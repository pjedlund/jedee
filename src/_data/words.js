// The interface words, one file per language in src/_config/words. ⚠ Default export only — Eleventy 3 ignores a default export sitting beside named ones.
import {loadWords} from '../_config/utils/site.js';

export default () => loadWords(); // a function, so a watched change to a words file is read again on the next build
