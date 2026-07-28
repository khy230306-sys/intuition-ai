# FlowMate — iOS 모바일 자동화 앱

iPhone에서 워크플로우 기반 자동화를 만들고 실행하는 SwiftUI 앱입니다.

## 주요 기능

- **워크플로우 생성/편집** — 여러 동작을 순서대로 연결
- **10가지 내장 동작** — URL 열기, 단축어 실행, 클립보드, 알림, 대기, 앱 열기, 설정, 햅틱, 공유, TTS
- **빠른 실행** — 자주 쓰는 동작을 원터치로 실행
- **iOS 단축어 연동** — 기존 Shortcuts 앱의 단축어를 워크플로우에 포함
- **Siri / App Intents** — "FlowMate에서 워크플로우 실행" 음성 명령 지원
- **샘플 워크플로우** — 아침 루틴, 집중 모드, 빠른 공유

## iOS 자동화 제한 사항

Apple의 샌드박스 정책으로 인해 **다른 앱을 직접 터치하거나 조작할 수는 없습니다.** FlowMate는 iOS가 허용하는 범위 내에서 자동화합니다:

| 가능 | 불가능 |
|------|--------|
| URL / URL Scheme으로 앱 열기 | 다른 앱 UI 요소 클릭 |
| iOS 단축어 앱 연동 | 백그라운드에서 무제한 실행 |
| 알림, 클립보드, 공유 시트 | 시스템 전체 제어 |
| 설정 앱 열기 | 타사 앱 내부 자동 조작 |

더 강력한 자동화가 필요하면 **iOS 단축어 앱**과 FlowMate를 함께 사용하세요.

## 요구 사항

- macOS + Xcode 15 이상
- iOS 17.0 이상 (iPhone / iPad)
- Apple Developer 계정 (실기기 배포 시)

## 설치 및 실행

1. Mac에서 이 저장소를 클론합니다.
2. `FlowMate/FlowMate.xcodeproj`를 Xcode로 엽니다.
3. **Signing & Capabilities**에서 본인의 Development Team을 선택합니다.
4. iPhone을 연결하거나 시뮬레이터를 선택한 뒤 **Run (⌘R)** 합니다.

```bash
git clone <repository-url>
cd FlowMate
open FlowMate.xcodeproj
```

## 사용 방법

### 1. 워크플로우 만들기

1. **워크플로우** 탭 → **+** 버튼
2. 이름, 아이콘, 색상 설정
3. **동작 추가**로 단계를 추가하고 순서 조정
4. **저장**

### 2. 워크플로우 실행

- 목록에서 워크플로우 탭 → 실행 화면에서 **워크플로우 실행**
- **빠른 실행** 탭에서 그리드 카드 탭

### 3. iOS 단축어와 연동

1. iOS **단축어** 앱에서 자동화를 만듭니다.
2. FlowMate 워크플로우에 **단축어 실행** 동작을 추가하고 단축어 이름을 입력합니다.
3. 또는 단축어 앱에서 FlowMate의 **워크플로우 실행** App Intent를 사용합니다.

### 4. Siri로 실행

단축어 앱 → FlowMate → "워크플로우 실행"을 Siri에 추가한 뒤:

> "Hey Siri, FlowMate에서 아침 루틴 워크플로우 실행"

## 프로젝트 구조

```
FlowMate/
├── FlowMate.xcodeproj/
└── FlowMate/
    ├── App/              # 앱 진입점
    ├── Models/           # 워크플로우, 동작 모델
    ├── Services/         # 실행 엔진, 저장소, 단축어 연동
    ├── Views/            # SwiftUI 화면
    ├── Intents/          # App Intents (Siri 연동)
    └── Resources/        # Info.plist, Assets
```

## 지원 동작 목록

| 동작 | 설명 | 예시 |
|------|------|------|
| URL 열기 | 웹사이트 또는 딥링크 열기 | `https://apple.com` |
| 단축어 실행 | iOS Shortcuts 단축어 호출 | `내 단축어` |
| 클립보드 복사 | 텍스트를 클립보드에 저장 | `안녕하세요` |
| 알림 표시 | 로컬 푸시 알림 | `작업 완료` |
| 대기 | 지정 시간만큼 대기 | `3` (초) |
| 앱 열기 | URL Scheme으로 앱 실행 | `instagram://` |
| 설정 열기 | iOS 설정 화면 열기 | `wifi`, `bluetooth` |
| 햅틱 피드백 | 진동 피드백 | `light`, `medium`, `heavy` |
| 텍스트 공유 | 공유 시트 표시 | 공유할 텍스트 |
| 텍스트 읽기 | TTS로 텍스트 읽기 | 읽을 문장 |

## 라이선스

MIT License
