# Event Blaster — 프로젝트 문서

## 프로젝트 개요

사용자가 Chrome 확장 프로그램 팝업의 버튼을 클릭하면,
현재 브라우저 URL을 백엔드 서버로 전달하고,
백엔드가 프록시를 통해 해당 사이트 소스를 수집·파싱하여
추출된 함수/이벤트 목록을 반환하면,
확장 프로그램이 그 중 랜덤 1개를 페이지에서 실행하는 시스템.

---

## 전체 흐름

```
[Chrome Extension - Popup]
  버튼 클릭
      │
      │ ① POST /api/parse  { url: "https://target.com/page" }
      ▼
[Backend Server]
      │
      │ ② 프록시를 경유하여 해당 URL 접속
      ▼
[Proxy Server]
      │
      │ ③ HTTP 응답 (HTML / JS / JSX / XML) 캡처
      ▼
[Backend Server - Parser]
      │
      │ ④ 소스코드에서 함수/이벤트 추출
      │
      │ ⑤ Response { functions: [ ... ] }
      ▼
[Chrome Extension - Popup]
      │
      │ ⑥ 목록 중 랜덤 1개 선택
      ▼
[Chrome Extension - content.js]
      │
      │ ⑦ 페이지 내에서 해당 함수/이벤트 실행
      ▼
[Target Website]
```

---

## 컴포넌트 정의

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| popup.html / popup.js | 확장 프로그램 | 버튼 UI, 현재 URL 추출, 백엔드 API 호출, 랜덤 선택 |
| content.js | 확장 프로그램 | 팝업으로부터 함수명 수신, 대기 오버레이/사운드 처리, 함수 실행 |
| Backend API | 백엔드 서버 | URL 수신, 프록시 경유 접속, 파싱, 목록 반환 |
| Proxy Server | 백엔드 서버 내 | 대상 사이트 HTTP 응답 가로채기 |
| Parser | 백엔드 서버 내 | HTML/JS/JSX/XML 소스에서 함수/이벤트 추출 |

---

## 파일 구조

```
chrome-extension/
├── manifest.json
├── popup.html              ← 팝업 UI
├── assets/
│   └── bgm.mp3             ← BGM 음원 (사용자 직접 준비)
└── src/
    ├── popup.js            ← URL 추출 → API 호출 → 랜덤 선택 → content.js 전달
    └── content.js          ← 대기 오버레이, 사운드, 함수 실행
```

### manifest.json 필요 권한

| 권한 | 용도 |
|---|---|
| `tabs` | 현재 탭 URL 조회 |
| `scripting` | content.js 삽입 |
| `host_permissions` | 대상 사이트 + 백엔드 서버 주소 |

---

## API 명세

### POST /api/parse

**Request**
```json
{ "url": "https://target-site.com/current/page" }
```

**Response**
```json
{
  "url": "https://target-site.com/current/page",
  "functions": [
    { "name": "handleSubmit",  "type": "function", "source": "main.js"    },
    { "name": "openModal",     "type": "function", "source": "app.jsx"    },
    { "name": "onClickBanner", "type": "event",    "source": "index.html" },
    { "name": "loadDashboard", "type": "function", "source": "router.js"  }
  ]
}
```

| 필드 | 설명 |
|---|---|
| `name` | 추출된 함수명 또는 이벤트 핸들러명 |
| `type` | `function` / `event` |
| `source` | 추출된 원본 파일명 |

---

## 백엔드 처리 흐름

1. `POST /api/parse`로 URL 수신
2. 프록시 경유로 해당 URL에 HTTP 요청, HTML + 연결된 JS/JSX/XML 파일 캡처
3. 정규식으로 함수/이벤트 추출

| 소스 타입 | 추출 패턴 |
|---|---|
| JS / JSX | `function foo()`, `const foo = () =>`, `foo: function()`, `window.foo =` |
| HTML | `onclick="foo()"`, `data-action="foo"`, `addEventListener('event', foo)` |
| XML | `<action name="foo">`, `<event type="foo">` |

4. 필터링 — 익명 함수, 라이브러리 내부 함수, 1~2자 minified 함수명 제외
5. 필터링된 목록 JSON으로 반환

---

## 확장 프로그램 처리 흐름

### popup.js

