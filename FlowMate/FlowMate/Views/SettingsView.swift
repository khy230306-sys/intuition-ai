import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: WorkflowStore
    @State private var showingResetAlert = false

    var body: some View {
        NavigationStack {
            List {
                Section("앱 정보") {
                    LabeledContent("앱 이름", value: "FlowMate")
                    LabeledContent("버전", value: "1.0.0")
                    LabeledContent("워크플로우", value: "\(store.workflows.count)개")
                }

                Section {
                    Link(destination: URL(string: "shortcuts://")!) {
                        Label("단축어 앱 열기", systemImage: "command")
                    }
                } header: {
                    Text("iOS 단축어 연동")
                } footer: {
                    Text("FlowMate는 iOS 단축어 앱과 함께 사용하면 더 강력해집니다. '단축어 실행' 동작으로 기존 단축어를 워크플로우에 연결하세요.")
                }

                Section("지원 동작") {
                    ForEach(ActionType.allCases) { type in
                        HStack {
                            Image(systemName: type.icon)
                                .foregroundStyle(.blue)
                                .frame(width: 24)
                            Text(type.displayName)
                        }
                    }
                }

                Section("iOS 자동화 안내") {
                    InfoRow(
                        icon: "lock.shield",
                        title: "보안 제한",
                        description: "iOS는 다른 앱을 직접 제어하지 못하도록 제한합니다. FlowMate는 허용된 API와 단축어 연동으로 자동화합니다."
                    )
                    InfoRow(
                        icon: "clock.arrow.circlepath",
                        title: "백그라운드 실행",
                        description: "앱이 열려 있을 때 워크플로우가 가장 안정적으로 실행됩니다."
                    )
                    InfoRow(
                        icon: "mic",
                        title: "Siri 연동",
                        description: "단축어 앱에서 FlowMate 워크플로우를 Siri에 추가할 수 있습니다."
                    )
                }

                Section {
                    Button("샘플 워크플로우로 초기화", role: .destructive) {
                        showingResetAlert = true
                    }
                }
            }
            .navigationTitle("설정")
            .alert("초기화하시겠습니까?", isPresented: $showingResetAlert) {
                Button("취소", role: .cancel) {}
                Button("초기화", role: .destructive) {
                    store.resetToSamples()
                }
            } message: {
                Text("모든 워크플로우가 샘플 데이터로 교체됩니다.")
            }
        }
    }
}

struct InfoRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.subheadline.bold())
            Text(description)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    SettingsView()
        .environmentObject(WorkflowStore())
}
