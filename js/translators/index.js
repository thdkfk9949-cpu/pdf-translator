// 번역 엔진 목록.
//
// 새 엔진(예: DeepL, Google Cloud Translation)을 추가하려면:
//   1. 이 폴더에 아래 "엔진 모양"대로 객체를 내보내는 파일을 만들고
//   2. 아래 TRANSLATORS 배열에 넣으면 끝이에요. 화면(설정 칸, 선택 목록)은 자동으로 만들어져요.
//
// 엔진 모양:
// {
//   id: "my-engine",                  // 고유 이름
//   name: "표시 이름",
//   tier: "free" | "paid",            // 선택 목록에서 무료/유료로 묶임
//   description: "설명 한두 줄",
//   fields: [                         // 설정 화면에 보일 입력 칸 (type: text | password | select | textarea)
//     { key: "apiKey", label: "API 키", type: "password", secret: true, required: true,
//       placeholder: "...", help: "...", options?: [{ value, label }], defaultValue?, maxLength? }
//   ],
//   // 지시를 따를 수 있는 엔진은 requests.js의 REQUESTS_FIELD를 넣으면 '번역 요청사항' 칸이 생겨요.
//   maxChunkChars: 1000,              // 한 번 요청에 보낼 최대 글자 수
//   concurrency: 1,                   // 동시에 보낼 요청 수
//   delayMs: 0,                       // 요청 사이 쉬는 시간(무료 API 예의상)
//   isSupportedHere: () => true,      // (선택) false면 이 환경에서는 목록에 아예 안 보임
//   async checkAvailability() { return { ok: true, note?: "..." } | { ok: false, reason: "..." } },
//   async createSession(values, { onStatus, signal }) {
//     return { translate: async (text, signal, onPartial?) => "번역문", destroy?() {} };
//   },
// }
//
// translate()에서 계속 진행해도 의미가 없는 오류(키가 틀림, 오늘 한도 소진 등)는
// FatalTranslateError로 던지면 번역 전체를 멈추고, 그 밖의 오류는 해당 부분만 "실패"로 표시해요.
// 그 밖의 오류는 한 번 자동으로 다시 시도하는데, 오류에 noRetry = true를 붙이면 다시 시도하지 않아요.

import claudeAi from "./claude-ai.js";
import chromeBuiltin from "./chrome-builtin.js";
import mymemory from "./mymemory.js";
import claude from "./claude.js";

/** 등록된 모든 엔진. 무료 엔진은 이 순서대로 첫 방문 때 기본값 후보가 돼요. */
export const TRANSLATORS = [claudeAi, chromeBuiltin, mymemory, claude];

/** 지금 열린 환경(GitHub Pages / claude.ai)에서 쓸 수 있는 엔진. */
export const AVAILABLE_TRANSLATORS = TRANSLATORS.filter((t) => t.isSupportedHere?.() ?? true);

export function getTranslator(id) {
  return AVAILABLE_TRANSLATORS.find((t) => t.id === id) ?? null;
}

export { FatalTranslateError } from "./errors.js";
