import type { ImageScene, SceneGeometry } from '@/types';
import { ENDPOINTS } from '@/config/providers.config';
import { geometryBounds } from '@/utils/bbox';
import { USGS_DECLASS_PROVIDER_ID } from './declassCatalog';

/**
 * One record of the pre-harvested Syria-wide declassified catalog
 * (public/catalog/declass-syria.json), produced by scripts/harvest-declass.mjs
 * from the USGS M2M API. The archive is closed (1960–1984), so a one-time
 * harvest gives permanent, credential-free coverage of all of Syria.
 */
export interface DeclassCatalogRecord {
  entityId: string;
  dataset: string;
  captureDate: string;
  geometry?: SceneGeometry;
  bounds?: [number, number, number, number];
  browseUrl?: string;
  thumbnailUrl?: string;
  mission?: string;
  resolution?: number;
  metadata?: Record<string, unknown>;
}

interface DeclassCatalogFile {
  generatedAt?: string;
  scenes: DeclassCatalogRecord[];
}

const DATASET_LABELS: Record<string, string> = {
  declassi: 'Declass 1 (1960 to 1972)',
  corona2: 'Declass 1 (1960 to 1972)',
  declassii: 'Declass 2 (1963 to 1980)',
  declassiii: 'Declass 3 (1971 to 1984)',
};

const MISSION_BY_DATASET: Record<string, string> = {
  declassi: 'CORONA / ARGON / LANYARD',
  corona2: 'CORONA / ARGON / LANYARD',
  declassii: 'KH-7 GAMBIT / KH-9 HEXAGON',
  declassiii: 'KH-9 HEXAGON mapping camera',
};

/**
 * The Declass 2 dataset mixes two platforms, and the harvest stamps its
 * combined label onto every record. The entity id tells them apart
 * (handbook §3): DZB004… frames are KH-7 GAMBIT missions 4001–4054,
 * DZB12… frames are KH-9 HEXAGON missions 1201+.
 */
function declassMission(record: DeclassCatalogRecord): string {
  const generic = !record.mission || record.mission === MISSION_BY_DATASET[record.dataset];
  if (!generic && record.mission) return record.mission;
  if (record.entityId.startsWith('DZB004')) return 'KH-7 GAMBIT';
  if (record.entityId.startsWith('DZB12')) return 'KH-9 HEXAGON';
  return record.mission ?? MISSION_BY_DATASET[record.dataset] ?? 'Declassified reconnaissance';
}

/**
 * The harvest emits "YYYY-MM-DD HH:MM:SS-05"; Safari's Date parser
 * rejects the space separator and the two-digit offset, which would break
 * timeline grouping on iPhones. Normalize to strict ISO 8601.
 */
export function toIsoCaptureDate(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:([+-]\d{2})(?::?(\d{2}))?)?$/.exec(
    value,
  );
  if (!match) return value;
  const offset = match[3] ? `${match[3]}:${match[4] ?? '00'}` : 'Z';
  return `${match[1]}T${match[2]}${offset}`;
}

let catalogPromise: Promise<ImageScene[]> | null = null;

/**
 * Load the harvested catalog once per session. Returns an empty list when
 * the file has not been generated yet (the curated seed catalog still works).
 */
export function loadHarvestedCatalog(): Promise<ImageScene[]> {
  catalogPromise ??= fetchCatalog();
  return catalogPromise;
}

async function fetchCatalog(): Promise<ImageScene[]> {
  try {
    const url = `${import.meta.env.BASE_URL}catalog/declass-syria.json`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const file = (await response.json()) as DeclassCatalogFile;
    return (file.scenes ?? [])
      .map((record) => toScene(record))
      .filter((scene): scene is ImageScene => scene !== null);
  } catch {
    // Catalog not generated yet or offline — degrade to the curated seed.
    return [];
  }
}

function toScene(record: DeclassCatalogRecord): ImageScene | null {
  if (!record.entityId || !record.captureDate) return null;
  const bounds = record.bounds ?? (record.geometry ? geometryBounds(record.geometry) : null);
  if (!bounds) return null;

  return {
    id: `${USGS_DECLASS_PROVIDER_ID}:${record.entityId}`,
    provider: USGS_DECLASS_PROVIDER_ID,
    mission: declassMission(record),
    captureDate: toIsoCaptureDate(record.captureDate),
    ...(record.resolution !== undefined ? { resolution: record.resolution } : {}),
    bounds,
    ...(record.thumbnailUrl ? { thumbnail: record.thumbnailUrl } : {}),
    ...(record.browseUrl ? { previewUrl: record.browseUrl } : {}),
    downloadUrl: ENDPOINTS.earthExplorer,
    metadata: {
      entityId: record.entityId,
      dataset: record.dataset,
      approximateFootprint: true,
      orderingNote:
        'On EarthExplorer (free account): Data Sets → Declassified Data → ' +
        `${DATASET_LABELS[record.dataset] ?? record.dataset} → Additional Criteria → ` +
        `Entity ID ${record.entityId} → Results.`,
      ...record.metadata,
    },
    license: {
      id: 'public-domain',
      label: 'Public Domain (declassified US Government imagery)',
      redistributable: true,
    },
    ...(record.geometry ? { geometry: record.geometry } : {}),
  };
}
