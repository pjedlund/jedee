---
title: Bethink Yourselves!
description: Leo Tolstoys avslutningsord i Betänken Eder.
date: 2026-06-01T21:08:20.943Z
draft: false
---

{# On the 8-column prose grid (column 6.25 + gutter 2, out of 64) the pamphlet takes 3 columns beside 5 of text; once the text would drop under 28rem they stack, pamphlet on top. ⚠ Only the column gap is a percentage: a percentage row gap isn't counted in the height, and the text spills out below. #}
{% set pamphlet = { svg: "covers/betanken-eder", label: "Cover of Betänken Eder! by Leo Tolstoy, Stockholm 1904" } %}
<div class="sidebar" style="--sidebar-direction: row-reverse; --gutter: var(--space-s-m) calc(100% * 2 / 64); --sidebar-target-width: calc(100% * 22.75 / 64); --sidebar-content-min-width: max(100% * 39 / 64, min(28rem, 100%))">
{% include "partials/pamphlet.njk" %}
<div lang="sv">

På sin tid suckade Jesus i förväntan och sade: 

»Jag har kommit för att kasta eld öfver världen, 
och jag trånar efter att den redan vore tänd.» 

Det, som Jesus längtade efter, fullbordas nu: elden 
håller på att tändas. Låtom oss då icke släcka den, 
utan sprida och underhålla den! 

</div>
</div>
