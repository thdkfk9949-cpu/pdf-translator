// pdf.js 텍스트 조각(item)들을 줄 → 문단으로 묶는 순수 함수.
// 브라우저와 Node(테스트) 양쪽에서 쓰므로 pdf.js에 의존하지 않는다.

/**
 * @param {Array<{str: string, transform: number[], width?: number, height?: number, hasEOL?: boolean}>} items
 * @returns {string[]} 문단 목록
 */
export function itemsToParagraphs(items) {
  return linesToParagraphs(itemsToLines(items));
}

export function itemsToLines(items) {
  const lines = [];
  let line = null;
  let prev = null;

  for (const item of items) {
    const str = item.str ?? "";
    const [, , , d, x, y] = item.transform ?? [0, 0, 0, 0, 0, 0];
    const size = Math.abs(item.height || d || 10);

    if (!str) {
      if (item.hasEOL && line) {
        lines.push(line);
        line = null;
        prev = null;
      }
      continue;
    }

    const newLine = !line || (prev && prev.hasEOL) || Math.abs(y - line.y) > Math.max(2, size * 0.5);
    if (newLine) {
      if (line) lines.push(line);
      line = { text: "", x, y, size, right: x };
    }

    // 같은 줄인데 조각 사이 간격이 있으면 띄어쓰기를 넣는다.
    if (line.text && !/\s$/.test(line.text) && !/^\s/.test(str) && x - line.right > size * 0.15) {
      line.text += " ";
    }
    line.text += str;
    line.right = x + (item.width || 0);
    line.size = Math.max(line.size, size);
    prev = item;
  }
  if (line) lines.push(line);

  return lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text);
}

export function linesToParagraphs(lines) {
  if (!lines.length) return [];

  // 줄 간격의 중앙값을 기준으로 문단 사이 빈 줄을 판단한다.
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > 0) gaps.push(gap);
  }
  gaps.sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const maxWidth = Math.max(...lines.map((l) => l.right - l.x));

  const paragraphs = [];
  let current = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (current.length) {
      const before = lines[i - 1];
      const gap = before.y - l.y;
      const bigGap = typicalGap > 0 && gap > typicalGap * 1.45;
      const jumpedUp = gap < -1; // 다음 단(column)이나 머리말로 넘어감
      const sizeChanged = Math.abs(l.size - before.size) > Math.max(1, before.size * 0.2);
      const shortSentenceEnd =
        /[.!?:"”)]$/.test(before.text) && before.right - before.x < maxWidth * 0.7;
      if (bigGap || jumpedUp || sizeChanged || shortSentenceEnd) {
        paragraphs.push(joinLines(current));
        current = [];
      }
    }
    current.push(l.text);
  }
  if (current.length) paragraphs.push(joinLines(current));

  return paragraphs.filter((p) => p);
}

function joinLines(texts) {
  let out = "";
  for (const t of texts) {
    if (!out) {
      out = t;
    } else if (/[A-Za-z]-$/.test(out) && /^[a-z]/.test(t)) {
      // 줄 끝 하이픈으로 끊긴 단어 이어 붙이기: "trans-" + "lation"
      out = out.slice(0, -1) + t;
    } else {
      out += " " + t;
    }
  }
  return out.trim();
}
