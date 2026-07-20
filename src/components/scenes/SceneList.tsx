import { useExplorerStore } from '@/hooks/useExplorerStore';
import { formatCaptureDate } from '@/utils/date';
import type { ImageScene } from '@/types';

const PROVIDER_BADGE_STYLES: Record<string, string> = {
  'usgs-declass': 'bg-amber-hl/15 text-amber-hl',
  landsat: 'bg-emerald-400/15 text-emerald-300',
  sentinel2: 'bg-accent-400/15 text-accent-400',
};

/** Chronological list of every scene found for the current location. */
export function SceneList() {
  const scenes = useExplorerStore((state) => state.scenes);
  const outcomes = useExplorerStore((state) => state.outcomes);
  const searchStatus = useExplorerStore((state) => state.searchStatus);
  const selectedScene = useExplorerStore((state) => state.selectedScene);
  const selectScene = useExplorerStore((state) => state.selectScene);
  const locationName = useExplorerStore((state) => state.locationName);

  const failures = outcomes.filter((outcome) => outcome.error);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-surface-600 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">Imagery — {locationName}</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {searchStatus === 'loading'
            ? 'Searching all providers…'
            : `${scenes.length} scene${scenes.length === 1 ? '' : 's'} across ${
                outcomes.filter((outcome) => !outcome.error).length
              } providers`}
        </p>
      </header>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        {searchStatus === 'error' && (
          <p className="px-4 py-6 text-sm text-red-400">
            Search failed. Check your connection and try again.
          </p>
        )}
        {searchStatus === 'done' && scenes.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400">
            No scenes found here yet. Try another location or a wider area.
          </p>
        )}
        <ul>
          {scenes.map((scene) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              selected={scene.id === selectedScene?.id}
              onSelect={() => void selectScene(scene)}
            />
          ))}
        </ul>
        {failures.length > 0 && (
          <p className="px-4 py-3 text-[11px] text-gray-600">
            Unavailable: {failures.map((failure) => failure.providerId).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

function SceneRow({
  scene,
  selected,
  onSelect,
}: {
  scene: ImageScene;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="border-b border-surface-700/60">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          selected ? 'bg-surface-700/70' : 'hover:bg-surface-800'
        }`}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-800">
          {scene.thumbnail ? (
            <img
              src={scene.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-gray-600">
              🛰
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-100">
            {formatCaptureDate(scene.captureDate)}
          </p>
          <p className="truncate text-xs text-gray-400">
            {scene.mission}
            {scene.resolution !== undefined ? ` · ${scene.resolution} m` : ''}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            PROVIDER_BADGE_STYLES[scene.provider] ?? 'bg-surface-700 text-gray-300'
          }`}
        >
          {scene.provider.replace('-declass', '')}
        </span>
      </button>
    </li>
  );
}
