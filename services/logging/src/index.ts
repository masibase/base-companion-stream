export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: LogLevel[] = ["debug", "info", "warn", "error"];

export class Logger {
  private level: LogLevel;
  private sink: (line: string) => void;

  constructor(
    level: LogLevel = "info",
    sink: (line: string) => void = console.log,
  ) {
    this.level = level;
    this.sink = sink;
  }

  private enabled(level: LogLevel): boolean {
    return ORDER.indexOf(level) >= ORDER.indexOf(this.level);
  }

  log(level: LogLevel, msg: string, meta?: unknown): void {
    if (!this.enabled(level)) return;
    const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
    this.sink(
      `${new Date().toISOString()} [${level.toUpperCase()}] ${msg}${suffix}`,
    );
  }

  debug(msg: string, meta?: unknown): void {
    this.log("debug", msg, meta);
  }

  info(msg: string, meta?: unknown): void {
    this.log("info", msg, meta);
  }

  warn(msg: string, meta?: unknown): void {
    this.log("warn", msg, meta);
  }

  error(msg: string, meta?: unknown): void {
    this.log("error", msg, meta);
  }
}
