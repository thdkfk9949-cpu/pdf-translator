// 문단들을 번역 엔진 한 번 요청에 들어갈 크기(maxChars)로 묶는다.
// 엔진마다 한 번에 받을 수 있는 글자 수가 달라서(무료 API는 아주 작음) 엔진이 크기를 정한다.

export const PARAGRAPH_SEPARATOR = "\n\n";

/**
 * @param {string[]} paragraphs
 * @param {number} maxChars
 * @returns {string[][]} 묶음(chunk)마다의 문단 목록
 */
export function chunkParagraphs(paragraphs, maxChars) {
  const pieces = paragraphs.flatMap((p) => splitLongText(p, maxChars));
  const chunks = [];
  let current = [];
  let size = 0;

  for (const piece of pieces) {
    const added = (current.length ? PARAGRAPH_SEPARATOR.length : 0) + piece.length;
    if (current.length && size + added > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    size += (current.length ? PARAGRAPH_SEPARATOR.length : 0) + piece.length;
    current.push(piece);
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** maxChars보다 긴 문단을 문장 → 단어 → 글자 단위 순으로 잘라낸다. */
export function splitLongText(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const sentences = text.split(/(?<=[.!?;:])\s+/);
  const out = [];
  let current = "";
  for (const sentence of sentences) {
    for (const part of sentence.length > maxChars ? splitByWords(sentence, maxChars) : [sentence]) {
      if (current && current.length + 1 + part.length > maxChars) {
        out.push(current);
        current = part;
      } else {
        current = current ? current + " " + part : part;
      }
    }
  }
  if (current) out.push(current);
  return out;
}

function splitByWords(text, maxChars) {
  const out = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (word.length > maxChars) {
      if (current) out.push(current);
      current = "";
      for (let i = 0; i < word.length; i += maxChars) out.push(word.slice(i, i + maxChars));
      continue;
    }
    if (current && current.length + 1 + word.length > maxChars) {
      out.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) out.push(current);
  return out;
}
