import assert from "node:assert/strict"

import {
  initVConsole,
  shouldEnableVConsole,
} from "@/shared/lib/vconsole"

async function runTest(name: string, testFn: () => Promise<void> | void) {
  try {
    await testFn()
    process.stdout.write(`PASS ${name}\n`)
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`)
    throw error
  }
}

async function main() {
  await runTest("shouldEnableVConsole returns false outside dev", () => {
    assert.equal(shouldEnableVConsole(false, "?debug=1"), false)
  })

  await runTest("shouldEnableVConsole returns false without debug flag", () => {
    assert.equal(shouldEnableVConsole(true, ""), false)
  })

  await runTest("shouldEnableVConsole returns true in dev with debug flag", () => {
    assert.equal(shouldEnableVConsole(true, "?debug=1"), true)
  })

  await runTest("initVConsole skips loading when disabled", async () => {
    let didLoad = false

    await initVConsole({
      isDev: false,
      loadVConsole: async () => {
        didLoad = true
        return class MockVConsole {}
      },
    })

    assert.equal(didLoad, false)
  })

  await runTest("initVConsole loads and constructs once when enabled", async () => {
    let constructCount = 0

    await initVConsole({
      isDev: true,
      search: "?debug=1",
      loadVConsole: async () =>
        class MockVConsole {
          constructor() {
            constructCount += 1
          }
        },
    })

    assert.equal(constructCount, 1)
  })
}

void main()
