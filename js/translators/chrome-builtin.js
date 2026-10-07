// 무료: Chrome에 내장된 번역 기능(Translator API). 번역이 내 컴퓨터 안에서 이뤄지고 한도가 없다.
// 데스크톱 Chrome 138 이상에서만 동작한다.
import { FatalTranslateError } from "./errors.js";

const LANGS = { sourceLanguage: "en", targetLanguage: "ko" };

export default {
  id: "chrome-builtin",
  name: "Chrome 내장 번역",
  tier: "free",
  description:
    "Chrome 브라우저에 들어 있는 번역 기능을 써요. 무료이고 사용량 제한이 없으며, 문서가 외부로 전송되지 않아요. 데스크톱 Chrome 138 이상에서만 쓸 수 있어요.",
  fields: [],
  maxChunkChars: 1500,
  concurrency: 1,
  delayMs: 0,

  async checkAvailability() {
    if (!("Translator" in globalThis)) {
      return { ok: false, reason: "이 브라우저는 내장 번역을 지원하지 않아요. 데스크톱 Chrome 138 이상에서 열거나 다른 번역 방식을 고르세요." };
    }
    try {
      const status = await globalThis.Translator.availability(LANGS);
      if (status === "unavailable") return { ok: false, reason: "이 브라우저에서는 영어→한국어 내장 번역을 쓸 수 없어요." };
      if (status === "available") return { ok: true, note: "바로 쓸 수 있어요." };
      return { ok: true, note: "처음 한 번은 번역 모델을 내려받느라 시간이 조금 걸려요." };
    } catch (e) {
      return { ok: false, reason: `내장 번역 확인 중 오류: ${e.message}` };
    }
  },

  async createSession(_values, { onStatus, signal }) {
    if (!("Translator" in globalThis)) throw new FatalTranslateError("이 브라우저는 내장 번역을 지원하지 않아요.");
    let translator;
    try {
      translator = await globalThis.Translator.create({
        ...LANGS,
        signal,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            onStatus?.(`번역 모델 내려받는 중… ${Math.round(e.loaded * 100)}%`);
          });
        },
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new FatalTranslateError(`내장 번역을 시작하지 못했어요: ${e.message}`);
    }
    return {
      translate: (text, sig) => translator.translate(text, { signal: sig }),
      destroy: () => translator.destroy?.(),
    };
  },
};
