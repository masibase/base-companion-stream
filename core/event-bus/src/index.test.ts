import { describe, expect, it } from "vitest";
import { createEvent, EventBus } from "./index";

describe("EventBus", () => {
  it("delivers events to subscribers", async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on("chat.message", (event) => void seen.push(String(event.payload)));
    await bus.emit(createEvent("chat.message", "test", "hello"));
    expect(seen).toEqual(["hello"]);
  });

  it("supports once and unsubscribe", async () => {
    const bus = new EventBus();
    let calls = 0;
    const off = bus.on("tick", () => {
      calls++;
    });
    await bus.emit(createEvent("tick", "test", null));
    off();
    await bus.emit(createEvent("tick", "test", null));
    expect(calls).toBe(1);
  });

  it("isolates handler failures", async () => {
    const bus = new EventBus();
    let survived = false;
    bus.on("boom", () => {
      throw new Error("x");
    });
    bus.on("boom", () => {
      survived = true;
    });
    await bus.emit(createEvent("boom", "test", null));
    expect(survived).toBe(true);
  });
});
