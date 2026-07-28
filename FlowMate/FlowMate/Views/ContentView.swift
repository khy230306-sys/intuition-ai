import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: WorkflowStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            WorkflowListView()
                .tabItem {
                    Label("워크플로우", systemImage: "list.bullet.rectangle")
                }
                .tag(0)

            QuickRunView()
                .tabItem {
                    Label("빠른 실행", systemImage: "bolt.fill")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("설정", systemImage: "gearshape")
                }
                .tag(2)
        }
        .tint(.blue)
    }
}

#Preview {
    ContentView()
        .environmentObject(WorkflowStore())
}
