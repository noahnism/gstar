---
name: release
description: 새 버전 배포 준비. 버전 번호 갱신(APP_VERSION, 캐시버스터)이 필요할 때 사용.
---
# 릴리즈 절차
1. 현재 버전 확인: `app.js`의 `APP_VERSION`, `index.html`의 `style.css?v=`, `app.js?v=`
2. 사용자에게 새 버전(예: v4.4.4.0)과 변경 요약을 확인
3. 세 곳을 **같은 버전**으로 갱신 (`APP_VERSION`은 `"vX.Y.Z.W (Build MMDD)"` 형식)
4. `node --check app.js` 실행
5. 커밋 메시지: `release: vX.Y.Z.W - <요약>`
