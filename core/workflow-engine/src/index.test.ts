import { EventBus } from "@agent/event-bus";
import { describe, expect, it } from "vitest";
import { runWorkflow } from "./index";

describe("runWorkflow", () => {
  it("runs steps in order", async () => {
    const order: string[] = [];
    await runWorkflow({
      id: "W-01",
      steps: [
        { name: "a", run: () => void order.push("a") },
        { name: "b", run: () => void order.push("b") },
      ],
    });
    expect(order).toEqual(["a", "b"]);
  });

  it("shares context between steps", async () => {
    const ctx = await runWorkflow({
      id: "W-01",
      steps: [
        {
          name: "set",
          run: (c) => {
            c.value = 41;
          },
        },
        {
          name: "bump",
          run: (c) => {
            c.value = (c.value as number) + 1;
          },
        },
      ],
    });
    expect(ctx.value).toBe(42);
  });

  it("emits lifecycle events", async () => {
    const bus = new EventBus();
    const ids: string[] = [];
    bus.on(
      "workflow.started",
      (e) => void ids.push((e.payload as { id: string }).id),
    );
    bus.on(
      "workflow.completed",
      (e) => void ids.push((e.payload as { id: string }).id),
    );
    await runWorkflow(
      { id: "W-01", steps: [{ name: "s", run: () => {} }] },
      {},
      bus,
    );
    expect(ids).toEqual(["W-01", "W-01"]);
  });

  it("emits workflow.failed and rethrows", async () => {
    const bus = new EventBus();
    let failed = false;
    bus.on("workflow.failed", () => {
      failed = true;
    });
    await expect(
      runWorkflow(
        {
          id: "X",
          steps: [
            {
              name: "s",
              run: () => {
                throw new Error("nope");
              },
            },
          ],
        },
        {},
        bus,
      ),
    ).rejects.toThrow("nope");
    expect(failed).toBe(true);
  });
});
