export interface WakeWord {
  readonly id: string;
  start(onWake: () => void): Promise<void>;
  stop(): Promise<void>;
  status(): "idle" | "listening";
}
