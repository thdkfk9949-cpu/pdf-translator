import { test } from "node:test";
import assert from "node:assert/strict";
import { itemsToParagraphs } from "../js/text-layout.js";

// pdf.js getTextContent()가 돌려주는 item 모양을 흉내 낸다. (y는 아래로 갈수록 작아짐)
const item = (str, x, y, { width = str.length * 5, size = 10, hasEOL = false } = {}) => ({
  str,
  transform: [size, 0, 0, size, x, y],
  width,
  height: size,
  hasEOL,
});

test("한 줄의 여러 조각을 띄어쓰기로 잇는다", () => {
  const items = [item("Hello", 0, 700, { width: 25 }), item("world", 30, 700, { width: 25 })];
  assert.deepEqual(itemsToParagraphs(items), ["Hello world"]);
});

test("붙어 있는 조각은 띄어쓰기 없이 잇는다", () => {
  const items = [item("trans", 0, 700, { width: 25 }), item("lation", 25, 700, { width: 30 })];
  assert.deepEqual(itemsToParagraphs(items), ["translation"]);
});

test("줄 간격이 넓으면 문단을 나누고, 좁으면 한 문단으로 잇는다", () => {
  const W = 300;
  const items = [
    item("This is the first line of a paragraph that", 0, 700, { width: W, hasEOL: true }),
    item("continues on the next line.", 0, 688, { width: W * 0.5, hasEOL: true }),
    item("A new paragraph starts after a gap and", 0, 660, { width: W, hasEOL: true }),
    item("also wraps.", 0, 648, { width: 60 }),
  ];
  assert.deepEqual(itemsToParagraphs(items), [
    "This is the first line of a paragraph that continues on the next line.",
    "A new paragraph starts after a gap and also wraps.",
  ]);
});

test("줄 끝 하이픈으로 끊긴 단어를 잇는다", () => {
  const items = [
    item("We study machine trans-", 0, 700, { width: 300, hasEOL: true }),
    item("lation quality.", 0, 688, { width: 300 }),
  ];
  assert.deepEqual(itemsToParagraphs(items), ["We study machine translation quality."]);
});

test("글자 크기가 바뀌면(제목 등) 문단을 나눈다", () => {
  const items = [
    item("Introduction", 0, 720, { size: 16, width: 120, hasEOL: true }),
    item("Body text begins here and goes on", 0, 700, { width: 300, hasEOL: true }),
    item("for another line.", 0, 688, { width: 300 }),
  ];
  assert.deepEqual(itemsToParagraphs(items), ["Introduction", "Body text begins here and goes on for another line."]);
});

test("빈 입력은 빈 배열", () => {
  assert.deepEqual(itemsToParagraphs([]), []);
});
