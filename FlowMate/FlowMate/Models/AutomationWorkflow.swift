import Foundation

struct AutomationWorkflow: Identifiable, Codable, Equatable, Hashable {
    var id: UUID
    var name: String
    var description: String
    var icon: String
    var color: String
    var actions: [AutomationAction]
    var isFavorite: Bool
    var createdAt: Date
    var lastRunAt: Date?
    var runCount: Int

    init(
        id: UUID = UUID(),
        name: String,
        description: String = "",
        icon: String = "bolt.fill",
        color: String = "blue",
        actions: [AutomationAction] = [],
        isFavorite: Bool = false,
        createdAt: Date = Date(),
        lastRunAt: Date? = nil,
        runCount: Int = 0
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.color = color
        self.actions = actions
        self.isFavorite = isFavorite
        self.createdAt = createdAt
        self.lastRunAt = lastRunAt
        self.runCount = runCount
    }

    var actionCount: Int { actions.count }

    var estimatedDuration: String {
        let waitSeconds = actions
            .filter { $0.type == .wait }
            .compactMap { Double($0.parameter) }
            .reduce(0, +)
        let baseSeconds = Double(actions.count) * 0.5
        let total = waitSeconds + baseSeconds
        if total < 1 { return "1초 미만" }
        if total < 60 { return "약 \(Int(total))초" }
        return "약 \(Int(total / 60))분"
    }
}

extension AutomationWorkflow {
    static let sampleWorkflows: [AutomationWorkflow] = [
        AutomationWorkflow(
            name: "아침 루틴",
            description: "날씨 확인 후 캘린더 앱을 엽니다",
            icon: "sun.max.fill",
            color: "orange",
            actions: [
                AutomationAction(type: .showNotification, parameter: "좋은 아침입니다!", secondaryParameter: "아침 루틴"),
                AutomationAction(type: .wait, parameter: "1"),
                AutomationAction(type: .openURL, parameter: "https://weather.com"),
                AutomationAction(type: .wait, parameter: "2"),
                AutomationAction(type: .openApp, parameter: "calshow://")
            ],
            isFavorite: true
        ),
        AutomationWorkflow(
            name: "집중 모드",
            description: "방해금지 설정을 열고 알림을 표시합니다",
            icon: "moon.fill",
            color: "indigo",
            actions: [
                AutomationAction(type: .hapticFeedback, parameter: "medium"),
                AutomationAction(type: .showNotification, parameter: "집중 모드를 시작합니다", secondaryParameter: "집중 모드"),
                AutomationAction(type: .openSettings, parameter: "focus")
            ]
        ),
        AutomationWorkflow(
            name: "빠른 공유",
            description: "텍스트를 복사하고 공유 시트를 엽니다",
            icon: "square.and.arrow.up.fill",
            color: "green",
            actions: [
                AutomationAction(type: .copyToClipboard, parameter: "FlowMate에서 공유된 텍스트"),
                AutomationAction(type: .hapticFeedback, parameter: "light"),
                AutomationAction(type: .shareText, parameter: "FlowMate에서 공유된 텍스트")
            ]
        )
    ]
}
