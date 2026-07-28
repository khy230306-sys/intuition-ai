import SwiftUI

struct WorkflowListView: View {
    @EnvironmentObject private var store: WorkflowStore
    @State private var showingEditor = false
    @State private var editingWorkflow: AutomationWorkflow?
    @State private var runningWorkflow: AutomationWorkflow?

    private var favorites: [AutomationWorkflow] {
        store.workflows.filter(\.isFavorite)
    }

    private var others: [AutomationWorkflow] {
        store.workflows.filter { !$0.isFavorite }
    }

    var body: some View {
        NavigationStack {
            List {
                if !favorites.isEmpty {
                    Section("즐겨찾기") {
                        ForEach(favorites) { workflow in
                            workflowRow(workflow)
                        }
                    }
                }

                Section("모든 워크플로우") {
                    ForEach(others) { workflow in
                        workflowRow(workflow)
                    }
                    .onDelete(perform: store.delete)
                }
            }
            .navigationTitle("FlowMate")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editingWorkflow = AutomationWorkflow(name: "새 워크플로우")
                        showingEditor = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingEditor) {
                if let workflow = editingWorkflow {
                    WorkflowEditorView(workflow: workflow) { saved in
                        if store.workflows.contains(where: { $0.id == saved.id }) {
                            store.update(saved)
                        } else {
                            store.add(saved)
                        }
                    }
                }
            }
            .sheet(item: $runningWorkflow) { workflow in
                WorkflowRunnerView(workflow: workflow)
            }
        }
    }

    @ViewBuilder
    private func workflowRow(_ workflow: AutomationWorkflow) -> some View {
        WorkflowRowView(workflow: workflow)
            .contentShape(Rectangle())
            .onTapGesture {
                runningWorkflow = workflow
            }
            .swipeActions(edge: .leading) {
                Button {
                    store.toggleFavorite(workflow)
                } label: {
                    Label(
                        workflow.isFavorite ? "해제" : "즐겨찾기",
                        systemImage: workflow.isFavorite ? "star.slash" : "star.fill"
                    )
                }
                .tint(.yellow)
            }
            .swipeActions(edge: .trailing) {
                Button {
                    store.duplicate(workflow)
                } label: {
                    Label("복제", systemImage: "doc.on.doc")
                }
                .tint(.blue)

                Button {
                    editingWorkflow = workflow
                    showingEditor = true
                } label: {
                    Label("편집", systemImage: "pencil")
                }
                .tint(.orange)
            }
            .contextMenu {
                Button("실행") { runningWorkflow = workflow }
                Button("편집") {
                    editingWorkflow = workflow
                    showingEditor = true
                }
                Button("복제") { store.duplicate(workflow) }
                Button(workflow.isFavorite ? "즐겨찾기 해제" : "즐겨찾기") {
                    store.toggleFavorite(workflow)
                }
                Button("삭제", role: .destructive) {
                    store.delete(workflow)
                }
            }
    }
}

struct WorkflowRowView: View {
    let workflow: AutomationWorkflow

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.named(workflow.color).opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: workflow.icon)
                    .font(.title3)
                    .foregroundStyle(Color.named(workflow.color))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(workflow.name)
                        .font(.headline)
                    if workflow.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.caption)
                            .foregroundStyle(.yellow)
                    }
                }

                if !workflow.description.isEmpty {
                    Text(workflow.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 8) {
                    Label("\(workflow.actionCount)단계", systemImage: "arrow.right.circle")
                    Text("·")
                    Text(workflow.estimatedDuration)
                    if workflow.runCount > 0 {
                        Text("·")
                        Text("\(workflow.runCount)회 실행")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "play.circle.fill")
                .font(.title2)
                .foregroundStyle(Color.named(workflow.color))
        }
        .padding(.vertical, 4)
    }
}

extension Color {
    static func named(_ name: String) -> Color {
        switch name {
        case "orange": return .orange
        case "green": return .green
        case "indigo": return .indigo
        case "purple": return .purple
        case "red": return .red
        case "pink": return .pink
        case "teal": return .teal
        default: return .blue
        }
    }
}

#Preview {
    WorkflowListView()
        .environmentObject(WorkflowStore())
}
