import { useRef, useState } from 'react';
import type { Place } from '@/types';
import { geocodingService } from '@/services';
import { useExplorerStore } from '@/hooks/useExplorerStore';

const PLACE_ZOOM = 13;

/**
 * Free-text search: city, village, neighbourhood (Arabic or English) or raw
 * "lat, lon" coordinates, biased to Syria. Geocoding runs ONLY on explicit
 * submit (Enter or the Go button) — the public Nominatim policy forbids
 * autocomplete, and panning the map is the primary way to explore anyway.
 */
export function SearchBox() {
  const goTo = useExplorerStore((state) => state.goTo);
  const [text, setText] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const submit = () => {
    const query = text.trim();
    if (query.length === 0 || loading) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setNoResults(false);
    geocodingService
      .search(query, abort.signal)
      .then((results) => {
        if (abort.signal.aborted) return;
        if (results.length === 1 && results[0]) {
          choose(results[0]);
        } else {
          setPlaces(results);
          setOpen(results.length > 0);
          setNoResults(results.length === 0);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
  };

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
          onChange={(event) => {
            setText(event.target.value);
            setNoResults(false);
          }}
          onFocus={() => places.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder="Search Syria — city, village or 35.13, 36.76"
          aria-label="Search Syria"
          enterKeyHint="search"
          className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
        />
        {loading ? (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-surface-600 border-t-accent-400" />
        ) : (
          <button
            type="button"
            onClick={submit}
            aria-label="Search"
            className="shrink-0 rounded-lg bg-surface-700 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-surface-600"
          >
            Go
          </button>
        )}
      </div>

      {noResults && (
        <p className="absolute top-full right-0 left-0 z-30 mt-2 rounded-xl border border-surface-600 bg-surface-900/95 px-4 py-2.5 text-xs text-gray-400 shadow-2xl backdrop-blur">
          Nothing found in Syria for that search.
        </p>
      )}

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
          <li className="border-t border-surface-700/60 px-4 py-1.5 text-[10px] text-gray-600">
            Search results © OpenStreetMap contributors (Nominatim)
          </li>
        </ul>
      )}
    </div>
  );
}
