import { PollingChatAdapter } from "./polling";

export class TikTokAdapter extends PollingChatAdapter {
  readonly platform = "tiktok" as const;
}
