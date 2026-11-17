---
paths:
  - "app.js"
  - "soccer-academy/app.js"
---
# Firebase 규칙
- Firebase v8 네임스페이스 API(`firebase.firestore()`)만 사용 — v9 모듈 문법 혼용 금지
- Firestore 쓰기는 오류 처리(try/catch + 사용자 안내)를 포함
- 회원 데이터 일괄 변경(엑셀 업로드 등)은 기존 병합 로직(`지능형 아이디 관리`)을 거친다
- 개인정보(이름·연락처)를 콘솔에 로그로 남기지 않는다
