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
 *
 * Touch scrolls the strip natively; mouse users get three equivalents:
 * vertical wheel mapped to horizontal scroll, drag-to-scroll, and edge
 * arrow buttons (hidden on touch-only devices).
 */
export function Timeline() {
  const scenes = useExplorerStore((state) => state.scenes);
  const searchStatus = useExplorerStore((state) => state.searchStatus);
  const selectedScene = useExplorerStore((state) => state.selectedScene);
  const selectScene = useExplorerStore((state) => state.selectScene);
  const listRef = useRef<HTMLOListElement>(null);
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const events = useMemo(() => timelineEvents(scenes), [scenes]);
  const activeKey = selectedScene ? timelineEventKey(selectedScene) : null;

  // Keep the active event visible as selection or location changes.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeKey, events]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = listRef.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: 'smooth' });
  };

  const onWheel = (event: React.WheelEvent) => {
    const el = listRef.current;
    if (!el) return;
    // Trackpads already produce horizontal deltas; map the dominant vertical
    // delta of a plain mouse wheel onto the strip instead.
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) el.scrollLeft += event.deltaY;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const el = listRef.current;
    if (!el) return;
    drag.current = { startX: event.clientX, startScroll: el.scrollLeft, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    const el = listRef.current;
    if (!state || !el) return;
    const dx = event.clientX - state.startX;
    if (!state.moved && Math.abs(dx) < 5) return;
    state.moved = true;
    el.scrollLeft = state.startScroll - dx;
  };

  const onPointerEnd = () => {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  };

  // A drag must not also select the marker the mouse happened to land on.
  const onClickCapture = (event: React.MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <nav
      aria-label="Imagery timeline"
      className="pointer-events-auto flex items-stretch rounded-xl border border-surface-600 bg-surface-900/90 shadow-lg backdrop-blur"
    >
      {events.length === 0 ? (
        <p className="px-4 py-2.5 text-xs text-gray-400">
          {searchStatus === 'loading'
            ? 'Finding imagery for this view…'
            : 'No dated imagery here yet — pan or zoom the map to explore.'}
        </p>
      ) : (
        <>
          <ScrollButton direction={-1} onClick={() => scrollByPage(-1)} />
          <ol
            ref={listRef}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerLeave={onPointerEnd}
            onClickCapture={onClickCapture}
            className="flex cursor-grab items-stretch gap-1 overflow-x-auto px-2 py-1.5 select-none [scrollbar-width:none] active:cursor-grabbing"
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
          <ScrollButton direction={1} onClick={() => scrollByPage(1)} />
        </>
      )}
    </nav>
  );
}

/** Edge arrow for mouse users; touch devices scroll the strip directly. */
function ScrollButton({ direction, onClick }: { direction: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === -1 ? 'Scroll timeline left' : 'Scroll timeline right'}
      className={`hidden shrink-0 items-center px-1.5 text-base text-gray-500 hover:text-gray-200 sm:flex ${
        direction === -1
          ? 'rounded-l-xl border-r border-surface-700/60'
          : 'rounded-r-xl border-l border-surface-700/60'
      }`}
    >
      {direction === -1 ? '‹' : '›'}
    </button>
  );
}

/** "KH-9 HEXAGON" → "KH-9"; single-word missions pass through. */
function shortMission(mission: string): string {
  return mission.split(' ')[0] ?? mission;
}
