// lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error" | "log"

interface LogEntry {
  level: LogLevel
  timestamp: string
  message: string
  context?: Record<string, unknown>
  durationMs?: number
}

class Logger {
  private minLevel: number
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    log: 2,
    warn: 3,
    error: 4,
  }

  constructor(defaultLevel: LogLevel = "info") {
    this.minLevel = this.levels[defaultLevel]
    if (process.env.NODE_ENV === "development") {
      this.minLevel = this.levels.debug // Log everything in development
    } else if (process.env.NODE_ENV === "production") {
      this.minLevel = this.levels.info // Only info, warn, error in production
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.minLevel
  }

  private formatMessage(message: string, context?: Record<string, unknown>): string {
    let formatted = `[${new Date().toISOString()}] ${message}`
    if (context) {
      try {
        const sanitizedContext = this.sanitizeContext(context)
        formatted += ` ${JSON.stringify(sanitizedContext)}`
      } catch (e) {
        formatted += ` [Context serialization error: ${(e as Error).message}]`
      }
    }
    return formatted
  }

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}
    for (const key in context) {
      if (Object.prototype.hasOwnProperty.call(context, key)) {
        const value = context[key]
        // Basic sanitization for sensitive data
        if (typeof key === "string" && (key.includes("password") || key.includes("token") || key.includes("secret"))) {
          sanitized[key] = "[REDACTED]"
        } else if (typeof value === "string" && value.length > 200) {
          // Truncate long strings
          sanitized[key] = value.substring(0, 200) + "...[TRUNCATED]"
        } else if (typeof value === "object" && value !== null) {
          // Recursively sanitize nested objects, but prevent deep recursion
          sanitized[key] = JSON.parse(
            JSON.stringify(value, (k, v) => {
              if (typeof k === "string" && (k.includes("password") || k.includes("token") || k.includes("secret"))) {
                return "[REDACTED]"
              }
              if (typeof v === "string" && v.length > 200) {
                return v.substring(0, 200) + "...[TRUNCATED]"
              }
              return v
            }),
          )
        } else {
          sanitized[key] = value
        }
      }
    }
    return sanitized
  }

  private output(level: LogLevel, message: string, context?: Record<string, unknown>, durationMs?: number): void {
    if (!this.shouldLog(level)) {
      return
    }

    const formattedMessage = this.formatMessage(message, context)
    const logEntry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: context ? this.sanitizeContext(context) : undefined,
      durationMs,
    }

    // In a real application, you might send this to a remote logging service
    // console.log(JSON.stringify(logEntry));

    switch (level) {
      case "debug":
        console.debug(formattedMessage)
        break
      case "info":
      case "log":
        console.log(formattedMessage)
        break
      case "warn":
        console.warn(formattedMessage)
        break
      case "error":
        console.error(formattedMessage)
        break
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.output("debug", message, context)
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.output("info", message, context)
  }

  public log(message: string, context?: Record<string, unknown>): void {
    this.output("log", message, context)
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.output("warn", message, context)
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.output("error", message, context)
  }

  public time<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const end = performance.now()
      this.debug(`Function ${name} executed`, { durationMs: end - start })
      return result
    } catch (e) {
      const end = performance.now()
      this.error(`Function ${name} failed`, { error: (e as Error).message, durationMs: end - start })
      throw e
    }
  }

  public async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const end = performance.now()
      this.debug(`Async function ${name} executed`, { durationMs: end - start })
      return result
    } catch (e) {
      const end = performance.now()
      this.error(`Async function ${name} failed`, { error: (e as Error).message, durationMs: end - start })
      throw e
    }
  }
}

export const logger = new Logger((process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info")
