# PDF 번역기

영어 PDF를 올리면 한국어로 번역해 주는 웹사이트예요. 서버 없이 GitHub Pages에서 무료로 돌아가요.

- PDF는 **내 브라우저 안에서** 읽어요. 파일 자체는 어디에도 올라가지 않아요.
- 번역 엔진은 **무료 → 유료로 언제든 바꿀 수 있어요.** 화면에서 고르기만 하면 돼요.
- 번역 도중 무료 한도가 끝나면, 엔진을 바꿔서 **남은 부분만 이어서** 번역할 수 있어요.
- 결과는 화면에서 원문과 나란히 보거나 `.txt`·`.md`로 저장하거나 인쇄(PDF로 저장)할 수 있어요.

## 번역 엔진

| 엔진 | 비용 | 한도 | 특징 |
|---|---|---|---|
| Chrome 내장 번역 | 무료 | 없음 | 데스크톱 Chrome 138 이상에서만 돼요. 번역이 내 컴퓨터 안에서 이뤄져요. |
| MyMemory | 무료 | 하루 약 5천 자 (이메일을 넣으면 약 5만 자) | 어느 브라우저에서나 돼요. 글이 MyMemory 서버로 전송돼요. |
| Claude API | 유료 | 크레딧만큼 | 품질이 가장 좋아요. [console.anthropic.com](https://console.anthropic.com)에서 API 키를 만들고 크레딧을 충전해야 해요. |
| Claude (내 claude.ai 계정) | 추가 요금 없음 | 내 플랜의 사용 한도 | **claude.ai에서 열었을 때만** 보여요. API 키 없이 내 claude.ai 계정의 Claude로 번역해요. |

> Claude API 크레딧은 claude.ai 구독(Pro/Max)과 **별개**예요. 구독이 있어도 API는 따로 충전해야 해요.

처음 방문하면 쓸 수 있는 무료 엔진이 자동으로 골라져요. Chrome이면 내장 번역, 다른 브라우저면 MyMemory가 골라져요.

claude.ai 안(Artifact)에서 열면 외부 서버로 요청을 보낼 수 없어서 MyMemory와 Claude API는 목록에서 빠지고, 대신 claude.ai 계정의 Claude를 써요. 이때 파일 저장은 claude.ai의 저장 확인 창을 거치고, 인쇄 버튼은 숨겨져요.

## 번역 요청사항

Claude 엔진(Claude API, 내 claude.ai 계정)을 고르면 **번역 요청사항** 칸이 나와요. 원하는 번역 방식을 글로 적으면 그대로 따라 번역해요.

- 예: "~습니다체로 써 줘", "transformer는 '트랜스포머'로, attention은 영어 그대로", "고유명사 뒤에 괄호로 원문 같이 적기"
- 처음에는 **번역체를 피하고 사람이 쓴 한국어처럼 읽히게 하는 문체 규칙**이 들어 있어요. 내용은 원문 그대로 두고 문장만 다듬어요.
- 고친 내용은 이 브라우저에 저장돼요. "기본값으로 되돌리기"를 누르면 처음 문구로 돌아가고, 칸을 비우면 요청사항 없이 번역해요.
- Chrome 내장 번역과 MyMemory는 단순 기계 번역이라 요청사항을 받을 수 없어요.

## 사이트 열기 (GitHub Pages)

1. 이 저장소의 **Settings → Pages**로 가요.
2. **Build and deployment**에서 Source를 `Deploy from a branch`로, Branch를 사이트 파일이 있는 브랜치(예: `main`)와 `/ (root)`로 정하고 저장해요.
3. 1~2분 뒤 `https://<GitHub 아이디>.github.io/pdf-translator/`에서 열려요.

내 컴퓨터에서 바로 열어 보려면 저장소 폴더에서 아래처럼 하고 `http://localhost:8000`에 접속해요. (`index.html`을 더블클릭해서 열면 동작하지 않아요.)

```bash
python3 -m http.server 8000
```

## 나중에 유료로 바꾸기

- **Claude로 바꾸기:** 이미 들어 있어요. 번역 엔진에서 `Claude API (유료)`를 고르고 API 키를 넣으면 끝이에요.
  - 모델은 Opus 5.5(최고 품질), Sonnet 5.5(균형), Haiku 4.5(가장 저렴) 중에서 고를 수 있어요.
  - API 키는 내 브라우저에서 Anthropic으로만 전송되고, "저장"을 체크했을 때만 이 브라우저에 저장돼요.
- **다른 엔진 추가하기:** `js/translators/` 폴더에 파일을 하나 만들고 `js/translators/index.js`의 목록에 넣으면 돼요. 파일 모양은 `index.js` 맨 위 주석과 `mymemory.js`를 참고하세요. 설정 칸과 선택 목록은 자동으로 만들어져요.
  - DeepL·Google Cloud 번역 API는 브라우저에서 바로 부를 수 없어요(CORS 제한). 이런 엔진을 쓰려면 작은 서버(예: Cloudflare Workers)를 하나 두고 그 주소를 부르는 엔진 파일을 만들면 돼요.

## 다른 사람에게 공개할 때 주의

이 구조에서는 **사용하는 사람이 자기 API 키를 넣어요.** 내 API 키를 코드에 넣어 두면 누구나 볼 수 있으니 절대 넣지 마세요. 내 비용으로 다른 사람에게 유료 번역을 제공하려면 키를 숨겨 줄 서버가 필요해요.

## 폴더 구조

```
index.html              화면
css/style.css           디자인 (다크 모드, 모바일, 인쇄 포함)
js/app.js               화면 동작: 파일 선택, 번역 진행, 저장
js/pdf-extract.js       PDF에서 페이지별 글자 읽기 (pdf.js)
js/text-layout.js       글자 조각을 줄·문단으로 묶기
js/chunker.js           문단을 엔진 한 번 요청 크기로 나누기
js/settings.js          설정을 브라우저에 저장
js/environment.js       claude.ai 안에서 열렸는지 확인
js/translators/         번역 엔진들 (여기에 파일을 추가하면 엔진이 늘어나요)
                        requests.js: '번역 요청사항' 칸과 기본 문체 규칙
vendor/                 외부 라이브러리 (pdf.js, Anthropic SDK). scripts/update-vendor.sh로 갱신
tests/                  테스트: node --test tests/*.test.mjs
```

## 아직 안 되는 것

- 스캔한 이미지로 된 PDF (글자 인식(OCR)이 필요해요)
- 원본 PDF의 배치(표, 그림 위치)를 그대로 살린 한글 PDF 만들기. 지금은 글자만 번역해서 보여 줘요.
