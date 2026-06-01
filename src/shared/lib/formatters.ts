export function readableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  return fallback
}

export function formatTimestamp(value: string) {
  const timestamp = Number(value)
  if (Number.isNaN(timestamp) || timestamp <= 0) {
    return "刚刚"
  }

  return new Date(timestamp * 1000).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCurrencyInput(value: number) {
  return value === 0 ? "0" : String(value)
}

export function maskSensitiveValue(value: string | null) {
  if (!value) {
    return "-"
  }

  if (value.length <= 7) {
    return value
  }

  return `${value.slice(0, 3)}${"*".repeat(Math.min(4, Math.max(1, value.length - 7)))}${value.slice(-4)}`
}
