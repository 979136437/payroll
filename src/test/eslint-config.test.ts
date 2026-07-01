import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

describe("eslint flat config", () => {
  const legacyConfigPath = path.resolve(process.cwd(), ".eslintrc.json");

  test("does not keep legacy eslintrc beside eslint.config.mjs", () => {
    expect(fs.existsSync(legacyConfigPath)).toBe(false);
  });

  test("can calculate config for workspace files", async () => {
    const eslint = new ESLint();

    await expect(eslint.calculateConfigForFile("src/app/page.tsx")).resolves.toBeTruthy();
    await expect(eslint.calculateConfigForFile("eslint.config.mjs")).resolves.toBeTruthy();
  });

  test("allows intentional client-side sync effects used by app pages", async () => {
    const eslint = new ESLint();
    const config = await eslint.calculateConfigForFile("src/app/page.tsx");
    const ruleLevel = Array.isArray(config.rules["react-hooks/set-state-in-effect"])
      ? config.rules["react-hooks/set-state-in-effect"][0]
      : config.rules["react-hooks/set-state-in-effect"];

    expect(ruleLevel).toBe(0);
  });
});
