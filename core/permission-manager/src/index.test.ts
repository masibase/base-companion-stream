import { describe, expect, it } from "vitest";
import { PermissionManager } from "./index";

describe("PermissionManager", () => {
  it("auto allows without asking", async () => {
    const perms = new PermissionManager({ "obs.sceneSwitch": "auto" });
    const decision = await perms.request("obs.sceneSwitch");
    expect(decision).toEqual({ allowed: true, mode: "auto" });
  });

  it("deny refuses", async () => {
    const perms = new PermissionManager({ "chat.reply": "deny" });
    expect(perms.check("chat.reply").allowed).toBe(false);
  });

  it("ask defers to approver", async () => {
    const perms = new PermissionManager({}, async () => true);
    expect((await perms.request("tokens.spend")).allowed).toBe(true);
    expect(perms.check("tokens.spend").mode).toBe("ask");
  });

  it("unknown scope defaults to ask (denied)", async () => {
    const perms = new PermissionManager();
    expect((await perms.request("unknown")).allowed).toBe(false);
  });
});
