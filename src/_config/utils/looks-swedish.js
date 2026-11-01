// Heuristic language flag for short, mixed-language strings — used to mark Swedish activity titles with lang="sv" so screen readers switch to a Swedish voice.
//
// Titles arrive from Strava/Eventor as a genuine mix of Swedish and English, and hand-tagging won't survive future imports — so detect, and stay CONSERVATIVE: true only when Swedish is clearly present. Proper-noun event codes stay at the page's `en` default, since a WRONG lang reads worse than none.
//
// ponytail: a hand-tuned regex over a known title set, not a language-detection library. If titles drift to other languages, add tokens here rather than reaching for a dependency.
const SWEDISH =
  /[åäö]|orienter(?:ing|ingen)|träning|löpning|löpet|\blång\b|långdistans|\bmedel\b|medeldistans|medeln|\bnatt\b|nattorientering|nattcup|\bbana\b|\bbanor\b|\bkort\b|stigar|skog|mästerskap|premiär|rundan|träffen|månadens|vintercupen|\bmed\b|\boch\b|\bpå\b|\butan\b|\btill\b|\bdag\b|dagars|torsdag|måndag|morgonen|eftermiddagen|starten|hitta ut/i;

export const looksSwedish = title => typeof title === 'string' && SWEDISH.test(title);
