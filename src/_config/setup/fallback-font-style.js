//pTSerif
// import { createFontStack } from '@capsizecss/core';
// import pTSerif from '@capsizecss/metrics/pTSerif';
// import timesNewRoman from '@capsizecss/metrics/timesNewRoman';
//
// const { fontFaces } = createFontStack([pTSerif, timesNewRoman]);
// console.log(fontFaces);

// Source serif
import { createFontStack } from '@capsizecss/core';
import sourceSerif4 from '@capsizecss/metrics/sourceSerif4/700';
import georgia from '@capsizecss/metrics/georgia';

const { fontFaces } = createFontStack([sourceSerif4, georgia]);
console.log(fontFaces);

// @font-face {
// font-family: "Source Serif 4 Fallback";
// src: local('Georgia');
// ascent-override: 93.4918%;
// descent-override: 30.2314%;
// size-adjust: 110.8118%;
// }

// Source Sans
// import { createFontStack } from '@capsizecss/core';
// import sourceSans3 from '@capsizecss/metrics/sourceSans3';
// import arial from '@capsizecss/metrics/arial';
//
// const { fontFaces } = createFontStack([sourceSans3, arial]);
// console.log(fontFaces);

// @font-face {
// font-family: "Source Sans 3 Fallback";
// src: local('Arial'), local('ArialMT');
// ascent-override: 109.2105%;
// descent-override: 42.6604%;
// line-gap-override: 0%;
// size-adjust: 93.7639%;
// }