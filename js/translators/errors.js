/** 더 진행해도 소용없는 오류(잘못된 키, 한도 소진 등). 번역 전체를 멈춘다. */
export class FatalTranslateError extends Error {
  constructor(message) {
    super(message);
    this.name = "FatalTranslateError";
  }
}
