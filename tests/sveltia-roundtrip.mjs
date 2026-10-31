// Emulates Sveltia's first save of every post (its YAML lib + options, field order, defaults, empty-field omission) from admin/config.yml, and reports anything Eleventy would read differently. Run after any field change in the config.
// Usage: `node tests/sveltia-roundtrip.mjs` (report) · `… <file.md>` (print one emulated save) · `… --write-all` (rewrite every post for a before/after build diff; undo with `git checkout -- src/posts`).
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(`${ROOT}/package.json`);
const matter = require('gray-matter');
const jsyaml = require(`${ROOT}/node_modules/@11ty/eleventy/node_modules/js-yaml`); // ⚠ the js-yaml Eleventy passes to gray-matter, not gray-matter's own
const YAML = require('yaml'); // same library Sveltia uses

const KIND = { string: 'string', text: 'string', select: 'string', image: 'string', list: 'list', boolean: 'boolean', number: 'number' };
const DEFAULTS = { string: '', list: [], boolean: false };
const config = YAML.parse(fs.readFileSync(`${ROOT}/admin/config.yml`, 'utf8'));
const fieldsByType = {};
const numericSelect = (f) => f.widget === 'select' && f.options?.every((o) => typeof (o?.value ?? o) === 'number'); // star ratings: labels are stars, values numbers
const expand = (fields, prefix = '') => fields.flatMap((f) => (f.widget === 'object' ? expand(f.fields, `${prefix}${f.name}.`) : [{ ...f, name: prefix + f.name, ...(numericSelect(f) && { widget: 'number' }) }])); // object → its subfields as key paths (photo.alt), like Sveltia
for (const c of config.collections) {
  const fields = expand(c.fields.filter((f) => f.widget !== 'markdown' && f.widget !== 'richtext'));
  fields.filter((f) => !KIND[f.widget]).forEach((f) => console.warn(`⚠ ${c.name}.${f.name}: widget "${f.widget}" isn't emulated — add it to KIND before trusting this report`));
  fieldsByType[c.folder] = { filter: c.filter, depth: c.nested ? (c.nested.depth ?? Infinity) : 1, fields: fields.map((f) => [f.name, KIND[f.widget] ?? 'string', f.required !== false]) };
}

const fieldList = (name, fields) => { fields.filter((f) => !KIND[f.widget] && f.widget !== 'relation').forEach((f) => console.warn(`⚠ ${name}.${f.name}: widget "${f.widget}" isn't emulated — add it to KIND before trusting this report`)); return fields.map((f) => [f.name, f.types ? 'any' : f.widget === 'relation' ? (f.multiple ? 'list' : 'string') : KIND[f.widget] ?? 'string', f.required !== false]); }; // a list with `types` holds objects: kept as-is, not checked
const singletons = (config.singletons ?? []).map((s) => ({ file: s.file, data: /\.ya?ml$/.test(s.file), fields: fieldList(s.name, expand(s.fields.filter((f) => f.widget !== 'markdown'))) }));

const FM = /^---\n(?:(?<head>[\s\S]*?))\n---(?:\n(?<body>[\s\S]*))?$/s;
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !Object.keys(v).length);
const eleventy = (text) => { const r = matter(text, { engines: { yaml: (s) => jsyaml.load(s) } }); return { data: r.data, body: r.content.trim() }; };
const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare; // Sveltia's own (from @sveltia/utils)
const flatten = (o, prefix = '', out = {}) => { for (const [k, v] of Object.entries(o)) { const p = prefix ? `${prefix}.${k}` : k; if (v && typeof v === 'object' && Object.keys(v).length) flatten(v, p, out); else out[p] = v; } return out; };
const unflatten = (map) => { const res = {}; for (const [p, v] of Object.entries(map)) { const parts = p.split('.'); let cur = res; parts.forEach((part, i) => { if (i === parts.length - 1) cur[part] = v; else cur = cur[part] ??= /^\d+$/.test(parts[i + 1]) ? [] : {}; }); } return res; };
const dottedKeys = (o, p = '') => (o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => [...(k.includes('.') ? [p + k] : []), ...dottedKeys(v, `${p}${k}.`)]) : []);

// A YAML data file saves like front matter with no body; Sveltia ends it with one newline.
const sveltiaSaveData = (text, fields) => { const r = sveltiaSave(`---\n${text.trimEnd()}\n---\n`, fields); return { ...r, text: `${r.text.slice(4, -5)}\n` }; };

function sveltiaSave(text, fields) {
  const m = text.match(FM);
  if (!m) throw new Error('front matter not matched');
  const head = YAML.parse(m.groups.head) ?? {};
  const body = (m.groups.body ?? '').replace(/^\n/, '').replace(/\s+$/, '');
  const warnings = dottedKeys(head).map((k) => `key with a dot: ${k}`);
  const out = {};
  for (const [key, kind, required] of fields) {
    const found = key.split('.').reduce((o, k) => o?.[k], head);
    const v = found === undefined ? structuredClone(DEFAULTS[kind]) : found;
    if (!isEmpty(v)) {
      if (kind === 'string' && typeof v !== 'string') warnings.push(`${key} is a ${typeof v}, field is text`);
      if (kind === 'list' && (!Array.isArray(v) || v.some((x) => typeof x !== 'string'))) warnings.push(`${key} is not a list of text`);
      if (kind === 'boolean' && typeof v !== 'boolean') warnings.push(`${key} is a ${typeof v}, field is yes/no`);
      if (kind === 'number' && typeof v !== 'number') warnings.push(`${key} is a ${typeof v}, field is a number`);
    }
    if (!required && isEmpty(v)) continue;
    out[key] = v;
  }
  // Like Sveltia: the other keys are flattened to paths (photo.downloads.0.bytes), sorted naturally, and rebuilt — so nested keys get sorted too.
  const rest = Object.fromEntries(Object.entries(flatten(head)).filter(([p]) => !fields.some(([f]) => p === f || p.startsWith(`${f}.`))));
  Object.keys(rest).sort(compare).forEach((p) => { out[p] = rest[p]; });
  const yaml = YAML.stringify(unflatten(out), null, { indent: 2, indentSeq: true, lineWidth: 0, defaultKeyType: 'PLAIN', defaultStringType: 'PLAIN', singleQuote: true }).trim();
  return { text: `---\n${yaml}\n---\n${body ? `\n${body}\n` : ''}`, warnings };
}

