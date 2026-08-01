// Heuristic language flag for short, mixed-language strings — used to mark Swedish
// activity titles with lang="sv" so screen readers switch to a Swedish voice.
//
// Activity titles arrive from Strava/Eventor in whatever language was set at the time:
// a genuine mix of Swedish event/training names ("Styrketräning på eftermiddagen",
// "Orientering Bokskogen") and English Strava defaults ("Afternoon Run", "Weight
// Training"). We can't default a whole language, and hand-tagging every file won't
// survive future imports — so we detect.
//
// Deliberately CONSERVATIVE: return true only when Swedish is clearly present (a Swedish
// letter, or a Swedish content/function word). English titles and bare proper-noun event
// codes ("Keps-OL", "MPOL E03", "O-ringen H55K E1") return false and stay at the page's
// `en` default — WCAG 3.1.2 exempts proper names anyway, and a WRONG lang (English words
// read by a Swedish voice or vice-versa) is worse than none. Note "orientering" (sv)
// matches but "orienteering" (en) does not — the spelling itself carries the language.
//
// ponytail: a hand-tuned regex over a known title set, not a language-detection library.
// If titles drift to other languages, add tokens here rather than reaching for a dependency.
const SWEDISH =
  /[åäö]|orienter(?:ing|ingen)|träning|löpning|löpet|\blång\b|långdistans|\bmedel\b|medeldistans|medeln|\bnatt\b|nattorientering|nattcup|\bbana\b|\bbanor\b|\bkort\b|stigar|skog|mästerskap|premiär|rundan|träffen|månadens|vintercupen|\bmed\b|\boch\b|\bpå\b|\butan\b|\btill\b|\bdag\b|dagars|torsdag|måndag|morgonen|eftermiddagen|starten|hitta ut/i;

export const looksSwedish = title => typeof title === 'string' && SWEDISH.test(title);
