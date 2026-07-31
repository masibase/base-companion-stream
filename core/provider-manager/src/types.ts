export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

export interface Provider {
  readonly id: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  listModels(): Promise<string[]>;
  ping(): Promise<boolean>;
}
