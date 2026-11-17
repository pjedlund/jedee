const storageKey = 'theme-preference';
const themeColors = {
  dark: '{{ meta.themeDark }}',
  light: '{{ meta.themeLight }}'
};

// The tooltip says what a click WILL do; the accessible name stays put and aria-pressed carries the state.
const toggleTooltips = {
  dark: '{{ meta.themeToggleTooltip.toLight }}',
  light: '{{ meta.themeToggleTooltip.toDark }}'
};

const theme = {
  value: getColorPreference()
};

window.addEventListener('load', () => {
  const toggle = document.querySelector('[data-theme-toggle]');

  if (!toggle) {
    return;
  }

  reflectPreference();
  updateMetaThemeColor();
  reflectToggleState(toggle);

  toggle.addEventListener('click', () => {
    // Dismiss the tooltip once the button has been used — CSS alone can only hide it for the length of the press. Cleared below.
    toggle.dataset.tooltipDismissed = '';
    revealTheme(toggle, () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      setPreference();
      reflectToggleState(toggle);
    });
  });

  ['pointerleave', 'blur'].forEach((event) =>
    toggle.addEventListener(event, () => delete toggle.dataset.tooltipDismissed)
  );
});

// sync with system changes only while the visitor has not picked a theme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({matches: isDark}) => {
  if (getStoredPreference()) {
    return;
  }

  theme.value = isDark ? 'dark' : 'light';
  reflectPreference();
  updateMetaThemeColor();
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    reflectToggleState(toggle);
  }
});

// Another open tab saved or cleared a choice (a null key means its storage was wiped): follow it.
window.addEventListener('storage', ({key}) => {
  if (key !== storageKey && key !== null) return;
  theme.value = getColorPreference();
  reflectPreference();
  updateMetaThemeColor();
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) reflectToggleState(toggle);
});

// The new theme grows as a circle from the button (theme-toggle.css); instant where view transitions are missing or reduced motion is asked for.
let currentReveal;
function revealTheme(toggle, update) {
  const root = document.documentElement;
  if (!document.startViewTransition || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    update();
    return;
  }
  const {left, top, width, height} = toggle.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  root.style.setProperty('--theme-reveal-x', `${x}px`);
  root.style.setProperty('--theme-reveal-y', `${y}px`);
  root.style.setProperty('--theme-reveal-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  // ⚠ The attribute keeps these rules off the page-navigation crossfade, which uses the same pseudo-elements.
  root.dataset.themeReveal = '';
  const transition = document.startViewTransition(update);
  currentReveal = transition;
  transition.finished.finally(() => {
    if (currentReveal === transition) delete root.dataset.themeReveal;
  });
}

// aria-pressed === "dark is active" (the button toggles dark mode on/off)
function reflectToggleState(toggle) {
  toggle.setAttribute('aria-pressed', theme.value === 'dark');
  toggle.dataset.tooltip = toggleTooltips[theme.value];
}

function getStoredPreference() {
  // storage can be blocked entirely, the toggle should still work
  try {
    return localStorage.getItem(storageKey);
  } catch (error) {
    return null;
  }
}

function getColorPreference() {
  return (
    getStoredPreference() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

function setPreference() {
  // ⚠ Picking the system's own scheme clears the choice rather than saving it, or the site stops following the system for good.
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    if (theme.value === system) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, theme.value);
  } catch (error) {
    // not persisted, but the current page still reflects the choice
  }
  reflectPreference();
  updateMetaThemeColor();
}

function reflectPreference() {
  document.firstElementChild.setAttribute('data-theme', theme.value);
}

function updateMetaThemeColor() {
  const newColor = theme.value === 'dark' ? themeColors.dark : themeColors.light;
  // Both tags, since each carries a media query and the system setting picks which one counts.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', newColor);
}

// set early so no page flashes / CSS is made aware
reflectPreference();
