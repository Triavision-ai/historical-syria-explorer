import { useMemo } from 'react';
import { TIMELINE_YEARS, TIMELINE_MATCH_TOLERANCE_YEARS } from '@/config/app.config';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import { yearDistance } from '@/utils/date';

/**
 * Bottom timeline (1960 → 2026). Clicking a year loads the best available
 * scene near that year for the current location. A dot marks years with
 * at least one candidate scene.
 */
export function Timeline() {
  const scenes = useExplorerStore((state) => state.scenes);
  const activeYear = useExplorerStore((state) => state.activeYear);
  const selectYear = useExplorerStore((state) => state.selectYear);

  const yearsWithData = useMemo(() => {
    // A dot promises the user an actual picture — count only scenes that
    // can render on the map (sharp tiles or a browse preview), not
    // metadata-only archive records.
    const displayable = scenes.filter(
      (scene) =>
        scene.captureDate && (scene.metadata['displayable'] === true || scene.previewUrl),
    );
    const available = new Set<number>();
    for (const year of TIMELINE_YEARS) {
      if (
        displayable.some(
          (scene) => yearDistance(scene.captureDate, year) <= TIMELINE_MATCH_TOLERANCE_YEARS,
        )
      ) {
        available.add(year);
      }
    }
    return available;
  }, [scenes]);

  return (
    <nav
      aria-label="Imagery timeline"
      className="pointer-events-auto rounded-xl border border-surface-600 bg-surface-900/90 shadow-lg backdrop-blur"
    >
      <ol className="flex items-stretch gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
        {TIMELINE_YEARS.map((year) => {
          const isActive = year === activeYear;
          const hasData = yearsWithData.has(year);
          return (
            <li key={year} className="shrink-0">
              <button
                type="button"
                onClick={() => void selectYear(year)}
                aria-pressed={isActive}
                className={`flex flex-col items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${
                  isActive ? 'bg-accent-500 text-surface-950' : 'text-gray-300 hover:bg-surface-700'
                }`}
              >
                <span>{year}</span>
                <span
                  aria-hidden
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    hasData ? (isActive ? 'bg-surface-950' : 'bg-amber-hl') : 'bg-transparent'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
