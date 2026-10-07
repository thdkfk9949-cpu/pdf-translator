import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkParagraphs, splitLongText, PARAGRAPH_SEPARATOR } from "../js/chunker.js";

test("짧은 문단들은 한 묶음으로 합친다", () => {
  assert.deepEqual(chunkParagraphs(["One.", "Two.", "Three."], 100), [["One.", "Two.", "Three."]]);
});

test("묶음은 maxChars를 넘지 않는다", () => {
  const paragraphs = Array.from({ length: 30 }, (_, i) => `Paragraph number ${i} has some words in it.`);
  const chunks = chunkParagraphs(paragraphs, 120);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.join(PARAGRAPH_SEPARATOR).length <= 120);
  assert.deepEqual(chunks.flat(), paragraphs);
});

test("긴 문단은 문장 단위로 나눈다", () => {
  const text = "First sentence is here. Second sentence follows it. Third one ends the paragraph.";
  const parts = splitLongText(text, 40);
  for (const p of parts) assert.ok(p.length <= 40, p);
  assert.equal(parts.join(" "), text);
});

test("문장도 너무 길면 단어, 단어도 너무 길면 글자 단위로 나눈다", () => {
  const long = "word ".repeat(50).trim() + " " + "x".repeat(25);
  const parts = splitLongText(long, 10);
  for (const p of parts) assert.ok(p.length <= 10, p);
  assert.equal(parts.join("").replace(/\s/g, ""), long.replace(/\s/g, ""));
});
