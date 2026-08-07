# AIZIO 로또렌즈 — 최신 빌드

이 파일은 **항상 최신 공개 주소**를 가리킵니다. 배포할 때마다 여기를 갱신합니다.

## 지금 접속할 주소 (아이폰 · 안드로이드)

**https://pnly0n2h.nivii.app**

- 배포일: 2026-08-07
- 유효: ~2026-09-06
- 포함: AIZIO 로고, 히어로 간격 조정, 통계·흐름 분석

## 로컬 실행

```bash
cd lotto-analyzer && npm install && npm run dev
```

## iOS App Store 패키징

- Bundle ID: `com.aizio.lottolens`
- Version / Build: `1.0.0` / `1`
- Capacitor iOS 프로젝트: `ios/`
- 준비 명령: `npm run ios:prepare`
- 체크리스트: `../docs/IOS_APPSTORE_RELEASE_CHECKLIST.md`

## 에이전트 메모

- 모바일/공유용 URL을 말할 때는 **이 파일의 주소만** 사용한다.
- `nivii share`로 재배포하면 이 파일·`README.md`·PR 본문을 함께 갱신한다.
- iOS 관련 변경 후 `npm run smoke:ios`로 검증한다.
