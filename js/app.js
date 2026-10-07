import { TRANSLATORS, AVAILABLE_TRANSLATORS, getTranslator, FatalTranslateError } from "./translators/index.js";
import { inClaudeViewer } from "./environment.js";
import { chunkParagraphs, PARAGRAPH_SEPARATOR } from "./chunker.js";
import { loadSettings, saveSettings } from "./settings.js";

const $ = (id) => document.getElementById(id);
const els = {
  provider: $("provider"),
  providerDesc: $("provider-desc"),
  availability: $("provider-availability"),
  fields: $("provider-fields"),
  rememberWrap: $("remember-wrap"),
  remember: $("remember-secrets"),
  dropzone: $("dropzone"),
  fileInput: $("file-input"),
  fileName: $("file-name"),
  start: $("start"),
  resume: $("resume"),
  stop: $("stop"),
  progressWrap: $("progress-wrap"),
  progressBar: $("progress-bar"),
  status: $("status"),
  resultsSection: $("results-section"),
  results: $("results"),
  showSource: $("show-source"),
  downloadTxt: $("download-txt"),
  downloadMd: $("download-md"),
  print: $("print"),
};

const settings = loadSettings();

/** @type {File|null} */
let file = null;
/**
 * 번역 중인 문서.
 * @type {null | {fileName: string, pages: Array<{number: number, chunks: Chunk[]}>}}
 * @typedef {{paragraphs: string[], translation: string|null, status: "pending"|"working"|"done"|"error", error: string|null, el?: HTMLElement}} Chunk
 */
let doc = null;
/** @type {AbortController|null} */
let running = null;

// ---------- 번역 엔진 선택 ----------

function currentTranslator() {
  return getTranslator(els.provider.value) ?? AVAILABLE_TRANSLATORS[0];
}

function valuesFor(t) {
  settings.values[t.id] ??= {};
  return settings.values[t.id];
}

function persist() {
  saveSettings(settings, TRANSLATORS);
}

function buildProviderSelect() {
  const groups = { free: "무료", paid: "유료" };
  for (const [tier, label] of Object.entries(groups)) {
    const group = document.createElement("optgroup");
    group.label = label;
    for (const t of AVAILABLE_TRANSLATORS.filter((x) => x.tier === tier)) {
      group.append(new Option(t.name, t.id));
    }
    if (group.children.length) els.provider.append(group);
  }
}

async function pickInitialProvider() {
  if (settings.provider && getTranslator(settings.provider)) return settings.provider;
  // 처음 방문: 쓸 수 있는 첫 무료 엔진을 고른다.
  for (const t of AVAILABLE_TRANSLATORS.filter((x) => x.tier === "free")) {
    const r = await t.checkAvailability().catch(() => ({ ok: false }));
    if (r.ok) return t.id;
  }
  return AVAILABLE_TRANSLATORS[0].id;
}

function renderProviderPanel() {
  const t = currentTranslator();
  const values = valuesFor(t);
  els.providerDesc.textContent = t.description;

  els.fields.replaceChildren(
    ...t.fields.map((f) => {
      const wrap = document.createElement("label");
      wrap.className = "field";
      const label = document.createElement("span");
      label.className = "field-label";
      label.textContent = f.label;

      let input;
      if (f.type === "select") {
        input = document.createElement("select");
        for (const o of f.options) input.append(new Option(o.label, o.value));
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
        input.placeholder = f.placeholder || "";
        input.autocomplete = f.secret ? "off" : "on";
        input.spellcheck = false;
      }
      input.value = values[f.key] ?? f.defaultValue ?? "";
      if (f.type === "select" && !input.value) input.selectedIndex = 0;
      input.addEventListener("input", () => {
        values[f.key] = input.value;
        persist();
      });

      wrap.append(label, input);
      if (f.help) {
        const help = document.createElement("span");
        help.className = "field-help";
        help.textContent = f.help;
        wrap.append(help);
      }
      return wrap;
    }),
  );

  els.rememberWrap.hidden = !t.fields.some((f) => f.secret);
  els.remember.checked = settings.rememberSecrets;

  els.availability.hidden = true;
  t.checkAvailability()
    .catch((e) => ({ ok: false, reason: e.message }))
    .then((r) => {
      if (currentTranslator() !== t) return;
      const text = r.ok ? r.note : r.reason;
      els.availability.hidden = !text;
      els.availability.textContent = text || "";
      els.availability.classList.toggle("warn", !r.ok);
    });
}

