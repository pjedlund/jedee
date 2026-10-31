import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countStep} from '../src/assets/scripts/preloader-count.js';

// Run the count at 60 fps with the map ready at `readyAt` ms; returns the number shown on each frame.
const run = readyAt => {
  let state = {p: 0, speed: 1};
  const frames = [];
  for (let t = 0; state.n !== 100 && t < 20000; t += 1000 / 60) {
    state = countStep(state, t === 0 ? 0 : 1000 / 60, t >= readyAt);
    frames.push({t, n: state.n});
  }
  return frames;
};

for (const readyAt of [300, 1500, 5000]) {
  test(`map ready at ${readyAt} ms: counts up smoothly, 100 only once ready`, () => {
    const frames = run(readyAt);
    const last = frames.at(-1);
    assert.equal(last.n, 100);
    assert.ok(last.t >= readyAt);
    for (let i = 1; i < frames.length; i++) assert.ok(frames[i].n >= frames[i - 1].n, 'never counts backwards');
    let changed = 0;
    for (const f of frames.filter(f => f.t < Math.min(readyAt, 3000))) {
      if (f.n !== frames[Math.round(f.t / (1000 / 60)) - 1]?.n) changed = f.t;
      assert.ok(f.t - changed < 1200, `stalls on ${f.n} at ${Math.round(f.t)} ms`);
    }
  });
}

test('broadband: a full count in about 1.85 s', () => {
  const t = run(300).at(-1).t;
  assert.ok(t > 1700 && t < 2000, `took ${Math.round(t)} ms`);
});
