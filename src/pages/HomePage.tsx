import { useEffect, useLayoutEffect, useRef } from 'react';
import { ExplorerMap } from '@/components/map/ExplorerMap';
import { SearchBox } from '@/components/search/SearchBox';
import { Timeline } from '@/components/timeline/Timeline';
import { SceneList } from '@/components/scenes/SceneList';
import { MetadataPanel } from '@/components/scenes/MetadataPanel';
import { LabelsToggle, ViewControls } from '@/components/controls/ViewControls';
import { WelcomeHint } from '@/components/onboarding/WelcomeHint';
import { useExplorerStore } from '@/hooks/useExplorerStore';

/**
 * Single-page explorer layout. Mobile-first: map fills the viewport;
 * search on top, timeline + controls at the bottom, scene/metadata panels
 * as a bottom sheet (mobile) or right-hand drawer (desktop).
 */
export function HomePage() {
  const searchScenesAt = useExplorerStore((state) => state.searchScenesAt);
  const center = useExplorerStore((state) => state.center);
  const activePanel = useExplorerStore((state) => state.activePanel);
  const setActivePanel = useExplorerStore((state) => state.setActivePanel);
  const scenes = useExplorerStore((state) => state.scenes);
  const searchStatus = useExplorerStore((state) => state.searchStatus);
  const footerRef = useRef<HTMLElement>(null);

  // Publish the bottom controls' height so map credits can sit above them.
  // The footer grows and shrinks (loading pill, compare buttons, timeline
  // wrap), and on a phone a fixed offset would leave the expanded
  // attribution covering the whole timeline.
  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const publish = () =>
      document.documentElement.style.setProperty('--map-footer-h', `${footer.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Load imagery for the default location (Hama Old City) on first paint.
  useEffect(() => {
    if (useExplorerStore.getState().searchStatus === 'idle') {
      void searchScenesAt(center);
    }
  }, [searchScenesAt, center]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface-950">
      <ExplorerMap />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:flex-row sm:items-center">
        <h1 className="pointer-events-auto shrink-0 rounded-xl border border-surface-600 bg-surface-900/90 px-3 py-2 text-sm font-bold tracking-tight text-gray-100 shadow-lg backdrop-blur">
          <span className="text-accent-400">Syria</span> Explorer
          <span className="ml-2 hidden text-[10px] font-medium text-gray-500 sm:inline">
            1960 → today
          </span>
        </h1>
        <div className="pointer-events-auto w-full sm:max-w-md">
          <SearchBox />
        </div>
      </header>

      <WelcomeHint />

      {/* Scene / metadata panel */}
      {activePanel !== null && (
        <aside className="absolute inset-x-0 bottom-0 z-40 flex h-[55dvh] flex-col rounded-t-2xl border border-surface-600 bg-surface-900/95 shadow-2xl backdrop-blur sm:inset-x-auto sm:top-20 sm:right-3 sm:bottom-28 sm:h-auto sm:w-96 sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-surface-600 px-2 py-1.5">
            <div className="flex gap-1">
              <PanelTab
                label="Scenes"
                active={activePanel === 'scenes'}
                onClick={() => setActivePanel('scenes')}
              />
              <PanelTab
                label="Metadata"
                active={activePanel === 'metadata'}
                onClick={() => setActivePanel('metadata')}
              />
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              aria-label="Close panel"
              className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-surface-700"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {activePanel === 'scenes' ? <SceneList /> : <MetadataPanel />}
          </div>
        </aside>
      )}

      {/* Bottom controls */}
      <footer
        ref={footerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {/* Panel toggle (when closed). Part of the footer stack rather than
            free-floating, so its height is included in --map-footer-h and the
            map credits park above it instead of covering it. */}
        {activePanel === null && (
          <div className="flex w-full max-w-3xl justify-end">
            <button
              type="button"
              onClick={() => setActivePanel('scenes')}
              className="pointer-events-auto rounded-xl border border-surface-600 bg-surface-900/90 px-3 py-2 text-xs font-semibold text-gray-100 shadow-lg backdrop-blur hover:bg-surface-700"
            >
              {searchStatus === 'loading' ? 'Searching…' : `Scenes (${scenes.length})`}
            </button>
          </div>
        )}

        <div className="pointer-events-none flex items-center gap-2">
          <ViewControls />
          <LabelsToggle />
        </div>
        <div className="w-full max-w-3xl">
          <Timeline />
        </div>
      </footer>
    </div>
  );
}

function PanelTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold ${
        active ? 'bg-surface-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
