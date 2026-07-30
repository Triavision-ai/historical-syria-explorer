import { useState } from 'react';

const STORAGE_KEY = 'hse-welcome-dismissed';

/** Three-step how-to shown on first visit only. */
export function WelcomeHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-28 z-50 mx-auto max-w-sm rounded-2xl border border-surface-600 bg-surface-900/95 p-4 shadow-2xl backdrop-blur sm:top-24">
      <h2 className="text-sm font-bold text-gray-100">How to explore</h2>
      <ol className="mt-2 space-y-2 text-sm text-gray-300">
        <li className="flex gap-2">
          <span className="font-bold text-accent-400">1.</span>
          <span>
            <strong>Pan and zoom</strong> to any place in Syria — or search for a city, village, or
            coordinates.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-accent-400">2.</span>
          <span>
            The bottom timeline shows the <strong>real dates</strong> of imagery captured here. Tap
            a date to see that image. Or pick one yourself from <strong>Scenes</strong>.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-accent-400">3.</span>
          <span>
            Tap <strong>Compare</strong> to swipe between then and now — or tap <strong>⇄</strong>{' '}
            on any scene to put it on the right side and compare two dates.
          </span>
        </li>
      </ol>
      <p className="mt-2 text-xs text-gray-500">
        Tip: the ☁ percentage on each scene is cloud cover — lower is clearer.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-accent-400"
      >
        Got it
      </button>
    </div>
  );
}
