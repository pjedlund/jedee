import {test} from 'node:test';
import assert from 'node:assert/strict';
import {looksSwedish} from '../src/_config/utils/looks-swedish.js';

// Real activity titles that MUST be flagged Swedish (åäö or a Swedish word).
const swedish = [
  'Styrketräning på eftermiddagen',
  'Löpning på eftermiddagen',
  'Gymträning måndag',
  'Orientering Bokskogen',
  'Parkorientering',
  'Sprintorientering Alnarpsparken',
  'DM Lång H55',
  'DM medel H55',
  'Nattorientering Söderåsen',
  'Månadens bana',
  'Söderåsenrundan',
  'Till starten...',
  'Vintercupen E3 Gyabjär',
  'Vintercupen E1',
  'Veteran-SM Lång H55',
  'SM medel 2021',
  'Kretsmästerskap och Natt-KM',
  'Hitta ut Guddehjälm',
  'KM H55 Ystad strandskog',
  'Gotland dag 8: Gotland 3-dagars etapp 1',
];

// English (or bare proper-noun) titles that must NOT be flagged — they stay at `en`.
// Note "Orienteering" (en) must not match while "Orientering" (sv) does.
const notSwedish = [
  'Afternoon Run',
  'Afternoon Weight Training',
  'Lunch Weight Training',
  'Orienteering',
  'Orienteering line',
  'Keps-OL',
  'MPOL E03',
  'O-ringen H55K E1',
  'Extra OL',
];

test('looksSwedish flags Swedish activity titles', () => {
  for (const t of swedish) assert.ok(looksSwedish(t), `should be Swedish: ${t}`);
});

test('looksSwedish leaves English / proper-noun titles alone', () => {
  for (const t of notSwedish) assert.ok(!looksSwedish(t), `should NOT be Swedish: ${t}`);
});

test('looksSwedish handles non-strings', () => {
  assert.equal(looksSwedish(undefined), false);
  assert.equal(looksSwedish(null), false);
});
