# 쑥쑥놀이터 고정 주소 만들기

터널(`*.lhr.life`)은 시간이 지나면 끊깁니다. 아래 중 **하나만** 하면 고정 URL이 됩니다.

## 방법 A — ShipStatic 클레임 (가장 빠름, 약 20초)

1. 배포 후 나온 **Claim** 링크를 폰/PC에서 엽니다.
2. 이메일로 소유권을 가져옵니다.
3. 대시보드에서 원하는 고정 이름(예: `ssuk-hanyoung`)을 연결합니다.

현재 배포를 다시 올리려면:

```bash
cd ssuk-hanyoung
bash scripts/deploy-ship.sh
```

## 방법 B — Vercel (이미 `ssuk-hanyoung.vercel.app` 사용 중이면 최적)

```bash
cd ssuk-hanyoung
npm run build
npx vercel deploy ./dist --prod --yes
```

브라우저에서 로그인/승인 후 고정 주소가 나옵니다.  
프로젝트 Root Directory를 `ssuk-hanyoung`로 두면 이후 push마다 자동 배포됩니다.

## 방법 C — GitHub Pages (관리자 1회 설정)

이 저장소는 `gh-pages`에 파일은 올라가 있지만 Pages 기능이 꺼져 있을 수 있습니다.

1. https://github.com/khy230306-sys/intuition-ai/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / Folder: **`/`**
4. Save

이후 주소:

**https://khy230306-sys.github.io/intuition-ai/ssuk-hanyoung/**
