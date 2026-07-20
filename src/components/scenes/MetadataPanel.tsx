import { useExplorerStore } from '@/hooks/useExplorerStore';
import { formatCaptureDate } from '@/utils/date';

/** Fields already rendered prominently — skipped in the raw metadata table. */
const PROMINENT_KEYS = new Set(['datetime', 'platform', 'collection']);
const MAX_METADATA_ROWS = 40;

/** Full detail view for the selected scene. */
export function MetadataPanel() {
  const scene = useExplorerStore((state) => state.selectedScene);
  const sceneLayerLoading = useExplorerStore((state) => state.sceneLayerLoading);
  const sceneLayer = useExplorerStore((state) => state.sceneLayer);
  const setActivePanel = useExplorerStore((state) => state.setActivePanel);

  if (!scene) {
    return (
      <p className="px-4 py-6 text-sm text-gray-400">
        Select a scene from the list or the timeline to inspect it.
      </p>
    );
  }

  const metadataRows = Object.entries(scene.metadata)
    .filter(([key, value]) => !PROMINENT_KEYS.has(key) && isScalar(value))
    .slice(0, MAX_METADATA_ROWS);
  const orderingNote = scene.metadata['orderingNote'];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-2 border-b border-surface-600 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{scene.mission}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{formatCaptureDate(scene.captureDate)}</p>
        </div>
        <button
          type="button"
          onClick={() => setActivePanel('scenes')}
          className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-surface-700"
        >
          ← Scenes
        </button>
      </header>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {scene.thumbnail && (
          <img
            src={scene.thumbnail}
            alt={`Preview of ${scene.mission} scene`}
            className="mb-3 w-full rounded-lg border border-surface-600"
          />
        )}

        {sceneLayer && (
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="mb-3 w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-accent-400"
          >
            Show on map
          </button>
        )}

        {sceneLayerLoading && <p className="mb-3 text-xs text-accent-400">Loading preview…</p>}
        {!sceneLayerLoading && !sceneLayer && (
          <p className="mb-3 rounded-lg border border-amber-hl/30 bg-amber-hl/10 px-3 py-2 text-xs text-amber-hl">
            No displayable preview for this scene yet — the product is ordered from the archive.
            Metadata and ordering links below.
          </p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <Field label="Provider" value={scene.provider} />
          <Field label="Scene ID" value={scene.id.split(':')[1] ?? scene.id} mono />
          {scene.resolution !== undefined && (
            <Field label="Resolution" value={`${scene.resolution} m/px`} />
          )}
          <Field label="Bounds" value={scene.bounds.map((b) => b.toFixed(3)).join(', ')} mono />
          <Field label="License" value={scene.license.label} />
        </dl>

        {typeof orderingNote === 'string' && (
          <p className="mt-4 rounded-lg border border-surface-600 bg-surface-800/60 px-3 py-2 text-xs leading-relaxed text-gray-300">
            {orderingNote}
          </p>
        )}

        {scene.downloadUrl && (
          <a
            href={scene.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-lg bg-accent-500 px-4 py-2 text-center text-sm font-semibold text-surface-950 hover:bg-accent-400"
          >
            {orderingNote ? 'Open USGS EarthExplorer' : 'Open source record / download'}
          </a>
        )}

        {metadataRows.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-gray-300">
              Raw metadata ({metadataRows.length})
            </summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
              {metadataRows.map(([key, value]) => (
                <Field key={key} label={key} value={String(value)} mono />
              ))}
            </dl>
          </details>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className={`break-all text-gray-200 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </>
  );
}

function isScalar(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value);
}
