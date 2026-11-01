// For a site built on stomme: lists every shared file that differs from upstream/main, as last fetched. Run: npm run compare:upstream
import { execFileSync } from 'node:child_process';
import { isSiteFile } from './lib/site-files.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
const attempt = (...args) => {
  try {
    return git(...args).trim();
  } catch {
    return '';
  }
};

const upstream = attempt('remote', 'get-url', 'upstream');
if (!/(^|[/:])stomme(\.git)?\/?$/.test(upstream)) {
  console.log(`The upstream remote (${upstream || 'none'}) isn't stomme, so there is nothing to compare. This check is for sites built on stomme.`);
  process.exit(0);
}
if (!attempt('rev-parse', '--verify', '-q', 'upstream/main')) {
  console.error('No upstream/main here yet. Run: git fetch upstream');
  process.exit(1);
}

const names = text => text.split('\0').filter(Boolean);
const changed = names(git('diff', '--name-only', '--no-renames', '-z', 'upstream/main'));
const untracked = names(git('ls-files', '-o', '--exclude-standard', '-z'));
const differ = [...new Set([...changed, ...untracked])].filter(file => !isSiteFile(file)).sort();

if (!differ.length) {
  console.log('Every shared file matches upstream/main.');
  process.exit(0);
}
console.log(`${differ.length} shared files differ from upstream/main:\n${differ.map(file => `  ${file}`).join('\n')}`);
process.exit(1);
