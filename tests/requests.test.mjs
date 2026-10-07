import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REQUESTS, REQUESTS_FIELD, requestsFrom, withRequests } from "../js/translators/requests.js";

test("한 번도 고친 적 없으면 기본 요청사항을 쓴다", () => {
  assert.equal(requestsFrom({}), DEFAULT_REQUESTS);
  assert.equal(requestsFrom(undefined), DEFAULT_REQUESTS);
});

test("일부러 비운 요청사항은 기본값으로 돌아가지 않는다", () => {
  assert.equal(requestsFrom({ requests: "" }), "");
  assert.equal(requestsFrom({ requests: "   \n " }), "");
});

test("사용자가 적은 요청사항은 앞뒤 공백만 지우고 그대로 쓴다", () => {
  assert.equal(requestsFrom({ requests: "  ~습니다체로 써 줘\n" }), "~습니다체로 써 줘");
});

test("너무 긴 요청사항은 최대 길이에서 자른다", () => {
  assert.equal(requestsFrom({ requests: "가".repeat(REQUESTS_FIELD.maxLength + 50) }).length, REQUESTS_FIELD.maxLength);
});

test("요청사항이 없으면 지시문을 바꾸지 않는다", () => {
  assert.equal(withRequests("BASE", ""), "BASE");
});

test("요청사항은 지시문 뒤 <requests> 안에 붙는다", () => {
  const out = withRequests("BASE", "용어는 영어 그대로");
  assert.ok(out.startsWith("BASE\n\n"));
  assert.ok(out.includes("<requests>\n용어는 영어 그대로\n</requests>"));
});
