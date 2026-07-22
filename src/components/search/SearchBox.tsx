import { useEffect, useRef, useState } from 'react';
import type { Place } from '@/types';
import { geocodingService } from '@/services';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useExplorerStore } from '@/hooks/useExplorerStore';

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const PLACE_ZOOM = 13;

/**
 * Free-text search: city, village, neighbourhood (Arabic or English) or raw
 * "lat, lon" coordinates. Results are biased to Syria.
 */
export function SearchBox() {
  const goTo = useExplorerStore((state) => state.goTo);
  const [text, setText] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedText = useDebouncedValue(text, DEBOUNCE_MS);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const query = debouncedText.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    geocodingService
      .search(query, abort.signal)
      .then((results) => {
        if (abort.signal.aborted) return;
        setPlaces(results);
        setOpen(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
  }, [debouncedText]);

  const choose = (place: Place) => {
    setOpen(false);
    setText(place.name);
    goTo(place.name, place.location, PLACE_ZOOM);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-surface-600 bg-surface-900/90 px-3 py-2 shadow-lg backdrop-blur">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-gray-400">
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => places.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && places[0]) choose(places[0]);
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder="Search Syria — city, village or 35.13, 36.76"
          aria-label="Search Syria"
          className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
        />
        {loading && (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-surface-600 border-t-accent-400" />
        )}
      </div>

      {open && places.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-surface-600 bg-surface-900/95 shadow-2xl backdrop-blur">
          {places.map((place) => (
            <li key={`${place.location.lat},${place.location.lon},${place.displayName}`}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface-700"
              >
                <span className="text-gray-100">{place.name}</span>
                <span className="mt-0.5 block truncate text-xs text-gray-500">
                  {place.displayName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
