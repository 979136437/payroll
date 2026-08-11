import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const ESLINT_CONFIG_TEST_TIMEOUT_MS = 60_000;

describe("eslint flat config", () => {
  const legacyConfigPath = path.resolve(process.cwd(), ".eslintrc.json");
  const eslint = new ESLint();

  test("does not keep legacy eslintrc beside eslint.config.mjs", () => {
    expect(fs.existsSync(legacyConfigPath)).toBe(false);
  });

  test("can calculate config for workspace files", async () => {
    const configs = await Promise.all([
      eslint.calculateConfigForFile("src/app/page.tsx"),
      eslint.calculateConfigForFile("eslint.config.mjs"),
    ]);

    expect(configs.every(Boolean)).toBe(true);
  }, ESLINT_CONFIG_TEST_TIMEOUT_MS);

  test("allows intentional client-side sync effects used by app pages", async () => {
    const config = await eslint.calculateConfigForFile("src/app/page.tsx");
    const ruleLevel = Array.isArray(config.rules["react-hooks/set-state-in-effect"])
      ? config.rules["react-hooks/set-state-in-effect"][0]
      : config.rules["react-hooks/set-state-in-effect"];

    expect(ruleLevel).toBe(0);
  }, ESLINT_CONFIG_TEST_TIMEOUT_MS);
});
