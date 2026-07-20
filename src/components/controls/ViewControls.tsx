import { useExplorerStore } from '@/hooks/useExplorerStore';

const OPACITY_STEPS = 100;

/**
 * Overlay controls: compare (swipe) toggle and historical-layer opacity.
 * Only rendered when a scene overlay is active.
 */
export function ViewControls() {
  const sceneLayer = useExplorerStore((state) => state.sceneLayer);
  const compareMode = useExplorerStore((state) => state.compareMode);
  const setCompareMode = useExplorerStore((state) => state.setCompareMode);
  const overlayOpacity = useExplorerStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useExplorerStore((state) => state.setOverlayOpacity);
  const selectScene = useExplorerStore((state) => state.selectScene);

  if (!sceneLayer) return null;

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
