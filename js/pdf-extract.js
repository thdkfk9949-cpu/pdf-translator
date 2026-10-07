// PDF 파일에서 페이지별 문단 텍스트를 뽑는다. (pdf.js 사용, 모두 브라우저 안에서 처리)
import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";
import { itemsToParagraphs } from "./text-layout.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

/**
 * @param {File} file
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Array<{number: number, paragraphs: string[]}>>}
 */
export async function extractPages(file, onProgress) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: new URL("../vendor/pdfjs/cmaps/", import.meta.url).href,
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push({ number: n, paragraphs: itemsToParagraphs(content.items) });
      page.cleanup();
      onProgress?.(n, pdf.numPages);
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}
