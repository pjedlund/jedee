import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyOf, compareRows} from '../src/assets/scripts/components/sortable-table.js';

const cell = (text, sort) => ({textContent: text, dataset: sort === undefined ? {} : {sort}});
const sortBy = (keys, direction) =>
  keys
    .map((key, index) => ({key, index}))
    .sort((a, b) => compareRows(a, b, direction))
    .map(r => r.key);

test('keyOf: data-sort is a number, text otherwise, empty is null', () => {
  assert.equal(keyOf(cell('3.5', '3.51')), 3.51);
  assert.equal(keyOf(cell('Run')), 'Run');
  assert.equal(keyOf(cell('', '')), null);
  assert.equal(keyOf(cell('  ')), null);
});

test('numbers sort both ways, empties always last', () => {
  assert.deepEqual(sortBy([3, null, 10, 1], 'descending'), [10, 3, 1, null]);
  assert.deepEqual(sortBy([3, null, 10, 1], 'ascending'), [1, 3, 10, null]);
});

test('text sorts numerically aware, ties keep page order', () => {
  assert.deepEqual(sortBy(['E10', 'E2', 'E1'], 'ascending'), ['E1', 'E2', 'E10']);
  const rows = [{key: 5, index: 0}, {key: 5, index: 1}];
  assert.equal(compareRows(rows[0], rows[1], 'descending'), -1);
});

// The activities table's Type column shows an icon, so its sort value is the type name in data-sort. Number() turned that into NaN and a NaN comparator left every row where it was.
test('a data-sort that is not a number sorts as text, not NaN', () => {
  assert.equal(keyOf(cell('Run', 'run')), 'run');
  assert.ok(!Number.isNaN(keyOf(cell('Run', 'run'))));
  const types = ['run', 'orienteering', 'weight training', 'hike'];
  assert.deepEqual(sortBy(types, 'ascending'), ['hike', 'orienteering', 'run', 'weight training']);
  assert.deepEqual(sortBy(types, 'descending'), ['weight training', 'run', 'orienteering', 'hike']);
});
