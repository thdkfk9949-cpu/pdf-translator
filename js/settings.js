// 번역 방식 선택과 입력값을 이 브라우저에만 저장한다. (서버로 보내지 않음)
// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 페이지가 동작하도록 실패는 무시한다.

const STORAGE_KEY = "pdf-translator:settings:v1";

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      return { provider: parsed.provider ?? null, values: parsed.values ?? {}, rememberSecrets: !!parsed.rememberSecrets };
    }
  } catch {
    // 무시
  }
  return { provider: null, values: {}, rememberSecrets: false };
}

/**
 * @param {{provider: string, values: Record<string, Record<string, string>>, rememberSecrets: boolean}} settings
 * @param {Array<{id: string, fields: Array<{key: string, secret?: boolean}>}>} translators
 */
export function saveSettings(settings, translators) {
  const values = {};
  for (const t of translators) {
    const v = { ...(settings.values[t.id] ?? {}) };
    if (!settings.rememberSecrets) {
      for (const f of t.fields) if (f.secret) delete v[f.key];
    }
    values[t.id] = v;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ provider: settings.provider, values, rememberSecrets: settings.rememberSecrets }),
    );
  } catch {
    // 무시
  }
}
