import { createEvent, EventBus } from "@agent/event-bus";
import { Logger } from "@agent/logging";
import { Orchestrator } from "@agent/orchestrator";
import { PermissionManager } from "@agent/permission-manager";
import { type Provider, ProviderManager } from "@agent/provider-manager";
import { runWorkflow, type Workflow } from "@agent/workflow-engine";
import { describe, expect, it } from "vitest";

const fakeProvider: Provider = {
  id: "fake",
  async chat(messages) {
    return `reply to: ${messages.at(-1)?.content}`;
  },
  async listModels() {
    return ["fake-1"];
  },
  async ping() {
    return true;
  },
};

function buildW01Workflow(
  perms: PermissionManager,
  providers: ProviderManager,
): Workflow {
  return {
    id: "W-01",
    steps: [
      {
        name: "guard",
        run: (ctx) => {
          ctx.allowed = perms.check("chat.reply").allowed;
        },
      },
      {
        name: "generate",
        run: async (ctx) => {
          if (!ctx.allowed) return;
          ctx.response = await providers
            .get("fake")
            .chat([{ role: "user", content: String(ctx.message) }]);
        },
      },
    ],
  };
}

describe("foundation: W-01 live chat response", () => {
  it("routes chat.message through workflow to response.ready", async () => {
    const bus = new EventBus();
    const providers = new ProviderManager();
    providers.register(fakeProvider);
    const perms = new PermissionManager({ "chat.reply": "auto" });
    const orchestrator = new Orchestrator(bus, new Logger("info", () => {}));

    const responses: string[] = [];
    bus.on(
      "response.ready",
      (e) => void responses.push((e.payload as { text: string }).text),
    );
    const workflowStarted: string[] = [];
    bus.on(
      "workflow.started",
      (e) => void workflowStarted.push((e.payload as { id: string }).id),
    );

    orchestrator.register({
      id: "nova",
      listens: ["chat.message"],
      async handle(event, ctx) {
        const w01 = buildW01Workflow(perms, providers);
        const result = await runWorkflow(
          w01,
          { message: (event.payload as { text: string }).text },
          bus,
        );
        if (result.allowed) {
          await ctx.emit("response.ready", { text: result.response });
        } else {
          await ctx.emit("permission.denied", { scope: "chat.reply" });
        }
      },
    });

    await bus.emit(
      createEvent("chat.message", "services/chat-adapters/youtube", {
        text: "hello chat",
      }),
    );

    expect(workflowStarted).toEqual(["W-01"]);
    expect(responses).toEqual(["reply to: hello chat"]);
  });

  it("emits permission.denied when scope is deny", async () => {
    const bus = new EventBus();
    const perms = new PermissionManager({ "chat.reply": "deny" });
    const orchestrator = new Orchestrator(bus);

    const denied: string[] = [];
    bus.on(
      "permission.denied",
      (e) => void denied.push((e.payload as { scope: string }).scope),
    );

    orchestrator.register({
      id: "nova",
      listens: ["chat.message"],
      async handle(_event, ctx) {
        if (!perms.check("chat.reply").allowed) {
          await ctx.emit("permission.denied", { scope: "chat.reply" });
          return;
        }
        await ctx.emit("response.ready", { text: "nope" });
      },
    });

    await bus.emit(createEvent("chat.message", "test", { text: "hi" }));
    expect(denied).toEqual(["chat.reply"]);
  });

  it("reports agent failure via agent.health", async () => {
    const bus = new EventBus();
    const orchestrator = new Orchestrator(bus);

    const health: string[] = [];
    bus.on(
      "agent.health",
      (e) => void health.push((e.payload as { agent: string }).agent),
    );

    orchestrator.register({
      id: "broken",
      listens: ["chat.message"],
      handle: () => {
        throw new Error("boom");
      },
    });

    await bus.emit(createEvent("chat.message", "test", { text: "x" }));
    expect(health).toEqual(["broken"]);
  });

  it("stop() detaches agents", async () => {
    const bus = new EventBus();
    const orchestrator = new Orchestrator(bus);
    let calls = 0;
    orchestrator.register({
      id: "nova",
      listens: ["chat.message"],
      handle: () => {
        calls++;
      },
    });
    orchestrator.stop();
    await bus.emit(createEvent("chat.message", "test", { text: "x" }));
    expect(calls).toBe(0);
  });
});
