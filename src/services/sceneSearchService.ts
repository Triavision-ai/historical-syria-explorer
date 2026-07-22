import type { ImageScene, SceneSearchQuery } from '@/types';
import type { ProviderRegistry } from '@/providers/registry';

export interface ProviderSearchOutcome {
  providerId: string;
  scenes: ImageScene[];
  error?: string;
}

export interface SceneSearchResult {
  scenes: ImageScene[];
  outcomes: ProviderSearchOutcome[];
}

/**
 * Fans a query out to every registered provider in parallel and merges the
 * results into one chronologically sorted list. A failing provider degrades
 * gracefully into an outcome error instead of failing the whole search —
 * "never stop because one provider is unavailable".
 *
 * This service is the single entry point the UI (and the future AI tool
 * layer) uses to find imagery.
 */
export class SceneSearchService {
  constructor(private readonly registry: ProviderRegistry) {}

  async search(query: SceneSearchQuery, signal?: AbortSignal): Promise<SceneSearchResult> {
    const providers = this.registry.all();
    const settled = await Promise.allSettled(
      providers.map((provider) => provider.search(query, signal)),
    );

    const outcomes: ProviderSearchOutcome[] = settled.map((result, index) => {
      const providerId = providers[index]?.id ?? 'unknown';
      return result.status === 'fulfilled'
        ? { providerId, scenes: result.value }
        : { providerId, scenes: [], error: toMessage(result.reason) };
    });

    const scenes = outcomes
      .flatMap((outcome) => outcome.scenes)
      .sort((a, b) => a.captureDate.localeCompare(b.captureDate));

    return { scenes, outcomes };
  }
}

function toMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
