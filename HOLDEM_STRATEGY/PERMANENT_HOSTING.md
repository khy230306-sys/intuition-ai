# HOLDEM EDGE 영구 주소

## 지금 쓰는 주소 (Shipstatic)

**https://arcane-bloom-2qgo9x3.shipstatic.com**

이 주소는 HTML이 정상 렌더링됩니다. (jsDelivr/Tiiny 익명 업로드처럼 만료·404가 나지 않게 하려면 아래 클레임이 필요합니다.)

### 영구화 (한 번만 · 약 30초)

아래 링크로 들어가 **Claim** 하면 만료되지 않습니다.

https://my.shipstatic.com/claim/613f099f44759dc1ef2781a856ace3b6874328a7df3b7c67e95ab0fc1fae0303

클레임 전에는 약 3일 후 만료될 수 있습니다. 클레임 후에는 계속 사용 가능합니다.

## GitHub Pages (저장소 관리자)

파일은 이미 `gh-pages` 브랜치 `/holdem-edge/` 에 있습니다.  
Pages만 켜면 영구 URL:

**https://khy230306-sys.github.io/intuition-ai/holdem-edge/**

1. https://github.com/khy230306-sys/intuition-ai/settings/pages  
2. Source → **Deploy from a branch**  
3. Branch: **`gh-pages`** / Folder: **`/ (root)`**  
4. Save  

## 재배포

```bash
cd HOLDEM_STRATEGY
npm run build
npm run deploy:web
```
