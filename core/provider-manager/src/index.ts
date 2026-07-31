import type { Provider } from "./types";

export * from "./ollama";
export * from "./openai";
export * from "./types";

export class ProviderManager {
  private providers = new Map<string, Provider>();

  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): Provider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`provider not registered: ${id}`);
    return provider;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  remove(id: string): void {
    this.providers.delete(id);
  }
}
