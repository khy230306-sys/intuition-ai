import Foundation

enum ActionType: String, Codable, CaseIterable, Identifiable {
    case openURL
    case runShortcut
    case copyToClipboard
    case showNotification
    case wait
    case openApp
    case openSettings
    case hapticFeedback
    case shareText
    case speakText

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .openURL: return "URL 열기"
        case .runShortcut: return "단축어 실행"
        case .copyToClipboard: return "클립보드 복사"
        case .showNotification: return "알림 표시"
        case .wait: return "대기"
        case .openApp: return "앱 열기"
        case .openSettings: return "설정 열기"
        case .hapticFeedback: return "햅틱 피드백"
        case .shareText: return "텍스트 공유"
        case .speakText: return "텍스트 읽기"
        }
    }

    var icon: String {
        switch self {
        case .openURL: return "safari"
        case .runShortcut: return "command"
        case .copyToClipboard: return "doc.on.doc"
        case .showNotification: return "bell"
        case .wait: return "clock"
        case .openApp: return "app"
        case .openSettings: return "gearshape"
        case .hapticFeedback: return "waveform"
        case .shareText: return "square.and.arrow.up"
        case .speakText: return "speaker.wave.2"
        }
    }

    var parameterLabel: String {
        switch self {
        case .openURL: return "URL"
        case .runShortcut: return "단축어 이름"
        case .copyToClipboard, .shareText, .speakText: return "텍스트"
        case .showNotification: return "알림 메시지"
        case .wait: return "대기 시간 (초)"
        case .openApp: return "앱 URL Scheme"
        case .openSettings: return "설정 항목"
        case .hapticFeedback: return "강도 (light/medium/heavy)"
        }
    }

    var parameterPlaceholder: String {
        switch self {
        case .openURL: return "https://apple.com"
        case .runShortcut: return "내 단축어"
        case .copyToClipboard, .shareText: return "복사할 텍스트"
        case .showNotification: return "알림 내용"
        case .wait: return "2"
        case .openApp: return "instagram://"
        case .openSettings: return "wifi / bluetooth / privacy"
        case .hapticFeedback: return "medium"
        case .speakText: return "읽을 텍스트"
        }
    }
}

struct AutomationAction: Identifiable, Codable, Equatable, Hashable {
    var id: UUID
    var type: ActionType
    var parameter: String
    var secondaryParameter: String

    init(
        id: UUID = UUID(),
        type: ActionType,
        parameter: String = "",
        secondaryParameter: String = ""
    ) {
        self.id = id
        self.type = type
        self.parameter = parameter
        self.secondaryParameter = secondaryParameter
    }

    var summary: String {
        let value = parameter.isEmpty ? "(미설정)" : parameter
        switch type {
        case .wait:
            return "\(type.displayName): \(value)초"
        case .showNotification:
            let title = secondaryParameter.isEmpty ? "알림" : secondaryParameter
            return "\(title) — \(value)"
        default:
            return "\(type.displayName): \(value)"
        }
    }
}
