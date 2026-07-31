import type { EventBus } from "@agent/event-bus";
import type { AgentDefinition } from "@agent/orchestrator";
import type { PermissionManager } from "@agent/permission-manager";
import type { ProviderManager } from "@agent/provider-manager";
import { runWorkflow } from "@agent/workflow-engine";
import { chatResponseWorkflow } from "./workflows";

export interface NovaOptions {
  bus: EventBus;
  providers: ProviderManager;
  perms: PermissionManager;
  providerId?: string;
}

export function createNovaAgent(opts: NovaOptions): AgentDefinition {
  return {
    id: "nova",
    listens: ["chat.message"],
    async handle(event, ctx) {
      const message = (event.payload as { text?: string }).text ?? "";
      const workflow = chatResponseWorkflow(
        opts.perms,
        opts.providers,
        opts.providerId ?? "primary",
      );
      const result = await runWorkflow(workflow, { message }, opts.bus);
      if (result.allowed) {
        await ctx.emit("response.ready", {
          text: result.response,
          replyTo: event.id,
        });
      } else {
        await ctx.emit("permission.denied", {
          scope: "chat.reply",
          message,
        });
      }
    },
  };
}
