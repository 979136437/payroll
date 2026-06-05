import { readFile, writeFile } from "node:fs/promises"

const packageJsonPath = new URL("../package.json", import.meta.url)
const tauriConfigPath = new URL("../src-tauri/tauri.conf.json", import.meta.url)

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"))

tauriConfig.version = packageJson.version

await writeFile(
  tauriConfigPath,
  `${JSON.stringify(tauriConfig, null, 2)}\n`,
)
