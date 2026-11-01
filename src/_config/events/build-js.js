import esbuild from 'esbuild';
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import {settings} from '../../_data/meta.js';
import {resolveMaps} from '../utils/maps.js';

// Values from settings that a script is built with.
const maps = resolveMaps(settings);
const define = {__MAP_TILES__: JSON.stringify(maps.tiles), __MAP_COVERAGE__: JSON.stringify(maps.coverage)};

export const buildJs = async (inputPath, outputPath, {format} = {}) => {
  const result = await esbuild.build({
    target: 'es2020',
    entryPoints: [inputPath],
    bundle: true,
    minify: true,
    write: false,
    define,
    ...(format && {format})
  });

  const output = result.outputFiles[0].text;

  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, output);

  return output;
};

export const buildAllJs = async () => {
  const tasks = [];

  const bundleFiles = await fg(['src/assets/scripts/bundle/**/*.js']);
  for (const inputPath of bundleFiles) {
    const baseName = path.basename(inputPath);
    tasks.push(buildJs(inputPath, `src/_includes/scripts/${baseName}`, {format: 'iife'}));
  }

  const componentFiles = await fg(['src/assets/scripts/components/**/*.js']);
  for (const inputPath of componentFiles) {
    const baseName = path.basename(inputPath);
    tasks.push(buildJs(inputPath, `dist/assets/scripts/components/${baseName}`, {format: 'esm'}));
  }

  await Promise.all(tasks);
};
