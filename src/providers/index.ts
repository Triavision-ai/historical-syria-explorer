import { ProviderRegistry } from './registry';
import { USGSProvider } from './usgs/USGSProvider';
import { createLandsatProvider } from './landsat/LandsatProvider';
import { createSentinelProvider } from './sentinel/SentinelProvider';
import { EarthEngineProvider } from './earthEngine/EarthEngineProvider';
import { WaybackProvider } from './wayback/WaybackProvider';

/**
 * Composition root for imagery sources. Adding a provider (Maxar, Planet,
 * Airbus, NASA, OpenAerialMap, …) means implementing ImageryProvider and
 * registering it here — no other code changes.
 */
export function createDefaultRegistry(): ProviderRegistry {
  return new ProviderRegistry()
    .register(new USGSProvider())
    .register(createLandsatProvider())
    .register(createSentinelProvider())
    .register(new WaybackProvider())
    .register(new EarthEngineProvider());
}

export { ProviderRegistry } from './registry';
