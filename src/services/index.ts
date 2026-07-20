import { createDefaultRegistry } from '@/providers';
import { SceneSearchService } from './sceneSearchService';
import { GeocodingService } from './geocodingService';

/**
 * Service layer composition. These singletons are the only objects the UI
 * talks to — and they double as the tool surface a future AI layer (GPT,
 * Claude, Gemini function-calling) will invoke: search scenes, geocode,
 * load imagery, inspect provider capabilities.
 */
export const providerRegistry = createDefaultRegistry();
export const sceneSearchService = new SceneSearchService(providerRegistry);
export const geocodingService = new GeocodingService();

export type { SceneSearchResult, ProviderSearchOutcome } from './sceneSearchService';
