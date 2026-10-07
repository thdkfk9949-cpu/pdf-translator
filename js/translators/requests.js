// '번역 요청사항': 문체·용어 등 번역 방식을 사용자가 글로 정한다.
// 지시를 따를 수 있는 엔진(Claude 계열)만 이 칸을 쓴다. 기계 번역 엔진(Chrome 내장, MyMemory)은 지시를 받지 못한다.

/** 처음 쓸 때 들어 있는 요청사항. 원문 내용은 그대로 두고, 사람이 쓴 한국어처럼 읽히게 하는 문체 규칙. */
export const DEFAULT_REQUESTS = `사람이 직접 쓴 한국어 글처럼 자연스럽게 옮겨 주세요. 내용은 원문 그대로 두고, 문장만 다듬어요.

- 영어 어순과 번역체를 피해요. "~하는 것이 가능하다", "~에 의해 ~되다", "~를 가지고 있다" 같은 직역 표현 대신 한국어다운 표현을 써요.
- 문장 끝맺음을 다양하게 섞어요(습니다, 입니다, 합니다, 하죠, 이죠, 겁니다 등). 단, 원문의 격식과 어조에 맞는 범위 안에서요.
- 문장 길이와 구조에 변주를 줘요. 길고 복잡한 영어 문장은 두세 문장으로 나눠도 돼요.
- "단순히", "이는", "때문에", "또한", "일반적으로", "사실적으로" 같은 말이 반복되지 않게 자연스럽게 바꿔 써요. 반복을 피하려고 어색하거나 생소한 단어를 지어내지는 마세요.
- "체계적", "종합적", "효율적" 같은 추상 명사는 원문에 꼭 필요한 경우가 아니면 구체적인 말로 풀어 써요.
- 뭉뚱그리지 말고 구체적이고 간결하게 써요.
- 같은 전문 용어는 처음부터 끝까지 같은 번역어로 통일해요.
- 한국 독자가 읽기 쉬운 흐름을 가장 먼저 생각해요.`;

/** 번역 요청사항 입력 칸. Claude 계열 엔진의 fields 배열에 넣는다. */
export const REQUESTS_FIELD = {
  key: "requests",
  label: "번역 요청사항",
  type: "textarea",
  defaultValue: DEFAULT_REQUESTS,
  maxLength: 4000,
  placeholder: '예: "~습니다체로 써 줘", "transformer는 \'트랜스포머\'로, attention은 영어 그대로"',
  help: "문체, 용어, 표기 방식 등 원하는 번역 방식을 적어요. 비워 두면 기본 방식으로 번역해요. 바꾼 내용은 다음 번역부터 적용돼요.",
};

/** 저장된 값에서 요청사항을 꺼낸다. 한 번도 고친 적 없으면 기본값, 일부러 비웠으면 빈 문자열. */
export function requestsFrom(values) {
  const v = values?.[REQUESTS_FIELD.key];
  return (typeof v === "string" ? v : DEFAULT_REQUESTS).trim().slice(0, REQUESTS_FIELD.maxLength);
}

/**
 * 기본 번역 지시문 뒤에 사용자의 요청사항을 붙인다.
 * 요청사항은 문체·용어보다 우선하지만, 문단 구조와 "번역문만 답한다"는 규칙은 지키게 한다.
 */
export function withRequests(instructions, requests) {
  if (!requests) return instructions;
  return `${instructions}

The user who is reading this translation gave the requests below, written in Korean. Follow them; where they conflict with the style guidance above, the requests win. Still keep the same paragraphs in the same order, reply with only the translation, and do not add, drop, or summarize content unless the requests explicitly ask for it.

<requests>
${requests}
</requests>`;
}
