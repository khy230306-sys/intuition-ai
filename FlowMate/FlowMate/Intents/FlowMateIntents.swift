import AppIntents
import Foundation

struct RunWorkflowIntent: AppIntent {
    static var title: LocalizedStringResource = "워크플로우 실행"
    static var description = IntentDescription("FlowMate 워크플로우를 실행합니다.")

    @Parameter(title: "워크플로우 이름")
    var workflowName: String

    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let store = WorkflowStore()
        guard let workflow = store.workflows.first(where: {
            $0.name.localizedCaseInsensitiveCompare(workflowName) == .orderedSame
        }) else {
            return .result(dialog: "'\(workflowName)' 워크플로우를 찾을 수 없습니다.")
        }

        let engine = AutomationEngine()
        await engine.run(workflow: workflow)
        store.recordRun(for: workflow.id)

        return .result(dialog: "'\(workflow.name)' 워크플로우를 실행했습니다.")
    }
}

struct ListWorkflowsIntent: AppIntent {
    static var title: LocalizedStringResource = "워크플로우 목록"
    static var description = IntentDescription("저장된 FlowMate 워크플로우 목록을 반환합니다.")

    func perform() async throws -> some IntentResult & ReturnsValue<[String]> {
        let store = WorkflowStore()
        let names = store.workflows.map(\.name)
        return .result(value: names)
    }
}

struct FlowMateShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RunWorkflowIntent(),
            phrases: [
                "FlowMate에서 \(.applicationName) 워크플로우 실행",
                "\(.applicationName) 자동화 실행"
            ],
            shortTitle: "워크플로우 실행",
            systemImageName: "bolt.fill"
        )
    }
}
