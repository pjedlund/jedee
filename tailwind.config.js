/* © Andy Bell - https://github.com/Set-Creative-Studio/cube-boilerplate */

import plugin from 'tailwindcss/plugin.js';
import postcss from 'postcss';
import postcssJs from 'postcss-js';

import {dtcgToTailwind, dtcgFluidToTailwind, dtcgShadowToTailwind} from './src/_config/utils/dtcg-to-tailwind.js';
import {loadTokens, themeName} from './src/_config/utils/theme.js';

// Reads the active theme's tokens each time it's called; build-css.js calls it for every build.
export const themeFromTokens = () => {
  const viewportTokens = loadTokens('viewports.json');

  return {
    screens: {
      ltsm: {max: `${viewportTokens.sm}px`},
      sm: `${viewportTokens.sm}px`,
      md: `${viewportTokens.md}px`,
      ltnavigation: {max: `${viewportTokens.navigation}px`},
      navigation: `${viewportTokens.navigation}px`
    },
    colors: dtcgToTailwind(loadTokens('colors.json')),
    borderRadius: dtcgToTailwind(loadTokens('borderRadius.json')),
    borderWidth: dtcgToTailwind(loadTokens('borderWidth.json')),
    boxShadow: dtcgShadowToTailwind(loadTokens('shadows.json')),
    spacing: dtcgFluidToTailwind(loadTokens('spacing.json')),
    fontFamily: dtcgToTailwind(loadTokens('fonts.json')),
    fontSize: dtcgFluidToTailwind(loadTokens('textSizes.json')),
    fontWeight: dtcgToTailwind(loadTokens('textWeights.json')),
    lineHeight: dtcgToTailwind(loadTokens('textLeading.json')),
    backgroundColor: ({theme}) => theme('colors'),
    textColor: ({theme}) => theme('colors'),
    margin: ({theme}) => ({
      auto: 'auto',
      ...theme('spacing')
    }),
    padding: ({theme}) => theme('spacing')
  };
};

export default {
  // ⚠ Tailwind makes a class for any word in these files that looks like one, so only the active theme's templates count, and no DESIGN.md.
  content: ['./src/**/*.{html,js,md,njk,liquid,webc}', `!./src/_includes/themes/!(${themeName()})/**`, '!./src/_includes/themes/*/*.md'],
  presets: [],
  theme: themeFromTokens(),
  variantOrder: [
    'first',
    'last',
    'odd',
    'even',
    'visited',
    'checked',
    'empty',
    'read-only',
    'group-hover',
    'group-focus',
    'focus-within',
    'hover',
    'focus',
    'focus-visible',
    'active',
    'disabled'
  ],

  // Disables Tailwind's reset etc
  corePlugins: {
    preflight: false,
    textOpacity: false,
    backgroundOpacity: false,
    borderOpacity: false,
    // ⚠ Its classes share names with utilities/numerals.css and, layered later, would override them.
    fontVariantNumeric: false
  },

  // Prevents Tailwind's core components
  blocklist: ['container'],

  // Prevents Tailwind from generating that wall of empty custom properties
  experimental: {
    optimizeUniversalDefaults: true
  },

  plugins: [
    // Generates custom property values from tailwind config
    plugin(function ({addComponents, config}) {
      let result = '';

      const currentConfig = config();

      const groups = [
        {key: 'colors', prefix: 'color'},
        {key: 'borderRadius', prefix: 'border-radius'},
        {key: 'borderWidth', prefix: 'border-width'},
        {key: 'boxShadow', prefix: 'box-shadow'},
        {key: 'spacing', prefix: 'space'},
        {key: 'fontSize', prefix: 'size'},
        {key: 'lineHeight', prefix: 'leading'},
        {key: 'fontFamily', prefix: 'font'},
        {key: 'fontWeight', prefix: 'font'}
      ];

      groups.forEach(({key, prefix}) => {
        const group = currentConfig.theme[key];

        if (!group) {
          return;
        }

        Object.keys(group).forEach(key => {
          result += `--${prefix}-${key}: ${group[key]};`;
        });
      });

      addComponents({
        ':root': postcssJs.objectify(postcss.parse(result))
      });
    }),

    // Generates custom utility classes
    plugin(function ({addUtilities, config}) {
      const currentConfig = config();
      const customUtilities = [
        {key: 'spacing', prefix: 'flow-space', property: '--flow-space'},
        {key: 'spacing', prefix: 'region-space', property: '--region-space'},
        {key: 'spacing', prefix: 'gutter', property: '--gutter'}
      ];

      customUtilities.forEach(({key, prefix, property}) => {
        const group = currentConfig.theme[key];

        if (!group) {
          return;
        }

        Object.keys(group).forEach(key => {
          addUtilities({
            [`.${prefix}-${key}`]: postcssJs.objectify(postcss.parse(`${property}: ${group[key]}`))
          });
        });
      });
    })
  ]
};