// ---------- 파일 선택 ----------

function setFile(f) {
  if (!f) return;
  if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
    setStatus("PDF 파일만 올릴 수 있어요.", true);
    return;
  }
  file = f;
  doc = null;
  els.fileName.textContent = `${f.name} (${formatSize(f.size)})`;
  els.results.replaceChildren();
  els.resultsSection.hidden = true;
  els.progressWrap.hidden = true;
  setStatus("");
  updateButtons();
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ---------- 번역 실행 ----------

async function run({ fresh }) {
  if (!file || running) return;
  const t = currentTranslator();
  const values = valuesFor(t);
  const missing = t.fields.find((f) => f.required && !String(values[f.key] ?? "").trim());
  if (missing) {
    setStatus(`'${missing.label}'을(를) 입력해 주세요.`, true);
    return;
  }

  const controller = new AbortController();
  running = controller;
  updateButtons();
  setStatus("번역 엔진 준비 중…");

  let session = null;
  try {
    // 엔진 준비를 가장 먼저 한다. (Chrome 내장 번역은 버튼 클릭 직후에만 모델을 내려받을 수 있음)
    session = await t.createSession(values, { onStatus: (s) => setStatus(s), signal: controller.signal });

    if (fresh || !doc) {
      setStatus("PDF에서 글자를 읽는 중…");
      const { extractPages } = await import("./pdf-extract.js");
      const pages = await extractPages(file, (done, total) => setStatus(`PDF에서 글자를 읽는 중… (${done}/${total}쪽)`));
      doc = {
        fileName: file.name,
        pages: pages.map((p) => ({
          number: p.number,
          chunks: chunkParagraphs(p.paragraphs, t.maxChunkChars).map(newChunk),
        })),
      };
      if (!allChunks().length) {
        renderResults();
        setStatus("이 PDF에서 글자를 찾지 못했어요. 스캔한 이미지로 된 PDF는 아직 번역할 수 없어요.", true);
        return;
      }
    } else {
      fitChunksTo(t.maxChunkChars);
    }
    renderResults();

    const fatal = await translateAll(session, t, controller);
    const s = summary();
    if (fatal) {
      setStatus(fatal.message, true);
    } else if (controller.signal.aborted) {
      setStatus(`중지했어요. ${s.done}/${s.total} 부분 번역됨.`);
    } else if (s.failed) {
      setStatus(`${s.failed}개 부분을 번역하지 못했어요. '남은 부분 이어서 번역'으로 다시 시도할 수 있어요.`, true);
    } else {
      setStatus(`번역을 마쳤어요. (${doc.pages.length}쪽)`);
    }
  } catch (e) {
    if (controller.signal.aborted) setStatus("중지했어요.");
    else setStatus(errorMessage(e), true);
  } finally {
    session?.destroy?.();
    running = null;
    updateButtons();
    updateProgress();
  }
}

function newChunk(paragraphs) {
  return { paragraphs, translation: null, status: "pending", error: null };
}

function allChunks() {
  return doc ? doc.pages.flatMap((p) => p.chunks) : [];
}

/** 엔진을 바꿔 이어서 번역할 때, 아직 안 끝난 부분을 새 엔진의 한 번 요청 크기에 맞게 다시 나눈다. */
function fitChunksTo(maxChars) {
  for (const page of doc.pages) {
    page.chunks = page.chunks.flatMap((c) =>
      c.status !== "done" && sourceOf(c).length > maxChars ? chunkParagraphs(c.paragraphs, maxChars).map(newChunk) : [c],
    );
  }
}

