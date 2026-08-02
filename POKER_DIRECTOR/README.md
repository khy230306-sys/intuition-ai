# POKER DIRECTOR

홀덤 토너먼트 통합 운영 시스템 (모바일·PC·TV / PWA)

## 프로젝트 위치

- 워크스페이스: `/workspace/POKER_DIRECTOR`
- 바탕화면 링크: `/home/ubuntu/Desktop/POKER_DIRECTOR`

## 기술 스택

React · TypeScript · Vite · Tailwind CSS · React Router · Zustand · Supabase(선택) · PWA · IndexedDB · Vitest · ESLint

## 접속 주소

현재 공유용(터널): **https://processing-occasional-sleeve-cingular.trycloudflare.com**

로그인: `admin` / `1234` 또는 **데모 계정으로 바로 입장**

### 듀얼 모니터

- 왼쪽 TV 시계: `#/display/tournament/<id>`
- 오른쪽 바인 체크판(正): `#/display/buyins/<id>`

홈·타이머·더보기에서 **바인 체크판** 버튼으로 새 창을 연 뒤, 오른쪽 모니터로 옮기고 전체화면 하세요.

## 설치

```bash
cd /workspace/POKER_DIRECTOR
npm install
```

## 실행

```bash
npm run dev
```

- PC: http://localhost:5173
- 같은 Wi-Fi 휴대폰: 터미널에 표시되는 Network 주소 (예: `http://192.168.x.x:5173`)

## 데모 로그인

로컬 데모 모드(기본):

- 아이디: `admin`
- 비밀번호: `1234`

동일 비밀번호로 `director`, `staff` 계정도 사용 가능합니다.

## 빌드

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

## PWA 설치

1. HTTPS 또는 localhost에서 앱을 엽니다.
2. **iPhone Safari**: 공유 → 홈 화면에 추가
3. **Android Chrome**: 메뉴(⋮) → 앱 설치 / 홈 화면에 추가

## Supabase 연결

1. `.env.example`을 복사해 `.env` 생성
2. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력
3. `supabase/migrations/001_init.sql` 및 `supabase/policies/rls.sql` 적용
4. 앱 재시작 → 클라우드 모드로 전환

환경변수가 없으면 자동으로 로컬 데모 모드로 동작합니다.

## 주요 화면

| 경로 | 설명 |
|------|------|
| `/` | 대시보드 |
| `/timer` | 블라인드 타이머 |
| `/players` | 참가자 관리 |
| `/tables` | 테이블 / 밸런싱 |
| `/display/tournament/:id` | TV 전용 화면 |
| `/player/:accessCode` | 플레이어 조회 |

## 문서

- `docs/FEATURES.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/USER_GUIDE.md`
- `docs/MOBILE_TEST.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/REMAINING_WORK.md`
