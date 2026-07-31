import { createEvent, EventBus } from "@agent/event-bus";
import { Orchestrator } from "@agent/orchestrator";
import { PermissionManager } from "@agent/permission-manager";
import { type Provider, ProviderManager } from "@agent/provider-manager";
import { describe, expect, it } from "vitest";
import { createNovaAgent } from "./nova";

const fakeProvider: Provider = {
  id: "primary",
  async chat(messages) {
    return `nova says: ${messages.at(-1)?.content}`;
  },
  async listModels() {
    return ["fake-1"];
  },
  async ping() {
    return true;
  },
};

describe("nova agent", () => {
  it("answers chat.message via W-01 when allowed", async () => {
    const bus = new EventBus();
    const providers = new ProviderManager();
    providers.register(fakeProvider);
    const perms = new PermissionManager({ "chat.reply": "auto" });
    const orchestrator = new Orchestrator(bus);

    const responses: Array<{ text: string; replyTo: string }> = [];
    bus.on(
      "response.ready",
      (e) =>
        void responses.push(e.payload as { text: string; replyTo: string }),
    );
    orchestrator.register(
      createNovaAgent({ bus, providers, perms, providerId: "primary" }),
    );

    await bus.emit(
      createEvent("chat.message", "services/chat-adapters/youtube", {
        text: "hello nova",
      }),
    );

    expect(responses).toHaveLength(1);
    expect(responses[0]?.text).toBe("nova says: hello nova");
    expect(responses[0]?.replyTo).toBeDefined();
  });

  it("emits permission.denied when chat.reply is deny", async () => {
    const bus = new EventBus();
    const providers = new ProviderManager();
    providers.register(fakeProvider);
    const perms = new PermissionManager({ "chat.reply": "deny" });
    const orchestrator = new Orchestrator(bus);

    const denied: string[] = [];
    bus.on(
      "permission.denied",
      (e) => void denied.push((e.payload as { scope: string }).scope),
    );
    const responses: string[] = [];
    bus.on("response.ready", (e) => void responses.push(String(e.payload)));

    orchestrator.register(
      createNovaAgent({ bus, providers, perms, providerId: "primary" }),
    );

    await bus.emit(
      createEvent("chat.message", "services/chat-adapters/twitch", {
        text: "hi",
      }),
    );

    expect(denied).toEqual(["chat.reply"]);
    expect(responses).toHaveLength(0);
  });

  it("declares workflow via workflow.started", async () => {
    const bus = new EventBus();
    const providers = new ProviderManager();
    providers.register(fakeProvider);
    const orchestrator = new Orchestrator(bus);

    const started: string[] = [];
    bus.on(
      "workflow.started",
      (e) => void started.push((e.payload as { id: string }).id),
    );
    orchestrator.register(
      createNovaAgent({
        bus,
        providers,
        perms: new PermissionManager({ "chat.reply": "auto" }),
        providerId: "primary",
      }),
    );

    await bus.emit(createEvent("chat.message", "test", { text: "x" }));
    expect(started).toContain("W-01");
  });
});
