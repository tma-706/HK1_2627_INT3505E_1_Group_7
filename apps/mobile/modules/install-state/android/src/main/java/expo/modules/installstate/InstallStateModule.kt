package expo.modules.installstate

import android.util.AtomicFile
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileNotFoundException

class InstallStateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("InstallState")

    AsyncFunction("read") {
      val file = stateFile()
      try {
        String(file.readFully(), Charsets.UTF_8)
      } catch (error: FileNotFoundException) {
        if (file.baseFile.exists()) throw error
        null
      }
    }

    AsyncFunction("write") { value: String ->
      val file = stateFile()
      val output = file.startWrite()
      try {
        output.write(value.toByteArray(Charsets.UTF_8))
        file.finishWrite(output)
      } catch (error: Exception) {
        file.failWrite(output)
        throw error
      }
    }
  }

  private fun stateFile(): AtomicFile {
    val context = checkNotNull(appContext.reactContext)
    return AtomicFile(File(context.noBackupFilesDir, "lost-found-install-state"))
  }
}
