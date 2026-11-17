# G-STAR TRAINING CAMP (지트캠) — 프로젝트 지침

축구 아카데미 회원/CRM 웹앱. 빌드 도구 없는 순수 정적 사이트 (HTML + CSS + 바닐라 JS), Firebase v8 (Auth/Firestore/Storage) 사용.

## 구조
- `index.html` / `style.css` / `app.js` — 메인 앱 (app.js는 약 4,200줄 IIFE 단일 파일)
- `soccer-academy/` — 별도(구버전/분리) 사본. 메인과 동기화되지 않으니 수정 전 어느 쪽 대상인지 확인
- 외부 라이브러리는 CDN (Chart.js, Font Awesome, Firebase 8.10.1)

## 명령어
- 로컬 실행: `python3 -m http.server 8000` → http://localhost:8000
- 빌드/테스트 없음. 변경 후 브라우저에서 직접 확인

## 핵심 규칙
- UI 텍스트·주석은 한국어, 코드 식별자는 영어
- 버전은 `app.js`의 `APP_VERSION`과 `index.html`의 `?v=` 캐시버스터를 **함께** 올린다 (`/release` 참고)
- Firebase 설정/키를 새로 노출하거나 다른 프로젝트로 바꾸지 않는다
- 상세 규칙은 `.claude/rules/` 참고

## 로컬 전용 설정
개인 메모는 `CLAUDE.local.md`, 개인 권한은 `.claude/settings.local.json` (둘 다 gitignore)
