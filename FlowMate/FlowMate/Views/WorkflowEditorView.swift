import SwiftUI

struct WorkflowEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var workflow: AutomationWorkflow
    @State private var showingActionPicker = false

    let onSave: (AutomationWorkflow) -> Void

    private let icons = [
        "bolt.fill", "sun.max.fill", "moon.fill", "star.fill",
        "heart.fill", "flame.fill", "leaf.fill", "paperplane.fill",
        "house.fill", "car.fill", "gamecontroller.fill", "music.note"
    ]

    private let colors = ["blue", "orange", "green", "indigo", "purple", "red", "pink", "teal"]

    init(workflow: AutomationWorkflow, onSave: @escaping (AutomationWorkflow) -> Void) {
        _workflow = State(initialValue: workflow)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("기본 정보") {
                    TextField("이름", text: $workflow.name)
                    TextField("설명", text: $workflow.description, axis: .vertical)
                        .lineLimit(2...4)

                    Picker("아이콘", selection: $workflow.icon) {
                        ForEach(icons, id: \.self) { icon in
                            Label(icon, systemImage: icon).tag(icon)
                        }
                    }

                    Picker("색상", selection: $workflow.color) {
                        ForEach(colors, id: \.self) { color in
                            HStack {
                                Circle()
                                    .fill(Color.named(color))
                                    .frame(width: 16, height: 16)
                                Text(color)
                            }
                            .tag(color)
                        }
                    }
                }

                Section {
                    ForEach($workflow.actions) { $action in
                        ActionEditRow(action: $action)
                    }
                    .onDelete { offsets in
                        workflow.actions.remove(atOffsets: offsets)
                    }
                    .onMove { from, to in
                        workflow.actions.move(fromOffsets: from, toOffset: to)
                    }

                    Button {
                        showingActionPicker = true
                    } label: {
                        Label("동작 추가", systemImage: "plus.circle.fill")
                    }
                } header: {
                    Text("동작 (\(workflow.actions.count)개)")
                } footer: {
                    Text("동작은 위에서 아래 순서로 실행됩니다. 길게 눌러 순서를 변경할 수 있습니다.")
                }
            }
            .navigationTitle(workflow.name.isEmpty ? "새 워크플로우" : workflow.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") {
                        onSave(workflow)
                        dismiss()
                    }
                    .disabled(workflow.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    EditButton()
                }
            }
            .sheet(isPresented: $showingActionPicker) {
                ActionPickerView { type in
                    workflow.actions.append(AutomationAction(type: type))
                }
            }
        }
    }
}

struct ActionEditRow: View {
    @Binding var action: AutomationAction

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: action.type.icon)
                    .foregroundStyle(.blue)
                Text(action.type.displayName)
                    .font(.headline)
            }

            TextField(action.type.parameterLabel, text: $action.parameter, axis: .vertical)
                .textFieldStyle(.roundedBorder)

            if action.type == .showNotification {
                TextField("알림 제목", text: $action.secondaryParameter)
                    .textFieldStyle(.roundedBorder)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    WorkflowEditorView(workflow: AutomationWorkflow.sampleWorkflows[0]) { _ in }
}
