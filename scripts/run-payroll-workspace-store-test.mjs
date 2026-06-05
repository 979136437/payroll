import { createServer } from "vite"

const server = await createServer({
  appType: "custom",
  server: {
    middlewareMode: true,
  },
})

try {
  await server.ssrLoadModule("/tests/formatters.test.ts")
  await server.ssrLoadModule("/tests/vconsole.test.ts")
  await server.ssrLoadModule(
    "/tests/payroll-workspace-store.test.ts",
  )
  await server.ssrLoadModule(
    "/tests/personnel-management-store.test.ts",
  )
} finally {
  await server.close()
}
