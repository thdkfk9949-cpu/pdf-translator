// 이 페이지가 claude.ai 안(Artifact 화면)에서 열렸는지 알려 준다.
// 그 안에서는 외부 서버로의 요청(fetch)이 막혀 있고, 대신 window.claude.use()로 Claude 기능을 쓸 수 있다.
export const inClaudeViewer = typeof globalThis.claude?.use === "function";
