import ExpoModulesCore
import Foundation

public class InstallStateModule: Module {
  public func definition() -> ModuleDefinition {
    Name("InstallState")

    AsyncFunction("read") { () throws -> String? in
      let file = try self.directory().appendingPathComponent("state")
      guard FileManager.default.fileExists(atPath: file.path) else { return nil }
      return try String(contentsOf: file, encoding: .utf8)
    }

    AsyncFunction("write") { (value: String) throws in
      var directory = try self.directory()
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
      try value.write(to: directory.appendingPathComponent("state"), atomically: true, encoding: .utf8)
    }
  }

  private func directory() throws -> URL {
    try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: false
    ).appendingPathComponent("InstallState", isDirectory: true)
  }
}
