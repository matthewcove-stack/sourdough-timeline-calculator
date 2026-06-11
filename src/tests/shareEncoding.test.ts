import { describe, expect, it } from 'vitest';
import { decodeJsonFromUrl, encodeJsonForUrl } from '../lib/shareEncoding';

describe('share URL encoding', () => {
  it('round-trips Unicode notes safely', () => {
    const schedule = {
      settings: {
        finalReadyAt: 2220
      },
      points: [
        {
          id: 'feed-1',
          time: 1080,
          notes: 'starter ready 🔥 café'
        }
      ]
    };

    expect(decodeJsonFromUrl(encodeJsonForUrl(schedule))).toEqual(schedule);
  });
});
