# Mobile Autoplay Limitations

iPhone Safari와 Android Chrome(및 홈 화면 PWA)은 **사용자 제스처 없는 오디오 자동재생**을 막는 경우가 많습니다.

## AIZIO Music Skill 정책

1. 음악 요청 → 검색·준비까지만 수행
2. 대화 버블 / 미니 플레이어에 **음악 재생** 버튼 표시
3. 사용자가 탭한 뒤에만 YouTube 등 외부 URL 오픈
4. “음악을 틀었어요”처럼 자동재생 성공을 가정하지 않음
5. 외부 앱으로 연 뒤 상태는 `opened_external` 또는 `unknown`

## 수동 테스트 절차 (실기기)

1. PWA 또는 모바일 Safari/Chrome에서 AIZIO 열기
2. “조용한 음악 틀어줘” 입력 또는 MIC로 말하기
3. 답변과 **음악 재생** 버튼 확인 (소리 자동 재생 없음)
4. 버튼 탭 → YouTube/YouTube Music 검색 화면 또는 앱 전환
5. “음악 멈춰” → AIZIO 세션 중지 안내 (외부 앱 소리는 앱에서 정지)
6. “다음 곡” → 외부 앱 제한 안내 또는 재오픈 유도
7. 하단 MIC·전송 버튼이 미니 플레이어에 가리지 않는지 확인
8. 홈 인디케이터(Safe Area)와 겹침 여부 확인

Cloud Agent에서는 위 실기기 항목을 **미확인**으로 둡니다.
