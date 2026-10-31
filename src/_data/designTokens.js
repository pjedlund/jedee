// Every token file of the active theme, by name: designTokens.colors is tokens/colors.json.
import fs from 'node:fs';
import {TOKENS_DIR, loadTokens} from '../_config/utils/theme.js';

export default () =>
  Object.fromEntries(
    fs.readdirSync(TOKENS_DIR).filter(file => file.endsWith('.json')).map(file => [file.replace(/\.json$/, ''), loadTokens(file)])
  );
