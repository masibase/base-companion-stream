import { describe, expect, it } from "vitest";
import { Logger } from "./index";

describe("Logger", () => {
  it("filters by level", () => {
    const lines: string[] = [];
    const logger = new Logger("warn", (line) => lines.push(line));
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[WARN] w");
    expect(lines[1]).toContain("[ERROR] e");
  });

  it("appends meta as JSON", () => {
    const lines: string[] = [];
    const logger = new Logger("info", (line) => lines.push(line));
    logger.info("msg", { scope: "obs" });
    expect(lines[0]).toContain('{"scope":"obs"}');
  });
});
