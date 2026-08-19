# Deployment

## 정적 호스팅

```bash
npm run build
```

`dist/`를 Vercel, Netlify, Cloudflare Pages, Nginx 등에 배포합니다.

SPA 라우팅을 위해 모든 경로를 `index.html`로 fallback 설정하세요.

## 환경변수

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (데모) `VITE_DEMO_ADMIN_ID`, `VITE_DEMO_ADMIN_PASSWORD`

## PWA

프로덕션은 HTTPS가 필요합니다. 빌드 산출물에 service worker와 manifest가 포함됩니다.

## Supabase

1. 프로젝트 생성
2. migration SQL 실행
3. RLS 정책 검토/적용
4. Auth 사용자 생성 후 앱 로그인 연동 확장