// A post belongs to the collection whose folder holds it within `nested.depth` levels (1 unless nested), like Sveltia.
const headOf = (rel) => { const m = fs.readFileSync(`${ROOT}/${rel}`, 'utf8').match(FM); try { return (m && YAML.parse(m.groups.head)) ?? {}; } catch { return {}; } };
const dirFor = (rel) => { const p = rel.split(path.sep).join('/'); return Object.keys(fieldsByType).find((dir) => { const c = fieldsByType[dir]; return p.startsWith(`${dir}/`) && p.slice(dir.length + 1).split('/').length <= c.depth && (!c.filter || headOf(rel)[c.filter.field] === c.filter.value); }); };
const fieldsFor = (rel) => fieldsByType[dirFor(rel)]?.fields;
const posts = [...new Set(Object.keys(fieldsByType).flatMap((dir) => fs.readdirSync(`${ROOT}/${dir}`, { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f.split(path.sep).join('/')}`)))].filter((rel) => fieldsFor(rel));

if (process.argv[2] === '--write-all') {
  for (const rel of posts) fs.writeFileSync(`${ROOT}/${rel}`, sveltiaSave(fs.readFileSync(`${ROOT}/${rel}`, 'utf8'), fieldsFor(rel)).text);
  process.exit(0);
}
const single = singletons.find((x) => path.resolve(ROOT, x.file) === path.resolve(process.argv[2] ?? ''));
if (single) {
  process.stdout.write((single.data ? sveltiaSaveData : sveltiaSave)(fs.readFileSync(process.argv[2], 'utf8'), single.fields).text);
  process.exit(0);
}
if (process.argv[2]) {
  const rel = path.relative(ROOT, path.resolve(process.argv[2]));
  process.stdout.write(sveltiaSave(fs.readFileSync(process.argv[2], 'utf8'), fieldsFor(rel)).text);
  process.exit(0);
}

// Expected on a first save: a yes/no field gets `false` when absent, and an empty optional field disappears.
const expected = (kind, a, b) => (kind === 'boolean' && a === undefined && b === false) || (isEmpty(a) && b === undefined);
const report = {};
for (const rel of posts) {
  const r = (report[dirFor(rel).replace(/^src\/(posts\/)?/, '')] ??= { posts: 0, identical: 0, expected: 0, problems: [] });
  r.posts++;
  const text = fs.readFileSync(`${ROOT}/${rel}`, 'utf8');
  let saved;
  try { saved = sveltiaSave(text, fieldsFor(rel)); } catch (e) { r.problems.push(`${rel}: Sveltia can't read it — ${e.message.split('\n')[0]}`); continue; }
  if (saved.text === text) r.identical++;
  saved.warnings.forEach((w) => r.problems.push(`${rel}: ${w}`));
  const before = eleventy(text), after = eleventy(saved.text);
  for (const key of new Set([...Object.keys(before.data), ...Object.keys(after.data)])) {
    const a = before.data[key], b = after.data[key];
    if (isDeepStrictEqual(a, b)) continue;
    if (expected(fieldsFor(rel).find(([f]) => f === key)?.[1], a, b)) { r.expected++; continue; }
    const quotedDate = typeof a === 'string' && b instanceof Date && new Date(a).getTime() === b.getTime();
    r.problems.push(`${rel}: ${key} ${quotedDate ? 'loses its quote marks (same moment; Eleventy now reads a date, not text)' : `${JSON.stringify(a)?.slice(0, 80)} → ${JSON.stringify(b)?.slice(0, 80)}`}`);
  }
  if (before.body !== after.body) r.problems.push(`${rel}: body text changes`);
}
for (const [type, r] of Object.entries(report)) {
  console.log(`${type}: ${r.posts} posts, ${r.identical} untouched, ${r.expected} expected tidy-ups, ${r.problems.length} to look at`);
  r.problems.filter((p) => !p.includes('loses its quote marks')).forEach((p) => console.log(`   ! ${p}`));
  const quoted = r.problems.filter((p) => p.includes('loses its quote marks')).length;
  if (quoted) console.log(`   · ${quoted} quoted dates lose their quote marks (checked 2026-09-10: only hidden timestamps on quoted date-only values change)`);
}
for (const { file, data, fields } of singletons) {
  const text = fs.readFileSync(`${ROOT}/${file}`, 'utf8');
  const saved = (data ? sveltiaSaveData : sveltiaSave)(text, fields);
  const read = (t) => (data ? jsyaml.load(t) : eleventy(t));
  const same = isDeepStrictEqual(read(text), read(saved.text));
  console.log(`${file}: ${saved.text === text ? 'untouched by a save' : 'a save rewrites it'}; values ${same ? 'identical' : 'CHANGE'}`);
  saved.warnings.forEach((w) => console.log(`   ! ${w}`));
}
