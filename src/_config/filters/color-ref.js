// Resolve a "{color.foo.bar}" token reference to its hex, against colors.json. Tries the nested path first (gray.900), then the hyphen-joined top-level key (base.lightest → base-lightest). A plain value passes through.
export const colorRef = (ref, colors) => {
  const m = String(ref).match(/^\{([^}]+)\}$/);
  if (!m) return ref;
  const path = m[1];
  if (!path.startsWith('color.')) return null;
  const parts = path.slice('color.'.length).split('.');
  let cur = colors;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else {
      cur = null;
      break;
    }
  }
  if (cur && cur.$value) return cur.$value;
  return colors[parts.join('-')]?.$value ?? null;
};
