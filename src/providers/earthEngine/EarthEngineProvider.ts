import type {
  ImageScene,
  ImageryProvider,
  ProviderCapabilities,
  ProviderStatus,
  SceneLayer,
  SceneSearchQuery,
} from '@/types';
import { ProviderNotConfiguredError } from '@/types';
import { CREDENTIALS } from '@/config/providers.config';

/**
 * Google Earth Engine provider (Version 3 roadmap item).
 *
 * The provider contract is implemented and registered so the rest of the app
 * — search fan-out, UI, future AI layer — already treats Earth Engine as a
 * first-class source. Live search/load require an OAuth client id
 * (VITE_EE_CLIENT_ID) and a signed-in Google account; until then the
 * provider reports itself as "unconfigured" and returns no results instead
 * of failing the fan-out.
 *
 * Planned implementation notes:
 *  - Auth: Google Identity Services token flow scoped to
 *    https://www.googleapis.com/auth/earthengine.readonly
 *  - Search: earthengine.googleapis.com v1 `projects.assets:listImages`
 *    over LANDSAT/* and COPERNICUS/S2* collections
 *  - Load: `projects.maps` tile endpoints for on-the-fly visualizations
 */
export class EarthEngineProvider implements ImageryProvider {
  readonly id = 'earth-engine';

  capabilities(): ProviderCapabilities {
    return {
      id: this.id,
      displayName: 'Google Earth Engine',
      description:
        'Landsat and Sentinel collections rendered server-side by Google Earth Engine. ' +
        'Requires a Google account with Earth Engine access.',
      temporalRange: { from: 1972, to: 'present' },
      supportsSearch: false,
      supportsPolygonSearch: false,
      supportsDownload: false,
      supportsPreview: false,
      requiresAuth: true,
      missions: ['Landsat 1–9', 'Sentinel-1', 'Sentinel-2'],
      attribution: 'Google Earth Engine',
    };
  }

  async status(): Promise<ProviderStatus> {
    if (!CREDENTIALS.earthEngineClientId) {
      return {
        state: 'unconfigured',
        reason: 'Set VITE_EE_CLIENT_ID and sign in with an Earth Engine enabled Google account.',
      };
    }
    return { state: 'ready' };
  }

  async search(_query: SceneSearchQuery): Promise<ImageScene[]> {
    // Unconfigured providers must not break the multi-provider fan-out.
    return [];
  }

  async load(_scene: ImageScene): Promise<SceneLayer | null> {
    return null;
  }

  async metadata(sceneId: string): Promise<Record<string, unknown>> {
    throw new ProviderNotConfiguredError(this.id, `cannot fetch metadata for ${sceneId} yet`);
  }
}
