import {execFileSync} from 'node:child_process';

const DAY = 86400000;

// One `git log` over the whole repo, read once per process: path → its commits, newest first. ⚠ `core.quotePath=false` keeps names with å/ä/ö readable, or they never match. ⚠ A dev server keeps this until restart, so a new commit doesn't show until then.
let history = null;

const readHistory = () => {
  const map = new Map();
  try {
    const out = execFileSync('git', ['-c', 'core.quotePath=false', 'log', '--format=>%H%x09%cI', '--name-only', '--no-renames'], {encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
    let commit = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('>')) {
        const [hash, date] = line.slice(1).split('\t');
        commit = {hash, date: new Date(date)};
      } else if (line && commit) {
        if (!map.has(line)) map.set(line, []);
        map.get(line).push(commit);
      }
    }
    for (const commits of map.values()) commits.sort((a, b) => b.date - a.date);
  } catch {}
  return map;
};

/** A source file's last commit {hash, date, path, first}, or null without git history (⚠ a shallow clone on the build host hides it). `first` is the first commit on or after `published` — the page as first written — or null when that came more than a week later (an imported or backdated post). `path` is URL-encoded for GitHub links. */
export const gitRevision = (inputPath, published) => {
  history ??= readHistory();
  const repoPath = inputPath.replace(/^\.\//, '');
  const commits = history.get(repoPath);
  if (!commits) return null;
  let first = null;
  if (published) {
    const from = new Date(published) - DAY;
    first = commits.findLast(c => c.date >= from) ?? null;
    if (first && first.date - from > 8 * DAY) first = null;
  }
  return {...commits[0], first, path: repoPath.split('/').map(encodeURIComponent).join('/')};
};