function sourceOf(chunk) {
  return chunk.paragraphs.join(PARAGRAPH_SEPARATOR);
}

/** @returns {Promise<FatalTranslateError|null>} */
async function translateAll(session, t, controller) {
  const queue = allChunks().filter((c) => c.status !== "done");
  let next = 0;
  let fatal = null;
  updateProgress();

  const worker = async () => {
    while (!controller.signal.aborted && next < queue.length) {
      const chunk = queue[next++];
      setChunk(chunk, "working");
      try {
        const onPartial = (partial) => {
          const dst = chunk.el?.querySelector(".dst");
          if (dst && chunk.status === "working") dst.textContent = partial;
        };
        const text = await translateWithRetry(session, sourceOf(chunk), controller.signal, onPartial);
        chunk.translation = text;
        setChunk(chunk, "done");
      } catch (e) {
        if (controller.signal.aborted) {
          setChunk(chunk, "pending");
        } else if (e instanceof FatalTranslateError) {
          fatal ??= e;
          setChunk(chunk, "pending");
          controller.abort();
        } else {
          setChunk(chunk, "error", errorMessage(e));
        }
      }
      updateProgress();
      if (t.delayMs) await sleep(t.delayMs, controller.signal);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, t.concurrency || 1) }, worker));
  return fatal;
}

async function translateWithRetry(session, text, signal, onPartial) {
  try {
    return await session.translate(text, signal, onPartial);
  } catch (e) {
    if (signal.aborted || e instanceof FatalTranslateError || e?.noRetry) throw e;
    await sleep(1500, signal);
    if (signal.aborted) throw e;
    return await session.translate(text, signal, onPartial);
  }
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done);
  });
}

function errorMessage(e) {
  return e?.message || String(e);
}

// ---------- 화면 표시 ----------

function renderResults() {
  els.resultsSection.hidden = false;
  els.results.replaceChildren(
    ...doc.pages.map((page) => {
      const section = document.createElement("section");
      section.className = "page";
      const h = document.createElement("h3");
      h.textContent = `${page.number}쪽`;
      section.append(h);

      if (!page.chunks.length) {
        const p = document.createElement("p");
        p.className = "page-empty";
        p.textContent = "이 쪽에서는 글자를 찾지 못했어요. (그림이나 스캔한 이미지일 수 있어요)";
        section.append(p);
      }
      for (const chunk of page.chunks) {
        const el = document.createElement("div");
        el.className = "chunk";
        const src = document.createElement("div");
        src.className = "src";
        src.lang = "en";
        src.textContent = sourceOf(chunk);
        const dst = document.createElement("div");
        dst.className = "dst";
        dst.lang = "ko";
        el.append(src, dst);
        chunk.el = el;
        section.append(el);
        paintChunk(chunk);
      }
      return section;
    }),
  );
}

function setChunk(chunk, status, error = null) {
  chunk.status = status;
  chunk.error = error;
  paintChunk(chunk);
}

function paintChunk(chunk) {
  if (!chunk.el) return;
  chunk.el.dataset.status = chunk.status;
  const dst = chunk.el.querySelector(".dst");
  if (chunk.status === "done") {
    dst.textContent = chunk.translation;
    return;
  }
  const span = document.createElement("span");
  span.className = "placeholder";
  span.textContent =
    chunk.status === "working" ? "번역 중" : chunk.status === "error" ? `번역 실패: ${chunk.error}` : "번역 대기 중";
  dst.replaceChildren(span);
}

function summary() {
  const chunks = allChunks();
  return {
    total: chunks.length,
    done: chunks.filter((c) => c.status === "done").length,
    failed: chunks.filter((c) => c.status === "error").length,
  };
}

function updateProgress() {
  const s = summary();
  els.progressWrap.hidden = !s.total;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressBar.parentElement.setAttribute("aria-valuenow", String(pct));
  if (running && s.total) setStatus(`번역 중… ${s.done}/${s.total} 부분 (${pct}%)`);
}

