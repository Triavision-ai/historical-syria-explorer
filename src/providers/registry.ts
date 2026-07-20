import type { ImageryProvider } from '@/types';

/**
 * Central plugin registry. Providers are injected at composition time
 * (see providers/index.ts) so nothing in the app depends on concrete
 * provider classes — new sources are added by registering them here.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ImageryProvider>();

  register(provider: ImageryProvider): this {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered`);
    }
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): ImageryProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown provider "${id}"`);
    return provider;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  all(): ImageryProvider[] {
    return [...this.providers.values()];
  }
}
