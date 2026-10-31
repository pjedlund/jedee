// Builds a copy of the site with no posts or wiki pages in a temp folder, so a test can change one setting or add a post or two and see the result. Posts come in through `files`: building the real ones would redo all their image work.
import { execFileSync, spawn } from 'node:child_process';
import { constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dump, load } from 'js-yaml';
import matter from 'gray-matter';

const root = path.resolve(import.meta.dirname, '../..');

// A null value deletes the key; objects merge; anything else (arrays included) replaces.
function deepMerge(base, extra) {
  for (const [key, value] of Object.entries(extra)) {
    if (value === null) delete base[key];
    else if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) deepMerge(base[key], value);
    else base[key] = value;
  }
  return base;
}

// Only the .md files are posts and wiki pages; the folders' data files and the wiki mockup sources stay.
const isContent = file => /^src\/(posts|wiki)\/.*\.md$/.test(file);

export async function makeTempSite({ settings = {}, files = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'jedee-site-'));
  const made = new Set();
  const put = (file, text) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };

  const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
  for (const file of new Set(tracked)) {
    if (isContent(file) || !existsSync(path.join(root, file))) continue;
    const target = path.join(dir, file);
    if (!made.has(path.dirname(target))) {
      mkdirSync(path.dirname(target), { recursive: true });
      made.add(path.dirname(target));
    }
    copyFileSync(path.join(root, file), target, constants.COPYFILE_FICLONE);
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');

  const settingsFile = 'src/_data/settings.yaml';
  put(settingsFile, dump(deepMerge(load(readFileSync(path.join(root, settingsFile), 'utf8')), settings), { lineWidth: -1 }));

  // The picks name posts that no longer exist, so both lists start empty. ⚠ The /now/ body is dropped too: its YouTube poster is fetched over the network.
  const featuredFile = 'src/_data/featured.yaml';
  put(featuredFile, dump({ ...load(readFileSync(path.join(root, featuredFile), 'utf8')), posts: [] }, { lineWidth: -1 }));
  const nowFile = 'src/pages/now.md';
  const now = matter(readFileSync(path.join(root, nowFile), 'utf8'));
  for (const pick of ['listening', 'watching', 'reading']) if (pick in now.data) now.data[pick] = [];
  put(nowFile, matter.stringify('', now.data));

  for (const [file, text] of Object.entries(files)) put(file, text);

  return {
    dir,
    build() {
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs')], { cwd: dir, env: { ...process.env, ELEVENTY_ENV: 'production' } });
        let output = '';
        child.stdout.on('data', chunk => (output += chunk));
        child.stderr.on('data', chunk => (output += chunk));
        child.on('error', reject);
        child.on('close', code => (code === 0 ? resolve(output) : reject(new Error(`Eleventy exited with ${code}\n${output}`))));
      });
    },
    read: file => readFileSync(path.join(dir, 'dist', file), 'utf8'),
    exists: file => existsSync(path.join(dir, 'dist', file)),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
