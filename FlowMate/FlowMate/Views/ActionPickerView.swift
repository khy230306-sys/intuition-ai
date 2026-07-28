import SwiftUI

struct ActionPickerView: View {
    @Environment(\.dismiss) private var dismiss
    let onSelect: (ActionType) -> Void

    var body: some View {
        NavigationStack {
            List(ActionType.allCases) { type in
                Button {
                    onSelect(type)
                    dismiss()
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: type.icon)
                            .font(.title3)
                            .foregroundStyle(.blue)
                            .frame(width: 32)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(type.displayName)
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Text(type.parameterPlaceholder)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("동작 선택")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    ActionPickerView { _ in }
}
