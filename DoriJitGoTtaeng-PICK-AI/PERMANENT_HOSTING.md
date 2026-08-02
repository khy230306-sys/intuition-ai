# GitHub Pages 404 원인과 해결

## 진단 결과 (자동 확인 완료)

| 항목 | 결과 |
|------|------|
| 원격 `gh-pages` 브랜치 | 존재함 |
| `index.html` 및 빌드 산출물 | 17개 파일 정상 (`raw.githubusercontent.com` 200) |
| Actions `gh-pages` 자동 배포 | 성공 |
| 저장소 `has_pages` | **false** (Pages 사이트 미생성) |
| Pages 생성 API | **403 Resource not accessible by integration** |

**결론:** 404의 원인은 빌드/브랜치 문제가 아닙니다.  
GitHub가 Cursor/Actions 통합 토큰의 **Pages 사이트 생성(administration)** 을 차단하고 있습니다.  
`gh-pages`에 파일은 이미 올라가 있지만, Pages 기능이 꺼져 있어 `*.github.io`가 “Site not found”를 반환합니다.

## 해결 (저장소 관리자 계정 · 약 30초)

1. 로그인: https://github.com/khy230306-sys/intuition-ai/settings/pages
2. **Build and deployment → Source**
3. **Deploy from a branch**
4. Branch: **`gh-pages`** / Folder: **`/ (root)`**
5. **Save**

저장 후 1~2분이면 아래 URL이 200이 됩니다.

**https://khy230306-sys.github.io/intuition-ai/**

> 한 번만 켜두면 이후 푸시마다 Actions가 `gh-pages`를 자동 갱신합니다.

## 관리자 PAT가 있는 경우 (완전 자동화)

저장소 Secrets에 아래 중 하나를 추가하면 Actions가 Pages를 자동 생성할 수 있습니다.

- `PAGES_TOKEN` / `GH_PAT` / `PAT` (classic `repo` 또는 fine-grained Administration + Pages write)

## 임시 실행 URL

https://vivid-bolt-1n8q5yk.shipstatic.com  
(클레임: https://my.shipstatic.com/claim/8f4670fd7d79a5f8605812fa6a4870eaf43f44229e2ba84030e284946cf35fe1)
