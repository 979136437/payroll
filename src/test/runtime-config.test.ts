import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  packageManager?: string;
  scripts?: {
    preinstall?: string;
  };
  volta?: {
    node?: string;
    pnpm?: string;
  };
  engines?: {
    node?: string;
  };
};

function readWorkspaceFile(fileName: string) {
  return fs.readFileSync(path.join(process.cwd(), fileName), "utf8");
}

function isNodeVersionAllowed(range: string, version: string) {
  const [major, minor] = version.split(".").map((value) => Number.parseInt(value, 10));

  if (range === "^20.19.0 || ^22.12.0 || >=24.0.0") {
    return (
      (major === 20 && minor >= 19) ||
      (major === 22 && minor >= 12) ||
      major >= 24
    );
  }

  return false;
}

describe("runtime config", () => {
  test("pins the preferred Node.js version across Volta and Docker", () => {
    const packageJson = JSON.parse(
      readWorkspaceFile("package.json")
    ) as PackageJson;
    const dockerfile = readWorkspaceFile("Dockerfile");

    expect(packageJson.volta?.node).toBeTruthy();
    expect(dockerfile).toContain(`FROM node:${packageJson.volta?.node}-alpine AS deps`);
    expect(dockerfile).toContain(`FROM node:${packageJson.volta?.node}-alpine AS builder`);
    expect(dockerfile).toContain(`FROM node:${packageJson.volta?.node}-alpine AS runner`);
  });

  test("copies Node.js runtime guard files before dependency installation in Docker", () => {
    const dockerfile = readWorkspaceFile("Dockerfile");

    expect(dockerfile).toContain(
      "COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./"
    );
    expect(dockerfile).toContain("COPY scripts/check-node-version.mjs ./scripts/check-node-version.mjs");
    expect(dockerfile).toContain("RUN pnpm install --frozen-lockfile");
    expect(
      dockerfile.indexOf("COPY scripts/check-node-version.mjs ./scripts/check-node-version.mjs")
    ).toBeLessThan(dockerfile.indexOf("RUN pnpm install"));
  });

  test("rejects dependency installation on the wrong Node.js version", () => {
    const packageJson = JSON.parse(
      readWorkspaceFile("package.json")
    ) as PackageJson;
    const npmrc = readWorkspaceFile(".npmrc");

    expect(npmrc).toMatch(/engine-strict\s*=\s*true/i);
    expect(packageJson.scripts?.preinstall).toBe("node ./scripts/check-node-version.mjs");
  });

  test("hardens pnpm dependency resolution", () => {
    const workspaceConfig = readWorkspaceFile("pnpm-workspace.yaml");

    expect(workspaceConfig).toMatch(/minimumReleaseAge:\s*10080/);
    expect(workspaceConfig).toMatch(/trustPolicy:\s*no-downgrade/);
    expect(workspaceConfig).toMatch(
      /trustPolicyExclude:[\s\S]*eslint-import-resolver-typescript@3\.10\.1/
    );
    expect(workspaceConfig).toMatch(/blockExoticSubdeps:\s*true/);
  });

  test("allows supported Node.js release lines while keeping Volta pinned", () => {
    const packageJson = JSON.parse(
      readWorkspaceFile("package.json")
    ) as PackageJson;
    const versionGuardScript = readWorkspaceFile("scripts/check-node-version.mjs");

    expect(packageJson.volta?.node).toBe("22.23.1");
    expect(packageJson.volta?.pnpm).toBe("10.34.4");
    expect(packageJson.packageManager).toBe(`pnpm@${packageJson.volta?.pnpm}`);
    expect(packageJson.engines?.node).toBe("^20.19.0 || ^22.12.0 || >=24.0.0");
    expect(isNodeVersionAllowed(packageJson.engines?.node ?? "", "20.20.2")).toBe(true);
    expect(isNodeVersionAllowed(packageJson.engines?.node ?? "", "22.23.1")).toBe(true);
    expect(isNodeVersionAllowed(packageJson.engines?.node ?? "", "18.20.8")).toBe(false);
    expect(versionGuardScript).toContain("satisfiesSupportedNodeRange");
  });
});
