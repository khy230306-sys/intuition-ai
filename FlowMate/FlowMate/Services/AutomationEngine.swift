import Foundation
import UIKit
import UserNotifications
import AVFoundation

enum AutomationStepStatus: Equatable {
    case pending
    case running
    case completed
    case failed(String)
}

struct AutomationStepResult: Identifiable, Equatable {
    let id: UUID
    let action: AutomationAction
    var status: AutomationStepStatus

    init(action: AutomationAction, status: AutomationStepStatus = .pending) {
        self.id = action.id
        self.action = action
        self.status = status
    }
}

@MainActor
final class AutomationEngine: ObservableObject {
    @Published var stepResults: [AutomationStepResult] = []
    @Published var isRunning = false
    @Published var currentStepIndex: Int?
    @Published var lastMessage: String?

    private let synthesizer = AVSpeechSynthesizer()

    func run(workflow: AutomationWorkflow) async {
        guard !isRunning else { return }

        isRunning = true
        stepResults = workflow.actions.map { AutomationStepResult(action: $0) }
        lastMessage = nil

        for index in workflow.actions.indices {
            currentStepIndex = index
            stepResults[index].status = .running

            let action = workflow.actions[index]
            let success = await execute(action)

            if success {
                stepResults[index].status = .completed
            } else {
                let message = "\(action.type.displayName) 실행 실패"
                stepResults[index].status = .failed(message)
                lastMessage = message
                break
            }
        }

        currentStepIndex = nil
        isRunning = false

        if lastMessage == nil {
            lastMessage = "'\(workflow.name)' 완료"
        }
    }

    func reset() {
        stepResults = []
        isRunning = false
        currentStepIndex = nil
        lastMessage = nil
    }

    private func execute(_ action: AutomationAction) async -> Bool {
        switch action.type {
        case .openURL:
            return openURL(action.parameter)
        case .runShortcut:
            return ShortcutService.runShortcut(named: action.parameter)
        case .copyToClipboard:
            UIPasteboard.general.string = action.parameter
            return true
        case .showNotification:
            return await showNotification(
                title: action.secondaryParameter.isEmpty ? "FlowMate" : action.secondaryParameter,
                body: action.parameter
            )
        case .wait:
            let seconds = Double(action.parameter) ?? 1
            let nanoseconds = UInt64(max(0, seconds) * 1_000_000_000)
            try? await Task.sleep(nanoseconds: nanoseconds)
            return true
        case .openApp:
            return openURL(action.parameter)
        case .openSettings:
            return openSettings(action.parameter)
        case .hapticFeedback:
            triggerHaptic(action.parameter)
            return true
        case .shareText:
            return shareText(action.parameter)
        case .speakText:
            speak(action.parameter)
            return true
        }
    }

    private func openURL(_ string: String) -> Bool {
        var urlString = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if urlString.hasPrefix("http://") == false && urlString.hasPrefix("https://") == false && urlString.contains("://") == false {
            urlString = "https://\(urlString)"
        }

        guard let url = URL(string: urlString) else { return false }
        UIApplication.shared.open(url)
        return true
    }

    private func openSettings(_ setting: String) -> Bool {
        let key = setting.lowercased()
        let urlString: String

        switch key {
        case "wifi", "wi-fi":
            urlString = "App-Prefs:root=WIFI"
        case "bluetooth":
            urlString = "App-Prefs:root=Bluetooth"
        case "privacy":
            urlString = UIApplication.openSettingsURLString
        case "focus", "dnd", "방해금지":
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
                return true
            }
            return false
        default:
            urlString = UIApplication.openSettingsURLString
        }

        guard let url = URL(string: urlString) else {
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
                return true
            }
            return false
        }

        UIApplication.shared.open(url)
        return true
    }

    private func triggerHaptic(_ intensity: String) {
        let generator: UIImpactFeedbackGenerator
        switch intensity.lowercased() {
        case "light", "약":
            generator = UIImpactFeedbackGenerator(style: .light)
        case "heavy", "강":
            generator = UIImpactFeedbackGenerator(style: .heavy)
        default:
            generator = UIImpactFeedbackGenerator(style: .medium)
        }
        generator.impactOccurred()
    }

    private func showNotification(title: String, body: String) async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        guard granted == true else { return false }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)
        )

        do {
            try await center.add(request)
            return true
        } catch {
            return false
        }
    }

    private func shareText(_ text: String) -> Bool {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first?.rootViewController else {
            return false
        }

        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        var presenter = root
        while let presented = presenter.presentedViewController {
            presenter = presented
        }

        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }

        presenter.present(activityVC, animated: true)
        return true
    }

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "ko-KR")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)
    }
}
