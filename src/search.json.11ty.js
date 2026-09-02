import fs from 'node:fs';
import {load as yamlLoad} from 'js-yaml';
import {buildIndex} from './_config/search-index.js';

// Read the dial here too, not from the data cascade: `eleventyImport` is resolved before the cascade runs, so the type list has to exist at module load. Same reason eleventy.config.js reads this file directly.
const {search} = yamlLoad(fs.readFileSync('./src/_data/features.yaml', 'utf8'));

export default class {
  data() {
    return {
      permalink: data => (data.features.search.enabled ? '/search.json' : false),
      eleventyExcludeFromCollections: true,
      eleventyImport: {collections: search.types}
    };
  }

  render({collections}) {
    return JSON.stringify({search: buildIndex(collections, search)});
  }
}
