import { PollingChatAdapter } from "./polling";

export class KickAdapter extends PollingChatAdapter {
  readonly platform = "kick" as const;
}
