import SwiftUI

@main
struct FlowMateApp: App {
    @StateObject private var workflowStore = WorkflowStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workflowStore)
        }
    }
}
