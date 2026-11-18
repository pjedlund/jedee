// Updates the variables in the FigCraft design file from the active theme's tokens; the repo is the source, FigCraft the mirror.
// Usage: `npm run figcraft:tokens` writes; `npm run figcraft:tokens -- --check` only reports. FIGCRAFT_FILE and FIGCRAFT_PORT override the defaults.
// ⚠ Close the file in FigCraft first, or reopen it after: a window still holding the old version will refuse to save over the new one.

import {execFile, execFileSync} from 'node:child_process';
import {copyFile, mkdtemp, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import net from 'node:net';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from './build-penpot-tokens.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FILE_IN_REPO = '_local/originals/figcraft/jedee website.figcraft';
const PORT = Number(process.env.FIGCRAFT_PORT || 7979);
const APP = '/Applications/FigCraft.app';
const CHECK_ONLY = process.argv.includes('--check');
const MODES = ['Light', 'Dark'];

// Token kinds FigCraft keeps elsewhere: type.* and shadow.* are text and effect styles, letter spacing uses the site's computed tracking on purpose.
const NOT_SYNCED = [/^type\./, /^shadow\./, /^font\.letterSpacing\./];

// FigCraft-only variables worked out from a repo token: opacity.* is the visibility switch in percent.
const DERIVED = {
	'opacity.light-only': {from: 'visibility.light-only', map: v => v * 100},
	'opacity.dark-only': {from: 'visibility.dark-only', map: v => v * 100},
};

// A worktree has no _local/, so fall back to the main checkout's.
function figcraftFile() {
	if (process.env.FIGCRAFT_FILE) return resolve(process.env.FIGCRAFT_FILE);
	const here = resolve(REPO_ROOT, FILE_IN_REPO);
	if (existsSync(here)) return here;
	const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {cwd: REPO_ROOT}).toString().trim();
	return resolve(dirname(common), FILE_IN_REPO);
}

// ---------- the repo's values, one flat map per mode ----------

function flatten(set, prefix = '', out = {}) {
	for (const [k, v] of Object.entries(set ?? {})) {
		const name = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object' && '$value' in v) out[name] = v;
		else if (v && typeof v === 'object') flatten(v, name, out);
	}
	return out;
}

const hex = s => {
	let h = s.replace('#', '').toLowerCase();
	if (h.length === 3) h = [...h].map(c => c + c).join('');
	if (h.length === 6) h += 'ff';
	return '#' + h;
};

// One repo token → {kind: 'alias', name} or {kind: 'color'|'number'|'string', value}, or null when it isn't a FigCraft variable.
function toFigcraft(token) {
	const v = token.$value;
	if (typeof v === 'string' && /^\{.+\}$/.test(v)) return {kind: 'alias', name: v.slice(1, -1)};
	switch (token.$type) {
		case 'color': return {kind: 'color', value: hex(v)};
		case 'fontFamilies': return {kind: 'string', value: Array.isArray(v) ? v[0] : v};
		default: {
			const n = parseFloat(v);
			return Number.isFinite(n) ? {kind: 'number', value: n} : null;
		}
	}
}

async function repoModes() {
	const dtcg = await build();
	const sets = dtcg.$metadata.tokenSetOrder;
	const core = sets.filter(s => !s.startsWith('theme/'));
	const out = {};
	for (const mode of MODES) {
		const map = {};
		for (const set of [...core, `theme/${mode.toLowerCase()}`]) {
			for (const [name, token] of Object.entries(flatten(dtcg[set]))) {
				if (NOT_SYNCED.some(re => re.test(name))) continue;
				const fc = toFigcraft(token);
				if (fc) map[name] = fc;
			}
		}
		for (const [name, {from, map: fn}] of Object.entries(DERIVED)) {
			if (map[from]?.kind === 'number') map[name] = {kind: 'number', value: fn(map[from].value)};
		}
		out[mode] = map;
	}
	return out;
}

// ---------- talking to FigCraft ----------

function connect() {
	return new Promise((ok, fail) => {
		const sock = net.createConnection({host: '127.0.0.1', port: PORT});
		sock.once('connect', () => ok(sock));
		sock.once('error', fail);
	});
}

