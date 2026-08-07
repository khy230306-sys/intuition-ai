# iOS App Store Release Checklist — AIZIO 로또렌즈

## 1. 현재 앱 상태

- Vite + TypeScript 웹앱을 Capacitor iOS로 패키징 완료
- 핵심 통계/추천/흐름 분석 기능 유지
- 데이터 번들 내장 → 오프라인 기본 화면 동작

## 2. iOS 패키징 완료 여부

| 항목 | 결과 |
|------|------|
| `@capacitor/ios` 설치 | ✅ |
| `ios/` 프로젝트 생성 | ✅ |
| `npm run build` | ✅ |
| `npx cap sync ios` | ✅ |
| Xcode Archive / Device Run | ⛔ Linux 환경 — Mac 필요 |

## 3. Bundle ID

`com.aizio.lottolens`

## 4. Version

`1.0.0` (`MARKETING_VERSION`)

## 5. Build Number

`1` (`CURRENT_PROJECT_VERSION`)

## 6. 앱 아이콘 상태

| 항목 | 상태 |
|------|------|
| 1024×1024 App Store icon | ✅ `resources/icon-1024.png` + Xcode AppIcon set |
| 투명 배경 | ❌ 없음 (불투명 RGB) |
| 모서리 직접 라운딩 | ❌ 없음 (정사각) |
| 원본 벡터 브랜드 파일 | ⚠️ 고해상도 디자이너 원본 없음 → 브랜드 기하학으로 생성. 최종 제출 전 고품질 원본(1024 PNG/SVG) 교체 권장 |

## 7. 권한 목록

- 카메라/사진/마이크/위치/연락처/블루투스: **선언 없음** (미사용)
- ATT: **없음**

## 8. 개인정보 수집 현황

- 수집 없음 (로그인·광고·추적·결제 없음)
- 초안: `docs/PRIVACY_POLICY_KO.md`, `docs/PRIVACY_POLICY_EN.md`

## 9. 외부 API

- 런타임 개인정보/데이터 업로드 API 없음
- Google Fonts는 선택적 스타일 로딩 (실패해도 앱 동작)
- `scripts/fetch-data.mjs`는 개발용 데이터 갱신 스크립트

## 10. 로또/도박 심사 위험 검토

| 위험 | 상태 |
|------|------|
| 실제 구매/결제/베팅 | 없음 |
| 외부 도박 링크 | 없음 |
| 당첨 보장 과장 | 없음 (푸터 고지 강화) |
| 포지셔닝 | 통계·엔터테인먼트 분석 도구 |

## 11. 자동 테스트 결과

- 기존 단위테스트 프레임워크 없음
- Smoke test 스크립트: `scripts/smoke-ios-prep.mjs` 실행 ✅

## 12. npm build 결과

✅ 성공 (`tsc && vite build`)

## 13. Capacitor sync 결과

✅ 성공 (`npx cap sync ios`)

## 14. 사용자 직접 해야 할 작업

1. Apple Developer Program 계정 로그인
2. App Store Connect에서 앱 생성 (Bundle ID `com.aizio.lottolens`)
3. Privacy Policy / Support URL 공개 호스팅 후 URL 기입
4. 문의 이메일·연락처 확정
5. (권장) 고품질 1024 아이콘 원본 교체
6. 스크린샷 촬영 (iPhone 6.7", 6.5" 등)

## 15. Xcode에서 해야 할 작업

1. Mac에서 `cd lotto-analyzer && npm install && npm run ios:prepare`
2. `npx cap open ios`
3. Signing & Capabilities → Team 선택
4. 시뮬레이터/실기기 Run
5. Product → Archive → Distribute App

## 16. App Store Connect에서 해야 할 작업

1. `docs/APP_STORE_SUBMISSION_INFO.md` 값 입력
2. App Privacy 설문: Data Not Collected
3. Build 선택 후 제출
4. Review Notes에 비도박/비구매 설명 포함

## 환경 제약

현재 CI/에이전트는 **Linux**이며 Xcode/CocoaPods 서명 빌드는 수행할 수 없습니다.  
웹 빌드 + Capacitor iOS 프로젝트 생성/동기화까지 검증 완료.
