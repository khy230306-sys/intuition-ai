import Foundation
import Combine

@MainActor
final class WorkflowStore: ObservableObject {
    @Published private(set) var workflows: [AutomationWorkflow] = []
    @Published var lastError: String?

    private let storageKey = "flowmate.workflows"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        load()
    }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            workflows = AutomationWorkflow.sampleWorkflows
            save()
            return
        }

        do {
            workflows = try decoder.decode([AutomationWorkflow].self, from: data)
        } catch {
            lastError = "워크플로우를 불러오지 못했습니다."
            workflows = AutomationWorkflow.sampleWorkflows
        }
    }

    func save() {
        do {
            let data = try encoder.encode(workflows)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            lastError = "워크플로우를 저장하지 못했습니다."
        }
    }

    func add(_ workflow: AutomationWorkflow) {
        workflows.insert(workflow, at: 0)
        save()
    }

    func update(_ workflow: AutomationWorkflow) {
        guard let index = workflows.firstIndex(where: { $0.id == workflow.id }) else { return }
        workflows[index] = workflow
        save()
    }

    func delete(at offsets: IndexSet) {
        workflows.remove(atOffsets: offsets)
        save()
    }

    func delete(_ workflow: AutomationWorkflow) {
        workflows.removeAll { $0.id == workflow.id }
        save()
    }

    func toggleFavorite(_ workflow: AutomationWorkflow) {
        guard var updated = workflows.first(where: { $0.id == workflow.id }) else { return }
        updated.isFavorite.toggle()
        update(updated)
    }

    func recordRun(for workflowID: UUID) {
        guard var workflow = workflows.first(where: { $0.id == workflowID }) else { return }
        workflow.lastRunAt = Date()
        workflow.runCount += 1
        update(workflow)
    }

    func duplicate(_ workflow: AutomationWorkflow) {
        var copy = workflow
        copy.id = UUID()
        copy.name = "\(workflow.name) 복사본"
        copy.createdAt = Date()
        copy.lastRunAt = nil
        copy.runCount = 0
        copy.actions = workflow.actions.map { action in
            var newAction = action
            newAction.id = UUID()
            return newAction
        }
        add(copy)
    }

    func resetToSamples() {
        workflows = AutomationWorkflow.sampleWorkflows
        save()
    }
}
