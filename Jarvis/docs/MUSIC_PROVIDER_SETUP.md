# Music Provider Setup

## 현재 기본 (키 불필요)

- **YouTube / YouTube Music**: 공식 검색 URL만 생성합니다.
- **Spotify / Apple Music**: 공식 검색 URL만 생성합니다 (로그인·재생 API 없음).

사용자가 직접 할 일:

1. 휴대폰에서 YouTube / YouTube Music / Spotify / Apple Music 앱 설치(선택)
2. 재생 버튼 탭 시 뜨는 **외부 앱·브라우저 열기 확인** 승인
3. (선택) 설정 → AIZIO Music → 기본 제공자 선택

## YouTube Data API (향후, 선택)

실제 곡 제목·영상 ID 목록이 필요하면:

1. Google Cloud Console에서 YouTube Data API v3 사용 설정
2. API 키 발급
3. 앱/서버 환경 변수로만 보관 (저장소·클라이언트에 하드코딩 금지)
4. `youtubeProvider.ts`에 공식 `search.list` 어댑터 연결

키가 없으면 **가짜 곡 메타데이터를 만들지 않습니다.** 검색 URL만 사용합니다.

## Spotify / Apple Music (향후)

공통 인터페이스는 `MusicProvider` (`src/music/types.ts`)입니다.

필요 작업:

- Spotify: Client ID/Secret, OAuth, Web Playback 또는 App Remote (유료/정책 확인)
- Apple Music: MusicKit / developer token, 사용자 미디어 권한

가짜 “연결됨” UI를 표시하지 마세요. 인증이 끝나기 전에는 검색 URL 폴백만 사용합니다.

## 유료·배포

- API 유료 한도·결제: 사용자/운영자가 직접 처리
- 프로덕션 배포: 기존 `npm run deploy:web` 승인 후 진행
