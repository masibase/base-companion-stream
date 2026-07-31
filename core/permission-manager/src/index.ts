export type PermissionMode = "auto" | "ask" | "deny";

export interface PermissionDecision {
  allowed: boolean;
  mode: PermissionMode;
}

export type Approver = (scope: string) => Promise<boolean>;

export class PermissionManager {
  private modes = new Map<string, PermissionMode>();
  private approver: Approver;

  constructor(
    modes: Record<string, PermissionMode> = {},
    approver: Approver = async () => false,
  ) {
    for (const [scope, mode] of Object.entries(modes))
      this.modes.set(scope, mode);
    this.approver = approver;
  }

  setMode(scope: string, mode: PermissionMode): void {
    this.modes.set(scope, mode);
  }

  check(scope: string): PermissionDecision {
    const mode = this.modes.get(scope) ?? "ask";
    return { allowed: mode === "auto", mode };
  }

  async request(scope: string): Promise<PermissionDecision> {
    const decision = this.check(scope);
    if (decision.mode === "ask") decision.allowed = await this.approver(scope);
    return decision;
  }
}
