// Lene's `personal.*` names, filled from settings.yaml. ⚠ Default export only — Eleventy 3 ignores a default export sitting beside named ones.
import {settings} from './meta.js';

const {identity, profiles} = settings;

export default {
  email: identity.email,
  address: identity.address,
  platforms: Object.fromEntries(Object.entries(profiles).map(([key, profile]) => [key, profile.url]))
};
