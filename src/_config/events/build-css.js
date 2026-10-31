import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import {globSync, watch} from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import tailwindConfig, {themeFromTokens} from '../../../tailwind.config.js';
import {themeDir} from '../utils/theme.js';

const buildCss = async (inputPath, outputPaths) => {
  const inputContent = await fs.readFile(inputPath, 'utf-8');

  const result = await postcss([
    postcssImport({
      resolve(id, basedir) {
        if (id === 'theme-fonts') return path.resolve(themeDir(), 'fonts.css');
        if (id === 'theme') return path.resolve(themeDir(), 'theme.css');
        if (!id.includes('*')) return id;
        return globSync(id, {cwd: basedir})
          .sort()
          .map(file => path.join(basedir, file));
      }
    }),
    // ⚠ Given the config as a file, Tailwind only rereads it when something it imports changes, and tokens are read, not imported: an edited token would need a dev server restart.
    tailwindcss({...tailwindConfig, theme: themeFromTokens()}),
    autoprefixer,
    cssnano
  ]).process(inputContent, {from: inputPath});

  for (const outputPath of outputPaths) {
    await fs.mkdir(path.dirname(outputPath), {recursive: true});
    await fs.writeFile(outputPath, result.css);
  }

  return result.css;
};

// Serving ALSO writes the global CSS as a plain file, so a CSS save costs no Eleventy rebuild. ⚠ Condition must stay in step with the runMode branch in head/css-inline.njk, which is what links this file.
const GLOBAL_SRC = 'src/assets/css/global/global.css';
const globalOutputs = () =>
  process.env.ELEVENTY_RUN_MODE === 'serve'
    ? ['src/_includes/css/global.css', 'dist/assets/css/global.css']
    : ['src/_includes/css/global.css'];

export const buildGlobalCss = () => buildCss(GLOBAL_SRC, globalOutputs());

/** Recompiles global CSS on save, in the Eleventy process, so `src/assets/css/global/**` can stay out of Eleventy's watcher. The active theme's folder counts too: fonts.css, theme.css and the tokens all end up in it. */
export const watchGlobalCss = () => {
  let pending;
  const rebuild = () => {
    clearTimeout(pending);
    pending = setTimeout(
      () =>
        buildGlobalCss()
          .then(() => console.log('[css] global.css rebuilt'))
          .catch(error => console.error(`[css] ${error.message}`)),
      50
    );
  };
  // ⚠ unref() is what lets Ctrl+C stop the dev server: Eleventy's SIGINT handler only closes its own watchers, and an open fs.watch keeps Node alive.
  return ['src/assets/css/global', themeDir()].map(folder => watch(folder, {recursive: true}, rebuild).unref());
};

export const buildAllCss = async () => {
  const tasks = [];

  tasks.push(buildGlobalCss());

  const localCssFiles = await fg(['src/assets/css/local/**/*.css']);
  for (const inputPath of localCssFiles) {
    const baseName = path.basename(inputPath);
    tasks.push(buildCss(inputPath, [`src/_includes/css/${baseName}`]));
  }

  const componentCssFiles = await fg(['src/assets/css/components/**/*.css']);
  for (const inputPath of componentCssFiles) {
    const baseName = path.basename(inputPath);
    tasks.push(buildCss(inputPath, [`dist/assets/css/components/${baseName}`]));
  }

  await Promise.all(tasks);
};
