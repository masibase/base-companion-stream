import type { PermissionManager } from "@agent/permission-manager";
import type { ProviderManager } from "@agent/provider-manager";
import type { Workflow } from "@agent/workflow-engine";
import { NOVA_SYSTEM_PROMPT } from "./prompt";

export function chatResponseWorkflow(
  perms: PermissionManager,
  providers: ProviderManager,
  providerId: string,
): Workflow {
  return {
    id: "W-01",
    steps: [
      {
        name: "guard",
        run: async (ctx) => {
          ctx.allowed = (await perms.request("chat.reply")).allowed;
        },
      },
      {
        name: "generate",
        run: async (ctx) => {
          if (!ctx.allowed) return;
          ctx.response = await providers.get(providerId).chat([
            { role: "system", content: NOVA_SYSTEM_PROMPT },
            { role: "user", content: String(ctx.message) },
          ]);
        },
      },
    ],
  };
}
