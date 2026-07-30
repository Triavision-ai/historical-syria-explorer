import { useEffect, useMemo, useRef } from 'react';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import { timelineEvents, timelineEventKey } from '@/utils/timelineEvents';
import { formatMonthYear } from '@/utils/date';

/**
 * Bottom timeline. No fixed year ruler: as the user pans — Google Maps
 * style, no search needed — it rebuilds from the imagery actually found at
 * the current view. Each marker is one mission-year group labeled with its
 * best scene's real capture date; a ×N badge signals that the group holds
 * further acquisitions (all reachable in the Scenes panel). Tapping a
 * marker loads the group's best scene.
 */
export function Timeline() {
  const scenes = useExplorerStore((state) => state.scenes);
  const searchStatus = useExplorerStore((state) => state.searchStatus);
  const selectedScene = useExplorerStore((state) => state.selectedScene);
  const selectScene = useExplorerStore((state) => state.selectScene);
  const listRef = useRef<HTMLOListElement>(null);

  const events = useMemo(() => timelineEvents(scenes), [scenes]);
  const activeKey = selectedScene ? timelineEventKey(selectedScene) : null;

  // Keep the active event visible as selection or location changes.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeKey, events]);

  return (
    <nav
      aria-label="Imagery timeline"
      className="pointer-events-auto rounded-xl border border-surface-600 bg-surface-900/90 shadow-lg backdrop-blur"
    >
      {events.length === 0 ? (
        <p className="px-4 py-2.5 text-xs text-gray-400">
          {searchStatus === 'loading'
            ? 'Finding imagery for this view…'
            : 'No dated imagery here yet — pan or zoom the map to explore.'}
        </p>
      ) : (
        <ol
          ref={listRef}
          className="flex items-stretch gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]"
        >
          {events.map((event) => {
            const isActive = event.key === activeKey;
            return (
              <li key={event.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => void selectScene(event.scene)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${
                    isActive
                      ? 'bg-accent-500 text-surface-950'
                      : 'text-gray-300 hover:bg-surface-700'
                  }`}
                >
                  <span className="whitespace-nowrap">
                    {formatMonthYear(event.scene.captureDate)}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[9px] font-semibold ${
                      isActive
                        ? 'text-surface-950/80'
                        : event.hd
                          ? 'text-amber-hl'
                          : 'text-gray-500'
                    }`}
                  >
                    {shortMission(event.scene.mission)}
                    {event.hd ? ' · HD' : ''}
                    {event.count > 1 ? ` · ×${event.count}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

/** "KH-9 HEXAGON" → "KH-9"; single-word missions pass through. */
function shortMission(mission: string): string {
  return mission.split(' ')[0] ?? mission;
}
