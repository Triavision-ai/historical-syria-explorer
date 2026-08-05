import { useExplorerStore } from '@/hooks/useExplorerStore';
import { formatCaptureDate } from '@/utils/date';

const OPACITY_STEPS = 100;

/**
 * Overlay controls: compare (swipe) toggle and historical-layer opacity.
 * Only rendered when a scene overlay is active.
 */
export function ViewControls() {
  const sceneLayer = useExplorerStore((state) => state.sceneLayer);
  const sceneLayerLoading = useExplorerStore((state) => state.sceneLayerLoading);
  const compareMode = useExplorerStore((state) => state.compareMode);
  const setCompareMode = useExplorerStore((state) => state.setCompareMode);
  const overlayOpacity = useExplorerStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useExplorerStore((state) => state.setOverlayOpacity);
  const selectScene = useExplorerStore((state) => state.selectScene);
  const compareRightScene = useExplorerStore((state) => state.compareRightScene);
  const setCompareRight = useExplorerStore((state) => state.setCompareRight);

  if (sceneLayerLoading) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-surface-600 bg-surface-900/90 px-3 py-2 text-xs text-accent-400 shadow-lg backdrop-blur">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-surface-600 border-t-accent-400" />
        Loading imagery…
      </div>
    );
  }
  if (!sceneLayer) return <QuickCompareButton />;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-surface-600 bg-surface-900/90 px-3 py-2 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setCompareMode(!compareMode)}
        aria-pressed={compareMode}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          compareMode
            ? 'bg-accent-500 text-surface-950'
            : 'bg-surface-700 text-gray-200 hover:bg-surface-600'
        }`}
      >
        Compare
      </button>

      {compareMode && compareRightScene && (
        <button
          type="button"
          onClick={() => void setCompareRight(null)}
          className="rounded-lg bg-surface-700 px-2 py-1.5 text-xs text-gray-300 hover:bg-surface-600"
          title="Reset right side to current imagery"
        >
          Right: {formatCaptureDate(compareRightScene.captureDate)} ✕
        </button>
      )}

      {!compareMode && (
        <label className="flex items-center gap-2 text-xs text-gray-400">
          Opacity
          <input
            type="range"
            min={0}
            max={OPACITY_STEPS}
            value={Math.round(overlayOpacity * OPACITY_STEPS)}
            onChange={(event) => setOverlayOpacity(Number(event.target.value) / OPACITY_STEPS)}
            className="w-24 accent-sky-400 sm:w-32"
            aria-label="Historical layer opacity"
          />
        </label>
      )}

      <button
        type="button"
        onClick={() => void selectScene(null)}
        className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-surface-700"
        aria-label="Clear historical overlay"
      >
        ✕ Clear
      </button>
    </div>
  );
}

/**
 * Show/hide the place-name overlay (cities, towns, villages). Always
 * visible: knowing what place one is looking at matters most exactly when
 * exploring unfamiliar villages on unlabeled imagery.
 */
export function LabelsToggle() {
  const showLabels = useExplorerStore((state) => state.showLabels);
  const setShowLabels = useExplorerStore((state) => state.setShowLabels);

  return (
    <button
      type="button"
      onClick={() => setShowLabels(!showLabels)}
      aria-pressed={showLabels}
      title={showLabels ? 'Hide place names' : 'Show place names'}
      className={`pointer-events-auto rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-colors ${
        showLabels
          ? 'border-accent-400/50 bg-accent-500 text-surface-950'
          : 'border-surface-600 bg-surface-900/90 text-gray-300 hover:bg-surface-700'
      }`}
    >
      Names
    </button>
  );
}

/**
 * One-tap entry into comparison: oldest sharp scene vs today. Shown when no
 * overlay is active yet, so comparing never requires digging in the list.
 */
function QuickCompareButton() {
  const scenes = useExplorerStore((state) => state.scenes);
  const searchStatus = useExplorerStore((state) => state.searchStatus);
  const quickCompare = useExplorerStore((state) => state.quickCompare);

  if (searchStatus !== 'done' || scenes.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => void quickCompare()}
      className="pointer-events-auto rounded-xl border border-accent-400/50 bg-surface-900/90 px-4 py-2 text-sm font-semibold text-accent-400 shadow-lg backdrop-blur transition-colors hover:bg-surface-700"
    >
      ⇆ Then / Now
    </button>
  );
}
