// The parts of the site that are on unless settings.switches says false. ⚠ Add a new one here, to settings.yaml and to admin/config.yml together: a Sveltia save writes an absent yes/no field as false.
export const SWITCHES = ['easteregg', 'shortcuts', 'tooltips', 'devGrid', 'themeToggle', 'serviceWorker', 'webmentions', 'micropub', 'relMe', 'feeds', 'header', 'mainNav', 'breadcrumb', 'footer'];

export function resolveSwitches(settings) {
  const given = settings?.switches ?? {};
  return Object.fromEntries(
    SWITCHES.map(name => {
      if (given[name] !== undefined && typeof given[name] !== 'boolean') throw new Error(`settings.switches.${name} is ${JSON.stringify(given[name])}, but it must be true or false`);
      return [name, given[name] ?? true];
    })
  );
}
