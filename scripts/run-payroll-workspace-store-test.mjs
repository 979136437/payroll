import { createServer } from "vite"

const server = await createServer({
  appType: "custom",
  server: {
    middlewareMode: true,
  },
})

try {
  await server.ssrLoadModule(
    "/tests/payroll-workspace-store.test.ts",
  )
} finally {
  await server.close()
}
