import type { BoundingBox, SceneGeometry } from './geo';

/** License / usage terms attached to a scene. */
export interface SceneLicense {
  /** SPDX-like identifier or a short label, e.g. "public-domain", "CC-BY-SA-3.0-IGO". */
  id: string;
  label: string;
  url?: string;
  /** True when the imagery itself may be displayed and redistributed freely. */
  redistributable: boolean;
}

/**
 * The unified scene model. Every provider — USGS, Earth Engine, Sentinel,
 * future commercial providers — maps its native records into this shape.
 */
export interface ImageScene {
  /** Globally unique: `${provider}:${nativeId}`. */
  id: string;
  /** Registry id of the provider that produced this scene. */
  provider: string;
  /** Mission / platform, e.g. "KH-7 GAMBIT", "Landsat 5 TM", "Sentinel-2A". */
  mission: string;
  /** Acquisition time, ISO 8601. */
  captureDate: string;
  /** Ground sample distance in meters, if known. */
  resolution?: number;
  /** Scene footprint bounding box (WGS84). */
  bounds: BoundingBox;
  /** Small browse image, if available. */
  thumbnail?: string;
  /** Where the full product can be obtained (file or landing page). */
  downloadUrl?: string;
  /** A displayable preview (georeferenced browse image or tile endpoint input). */
  previewUrl?: string;
  /** Provider-specific extra fields, kept for the metadata panel and AI layer. */
  metadata: Record<string, unknown>;
  license: SceneLicense;
  /** Precise footprint, when the provider supplies one. */
  geometry?: SceneGeometry;
}

/**
 * What a provider hands the map when a scene is loaded for display.
 * Kept renderer-agnostic so MapLibre/OpenLayers adapters stay thin.
 */
export type SceneLayer =
  | {
      kind: 'raster-tiles';
      /** XYZ tile URL template. */
      urlTemplate: string;
      tileSize: number;
      bounds: BoundingBox;
      minZoom?: number;
      maxZoom?: number;
      attribution?: string;
    }
  | {
      kind: 'georeferenced-image';
      url: string;
      /** Image corner coordinates: [tl, tr, br, bl] as [lon, lat]. */
      coordinates: [number, number][];
      bounds: BoundingBox;
      attribution?: string;
    };