async function client() {
	const sock = await connect();
	let buf = '';
	let id = 0;
	const waiting = new Map();
	sock.on('data', d => {
		buf += d;
		let n;
		while ((n = buf.indexOf('\n')) >= 0) {
			const msg = JSON.parse(buf.slice(0, n));
			buf = buf.slice(n + 1);
			waiting.get(msg.id)?.(msg);
			waiting.delete(msg.id);
		}
	});
	const call = (method, params = {}) => new Promise(ok => {
		const msgId = ++id;
		waiting.set(msgId, ok);
		sock.write(JSON.stringify({id: msgId, timeoutMs: 600000, method, params}) + '\n');
	});
	const run = async (command, params = {}) => {
		const res = await call('engine.execute', {command, params});
		if (!res.ok) throw new Error(`FigCraft ${command}: ${JSON.stringify(res.error)}`);
		return res.result;
	};
	return {call, run, close: () => sock.end()};
}

async function startFigcraft(workDir) {
	const busy = await connect().then(s => (s.end(), true), () => false);
	if (busy) throw new Error(`Something already answers on port ${PORT}: quit the FigCraft copy using it, or set FIGCRAFT_PORT.`);
	await new Promise((ok, fail) => execFile('open', ['-n', '-a', APP, '--args', '--control', String(PORT), '--automation-read-root', workDir, '--automation-write-root', workDir], e => (e ? fail(e) : ok())));
	for (let i = 0; i < 60; i++) {
		try { return await client(); } catch { await new Promise(r => setTimeout(r, 500)); }
	}
	throw new Error('FigCraft did not open its control port within 30 seconds.');
}

// ---------- comparing ----------

const toHex = c => '#' + [c.r, c.g, c.b, c.a ?? 1].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const shortHex = h => (h.endsWith('ff') ? h.slice(0, 7) : h);

