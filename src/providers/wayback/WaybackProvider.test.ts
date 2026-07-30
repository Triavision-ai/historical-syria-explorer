import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaybackProvider } from './WaybackProvider';
import { SYRIA_BBOX } from '@/config/app.config';

/** One Wayback config entry per given release date. */
function config(dates: string[]): Record<string, unknown> {
  return Object.fromEntries(
    dates.map((date, index) => [
      String(1000 + index),
      {
        itemID: `item-${index}`,
        itemTitle: `World Imagery (Wayback ${date})`,
        itemURL: `https://example.com/${index}/{level}/{row}/{col}`,
      },
    ]),
  );
}

function stubConfig(dates: string[]) {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(new Response(JSON.stringify(config(dates)), { status: 200 })),
  );
}

const query = { spatial: { kind: 'bbox' as const, bbox: SYRIA_BBOX } };

describe('WaybackProvider release de-duplication', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the last release of each calendar quarter', async () => {
    stubConfig([
      '2020-01-15',
      '2020-03-15',
      '2020-05-15',
      '2020-06-15',
      '2020-08-15',
      '2020-09-15',
      '2020-11-15',
      '2020-12-15',
    ]);
    const scenes = await new WaybackProvider().search(query);
    expect(scenes.map((scene) => scene.captureDate.slice(0, 10))).toEqual([
      '2020-03-15',
      '2020-06-15',
      '2020-09-15',
      '2020-12-15',
    ]);
  });

  it('treats April and July as different quarters', async () => {
    // floor(month / 4) put Apr-Jul in one bucket, so a July release displaced
    // the April one and December was isolated in a quarter of its own.
    stubConfig(['2019-04-10', '2019-07-10']);
    const scenes = await new WaybackProvider().search(query);
    expect(scenes).toHaveLength(2);
  });

  it('honours the date filter', async () => {
    stubConfig(['2015-06-01', '2021-06-01']);
    const scenes = await new WaybackProvider().search({
      ...query,
      dateFrom: '2020-01-01T00:00:00Z',
    });
    expect(scenes.map((scene) => scene.captureDate.slice(0, 4))).toEqual(['2021']);
  });
});
