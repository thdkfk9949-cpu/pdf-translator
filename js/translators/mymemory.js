// 무료: MyMemory 번역 API (https://mymemory.translated.net). 키가 필요 없다.
// 하루 한도: 이메일 없이 약 5,000자, 이메일을 넣으면 약 50,000자. 한 번 요청은 500바이트 이하.
import { FatalTranslateError } from "./errors.js";

const ENDPOINT = "https://api.mymemory.translated.net/get";

export default {
  id: "mymemory",
  name: "MyMemory (무료 API)",
  tier: "free",
  description:
    "어느 브라우저에서나 쓸 수 있는 무료 번역 API예요. 하루 번역량이 정해져 있어요(이메일 없이 약 5천 자, 이메일을 넣으면 약 5만 자). 문서 내용이 MyMemory 서버로 전송돼요.",
  fields: [
    {
      key: "email",
      label: "이메일 (선택)",
      type: "email",
      placeholder: "you@example.com",
      help: "넣으면 하루 무료 한도가 약 10배(5만 자)로 늘어나요. MyMemory에만 전달돼요.",
    },
  ],
  maxChunkChars: 450,
  concurrency: 1,
  delayMs: 250,

  async checkAvailability() {
    return { ok: true };
  },

  async createSession(values) {
    const email = (values.email || "").trim();
    return {
      async translate(text, signal) {
        const params = new URLSearchParams({ q: text, langpair: "en|ko" });
        if (email) params.set("de", email);

        const res = await fetch(`${ENDPOINT}?${params}`, { signal });
        if (res.status === 429) throw new FatalTranslateError(quotaMessage(email));
        if (!res.ok) throw new Error(`MyMemory 응답 오류 (HTTP ${res.status})`);

        const data = await res.json();
        const translated = data?.responseData?.translatedText ?? "";
        const status = Number(data?.responseStatus);
        if (data?.quotaFinished || status === 429 || /^MYMEMORY WARNING/i.test(translated)) {
          throw new FatalTranslateError(quotaMessage(email));
        }
        if (status !== 200) throw new Error(`MyMemory 오류: ${data?.responseDetails || status}`);
        return decodeEntities(translated);
      },
    };
  },
};

function quotaMessage(email) {
  return email
    ? "MyMemory 오늘 무료 한도를 다 썼어요. 내일 다시 하거나 다른 번역 방식을 고른 뒤 '남은 부분 이어서 번역'을 누르세요."
    : "MyMemory 오늘 무료 한도를 다 썼어요. 이메일을 넣으면 한도가 늘어나요. 넣은 뒤 '남은 부분 이어서 번역'을 누르세요.";
}

function decodeEntities(s) {
  if (!/&[#a-z0-9]+;/i.test(s)) return s;
  return new DOMParser().parseFromString(s, "text/html").documentElement.textContent ?? s;
}
