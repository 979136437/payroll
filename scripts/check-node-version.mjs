import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const packageJsonPath = path.join(process.cwd(), "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const expectedVersion = packageJson?.engines?.node;
const currentVersion = process.versions.node;

function satisfiesSupportedNodeRange(version) {
  const [majorPart, minorPart = "0"] = version.split(".");
  const major = Number.parseInt(majorPart, 10);
  const minor = Number.parseInt(minorPart, 10);

  if (Number.isNaN(major) || Number.isNaN(minor)) {
    return false;
  }

  if (major === 20) {
    return minor >= 19;
  }

  if (major === 22) {
    return minor >= 12;
  }

  return major >= 24;
}

if (!expectedVersion) {
  process.exit(0);
}

if (!satisfiesSupportedNodeRange(currentVersion)) {
  console.error(
    `Node.js 版本不匹配：当前为 ${currentVersion}，项目要求 ${expectedVersion}。推荐使用 Volta 固定到 ${packageJson?.volta?.node ?? "22.23.1"}，或切换到受支持的 Node 版本后再安装依赖。`
  );
  process.exit(1);
}
