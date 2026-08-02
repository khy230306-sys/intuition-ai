# 영구 호스팅 설정 (1분)

에이전트 토큰은 GitHub Pages를 **생성**할 권한이 없습니다.  
아래 중 **하나만** 하면 URL이 영구적으로 유지됩니다.

---

## 방법 A — GitHub Pages (권장, 완전 무료·영구)

1. 아래 링크를 엽니다 (저장소 관리자 계정으로 로그인):  
   **https://github.com/khy230306-sys/intuition-ai/settings/pages**
2. **Build and deployment → Source** 를  
   **Deploy from a branch** 로 선택
3. Branch: **`gh-pages`** / Folder: **`/ (root)`** → **Save**
4. 1~2분 후 접속:  
   **https://khy230306-sys.github.io/intuition-ai/**

이후 코드가 푸시되면 Actions가 `gh-pages`를 자동 갱신합니다.

---

## 방법 B — ShipStatic 클레임 (Google 로그인 1회)

현재 배포 URL:  
**https://flashy-shard-5dq95av.shipstatic.com**

클레임(영구 소유권) 링크:  
**https://my.shipstatic.com/claim/0d8c19e85c2519a9a113887f982cc346b4a138cb07037da579797e78dfea11ca**

1. 위 클레임 링크를 엽니다
2. Google로 로그인합니다
3. 클레임하면 **같은 URL이 만료되지 않고 영구 유지**됩니다

---

방법 A를 켜면 github.io 주소가 공식 영구 URL입니다.
