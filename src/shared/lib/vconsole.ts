type VConsoleConstructor = new () => unknown

type InitVConsoleOptions = {
  isDev: boolean
  search?: string
  loadVConsole: () => Promise<VConsoleConstructor>
}

export function shouldEnableVConsole(isDev: boolean, search = "") {
  if (!isDev) {
    return false
  }

  const params = new URLSearchParams(search)
  return params.get("debug") === "1"
}

export async function initVConsole({
  isDev,
  search = typeof window === "undefined" ? "" : window.location.search,
  loadVConsole,
}: InitVConsoleOptions) {
  if (!shouldEnableVConsole(isDev, search)) {
    return null
  }

  const VConsole = await loadVConsole()
  return new VConsole()
}
