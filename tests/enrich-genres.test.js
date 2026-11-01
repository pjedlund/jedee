// Unit tests for the MusicBrainz genre enrichment (src/_config/setup/enrich-genres.js).
// The risk in that script is the front-matter rewrite: it edits published posts in place, so a bad match either eats a neighbouring key or silently writes nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import {pickGenres, setGenres} from '../src/_config/setup/enrich-genres.js';

const post = (front, body = 'Body text.\n') => `---\n${front}---\n${body}`;

test('setGenres: replaces an existing list without touching the neighbouring keys', () => {
  const before = post(
    'title: Sunbather\ndate: 2013-05-28\nalbum: Sunbather\ngenre:\n  - "[[rock]]"\nyear: 2013\n'
  );
  const after = setGenres(before, ['rock', 'blackgaze']);
  assert.match(after, /genre:\n {2}- "\[\[rock\]\]"\n {2}- "\[\[blackgaze\]\]"\nyear: 2013\n/);
  assert.match(after, /^---\ntitle: Sunbather\ndate: 2013-05-28\n/);
  assert.equal(after.endsWith('---\nBody text.\n'), true);
});

test('setGenres: replaces a scalar genre with a list', () => {
  const after = setGenres(post('album: X\ngenre: rock\nyear: 2013\n'), ['rock', 'punk']);
  assert.match(after, /genre:\n {2}- "\[\[rock\]\]"\n {2}- "\[\[punk\]\]"\nyear: 2013\n/);
});

test('setGenres: inserts after album: when there is no genre key', () => {
  const after = setGenres(post('title: X\nalbum: Spiderland\nyear: 1991\n'), ['slowcore']);
  assert.match(after, /album: Spiderland\ngenre:\n {2}- "\[\[slowcore\]\]"\nyear: 1991\n/);
});

test('setGenres: appends when there is neither genre nor album', () => {
  const after = setGenres(post('title: X\nartist: "[[Refused]]"\n'), ['punk']);
  assert.match(after, /artist: "\[\[Refused\]\]"\ngenre:\n {2}- "\[\[punk\]\]"\n---/);
});

test('setGenres: an empty front matter block is an error, not a silent no-op', () => {
  assert.throws(() => setGenres('No front matter here.\n', ['punk']), /no front matter/);
});

const entry = {
  releaseGenres: [{name: 'blackgaze', count: 11}, {name: 'post-metal', count: 5}],
  artistGenres: [{name: 'shoegaze', count: 3}, {name: 'black metal', count: 1}],
};

test('pickGenres: existing values survive and lead', () => {
  const {genres, added} = pickGenres(['[[rock]]'], entry);
  assert.deepEqual(genres, ['rock', 'blackgaze', 'post-metal']);
  assert.deepEqual(added, ['blackgaze', 'post-metal']);
});

test('pickGenres: release genres outrank artist genres at an equal vote count', () => {
  const tie = {
    releaseGenres: [{name: 'post-rock', count: 3}],
    artistGenres: [{name: 'math rock', count: 3}],
  };
  assert.deepEqual(pickGenres([], tie).genres, ['post-rock', 'math rock']);
  assert.deepEqual(pickGenres([], tie, 1).genres, ['post-rock']);
});

test('pickGenres: never adds a genre the post already has in another spelling', () => {
  const {added} = pickGenres(['hip-hop'], {artistGenres: [{name: 'hip hop', count: 9}]});
  assert.deepEqual(added, []);
});

test('pickGenres: a post already at the cap gains nothing', () => {
  const {genres, added} = pickGenres(['a', 'b', 'c'], entry);
  assert.deepEqual(genres, ['a', 'b', 'c']);
  assert.deepEqual(added, []);
});

test('pickGenres: an artist MusicBrainz knows nothing about leaves the post as it was', () => {
  assert.deepEqual(pickGenres(['[[reggae]]'], undefined).genres, ['reggae']);
  assert.deepEqual(pickGenres([], {artistGenres: [], releaseGenres: []}).genres, []);
});