```
팝업 열림  →  현재 탭 URL 표시

버튼 클릭
  ├── content.js에 START_WAIT 전송  →  대기 오버레이 + BGM 시작
  ├── POST /api/parse { url } 호출 (3초 폴링)
  ├── 응답 수신 시 랜덤 1개 선택
  └── content.js에 EXECUTE_FN 전송
```

### content.js

```
START_WAIT 수신
  └── 대기 오버레이 생성 + BGM 재생 시작

EXECUTE_FN 수신
  ├── BGM 즉시 정지
  ├── BOOM 연출 재생
  └── 함수 실행 (우선순위 순)
        1. window[name]()
        2. document.querySelector('[data-action="name"]').click()
        3. document.dispatchEvent(new Event(name))
        4. eval(name + "()")  ← fallback

CANCEL 수신
  └── 오버레이 제거 + BGM 정지
```

---

## UI/UX 디자인 컨셉

**2000년대 초반 Flash 게임 / Newgrounds 스타일**

의도적으로 촌스럽고 과장된 비주얼을 사용한다.
세련미를 추구하지 않는다.
원색 충돌, 깜빡이는 텍스트, 두꺼운 보더, 과도한 글로우 효과가 핵심이다.

### 팝업 UI

- 타이틀: Impact 계열 폰트, 전부 대문자, 3D 그림자 또는 글리치 효과
- 서브 텍스트: Comic Sans 계열, 깜빡이거나 이탤릭
- 메인 버튼: 이중 보더, hover 시 색 반전, `cursor: crosshair`
- 현재 타겟 URL과 마지막 실행 함수명 표시
- 실행 성공 시 STATUS 텍스트에 느낌표 아낌없이 사용

### 대기 오버레이

버튼 클릭 후 현재 페이지 전체를 덮는 전체화면 레이어.

- 어두운 배경 + 별 도트 패턴 + CRT 스캔라인 질감
- 타이틀 텍스트 글리치 애니메이션 상시 재생
- 현재 페이지에서 추출한 링크/경로들이 약 150ms 간격으로 빠르게 교체되는 스트림 박스
- ASCII `█` 문자로 만든 진행 바, 3초 주기로 색 변경
- 경과 시간 텍스트 깜빡임

### BOOM 연출

- 전체 화면 흰색 플래시 0.1초
- 중앙에 폭발 이모지 바운스 등장
- 선택된 함수명 중앙 표시
- 오버레이 fade-out 후 제거

---

## 사운드

### 대기 BGM — 윙(WING) "Dopamine"

- `assets/bgm.mp3`에 음원 파일 배치 (사용자 직접 준비)
- `chrome.runtime.getURL('assets/bgm.mp3')`로 경로 획득
- Shadow DOM 안 `<audio loop>` 요소로 재생
- 오버레이 제거 시 `.pause()` + `.currentTime = 0`

> **저작권 주의** — 윙(WING) Dopamine은 저작권 음원이므로 음원 파일은 사용자가 합법적으로 취득해야 하며, 외부 배포 시 저작권 침해 문제가 발생할 수 있음.

### 갱신 알림음

- 3초마다 대기 연장 시 단발 비프
- Web Audio API 코드 내 합성

### BOOM 사운드 ("펑")

- 저음 펀치 + 노이즈 버스트 + 고음 스퀵 3레이어 동시 합성
- Web Audio API 코드 내 합성

> **Web Audio 재생 제한** — 모든 오디오는 사용자 제스처(버튼 클릭) 이후에만 재생 가능. AudioContext 생성은 반드시 클릭 핸들러 안에서 호출.

---

## 미결 사항

- [ ] 백엔드 프레임워크 선택 (Python FastAPI / Node.js Express 등)
- [ ] 프록시 구현 방식 (mitmproxy / http-proxy / Playwright 등)
- [ ] 백엔드 ↔ 확장 프로그램 간 인증 (API Key 등)
- [x] 파싱 범위 — 현재 페이지 HTML + 페이지에 연결된 JS/JSX/XML 파일 전체 포함 (결정됨)
- [ ] 함수 실행 실패 시 처리 (무시 / 재시도 / 팝업 알림)
- [ ] 인자가 있는 함수 처리 방식 (기본값 주입 / 인자 없는 함수만 허용)
