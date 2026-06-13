const storageKey = 'theme-preference';
const themeColors = {
  dark: '{{ meta.themeLight }}',
  light: '{{ meta.themeDark }}'
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
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    setPreference();
    reflectToggleState(toggle);
  });
});

// sync with system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({matches: isDark}) => {
  theme.value = isDark ? 'dark' : 'light';
  setPreference();
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    reflectToggleState(toggle);
  }
});

// aria-pressed === "dark is active" (the button toggles dark mode on/off)
function reflectToggleState(toggle) {
  toggle.setAttribute('aria-pressed', theme.value === 'dark');
}

function getColorPreference() {
  if (localStorage.getItem(storageKey)) {
    return localStorage.getItem(storageKey);
  } else {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

function setPreference() {
  localStorage.setItem(storageKey, theme.value);
  reflectPreference();
  updateMetaThemeColor();
}

function reflectPreference() {
  document.firstElementChild.setAttribute('data-theme', theme.value);
}

function updateMetaThemeColor() {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    return;
  }
  const newColor = theme.value === 'dark' ? themeColors.dark : themeColors.light;
  metaThemeColor.setAttribute('content', newColor);
}

// set early so no page flashes / CSS is made aware
reflectPreference();
