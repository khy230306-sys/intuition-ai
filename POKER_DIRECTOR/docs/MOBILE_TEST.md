# Mobile Test Checklist

대상 뷰포트:

- iPhone SE (375×667)
- iPhone Pro Max (430×932)
- Android 일반 (360×800)
- iPad (768×1024)
- Android 태블릿 (800×1280)
- TV 1920×1080 (`/display/tournament/:id`)

확인 항목:

- [ ] 하단 메뉴가 홈 인디케이터에 가려지지 않음 (safe-area)
- [ ] 주요 버튼 터치 영역 ≥ 44px
- [ ] 가로 스크롤/잘린 버튼 없음
- [ ] 타이머 숫자 가독성
- [ ] 입력 포커스 시 하단 액션이 과도하게 가려지지 않음
- [ ] PWA 홈 화면 설치 가능
- [ ] 새로고침 후 타이머/좌석 상태 복구

개발자 도구 Device Toolbar로 위 해상도를 순회하며 확인합니다.
