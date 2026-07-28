import SwiftUI

struct WorkflowRunnerView: View {
    @EnvironmentObject private var store: WorkflowStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var engine = AutomationEngine()

    let workflow: AutomationWorkflow

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                if engine.stepResults.isEmpty {
                    readyState
                } else {
                    stepList
                }

                bottomBar
            }
            .navigationTitle("실행")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
                }
            }
        }
        .interactiveDismissDisabled(engine.isRunning)
    }

    private var header: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.named(workflow.color).opacity(0.15))
                    .frame(width: 72, height: 72)
                Image(systemName: workflow.icon)
                    .font(.largeTitle)
                    .foregroundStyle(Color.named(workflow.color))
            }

            Text(workflow.name)
                .font(.title2.bold())

            if !workflow.description.isEmpty {
                Text(workflow.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if let message = engine.lastMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(engine.isRunning ? .secondary : .green)
                    .padding(.top, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
    }

    private var readyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "play.circle")
                .font(.system(size: 64))
                .foregroundStyle(Color.named(workflow.color))
            Text("\(workflow.actionCount)개 동작 · \(workflow.estimatedDuration)")
                .foregroundStyle(.secondary)
            Spacer()
        }
    }

    private var stepList: some View {
        List {
            ForEach(Array(engine.stepResults.enumerated()), id: \.element.id) { index, result in
                HStack(spacing: 12) {
                    statusIcon(for: result.status, isCurrent: engine.currentStepIndex == index)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(result.action.type.displayName)
                            .font(.headline)
                        Text(result.action.summary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.plain)
    }

    private var bottomBar: some View {
        VStack(spacing: 12) {
            if engine.isRunning {
                ProgressView("실행 중...")
                    .padding(.top, 8)
            }

            Button {
                Task {
                    await engine.run(workflow: workflow)
                    store.recordRun(for: workflow.id)
                }
            } label: {
                Label(engine.isRunning ? "실행 중..." : "워크플로우 실행", systemImage: "play.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(engine.isRunning ? Color.gray : Color.named(workflow.color))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(engine.isRunning || workflow.actions.isEmpty)
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private func statusIcon(for status: AutomationStepStatus, isCurrent: Bool) -> some View {
        switch status {
        case .pending:
            Image(systemName: isCurrent ? "arrow.right.circle" : "circle")
                .foregroundStyle(isCurrent ? .blue : .secondary)
        case .running:
            ProgressView()
                .frame(width: 24, height: 24)
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(.red)
        }
    }
}

#Preview {
    WorkflowRunnerView(workflow: AutomationWorkflow.sampleWorkflows[0])
        .environmentObject(WorkflowStore())
}
