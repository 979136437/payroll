import assert from "node:assert/strict"

import {
  maskSensitiveValue,
} from "@/shared/lib/formatters"

function runTest(name: string, testFn: () => void) {
  try {
    testFn()
    process.stdout.write(`PASS ${name}\n`)
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`)
    throw error
  }
}

function main() {
  runTest("maskSensitiveValue returns dash for empty value", () => {
    assert.equal(maskSensitiveValue(null), "-")
  })

  runTest("maskSensitiveValue keeps short values unchanged", () => {
    assert.equal(maskSensitiveValue("1234567"), "1234567")
  })

  runTest("maskSensitiveValue shortens long values to at most four stars", () => {
    assert.equal(maskSensitiveValue("430623197201192213"), "430****2213")
    assert.equal(maskSensitiveValue("6236683520010069982"), "623****9982")
  })
}

main()