function updateButtons() {
  const busy = !!running;
  const s = summary();
  els.start.disabled = !file || busy;
  els.start.textContent = doc ? "처음부터 다시 번역" : "번역 시작";
  els.resume.hidden = busy || !doc || s.done === s.total;
  els.stop.hidden = !busy;
  els.provider.disabled = busy;
  els.fileInput.disabled = busy;
  for (const b of [els.downloadTxt, els.downloadMd, els.print]) b.disabled = busy || !s.done;
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle("error", isError);
}

// ---------- 저장 ----------

function baseName() {
  return (doc?.fileName || "translation").replace(/\.pdf$/i, "");
}

function buildTxt() {
  return doc.pages
    .map((p) => {
      const body = p.chunks.length
        ? p.chunks.map((c) => (c.status === "done" ? c.translation : `[번역 안 됨]\n${sourceOf(c)}`)).join("\n\n")
        : "(글자 없음)";
      return `===== ${p.number}쪽 =====\n\n${body}`;
    })
    .join("\n\n");
}

function buildMd() {
  const parts = [`# ${baseName()} (한국어 번역)\n`];
  for (const p of doc.pages) {
    parts.push(`## ${p.number}쪽\n`);
    if (!p.chunks.length) parts.push("_(글자 없음)_\n");
    for (const c of p.chunks) {
      const quoted = sourceOf(c).split("\n").map((l) => `> ${l}`).join("\n");
      parts.push(`${quoted}\n\n${c.status === "done" ? c.translation : "_(번역 안 됨)_"}\n`);
    }
  }
  return parts.join("\n");
}

async function download(text, filename, type) {
  // claude.ai 화면 안에서는 일반 다운로드 링크가 막혀 있어서, 저장 기능(downloads)을 거친다.
  if (inClaudeViewer) {
    const downloads = await globalThis.claude.use("downloads");
    if (!downloads) {
      setStatus("이 화면에서는 파일로 저장할 수 없어요.", true);
      return;
    }
    try {
      await downloads.save({ filename, data: text });
      setStatus(`${filename} 파일을 저장했어요.`);
    } catch (e) {
      if (e?.code !== "declined") setStatus(`파일을 저장하지 못했어요: ${e?.message || e?.code}`, true);
    }
    return;
  }

  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- 이벤트 연결 ----------

function bindEvents() {
  els.provider.addEventListener("change", () => {
    settings.provider = els.provider.value;
    persist();
    renderProviderPanel();
  });
  els.remember.addEventListener("change", () => {
    settings.rememberSecrets = els.remember.checked;
    persist();
  });

  els.fileInput.addEventListener("change", () => setFile(els.fileInput.files?.[0]));
  els.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!running) els.dropzone.classList.add("dragover");
  });
  els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
  els.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
    if (!running) setFile(e.dataTransfer?.files?.[0]);
  });

  els.start.addEventListener("click", () => run({ fresh: true }));
  els.resume.addEventListener("click", () => run({ fresh: false }));
  els.stop.addEventListener("click", () => running?.abort());

  els.showSource.addEventListener("change", () => els.results.classList.toggle("show-source", els.showSource.checked));
  els.downloadTxt.addEventListener("click", () => download(buildTxt(), `${baseName()}.ko.txt`, "text/plain"));
  els.downloadMd.addEventListener("click", () => download(buildMd(), `${baseName()}.ko.md`, "text/markdown"));
  // claude.ai 화면 안에서는 인쇄 창을 열 수 없다.
  els.print.hidden = inClaudeViewer;
  els.print.addEventListener("click", () => window.print());

  window.addEventListener("beforeunload", (e) => {
    if (running) e.preventDefault();
  });
}

async function init() {
  buildProviderSelect();
  els.provider.value = await pickInitialProvider();
  settings.provider = els.provider.value;
  renderProviderPanel();
  bindEvents();
  updateButtons();
}

init();
