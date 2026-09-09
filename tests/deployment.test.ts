import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

// 用命令替身验证发布控制流，不构建镜像、不修改数据库或启动容器。
it.runIf(process.platform === "win32").each([1, 2, 3, 0])("第 %s 步失败时停止后续发布", (failedStep) => {
  const result = spawnSync("pwsh.exe", ["-NoProfile", "-Command", `
    $script:step = 0
    function global:docker {
      $script:step++
      Write-Output "步骤:$script:step"
      $global:LASTEXITCODE = $(if ($script:step -eq ${failedStep}) { 1 } else { 0 })
    }
    try { & ./scripts/deploy-production.ps1; exit 0 } catch { exit 1 }
  `], { encoding: "utf8" });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(failedStep === 0 ? 0 : 1);
  expect(result.stdout.match(/步骤:/g)?.length).toBe(failedStep || 4);
}, 15000);
