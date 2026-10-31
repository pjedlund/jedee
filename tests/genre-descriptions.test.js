// Unit tests for the Wikipedia genre descriptions (src/_config/setup/genre-descriptions.js).
// The risk here is a confident description of the WRONG subject — "country" as a political entity, "noise" as unwanted sound. Both guards that catch that are tested below.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidateTitles,
  firstSentence,
  isExactMatch,
  looksMusical,
  readSummary,
} from '../src/_config/setup/genre-descriptions.js';

test('candidateTitles: tries the bare name first, then the disambiguating forms', () => {
  assert.deepEqual(candidateTitles('blackgaze'), [
    'blackgaze',
    'blackgaze music',
    'blackgaze (music)',
    'blackgaze (genre)',
  ]);
});

test('firstSentence: takes the lead sentence only', () => {
  const extract =
    'Blackgaze is a fusion genre combining elements of black metal and shoegaze. The word is a blend of the two names. More follows.';
  assert.equal(
    firstSentence(extract),
    'Blackgaze is a fusion genre combining elements of black metal and shoegaze.'
  );
});

test('firstSentence: a very short lead takes the next sentence too', () => {
  assert.equal(
    firstSentence('Drone is a genre. It is characterised by sustained sounds.'),
    'Drone is a genre. It is characterised by sustained sounds.'
  );
});

test('firstSentence: an abbreviation does not end the sentence', () => {
  assert.equal(
    firstSentence('IDM emerged in the U.K. during the 1990s as a label for electronic music.'),
    'IDM emerged in the U.K. during the 1990s as a label for electronic music.'
  );
});

test('firstSentence: nothing in, empty string out', () => {
  assert.equal(firstSentence(undefined), '');
  assert.equal(firstSentence(''), '');
});

test('readSummary: a disambiguation page is a miss, never a description', () => {
  assert.equal(readSummary({type: 'disambiguation', extract: 'Filth may refer to:'}), null);
});

test('readSummary: a 404 payload is a miss', () => {
  assert.equal(
    readSummary({type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found'}),
    null
  );
  assert.equal(readSummary(null), null);
});

test('readSummary: a standard article yields description, title and url', () => {
  const result = readSummary({
    type: 'standard',
    title: 'Blackgaze',
    extract: 'Blackgaze is a fusion genre combining black metal and shoegaze. More text.',
    content_urls: {desktop: {page: 'https://en.wikipedia.org/wiki/Blackgaze'}},
  });
  assert.equal(result.title, 'Blackgaze');
  assert.equal(result.description, 'Blackgaze is a fusion genre combining black metal and shoegaze.');
  assert.equal(result.url, 'https://en.wikipedia.org/wiki/Blackgaze');
});

test('isExactMatch: accepts the genre itself and its music-suffixed forms', () => {
  assert.equal(isExactMatch('blackgaze', 'Blackgaze'), true);
  assert.equal(isExactMatch('country', 'Country music'), true);
  assert.equal(isExactMatch('electro', 'Electro (music)'), true);
  assert.equal(isExactMatch('contemporary r&b', 'Contemporary R&B'), true);
});

test('isExactMatch: rejects an article a redirect carried us to', () => {
  assert.equal(isExactMatch('contemporary', 'Contemporary history'), false);
  assert.equal(isExactMatch('orchestral', 'Orchestra'), false);
  assert.equal(isExactMatch('dark jazz', 'Dark Ozz'), false);
});

test('looksMusical: catches the exact-title match that is about the wrong subject', () => {
  // Both of these matched their genre's title exactly and would otherwise have shipped.
  assert.equal(looksMusical('Noise is sound, chiefly unwanted, unintentional, or harmful sound.'), false);
  assert.equal(looksMusical('The term country refers to a political entity or its territory.'), false);
  assert.equal(looksMusical('Blackgaze is a fusion genre combining black metal and shoegaze.'), true);
  assert.equal(looksMusical(''), false);
});
