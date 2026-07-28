import Foundation
import UIKit

enum ShortcutService {
  static func runShortcut(named name: String) -> Bool {
    guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }

    let encodedName = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
    guard let url = URL(string: "shortcuts://run-shortcut?name=\(encodedName)") else { return false }

    UIApplication.shared.open(url)
    return true
  }

  static func openShortcutsApp() {
    if let url = URL(string: "shortcuts://") {
      UIApplication.shared.open(url)
    }
  }

  static func createShortcutImportURL(for workflow: AutomationWorkflow) -> URL? {
    // Users can manually recreate workflows in Shortcuts app.
    // This opens Shortcuts so they can build matching automations.
    return URL(string: "shortcuts://create-shortcut")
  }
}