// FigCraft's variables, grouped per collection as name → {id, type, Light, Dark} with each value in toFigcraft's shape.
function readCollections(list) {
	const byId = Object.fromEntries(list.variables.map(v => [v.id, v]));
	const plain = name => name.replace(/^Themes\//, '');
	return list.collections.map(col => {
		const modeId = Object.fromEntries(col.modes.map(m => [m.name, m.id]));
		const vars = {};
		for (const v of list.variables.filter(v => v.collection === col.id)) {
			const entry = {id: v.id, type: v.resolvedType};
			for (const mode of MODES) {
				const raw = v.values[modeId[mode]];
				if (!raw) continue;
				if (raw.type === 'alias') entry[mode] = {kind: 'alias', name: plain(byId[raw.value]?.name ?? raw.value)};
				else if (raw.type === 'color') entry[mode] = {kind: 'color', value: toHex(raw.value)};
				else entry[mode] = {kind: raw.type, value: raw.value};
			}
			vars[plain(v.name)] = entry;
		}
		return {id: col.id, name: col.name, vars};
	});
}

// Follows links to the final value; `lookup(name)` gives that name's value in the same mode.
function resolveValue(val, lookup, depth = 0) {
	if (val?.kind !== 'alias' || depth > 20) return val;
	return resolveValue(lookup(val.name), lookup, depth + 1);
}

const same = (a, b) => {
	if (!a || !b) return false;
	if (a.kind === 'alias' || b.kind === 'alias') return a.kind === b.kind && a.name === b.name;
	if (typeof a.value === 'number') return Math.abs(a.value - b.value) < 1e-4;
	return a.value === b.value;
};

const show = v => (!v ? '(none)' : v.kind === 'alias' ? `→ ${v.name}` : v.kind === 'color' ? shortHex(v.value) : JSON.stringify(v.value));

function diff(collection, repo) {
	const changed = [];
	const missing = [];
	const figcraftOnly = [];
	for (const name of Object.keys(repo.Light)) {
		const fv = collection.vars[name];
		if (!fv) { missing.push(name); continue; }
		for (const mode of MODES) {
			const want = repo[mode][name];
			const have = fv[mode];
			// A repo value without a link matches a FigCraft link that ends on the same value.
			const haveResolved = want.kind === 'alias' ? have : resolveValue(have, n => collection.vars[n]?.[mode]);
			if (!same(want, haveResolved)) changed.push({name, mode, from: have, to: want});
		}
	}
	for (const name of Object.keys(collection.vars)) {
		if (!(name in repo.Light) && !NOT_SYNCED.some(re => re.test(name))) figcraftOnly.push(name);
	}
	return {changed, missing, figcraftOnly};
}

// The command that puts the repo's value in place; a link to a variable that isn't there yet falls back to its value.
function valueFor(want, collection, repoMode) {
	if (want.kind !== 'alias') return want.value;
	const target = collection.vars[want.name];
	if (target) return {alias: target.id};
	return resolveValue(want, n => repoMode[n])?.value;
}

function report(collection, d) {
	console.log(`\n${collection.name}`);
	if (!d.changed.length && !d.missing.length) console.log('  matches the repo');
	for (const c of d.changed) console.log(`  changed   ${c.name.padEnd(30)} ${c.mode.padEnd(5)} ${show(c.from)}  →  ${show(c.to)}`);
	for (const m of d.missing) console.log(`  missing   ${m}`);
	for (const f of d.figcraftOnly) console.log(`  FigCraft-only (left alone)  ${f}`);
}

// ---------- the run ----------

const target = figcraftFile();
if (!existsSync(target)) throw new Error(`No FigCraft file at ${target}`);
const startBytes = await readFile(target);
const workDir = await mkdtemp(join(tmpdir(), 'figcraft-tokens-'));
const work = join(workDir, 'jedee website.figcraft');
await copyFile(target, work);
await copyFile(target, join(workDir, 'before-sync.figcraft'));

const repo = await repoModes();
const fc = await startFigcraft(workDir);
let totalChanges = 0;
try {
	await fc.run('file.open', {path: work});
	let cols = readCollections(await fc.run('variable.list'));
	const diffs = cols.map(c => diff(c, repo));
	cols.forEach((c, i) => report(c, diffs[i]));
	totalChanges = diffs.reduce((n, d) => n + d.changed.length + d.missing.length, 0);

	if (CHECK_ONLY || !totalChanges) {
		console.log(CHECK_ONLY ? '\nChecked only; nothing written.' : '\nNothing to update.');
	} else {
		const creates = [];
		cols.forEach((c, i) => {
			for (const name of diffs[i].missing) {
				const values = Object.fromEntries(MODES.map(m => [m, valueFor(repo[m][name], c, repo[m])]));
				const first = resolveValue(repo.Light[name], n => repo.Light[n]);
				creates.push({command: 'variable.create', params: {collection: c.id, name: `Themes/${name}`, type: first.kind, values}});
			}
		});
		if (creates.length) {
			await fc.run('command.batch', {label: 'Add tokens from the repo', commands: creates});
			cols = readCollections(await fc.run('variable.list'));
		}
		const sets = [];
		for (const c of cols) {
			for (const ch of diff(c, repo).changed) {
				sets.push({command: 'variable.set', params: {variable: c.vars[ch.name].id, mode: ch.mode, value: valueFor(ch.to, c, repo[ch.mode])}});
			}
		}
		if (sets.length) await fc.run('command.batch', {label: 'Update tokens from the repo', commands: sets});

		const left = readCollections(await fc.run('variable.list')).flatMap(c => diff(c, repo).changed.map(ch => `${c.name}: ${ch.name} (${ch.mode})`));
		if (left.length) throw new Error(`Still different after the update, so nothing was copied back:\n  ${left.join('\n  ')}`);
		await fc.run('file.save', {path: work});
	}
} finally {
	await fc.call('app.quit').catch(() => {});
	fc.close();
}

if (!CHECK_ONLY && totalChanges) {
	const nowBytes = await readFile(target);
	if (!nowBytes.equals(startBytes)) {
		console.log(`\n⚠ ${target} was saved by someone else while this ran; left it alone. Run the command again.`);
		process.exitCode = 1;
	} else {
		await copyFile(work, target);
		console.log(`\nUpdated ${target.replace(REPO_ROOT + '/', '')} (${totalChanges} changes). The version before is at ${join(workDir, 'before-sync.figcraft')}.`);
		console.log('If the file is open in FigCraft, reopen it to see the new values.');
	}
}
