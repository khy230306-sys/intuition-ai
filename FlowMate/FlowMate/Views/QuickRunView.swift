import SwiftUI
import UIKit

struct QuickRunView: View {
    @EnvironmentObject private var store: WorkflowStore
    @State private var runningWorkflow: AutomationWorkflow?

    private let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    quickActionsSection
                    workflowsGrid
                }
                .padding()
            }
            .navigationTitle("빠른 실행")
            .sheet(item: $runningWorkflow) { workflow in
                WorkflowRunnerView(workflow: workflow)
            }
        }
    }

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("원터치 동작")
                .font(.headline)

            LazyVGrid(columns: columns, spacing: 12) {
                QuickActionButton(title: "Wi-Fi 설정", icon: "wifi", color: .blue) {
                    openSettings()
                }
                QuickActionButton(title: "단축어 앱", icon: "command", color: .purple) {
                    ShortcutService.openShortcutsApp()
                }
                QuickActionButton(title: "클립보드", icon: "doc.on.doc", color: .green) {
                    if let text = UIPasteboard.general.string {
                        runningWorkflow = AutomationWorkflow(
                            name: "클립보드 확인",
                            actions: [
                                AutomationAction(type: .showNotification, parameter: text, secondaryParameter: "클립보드")
                            ]
                        )
                    }
                }
                QuickActionButton(title: "방해금지", icon: "moon.fill", color: .indigo) {
                    runningWorkflow = AutomationWorkflow(
                        name: "집중 모드",
                        icon: "moon.fill",
                        color: "indigo",
                        actions: AutomationWorkflow.sampleWorkflows[1].actions
                    )
                }
            }
        }
    }

    private var workflowsGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("워크플로우")
                .font(.headline)

            if store.workflows.isEmpty {
                ContentUnavailableView(
                    "워크플로우 없음",
                    systemImage: "tray",
                    description: Text("워크플로우 탭에서 새 자동화를 만드세요.")
                )
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(store.workflows) { workflow in
                        Button {
                            runningWorkflow = workflow
                        } label: {
                            QuickWorkflowCard(workflow: workflow)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.subheadline.bold())
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, minHeight: 100)
            .background(color.opacity(0.12))
            .foregroundStyle(color)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

struct QuickWorkflowCard: View {
    let workflow: AutomationWorkflow

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: workflow.icon)
                .font(.title2)
                .foregroundStyle(Color.named(workflow.color))

            Text(workflow.name)
                .font(.subheadline.bold())
                .foregroundStyle(.primary)
                .lineLimit(2)

            Text("\(workflow.actionCount)단계")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 110, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    QuickRunView()
        .environmentObject(WorkflowStore())
}
