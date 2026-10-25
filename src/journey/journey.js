// The Journey: the wise men travel from the East to the stable in Bethlehem, arriving on Christmas Day.
//
// The camera travels with the caravan. The camels stay in place on screen, walking, while the land
// slides past in layers at different speeds (sky slowest, foreground fastest). It plays like a short
// film: each night they walk one stretch of road, about a minute. Tonight's plays when the page opens;
// earlier nights can be watched again, and "The journey so far" runs from the palace to tonight.
//
// What happens each night (sky, weather, landmarks, encounters, critters, camps) is set in plan.js.
// Open /journey/?test to unlock every night, play faster, override the weather and see the whole plan.
//
// Art comes from Adobe Firefly (docs/firefly/). Anything not made yet is drawn in code.
(function() {
	'use strict';

	var ART_READY = (window.JOURNEY_ART_READY || []).slice();   // art-ready.js, written by docs/firefly/process-art.py
	var params = new URLSearchParams(location.search);
	if (params.get('art')) ART_READY = ART_READY.concat(params.get('art').split(','));   // ?art=name,name to try art before it's listed
	var TEST = params.has('test');

	// ----- dates -----
	// The journey runs every year from October 1 to January 6. From January 7 to September 30 they're home in the East
	// (the 'home' view), and the dates below are for the season that has just ended; from October 1, the new one.
	var forced = params.get('date') ? new Date(params.get('date') + 'T19:00:00') : null;   // ?date=2026-12-12 to pretend it's that day
	var NOW0 = forced || new Date(), SEASON = NOW0.getMonth() >= 9 ? NOW0.getFullYear() : NOW0.getFullYear() - 1;
	var START = new Date(SEASON, 9, 1);         // the wise men set out
	var CHRISTMAS = new Date(SEASON, 11, 25);   // they reach the stable
	var SALE_OPENS = new Date('2026-11-08T09:00:00-08:00');
	var NIGHTS = [
		['2026-12-04', 'Friday, December 4', '6–9 pm'], ['2026-12-05', 'Saturday, December 5', '5–9 pm'],
		['2026-12-06', 'Sunday, December 6', '5–9 pm'], ['2026-12-10', 'Thursday, December 10', '6–9 pm'],
		['2026-12-11', 'Friday, December 11', '6–9 pm'], ['2026-12-12', 'Saturday, December 12', '5–9 pm'],
		['2026-12-13', 'Sunday, December 13', '5–9 pm']
	].filter(function(n) { return +n[0].slice(0, 4) === SEASON; });   // (this year's event; next year's dates go here when they're set)
	var DAY = 864e5;
	var TOTAL = Math.round((CHRISTMAS - START) / DAY);   // Christmas is night TOTAL
	var HOME = new Date(SEASON + 1, 0, 6);
	var END = Math.round((HOME - START) / DAY);          // home again on January 6, the last night
	function homeward(k) { return k > TOTAL; }          // after Christmas they head home: the scene turns round
	function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	function dateOfDay(k) { return new Date(START.getFullYear(), START.getMonth(), START.getDate() + Math.floor(k)); }
	function dayOf(md) { var p = md.split('-'), y = START.getFullYear() + (p[0] - 1 < START.getMonth() ? 1 : 0); return Math.round((new Date(y, p[0] - 1, +p[1]) - START) / DAY); }
	function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
	function longDate(d) { return d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'}); }
	function now() { return forced || new Date(); }

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var sound = window.JourneySound || {preload: function() {}, update: function() {}, thunder: function() {}, hoot: function() {}, animal: function() {}, music: function() {}, toggle: function() { return false; }, wanted: function() { return false; }, hasAny: function() { return false; }};

	// ----- seeded randomness: the same night always looks the same -----
	function rng(seed) {
		var a = seed >>> 0;
		return function() {
			a = (a + 0x6D2B79F5) >>> 0;
			var t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function hash(n) { return rng(n * 7919 + 17)(); }
	function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
	function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

	// ----- the plan for each night (plan.js) -----
	var PLAN = [];
	(window.JOURNEY_PLAN || []).forEach(function(p) { PLAN[dayOf(p.d)] = p; });
	function planFor(k) { return PLAN[k] || {sky: 'night', weather: 'clear'}; }

	var SKIES = {
		'night':     {art: 'jr-sky-night',     top: '#05081c', mid: '#151a45', low: '#352658', glow: '#5c3656', words: 'a clear, deep night'},
		'night-2':   {art: 'jr-sky-night-2',   top: '#03061a', mid: '#0f1b4a', low: '#24306a', glow: '#3d3f7a', words: 'a cold, clear night'},
		'deep':      {art: 'jr-sky-deep',      top: '#02030f', mid: '#0a0d2c', low: '#1d1a45', glow: '#352a55', words: 'a dark, starry night'},
		'dusk':      {art: 'jr-sky-dusk',      top: '#0b0d2e', mid: '#2a1f5a', low: '#6b3a6e', glow: '#c06a5a', words: 'the last glow of evening'},
		'dusk-2':    {art: 'jr-sky-dusk-2',    top: '#0a0f30', mid: '#24285e', low: '#5a3f78', glow: '#b07a68', words: 'a soft violet evening'},
		'clouds':    {art: 'jr-sky-clouds',    top: '#060a22', mid: '#1a1d4c', low: '#3a2c60', glow: '#5a3d64', words: ''},
		'storm':     {art: 'jr-sky-storm',     top: '#05060f', mid: '#12142a', low: '#262540', glow: '#3a3550', words: ''},
		'sandstorm': {art: 'jr-sky-sandstorm', top: '#120d1e', mid: '#3a2a32', low: '#7a5238', glow: '#a8703c', words: ''},
		'predawn':   {art: 'jr-sky-predawn',   top: '#0b1236', mid: '#2a3270', low: '#7a6a9a', glow: '#f2c487', words: 'the first light of Christmas morning'}
	};
	var WEATHER = {   // words for the night's description, a caption as it arrives, and one as it clears
		clear: {words: ''},
		haze: {words: 'haze along the hills'},
		clouds: {words: 'clouds drifting over'},
		wind: {words: 'a warm wind lifting the sand', caption: 'A warm wind lifts the sand'},
		fog: {words: 'mist lying in the valleys', caption: 'Mist in the valleys'},
		rain: {words: 'rain on the road', caption: 'Rain on the road'},
		storm: {words: 'a storm with thunder and lightning that clears late in the night', caption: 'A storm rolls in over the hills', clears: 'The storm passes, and the Star shines again'},
		sandstorm: {words: 'a sandstorm that settles late in the night', caption: 'A sandstorm sweeps across the desert', clears: 'The dust settles, and the Star is still there'}
	};
	var WEATHER_KINDS = Object.keys(WEATHER);

	function moonPhase(d) {   // 0 = new, 0.5 = full
		var synodic = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
		var p = ((d.getTime() - ref) / DAY) % synodic / synodic;
		return p < 0 ? p + 1 : p;
	}
	function moonWords(p) {
		if (p < 0.03 || p > 0.97) return null;
		if (p < 0.22 || p > 0.78) return 'a thin crescent moon';
		if (p < 0.28 || p > 0.72) return 'a half moon';
		if (p < 0.47) return 'a growing moon';
		if (p < 0.53) return 'a full moon';
		return 'a waning moon';
	}

	var weatherOverride = null;   // test mode
	function nightFor(k) {
		var p = planFor(k), r = rng(k * 131 + 7), d = dateOfDay(k);
		var weather = weatherOverride || p.weather || 'clear';
		var sky = p.sky || 'night';
		if (weatherOverride) sky = {storm: 'storm', sandstorm: 'sandstorm', rain: 'clouds', clouds: 'clouds'}[weatherOverride] || (sky === 'storm' || sky === 'sandstorm' || sky === 'clouds' ? 'night' : sky);
		return {day: k, plan: p, sky: SKIES[sky] || SKIES.night, skyKey: sky, weather: weather, phase: moonPhase(d),
			stars: 170 + Math.floor(r() * 110), moonX: 0.42 + r() * 0.24, wind: weather === 'sandstorm' ? 1 : weather === 'wind' ? 0.6 : weather === 'storm' ? 0.5 : 0.15};
	}
	function nightWords(n) {
		var bits = [];
		if (n.sky.words) bits.push(n.sky.words);
		var cloudy = /storm|rain|clouds/.test(n.weather);
		var m = moonWords(n.phase); if (m && n.day !== TOTAL && !cloudy) bits.push(m);
		if (WEATHER[n.weather].words) bits.push(WEATHER[n.weather].words);
		if (n.plan.note && !weatherOverride) bits.push(n.plan.note);
		if (cometNight(n.day)) bits.push('a comet with a long tail');
		if (n.phase > 0.44 && n.phase < 0.56 && n.day !== TOTAL && !/storm|rain|clouds/.test(n.weather)) bits.push('a big orange moon rising');
		if (snowSeason(n.day) && n.day <= TOTAL + 2) bits.push('snow on the far mountains');
		if (n.day <= 4) bits.push('a mountain smoking far to the north');
		var s = bits.join(', ') || 'a quiet night';
		return s.charAt(0).toUpperCase() + s.slice(1) + '.';
	}

	// ----- the road -----
	var DAYW = 3600;            // road units walked per night
	var WALK = 64;              // walking pace, units a second: a night is about a minute
	var PROLOGUE = 0.45;        // the first night starts at the palace gate
	var SPEED = {sky: 0.02, far: 0.12, mid: 0.4, road: 1, fg: 1.7};
	var STAGES = [
		{from: -99, key: 'east', label: 'The lands of the East', far: '#22294f', mid: '#2b3460', hill: 'plains',
			art: {far: ['jr-far-plains', 'jr-far-plains-2'], mid: ['jr-mid-fields'],   // jr-mid-plains-palms' black palms look wrong this far back
			 road: ['jr-near-riverbank', 'jr-near-sand-3']}},   // jr-near-riverbank-2's reeds look like cactuses at this size
		{from: dayOf('10-09'), key: 'desert', label: 'The great desert', far: '#2a2150', mid: '#3a2a5e', hill: 'dunes',
			art: {far: ['jr-far-mountains', 'jr-far-mountains-2', 'jr-far-mesas'], mid: ['jr-mid-dunes-2', 'jr-mid-dunes-3'], road: ['jr-near-sand-3', 'jr-near-sand-4']}},   // jr-near-sand-2 is one steep dune
		{from: dayOf('11-23'), key: 'rocky', label: 'Rocky country', far: '#2b2245', mid: '#40305a', hill: 'rocky',
			art: {far: ['jr-far-rocky-peaks', 'jr-far-mesas-2'], mid: ['jr-mid-rocky', 'jr-mid-rocky-2'], road: ['jr-near-rocky-road']}},   // jr-near-rocky-road-2's round stepping stones look odd under the camels
		{from: dayOf('12-11'), key: 'judea', label: 'The hills of Judea', far: '#232643', mid: '#2e3552', hill: 'terraces',
			art: {far: ['jr-far-judean-hills', 'jr-far-judean-hills-2'], mid: ['jr-mid-olive-terraces', 'jr-mid-olive-terraces-2'], road: ['jr-near-sand-4', 'jr-near-sand-3']}}   // a clean road; the walls and olive trees in front give Judea its look (the path strips' tufts and walls read badly under the camels)
	];
	STAGES.push(
		{from: dayOf('12-29'), key: 'desert', label: 'The desert road home', far: '#2a2150', mid: '#3a2a5e', hill: 'dunes',
			art: {far: ['jr-far-mesas', 'jr-far-mountains-2'], mid: ['jr-mid-dunes-3', 'jr-mid-dunes-2'], road: ['jr-near-sand-4', 'jr-near-sand-3']}},
		{from: dayOf('01-04'), key: 'east', label: 'Home in the East', far: '#22294f', mid: '#2b3460', hill: 'plains',
			art: {far: ['jr-far-plains-2', 'jr-far-plains'], mid: ['jr-mid-fields'], road: ['jr-near-riverbank', 'jr-near-sand-3']}});
	function stageAt(day) { var s = STAGES[0]; STAGES.forEach(function(t) { if (day >= t.from) s = t; }); return s; }
	// layer art is drawn this wide (the scene is 720 units tall) with its skyline at about y
	var LAYER = {far: {w: 1250, y: 462}, mid: {w: 1350, y: 545}, road: {w: 1700, y: 618}};
	var FADE = 0.35;   // where the land changes, the new art fades in over this much of a tile

	// ----- the night's stretch of road, and what's along it -----
	// Night k walks from just before day k to just before day k + 1, so the nights join end to end.
	function stretch(k) {
		if (k <= 0) return [-PROLOGUE, 0.85];
		if (k === TOTAL) return [TOTAL - 0.85, TOTAL];
		return [k - 0.15, k + 0.85];
	}
	// pieces: at = how far through the night (0..1) they pass the lead camel; off = where on screen, from the lead camel
	var LANDMARKS = {
		palace:    {kind: 'palace', art: 'jr-lm-east-palace', caption: 'Setting out from the East', h: 290, at: 0, off: -260},
		river:     {kind: 'river', art: 'jr-lm-river', caption: 'Crossing the great river', h: 150},
		oasis:     {kind: 'oasis', art: 'jr-lm-oasis', caption: 'Water at an oasis', h: 180},
		'oasis-2': {kind: 'oasis', art: 'jr-lm-oasis-2', caption: 'Another oasis', h: 175},
		ruins:     {kind: 'ruins', art: 'jr-lm-ruins', caption: 'Past ancient ruins', h: 165},
		inn:       {kind: 'inn', art: 'jr-lm-caravanserai', caption: 'An inn for travelers', h: 165},
		'inn-2':   {kind: 'inn', art: 'jr-lm-caravanserai-2', caption: 'Rest at a roadside inn', h: 140},
		pass:      {kind: 'pass', art: 'jr-far-pass', alt: 'jr-lm-mountain-pass', caption: 'Through the mountain pass', h: 290, layer: 'far', at: 0.4, off: 120},
		well:      {kind: 'well', art: 'jr-lm-well', caption: 'A well by the road', h: 110, layer: 'road', off: 420},
		olives:    {kind: 'olives', art: 'jr-lm-olive-grove', caption: 'Olive groves of Judea', h: 170},
		'jerusalem-far':  {kind: 'jerusalem', art: 'jr-lm-jerusalem', caption: 'Jerusalem on the hills ahead', h: 120, layer: 'far', at: 0.55},
		'jerusalem-gate': {kind: 'jerusalem', art: 'jr-lm-jerusalem-gate', alt: 'jr-lm-jerusalem', caption: 'At the gates of Jerusalem: “Where is he that is born King of the Jews?”', h: 260, at: 1, off: 330},
		herod:            {kind: 'palace', art: 'jr-lm-herod-palace', alt: 'jr-lm-jerusalem', caption: 'King Herod: “Go and search diligently for the young child”', h: 270, at: 1, off: 320},
		jerusalem:        {kind: 'jerusalem', art: 'jr-lm-jerusalem', caption: 'Leaving Jerusalem, the Star goes before them', h: 300, at: 0.3},
		angel:            {kind: 'angel', art: 'jr-en-angel', caption: 'Warned in a dream, they go home another way', h: 150, at: 0.92, off: 260},
		home:             {kind: 'palace', art: 'jr-lm-east-palace', caption: 'Home again', h: 400, at: 1, off: 330, layer: 'road'},   // close and large, lit to welcome them home
		shepherds: {kind: 'shepherds', art: 'jr-lm-shepherds', caption: 'Shepherds keeping watch', h: 140},
		bethlehem: {kind: 'bethlehem', art: 'jr-lm-bethlehem', caption: 'Bethlehem', h: 210, at: 0.5},
		stable:    {kind: 'stable', art: 'jr-lm-stable', caption: 'They have found him', h: 165, layer: 'road', at: 1, off: 390}
	};
	var ENCOUNTERS = {
		gazelles:  {art: 'jr-en-gazelles', caption: 'Gazelles in the starlight', dayCaption: 'Gazelles in the heat of the day', h: 95, flip: true},
		herder:    {art: 'jr-en-goat-herder', caption: 'A herder and his goats', h: 110, flip: true},
		heron:     {art: 'jr-en-herons', caption: 'Herons by the water', h: 105},
		farm:      {art: 'jr-en-farmhouse', caption: 'A farmhouse with a lamp still lit', h: 115},
		owl:       {art: 'jr-en-owl', caption: 'An owl in a palm tree', h: 300},
		tents:     {art: 'jr-en-bedouin-tents', caption: 'The tents of desert herders', h: 105},
		fox:       {art: 'jr-en-fox', caption: 'A desert fox watching them pass', h: 70, flip: true},
		merchants: {art: 'jr-en-merchants', caption: 'Merchants heading the other way', h: 85, kind: 'caravan'},
		hare:      {art: 'jr-en-hare', caption: 'A hare in the moonlight', dayCaption: 'A hare in the sunshine', h: 60, flip: true},
		stones:    {art: 'jr-en-standing-stones', caption: 'Standing stones', h: 120},
		ibex:      {art: 'jr-en-ibex', caption: 'Wild ibex on the rocks', h: 110, flip: true},
		lanterns:  {art: 'jr-en-lantern-travelers', caption: 'Other travelers with lanterns', h: 105, flip: true},
		sheep:     {art: 'jr-en-sheep', caption: 'A shepherd and his sheep', h: 110, flip: true},
		donkey:    {art: 'jr-en-donkey', caption: 'A traveler with a donkey', h: 110, flip: true},
		kite:      {art: 'jr-en-kite-boy', caption: 'A boy flying his kite in the wind', h: 150},
		potter:    {art: 'jr-en-potter', caption: 'A potter at her wheel', h: 115},
		'well-women': {art: 'jr-en-well-women', caption: 'Women drawing water at the well', h: 135},
		shepherdess: {art: 'jr-en-shepherdess', caption: 'A shepherdess with her lambs', h: 135}
	};
	var CAMPS = ['jr-lm-camp', 'jr-lm-camp-2', 'jr-lm-camp-3'];

	// every piece on the road, from the plan
	var PIECES = [];
	function addPiece(k, spec, key, at, small) {
		var st = stretch(k), a = spec.at != null ? spec.at : at;
		PIECES.push({night: k, key: key, kind: spec.kind || key, art: spec.art, alt: spec.alt, caption: spec.caption, dayCaption: spec.dayCaption, h: spec.h, small: small, flip: !!spec.flip,
			layer: spec.layer || 'mid', pass: st[0] + a * (st[1] - st[0]), off: spec.off != null ? spec.off : (spec.layer === 'far' ? 300 : 340)});
	}
	for (var k = 0; k <= END; k++) {
		var p = planFor(k);
		if (p.landmark && LANDMARKS[p.landmark]) addPiece(k, LANDMARKS[p.landmark], p.landmark, 0.3, false);
		if (p.encounter && ENCOUNTERS[p.encounter]) addPiece(k, ENCOUNTERS[p.encounter], p.encounter, 0.22, true);   // early, so it's gone before they stop
		if (p.camp) addPiece(k, {kind: 'camp', art: CAMPS[k % 3], caption: '', h: 130, at: 1, off: 300}, 'camp', 1, true);
	}
	// a jackal or a wolf sitting on a far ridge, head raised, howling: plan.js 'howl' (jackals in the desert, a wolf in the
	// mountains). Firefly art when it's in (jr-howl-jackal / jr-howl-wolf, the sitting-howling pose); a silhouette until then
	(window.JOURNEY_PLAN || []).forEach(function(p) {
		if (!p.howl || /rain|storm|sandstorm/.test(p.weather)) return;   // not out howling in the rain
		var k = dayOf(p.d), st = stretch(k);
		PIECES.push({night: k, key: 'howl', kind: 'howl', who: p.howl, art: 'jr-howl-' + p.howl, caption: p.howl === 'wolf' ? 'A wolf howls far away' : 'Jackals calling in the night',
			h: p.howl === 'wolf' ? 92 : 78, layer: 'mid', pass: st[0] + 0.45 * (st[1] - st[0]), off: 380, small: true});
	});
	// a lone jackal trotting across the hills on a few other desert and rocky nights
	for (var kj = dayOf('10-09'); kj < dayOf('12-11'); kj++) {
		var pj = planFor(kj);
		if (pj.howl || pj.encounter === 'fox' || !/clear|haze|wind/.test(pj.weather) || hash(kj * 5 + 900) > 0.2) continue;
		var stj = stretch(kj);
		PIECES.push({night: kj, key: 'trotter', kind: 'trotter', who: 'jackal', art: 'jr-jackal-trot', caption: 'A jackal running over the hills', h: 78,
			layer: 'mid', pass: stj[0] + 0.62 * (stj[1] - stj[0]), off: 380, small: true});
	}
	// far off in the first week: a great snow-capped mountain in the lands of the East, smoking gently
	PIECES.push({night: 2, key: 'volcano', kind: 'volcano', art: 'jr-far-volcano', caption: '', h: 150, layer: 'far', pass: 2.6, off: 0});
	// Bethlehem on the far hills, ahead of them through the last nights
	PIECES.push({night: TOTAL, key: 'bethlehem-far', kind: 'bethlehem', art: 'jr-far-bethlehem', caption: '', h: 70, layer: 'far', pass: TOTAL, off: -180});
	var STABLE = PIECES.filter(function(p) { return p.kind === 'stable'; })[0];

	// foreground pieces that rush past in front (jr-fg-olive-tree is left out: its pale silver leaves look like a cloud at night)
	var FG_KINDS = {east: ['palm', 'reeds', 'palm', 'grass'], desert: ['palm', 'acacia', 'grass', 'boulders'], rocky: ['boulders', 'acacia', 'boulders', 'grass'], judea: ['olive', 'wall', 'olive', 'grass']};
	var FG_ART = {palm: ['jr-fg-date-palm', 'jr-fg-date-palm-2', 'jr-fg-palm-group'], acacia: ['jr-fg-acacia', 'jr-fg-acacia-2'], boulders: ['jr-fg-boulders-2'],   // jr-fg-boulders keeps a pale glow disc
		grass: ['jr-fg-grass', 'jr-fg-grass-2'], olive: ['jr-fg-olive-tree-2'], reeds: ['jr-fg-reeds'], wall: ['jr-fg-stone-wall']};

	// ----- art images -----
	var images = {};
	var queue = [], active = 0;
	function pump() {
		while (active < 6 && queue.length) {
			var job = queue.shift(); active++;
			(function(job) {
				var im = new Image();
				im.onload = function() { if (job.prep) job.prep(im); images[job.n] = im; active--; pump(); };
				im.onerror = function() { active--; pump(); };
				im.src = '/journey/art/' + job.n + '.webp';
			})(job);
		}
	}
	function loadArt(n, prep) { queue.push({n: n, prep: prep}); }
	var rank = function(n) { return /^jr-char-/.test(n) ? 0 : /^jr-howl-/.test(n) ? 1 : /^jr-(sky|far|mid|near)-/.test(n) ? 1 : 2; };   // (characters first, then sky and land)
	ART_READY = ART_READY.filter(function(n) { return !/^jr-camel-rider/.test(n); }).sort(function(a, b) { return rank(a) - rank(b); });
	ART_READY.forEach(function(n) {
		var rig = window.JOURNEY_CAMEL_RIG && JOURNEY_CAMEL_RIG[n];
		if (rig) {
			loadArt(n + '-body');
			rig.legs.forEach(function(l, i) { ['upper', 'lower'].forEach(function(part) { loadArt(n + '-leg' + i + '-' + part, function(im) { if (i % 2) im.dark = tinted(im, 0.78); }); }); });
			return;
		}
		if (/^jr-sky-/.test(n)) loadArt(n);
		else if (/^jr-(far|mid|near)-/.test(n) && n !== 'jr-far-bethlehem' && n !== 'jr-far-pass') loadArt(n, skyline);
		else loadArt(n, footing);
	});	pump();

	function art(name) { return name && images[name] || null; }
	// test mode: note the name of every picture drawn (for docs/qa, which shows on which nights each picture is used)
	var drawnNames = {};
	if (TEST) (function() {
		var orig = CanvasRenderingContext2D.prototype.drawImage, known = new WeakMap();
		function nameOf(im) {
			if (known.has(im)) return known.get(im);
			var n = im && im.src && /\/art\/([^/?]+)\.webp/.exec(im.src);
			n = n ? n[1] : null;
			if (!n) for (var k in images) { var o = images[k]; if (o.dark === im || o.soft === im || o.soft2 === im || o.bent === im) { n = k; break; } }
			if (im) known.set(im, n);
			return n;
		}
		CanvasRenderingContext2D.prototype.drawImage = function(im) {
			var n = nameOf(im);
			if (n) drawnNames[n.replace(/-(body|leg\d-(upper|lower))$/, '')] = 1;
			return orig.apply(this, arguments);
		};
	})();
	function animFrames(prefix, n) { var f = []; for (var i = 0; i < n; i++) { if (!art(prefix + i)) return null; f.push(art(prefix + i)); } return f; }
	function pixels(im) {
		var c = document.createElement('canvas'), w = Math.min(im.width, 1600), h = Math.round(im.height * w / im.width);
		c.width = w; c.height = h;
		var x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
		return {w: w, h: h, data: x.getImageData(0, 0, w, h).data};
	}
	// the top edge of a layer in each column as a fraction of its height. A running median ignores tufts,
	// pebbles and small rocks, so the camels walk on the ground rather than hopping over every blade of grass.
	function skyline(im) {
		var px = pixels(im), w = px.w, h = px.h, d = px.data, raw = new Float32Array(w), top = new Float32Array(w), sum = 0;
		for (var c = 0; c < w; c++) { var r = 0; while (r < h - 1 && d[(r * w + c) * 4 + 3] < 140) r++; raw[c] = r / h; }
		var half = Math.round(w * 0.025), win = [];
		for (c = 0; c < w; c++) {
			win.length = 0;
			for (var k = -half; k <= half; k += 2) { var cc = c + k; if (cc < 0) cc = -cc; if (cc >= w) cc = 2 * w - cc - 2; win.push(raw[cc]); }   // mirrored at the ends, like the tiles
			win.sort(function(a, b) { return a - b; });
			top[c] = win[Math.floor(win.length * 0.6)]; sum += top[c];
		}
		im.top = top; im.meanTop = sum / w;
		// the ground itself: well below the tops of trees, rocks and tufts (a low percentile over a wide window)
		var ground = new Float32Array(w), gh = Math.round(w * 0.06);
		for (c = 0; c < w; c++) {
			win.length = 0;
			for (k = -gh; k <= gh; k += 4) { cc = c + k; if (cc < 0) cc = -cc; if (cc >= w) cc = 2 * w - cc - 2; win.push(raw[cc]); }
			win.sort(function(a, b) { return a - b; });
			ground[c] = win[Math.floor(win.length * 0.85)];
		}
		for (var pass = 0; pass < 2; pass++) for (c = 1; c < w - 1; c++) ground[c] = (ground[c - 1] + ground[c] * 2 + ground[c + 1]) / 4;
		im.ground = ground;
		var b = (h - 2) * w * 4, rr = 0, gg = 0, bb = 0, m = 0;
		for (c = 0; c < w; c += 8) { rr += d[b + c * 4]; gg += d[b + c * 4 + 1]; bb += d[b + c * 4 + 2]; m++; }
		im.bottom = 'rgb(' + Math.round(rr / m) + ',' + Math.round(gg / m) + ',' + Math.round(bb / m) + ')';
	}
	// where a single piece stands: the lowest solid row across its middle (its soft shadow doesn't count)
	function footing(im) {
		var px = pixels(im), w = px.w, h = px.h, d = px.data, base = 0;
		for (var c = Math.floor(w * 0.2); c < w * 0.8; c += 2) for (var r = h - 1; r > base; r--) if (d[(r * w + c) * 4 + 3] > 210) { base = r; break; }
		im.base = (base + 1) / h;
		// where the fire or lamp is: the centre of the brightest warm pixels
		var sx = 0, sy = 0, n = 0;
		for (var i = 0; i < w * h; i += 3) { var o = i * 4; if (d[o + 3] > 200 && d[o] > 235 && d[o + 1] > 170 && d[o + 2] < 150) { sx += i % w; sy += Math.floor(i / w); n++; } }
		if (n > 25) im.fire = [sx / n / w, sy / n / h];
	}
	// a copy whose edges fade away (left, right and bottom), so a cut-out blends into the land around it
	function feathered(im) {
		var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
		var x = c.getContext('2d'); x.drawImage(im, 0, 0);
		x.globalCompositeOperation = 'destination-in';
		var gx = x.createLinearGradient(0, 0, c.width, 0);
		gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.32, 'rgba(0,0,0,1)'); gx.addColorStop(0.68, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
		x.fillStyle = gx; x.fillRect(0, 0, c.width, c.height);
		var gy = x.createLinearGradient(0, 0, 0, c.height);
		gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.7, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
		x.fillStyle = gy; x.fillRect(0, 0, c.width, c.height);
		return c;
	}
	// a darker copy, for the far-side legs
	function tinted(im, k) {
		var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
		var x = c.getContext('2d'); x.drawImage(im, 0, 0);
		x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(30,15,40,' + (1 - k) + ')'; x.fillRect(0, 0, c.width, c.height);
		return c;
	}
	function stageArt(stage, layer) {
		var ready = stage.art[layer].filter(function(n) { return images[n]; });
		if (!ready.length) {   // nothing for this stage yet: borrow from the nearest stage that has some
			var i = STAGES.indexOf(stage);
			for (var dd = 1; dd < STAGES.length && !ready.length; dd++) [i - dd, i + dd].forEach(function(j) { if (!ready.length && STAGES[j]) ready = STAGES[j].art[layer].filter(function(n) { return images[n]; }); });
		}
		return ready.length ? images[ready[night.day % ready.length]] : null;
	}
	function hasLayerArt(layer) { return STAGES.some(function(s) { return s.art[layer].some(function(n) { return images[n]; }); }); }

	// ----- canvas and camera -----
	var canvas = document.getElementById('scene');
	var ctx = canvas.getContext('2d');
	var VH = 720, VW = 1280, S = 1, TOPV = 0, LEAD_X = 700, dpr = 1;
	function resize() {
		var w = canvas.clientWidth, h = canvas.clientHeight;
		dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
		S = Math.min(h / VH, w / (h > w ? 560 : 860));   // narrow screens zoom out just enough for the whole caravan
		VW = w / S;
		TOPV = -(h / S - VH);                              // extra sky above the scene on tall screens
		LEAD_X = Math.min(VW - 60, Math.max(VW * 0.52, 520) + 40);
		document.getElementById('rotate').style.display = h > w && w < 600 ? '' : 'none';   // phones held upright (not tablets)
		paint();
	}

	var realDay = Math.floor((now() - START) / DAY), over = realDay > END;      // once they're home, the journey is over
	var HOMEMODE = over || (TEST && params.has('home'));   // ?test&home to preview the year-round view
	function easterDay(y) {   // Easter Sunday (the Gregorian reckoning)
		var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
		var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
		return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
	}
	function EASTER() { return HOMEMODE && ymd(now()) === ymd(easterDay(now().getFullYear())); }   // Easter morning at home
	function PACKED() { return HOMEMODE && now().getMonth() === 8; }   // September: packed and ready to set out
	// at home, each day's weather by the real seasons of the lands east of the Jordan: winter rain, the hot khamsin winds
	// and sandstorms of spring, hazy summers
	function homeWeather() {
		var d = now(), m = d.getMonth(), r = hash(d.getFullYear() * 400 + YEARDAY);
		var odds = m <= 1 ? [['storm', 0.04], ['rain', 0.14], ['clouds', 0.25], ['fog', 0.07]]
			: m <= 4 ? [['sandstorm', 0.06], ['wind', 0.16], ['clouds', 0.14], ['haze', 0.1], ['rain', m === 2 ? 0.06 : 0]]
			: m <= 7 ? [['haze', 0.25], ['wind', 0.12]] : [['haze', 0.15], ['wind', 0.1], ['clouds', 0.08]];
		for (var i = 0, acc = 0; i < odds.length; i++) { acc += odds[i][1]; if (r < acc) return odds[i][0]; }
		return 'clear';
	}
	var YEARDAY = Math.floor((startOfDay(now()) - new Date(now().getFullYear(), 0, 1)) / DAY);   // (for home: what changes day to day)
	var realToday = Math.min(END, Math.max(0, realDay));   // tonight (0 = the night they set out)
	var lastOpen = TEST ? END : realToday;                                            // the furthest night that can be watched
	var viewIdx = realToday;
	var night = nightFor(viewIdx);
	var cam = -PROLOGUE;       // days along the road
	var restAt = cam;          // where the current show ends
	var walk = 0;              // 0 standing .. 1 walking
	var gaitDist = 0;          // distance the legs have walked
	var clock = 0;
	var timeScale = 1;

	function shiftOf(layer) { return cam * DAYW * SPEED[layer]; }
	function screenX(layer, u) { return u - shiftOf(layer) + LEAD_X; }
	function pieceU(p) { return p.pass * DAYW * SPEED[p.layer] + p.off; }

	// ----- layers: tiles of art along the road, every other one mirrored so joins always line up -----
	function tileInfo(layer, n) {
		var w = LAYER[layer].w, day = (n + 0.5) * w / (DAYW * SPEED[layer]);
		return {im: stageArt(stageAt(day), layer), n: n, w: w};
	}
	function box(im, layer) {
		var w = LAYER[layer].w, h = w * im.height / im.width;
		return {w: w, h: h, y: LAYER[layer].y - im.meanTop * h};
	}
	function tileY(im, layer, n, f, which) {
		var b = box(im, layer), line = which === 'ground' ? im.ground : im.top;
		if (n % 2) f = 1 - f;
		return b.y + line[Math.min(line.length - 1, Math.max(0, Math.floor(f * line.length)))] * b.h;
	}
	var FAR_HILLS = {
		plains: function(u) { return 0.4 * Math.sin(u / 900) + 0.15 * Math.sin(u / 310); },
		dunes: function(u) { return 0.8 * Math.abs(Math.sin(u / 700)) + 0.3 * Math.sin(u / 260 + 1); },
		rocky: function(u) { return Math.min(0.9 * Math.sin(u / 500) + 0.4 * Math.sin(u / 150 + 2), 0.55) * 1.4; },
		terraces: function(u) { return 0.6 * Math.sin(u / 800 + 1) + 0.25 * Math.sin(u / 300); }
	};
	var MID_HILLS = {
		plains: function(u) { return 0.35 * Math.sin(u / 610) + 0.2 * Math.sin(u / 233 + 1); },
		dunes: function(u) { var s = Math.sin(u / 420); return 0.9 * s * Math.abs(s) + 0.25 * Math.sin(u / 173 + 2); },
		rocky: function(u) { return 0.7 * Math.sin(u / 380) + 0.25 * Math.sin(u / 97 + 1); },
		terraces: function(u) { return Math.round((0.8 * Math.sin(u / 520) + 0.3 * Math.sin(u / 210 + 2)) * 5) / 5; }
	};
	function drawnY(layer, u) {
		var st = stageAt(u / (DAYW * SPEED[layer]));
		if (layer === 'road') return 606 + 16 * Math.sin(u / 520) + 8 * Math.sin(u / 190 + 1.3) + 3 * Math.sin(u / 77);
		return layer === 'far' ? 470 - 60 * FAR_HILLS[st.hill](u) : 545 - 42 * MID_HILLS[st.hill](u);
	}
	// the ground line of a layer at position u
	// the top line of a layer at position u ('ground' gives the ground under the trees and rocks)
	function layerY(layer, u, which) {
		if (!hasLayerArt(layer)) return drawnY(layer, u);
		var w = LAYER[layer].w, n = Math.floor(u / w), f = (u - n * w) / w;
		var cur = tileInfo(layer, n), prev = tileInfo(layer, n - 1);
		var y = tileY(cur.im, layer, n, f, which);
		if (prev.im !== cur.im && f < FADE) { var t = smooth(f / FADE); y = tileY(prev.im, layer, n, f, which) * (1 - t) + y * t; }
		return y;
	}
	function roadY(u) { return layerY('road', u); }
	function groundY(u) { return layerY('road', u, 'ground'); }   // where the camels walk: on the sand, with rocks and tufts behind them

	// draw part of a tile: the screen fraction [f0, f1] of tile n, mirrored on odd tiles
	function drawTilePart(im, layer, x, n, f0, f1, exact) {   // (exact: no overlap with the next part, for adding parts together)
		var b = box(im, layer), dx = x + f0 * b.w, dw = (f1 - f0) * b.w, o = exact ? 0 : 0.5;
		var s0 = (n % 2 ? 1 - f1 : f0) * im.width, sw = (f1 - f0) * im.width;
		// the outermost columns of a land picture are pale (left from cutting out the background): never use them, or where
		// two copies meet they line up into a thin pale line that flickers as the land scrolls
		var E = 3, lo = Math.max(s0, E), hi = Math.min(s0 + sw, im.width - E);
		if (hi > lo && (lo !== s0 || hi !== s0 + sw)) { s0 = lo; sw = hi - lo; }
		if (n % 2) { ctx.save(); ctx.translate(dx + dw, 0); ctx.scale(-1, 1); ctx.drawImage(im, s0, 0, sw, im.height, -o, b.y, dw + 2 * o, b.h); ctx.restore(); }
		else ctx.drawImage(im, s0, 0, sw, im.height, dx - o, b.y, dw + 2 * o, b.h);
		if (b.y + b.h < VH + 10) { var by = b.y + b.h - (exact ? 0 : 1); ctx.fillStyle = im.bottom; ctx.fillRect(dx - o, by, dw + 2 * o, VH + 10 - by); }
	}
	var fadeCvs = [];
	function fadeCanvas(i) {   // canvases the size of the scene's, for mixing two pictures of land where they meet
		var c = fadeCvs[i] || (fadeCvs[i] = document.createElement('canvas'));
		if (c.width !== canvas.width || c.height !== canvas.height) { c.width = canvas.width; c.height = canvas.height; }
		return c;
	}
	function paintLayerArt(layer) {
		var w = LAYER[layer].w, u0 = shiftOf(layer) - LEAD_X, n = Math.floor(u0 / w);
		for (var x = n * w - u0; x < VW; x += w, n++) {
			var cur = tileInfo(layer, n), prev = tileInfo(layer, n - 1);
			if (prev.im && prev.im !== cur.im) {
				// the land changes here: over the first part of the tile the old art turns into the new. Each is drawn whole on
				// a canvas of its own and faded across with a smooth mask (the old out, the new in), then the two are added
				// together, so the mix is true in colour and see-through-ness alike, with no strips and so no seams
				var fa = fadeCanvas(0), fb = fadeCanvas(1), main = ctx, w0 = box(cur.im, layer).w, x0 = x, x1 = x + FADE * w0;
				// the new art is drawn whole across the tile; across the fade the old art is mixed in, so there's no join
				[[fa, cur.im, false], [fb, prev.im, true]].forEach(function(job) {
					ctx = job[0].getContext('2d');
					ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
					ctx.clearRect(0, 0, job[0].width, job[0].height); ctx.setTransform(main.getTransform());
					drawTilePart(job[1], layer, x, n, 0, job[2] ? FADE : 1, true);
					var g = ctx.createLinearGradient(x0, 0, x1, 0);
					for (var k = 0; k <= 8; k++) { var t = smooth(k / 8); g.addColorStop(k / 8, 'rgba(0,0,0,' + (job[2] ? 1 - t : t).toFixed(4) + ')'); }
					ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = g;
					ctx.fillRect(x0 - 1, -2000, (job[2] ? x1 - x0 : w0) + 2, 6000);   // (the mask is solid from the end of the fade on)
					ctx.globalCompositeOperation = 'source-over';
				});
				ctx = fa.getContext('2d'); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fb, 0, 0); ctx.restore();
				ctx = main;
				ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fa, 0, 0); ctx.restore();
			}
			else if (cur.im) drawTilePart(cur.im, layer, x, n, 0, 1);
		}
	}
	function paintLayer(layer) {
		if (hasLayerArt(layer)) return paintLayerArt(layer);
		ctx.beginPath(); ctx.moveTo(-20, VH + 10);
		for (var x = -20; x <= VW + 20; x += 8) ctx.lineTo(x, drawnY(layer, x - LEAD_X + shiftOf(layer)));
		ctx.lineTo(VW + 20, VH + 10); ctx.closePath();
		ctx.fillStyle = layer === 'road' ? '#F2A93B' : stageAt(cam)[layer];
		ctx.fill();
	}

	// ----- grain in the sand: a speckled tile that scrolls with the road -----
	var grain = (function() {
		var c = document.createElement('canvas'), N = 220; c.width = c.height = N;
		var x = c.getContext('2d'), r = rng(42);
		for (var i = 0; i < 1500; i++) {
			var dark = r() < 0.55;
			x.fillStyle = dark ? 'rgba(110,60,15,' + (0.25 + r() * 0.4) + ')' : 'rgba(255,240,205,' + (0.25 + r() * 0.45) + ')';
			var s = 0.5 + r() * 1.3; x.fillRect(r() * N, r() * N, s, s * (0.6 + r() * 0.6));
		}
		for (i = 0; i < 14; i++) {   // a few pebbles
			var px = r() * N, py = r() * N, pr = 1.2 + r() * 2.2;
			x.fillStyle = 'rgba(120,70,25,0.45)'; x.beginPath(); x.ellipse(px, py + 0.8, pr, pr * 0.6, 0, 0, 7); x.fill();
			x.fillStyle = 'rgba(255,225,170,0.6)'; x.beginPath(); x.ellipse(px - 0.3, py, pr * 0.8, pr * 0.45, 0, 0, 7); x.fill();
		}
		return c;
	})();
	var grainPattern = null;
	function paintGrain() {
		if (!grainPattern) grainPattern = ctx.createPattern(grain, 'repeat');
		var base = cam * DAYW;
		ctx.save();
		ctx.beginPath(); ctx.moveTo(-20, VH + 20);
		for (var x = -20; x <= VW + 20; x += 10) ctx.lineTo(x, roadY(base + x - LEAD_X) + 3);
		ctx.lineTo(VW + 20, VH + 20); ctx.closePath(); ctx.clip();
		if (grainPattern.setTransform) grainPattern.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, -(base % 176), 0]));
		ctx.globalAlpha = 0.6; ctx.fillStyle = grainPattern; ctx.fillRect(-20, 520, VW + 40, VH - 500);
		ctx.restore();
	}

	// ----- weather -----
	// intensity through the night: storms build, rage through the middle and clear before they rest
	// how far through the night we are (0..1); in the time-lapse, how far through the day it's passing
	// On 'late sun' nights (plan.js sun: 'late') they ride in the late afternoon: 1 is full afternoon light, falling
	// as the sun sinks through the walk, about a quarter left as they stop, and gone a few seconds into the evening,
	// while the fire is lit
	// On 'day' nights they travel by day: full daylight under a high sun until well into the afternoon, then the same
	// sinking sun and nightfall.
	function daylight() {
		var sun = night.plan && night.plan.sun;
		if ((sun !== 'late' && sun !== 'day') || (show && show.mode === 'sofar')) return 0;
		var e = evening();
		if (e > 0) return 0.25 * (1 - smooth(e / 6));
		return sun === 'day' ? 1 - 0.75 * smooth((nightT() - 0.55) / 0.45) : 1 - 0.75 * smooth((nightT() - 0.35) / 0.65);
	}
	function morningMist() {   // on 'day' nights mist lies in the valleys at first and burns off as the sun climbs
		if (!night.plan || night.plan.sun !== 'day' || (show && show.mode === 'sofar') || evening() > 0 || /rain|storm|sandstorm/.test(night.weather)) return 0;
		return 1 - smooth(nightT() / 0.35);
	}
	function noon() {   // how much of the high midday look there is (1 at the start of a 'day' night, gone by sunset)
		return night.plan && night.plan.sun === 'day' && !(show && show.mode === 'sofar') && evening() === 0 ? 1 - smooth((nightT() - 0.2) / 0.6) : 0;
	}
	function nightT() {
		if (!show) return 1;
		if (show.mode === 'sofar') return clamp(cam - (Math.floor(cam + 0.15) - 0.15), 0, 1);
		return clamp(show.elapsed / show.seconds, 0, 1);
	}
	// how far the sky has drifted since tonight began (the moon and comet move with it, but stay on screen)
	function skyDrift() {
		var start = !show ? cam : show.mode === 'sofar' ? Math.floor(cam + 0.15) - 0.15 : show.from;
		return (cam - start) * DAYW * SPEED.sky;
	}
	function litSky(k) { return /dusk|predawn/.test(planFor(k).sky || ''); }   // evening or dawn light: the only skies a rainbow can appear in
	function cometNight(k) { return k >= dayOf('11-06') && k <= dayOf('11-12'); }   // a comet hangs in the sky for a week in November
	function snowSeason(k) { return k >= dayOf('12-01'); }                           // winter snow on the far mountains
	function wetBefore(k) { var p = planFor(k - 1); return p.weather === 'storm' || p.weather === 'rain'; }
	function weatherLevel(t) {
		var w = night.weather;
		if (HOMEMODE) return w === 'storm' || w === 'sandstorm' ? 0.75 : 0.9;   // at home the night doesn't pass: the weather holds steady
		if (w === 'storm' || w === 'sandstorm') return smooth((t - 0.06) / 0.22) * (1 - smooth((t - 0.7) / 0.18));
		if (w === 'rain') return smooth((t - 0.03) / 0.15) * (1 - smooth((t - 0.82) / 0.14));
		return 1;
	}
	var wx = {level: 0, cover: 0, flash: 0, shake: 0, nextStrike: 3, thunderIn: -1, bolt: null, drops: [], dust: [], streaks: [], splashes: []};
	function softBlob(r, g, b, size) {
		var c = document.createElement('canvas'); c.width = c.height = size;
		var x = c.getContext('2d'), gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.9)'); gr.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',0.35)'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
		x.fillStyle = gr; x.fillRect(0, 0, size, size);
		return c;
	}
	var DUST = softBlob(196, 136, 74, 256), MIST = softBlob(196, 190, 230, 256);
	// paper-cut clouds: a heap of round puffs, in two layers (a darker one behind), lit from above
	function makeCloud(seed, dark) {
		var r = rng(seed), W = 560, H = 230, c = document.createElement('canvas'); c.width = W; c.height = H;
		var x = c.getContext('2d'), puffs = [], n = 9 + Math.floor(r() * 6);
		for (var i = 0; i < n; i++) {
			var f = i / (n - 1), px = 70 + (W - 140) * f + (r() - 0.5) * 40;
			var hump = Math.sin(Math.PI * f), pr = 26 + hump * (34 + r() * 30);
			puffs.push([px, H - 50 - pr * 0.7 - hump * 26 * r(), pr]);
		}
		for (i = 0; i < 6; i++) puffs.push([110 + r() * (W - 220), H - 58, 30 + r() * 18]);   // a rounded underside
		function heap(dx, dy, top, bottom) {
			var g = x.createLinearGradient(0, 30, 0, H - 30); g.addColorStop(0, top); g.addColorStop(1, bottom);
			x.fillStyle = g; x.beginPath();
			puffs.forEach(function(p) { x.moveTo(p[0] + dx + p[2], p[1] + dy); x.arc(p[0] + dx, p[1] + dy, p[2], 0, Math.PI * 2); });
			x.fill();
		}
		x.filter = 'blur(1.2px)';
		// back layer, then a light edge along the top (the same heap nudged up), then the cloud itself
		if (dark) { heap(14, 12, '#25223c', '#110f22'); heap(0, -4, '#6a6590', '#2a2640'); heap(0, 0, '#45415f', '#1f1c34'); }
		else { heap(14, 11, '#4e4884', '#2c2758'); heap(0, -4, '#cfc9f0', '#6e67a8'); heap(0, 0, '#9d97cc', '#5d5698'); }
		return c;
	}
	var CLOUDS = {light: [1, 2, 3, 4].map(function(n) { return makeCloud(n * 11, false); }), dark: [5, 6, 7, 8].map(function(n) { return makeCloud(n * 13, true); })};
	// the Firefly clouds that are in, taking turns; drawn ones until then
	function cloudArt(dark, i) {
		var names = dark ? ['jr-cloud-storm-1', 'jr-cloud-storm-2', 'jr-cloud-storm-3'] : ['jr-cloud-1', 'jr-cloud-2', 'jr-cloud-3', 'jr-cloud-4'];
		var have = names.filter(function(n) { return art(n); });
		return have.length ? art(have[i % have.length]) : CLOUDS[dark ? 'dark' : 'light'][i % 4];
	}

	function softUnder(im) {   // the cloud pictures end in a flat cut along the bottom: fade their undersides away instead
		if (!im || im.soft2) return im && im.soft2 || im;
		if (!im.width) return im;
		var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
		var g = c.getContext('2d'); g.drawImage(im, 0, 0);
		var fade = g.createLinearGradient(0, im.height * 0.62, 0, im.height);
		fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
		g.globalCompositeOperation = 'destination-in'; g.fillStyle = fade; g.fillRect(0, 0, im.width, im.height);
		im.soft2 = c;
		return c;
	}
	function paintClouds(level, which) {
		var w = night.weather, count = {clouds: 7, rain: 10, storm: 13, haze: 3, fog: 3, wind: 3, sandstorm: 0, clear: 0}[w] || 0;
		if (!count) return;
		var dark = w === 'storm' || w === 'rain', sh = shiftOf('sky');
		var coverage = w === 'storm' || w === 'rain' ? level : 1;
		for (var i = 0; i < count; i++) {
			var r = rng(night.day * 31 + i), depth = 0.5 + r() * 0.5;
			if ((depth > 0.78) !== (which === 'front')) continue;
			var cw = (dark ? 600 : 440) * depth * (0.8 + r() * 0.5), ch = cw * 230 / 560;
			var span = VW + cw * 2, speed = (8 + night.wind * 40) * depth;
			var x = ((r() * span - clock * speed - sh * depth * 3) % span + span) % span - cw;
			var y = TOPV + (dark ? 20 + r() * 230 * depth : 40 + r() * 280);
			var a = (dark ? 0.97 : w === 'clouds' ? 0.95 : 0.5) * coverage * (0.85 + depth * 0.15);   // near enough solid: the sky mustn't show through
			if (a < 0.02) continue;
			ctx.globalAlpha = a;
			ctx.drawImage(softUnder(cloudArt(dark, i)), x, y, cw, ch);
			if (wx.flash > 0 && dark) { ctx.globalAlpha = a * wx.flash * 0.5; ctx.drawImage(CLOUDS.light[i % 4], x, y, cw, ch); }
		}
		ctx.globalAlpha = 1;
	}
	function paintMist(y, alpha, speed, scale) {
		var sh = shiftOf('mid') * speed;
		ctx.globalAlpha = alpha;
		for (var i = -1; i < VW / 260 + 2; i++) {
			var x = ((i * 260 - sh - clock * 6 * speed) % (VW + 520) + VW + 520) % (VW + 520) - 260;
			ctx.drawImage(MIST, x - 80, y - 60 * scale, 520 * scale, 140 * scale);
		}
		ctx.globalAlpha = 1;
	}
	function makeBolt() {
		var x0 = VW * (0.15 + Math.random() * 0.55), y0 = TOPV + 140 + Math.random() * 60, y1 = 455 + Math.random() * 30;
		var pts = [[x0, y0]], x = x0, y = y0;
		while (y < y1) { y += 18 + Math.random() * 26; x += (Math.random() - 0.5) * 46; pts.push([x, Math.min(y, y1)]); }
		var branch = pts.slice(2, 3 + Math.floor(Math.random() * 3)).map(function(p) { return p.slice(); });
		var bx = branch[branch.length - 1][0], by = branch[branch.length - 1][1];
		for (var j = 0; j < 4; j++) { by += 16 + Math.random() * 18; bx += 14 + Math.random() * 18; branch.push([bx, by]); }
		return [pts, branch.slice(branch.length - 5)];
	}
	function stepWeather(dt, t) {
		wx.level = night.weather === 'clear' ? 0 : weatherLevel(t);
		wx.cover = night.weather === 'storm' || night.weather === 'rain' ? wx.level * (night.weather === 'storm' ? 0.95 : 0.7) : night.weather === 'clouds' ? 0.35 : night.weather === 'sandstorm' ? wx.level * 0.85 : 0;
		wx.flash = Math.max(0, wx.flash - dt * 3.2);
		wx.shake = Math.max(0, wx.shake - dt * 1.4);
		if (night.weather === 'storm' && wx.level > 0.55 && !reduceMotion) {
			wx.nextStrike -= dt;
			if (wx.nextStrike <= 0) { wx.bolt = makeBolt(); wx.flash = 1; wx.thunderIn = 0.5 + Math.random() * 1.3; wx.near = wx.thunderIn < 0.9; wx.nextStrike = 2.8 + Math.random() * 4.5; wx.flicker = 0.14; }
		}
		if (wx.flicker > 0) { wx.flicker -= dt; if (wx.flicker <= 0) wx.flash = Math.max(wx.flash, 0.8); }
		if (wx.thunderIn > 0) { wx.thunderIn -= dt; if (wx.thunderIn <= 0) { wx.shake = 1; sound.thunder(wx.near); } }
		if (wx.flash <= 0.05) wx.bolt = null;
		// rain and dust move in screen space
		var raining = (night.weather === 'rain' || night.weather === 'storm') ? smooth((wx.level - 0.3) / 0.6) : 0;   // the rain stops while there are still clouds
		var want = Math.round(raining * (night.weather === 'storm' ? 420 : 280));
		while (wx.drops.length < want) wx.drops.push({x: Math.random() * (VW + 200), y: TOPV + Math.random() * (VH - TOPV), l: 14 + Math.random() * 16, v: 900 + Math.random() * 500});
		if (wx.drops.length > want) wx.drops.length = want;
		var slant = 0.18 + night.wind * 0.25;
		wx.drops.forEach(function(d) {
			d.y += d.v * dt; d.x -= d.v * dt * slant + WALK * walk * dt;
			if (d.y > VH || d.x < -40) { d.y = TOPV - Math.random() * 60; d.x = Math.random() * (VW + 200); if (raining && Math.random() < 0.5) wx.splashes.push({x: Math.random() * VW, t: 0, depth: Math.random()}); }
		});
		wx.splashes = wx.splashes.filter(function(s) { s.t += dt * 3; return s.t < 1; });
		var dusty = night.weather === 'sandstorm' ? wx.level : night.weather === 'wind' ? 0.35 : 0;
		var wantStreaks = Math.round(dusty * 240);
		while (wx.streaks.length < wantStreaks) wx.streaks.push({x: Math.random() * (VW + 300), y: 380 + Math.random() * 340, v: 500 + Math.random() * 700, s: 0.6 + Math.random() * 1.4});
		if (wx.streaks.length > wantStreaks) wx.streaks.length = wantStreaks;
		wx.streaks.forEach(function(p) { p.x -= (p.v * (0.5 + night.wind) + WALK * walk) * dt; if (p.x < -40) { p.x = VW + Math.random() * 200; p.y = 380 + Math.random() * 340; } });
		var wantDust = night.weather === 'sandstorm' ? 16 : 0;
		while (wx.dust.length < wantDust) wx.dust.push({x: Math.random() * (VW + 800) - 400, y: 250 + Math.random() * 420, s: 260 + Math.random() * 420, v: 260 + Math.random() * 380, d: Math.random()});
		if (wx.dust.length > wantDust) wx.dust.length = wantDust;
		wx.dust.forEach(function(p) { p.x -= p.v * dt; if (p.x < -p.s) { p.x = VW + Math.random() * 300; p.y = 250 + Math.random() * 420; } });
	}
	function paintBolt() {
		if (!wx.bolt) return;
		ctx.save();
		ctx.strokeStyle = 'rgba(235,235,255,' + wx.flash + ')'; ctx.shadowColor = 'rgba(190,190,255,0.9)'; ctx.shadowBlur = 18; ctx.lineJoin = 'round';
		wx.bolt.forEach(function(line, i) { ctx.lineWidth = i ? 1.6 : 3; ctx.beginPath(); line.forEach(function(p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); });
		ctx.restore();
	}
	function tint(color, a, y0) { if (a <= 0.005) return; ctx.fillStyle = color.replace('A', a.toFixed(3)); ctx.fillRect(-20, y0 == null ? TOPV : y0, VW + 40, VH - (y0 == null ? TOPV : y0) + 20); }

	// ----- critters: they scurry across the road, or fly over -----
	var critters = [];
	function spawnCritter(kind) {
		var r = Math.random(), dir = kind === 'hedgehog' ? 1 : r < 0.65 ? -1 : 1;
		var c = {kind: kind, t: 0, dir: dir, seed: Math.random() * 10};
		if (kind === 'owl') { c.x = dir < 0 ? VW + 60 : -60; c.y = TOPV + (220 - TOPV) * 0.5 + 120 + Math.random() * 120; c.v = 95 + Math.random() * 30; }   // an unhurried glide
		else if (kind === 'bats') { if (!art('jr-cr-bat')) return; c.x = VW * (0.2 + Math.random() * 0.6); c.y = 200 + Math.random() * 120; c.life = 9; }
		else {
			var sx = dir < 0 ? VW + 40 : -40;
			c.u = sx - LEAD_X + cam * DAYW; c.depth = 16 + Math.random() * 18;
			c.v = {jerboa: 150, mouse: 190, gecko: 220, hedgehog: 34, scorpion: 55, centipede: 70, spider: 120, beetle: 40, snake: 60}[kind] * (0.85 + Math.random() * 0.3);
			if (kind === 'hedgehog') { c.u = cam * DAYW + (Math.random() < 0.5 ? 420 : -500); c.dir = 1; }
		}
		critters.push(c);
		if (kind === 'owl') sound.hoot();
	}
	function stepCritters(dt) {
		critters = critters.filter(function(c) {
			c.t += dt;
			var fast = show && show.mode === 'sofar' ? 4 : 1;      // in the time-lapse, everything moves faster
			if (c.kind === 'owl') { c.x += c.dir * c.v * dt * fast; return c.x > -120 && c.x < VW + 120; }
			if (c.kind === 'bats') return c.t < c.life;
			var go = c.kind === 'jerboa' ? (Math.sin(c.t * 7 + c.seed) > -0.2 ? 1 : 0) : /mouse|gecko|spider|scorpion/.test(c.kind) ? (Math.sin(c.t * 2.2 + c.seed) > -0.45 ? 1 : 0.05) : 1;   // dart, stop, dart
			c.moving = go > 0.5;
			c.u += c.dir * c.v * go * dt;
			var x = c.u - cam * DAYW + LEAD_X;
			return x > -120 && x < VW + 120 && c.t < 40;
		});
	}
	function critterArt(kind, c) {
		if (kind === 'owl') {   // a flap from its animation sheet (up, level, up, level...), else the two single pictures
			var of = animFrames('jr-an-owl-', 3);
			if (of) return of[[0, 1, 2, 1][Math.floor(clock * 8 + c.seed * 4) % 4]];
			return art('jr-cr-owl-wings-down') ? art(Math.sin(clock * 9 + c.seed) > 0 ? 'jr-cr-owl-wings-up' : 'jr-cr-owl-wings-down') : art('jr-cr-owl-wings-up');
		}
		return art({jerboa: 'jr-cr-jerboa', mouse: 'jr-cr-sand-mouse', gecko: 'jr-cr-gecko', hedgehog: 'jr-cr-hedgehog', bats: 'jr-cr-bat'}[kind]);
	}
	// the small things that scuttle across the sand, drawn in code: a scorpion, a centipede, a spider, a beetle.
	// Kept small and dark (shapes in the night, not close-ups) so they're interesting rather than creepy.
	function drawBug(c) {
		if (!/scorpion|centipede|spider|beetle|snake/.test(c.kind)) return false;
		var t = c.t * (c.moving ? 18 : 0), col = '#2a1c22';
		ctx.scale(1.35, 1.35);   // (the caller restores)
		ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
		if (c.kind === 'scorpion') {
			ctx.lineWidth = 1.1;
			for (var i = 0; i < 4; i++) { var lx = -3 + i * 2.2, sw = Math.sin(t + i * 1.6) * 1.4; ctx.beginPath(); ctx.moveTo(lx, -2.5); ctx.lineTo(lx - 1.5 + sw, 0); ctx.stroke(); }
			ctx.beginPath(); ctx.ellipse(0, -3, 5, 1.9, 0, 0, Math.PI * 2); ctx.fill();
			ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, -3);                       // the tail curls up over its back
			ctx.bezierCurveTo(-9, -4, -10, -11, -5, -11.5); ctx.stroke();
			ctx.beginPath(); ctx.arc(-4.2, -11.2, 1.1, 0, Math.PI * 2); ctx.fill();
			ctx.lineWidth = 1.1; [-1, 1].forEach(function(sd) { ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(7, -3 + sd * 1.5); ctx.lineTo(8.5, -3 + sd * 0.6); ctx.stroke(); });   // pincers
			return true;
		}
		if (c.kind === 'snake') {
			// a desert snake slithering along in an S, its body flowing through the curve
			ctx.scale(1 / 1.35, 1 / 1.35);
			var segs = 26, len = 46, wave = c.t * 7;
			ctx.lineCap = 'round'; ctx.lineJoin = 'round';
			for (var pass = 0; pass < 2; pass++) {
				ctx.strokeStyle = pass ? '#8a6a3e' : '#3a2a1c'; ctx.lineWidth = pass ? 1.4 : 3.4;
				ctx.beginPath();
				for (var q = 0; q <= segs; q++) {
					var f = q / segs, px = -f * len, py = -2 + Math.sin(wave - f * 7) * 3.2 * (0.4 + 0.6 * f) * (c.moving ? 1 : 0.4);
					if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py);
				}
				ctx.stroke();
			}
			var hy = -2 + Math.sin(wave) * 1.3 * (c.moving ? 1 : 0.4);
			ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.ellipse(2, hy, 3.2, 2.1, 0, 0, Math.PI * 2); ctx.fill();
			if (Math.sin(c.t * 3) > 0.7) { ctx.strokeStyle = '#a3402e'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(5, hy); ctx.lineTo(8, hy - 0.6); ctx.moveTo(7, hy - 0.4); ctx.lineTo(8.4, hy + 0.6); ctx.stroke(); }   // a flick of the tongue
			return true;
		}
		if (c.kind === 'centipede') {
			ctx.lineWidth = 0.7;
			for (var k = 0; k < 12; k++) {
				var sx = -k * 1.6, sy = -1.6 + Math.sin(c.t * 9 - k * 0.7) * 0.6 * (c.moving ? 1 : 0);
				ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, Math.PI * 2); ctx.fill();
				var lg = Math.sin(t - k * 1.1) * 0.9;
				ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + lg, 0.4); ctx.stroke();
			}
			ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(3, -3.6); ctx.stroke();       // antennae
			return true;
		}
		if (c.kind === 'spider') {
			ctx.lineWidth = 0.9;
			for (var j = 0; j < 4; j++) [-1, 1].forEach(function(sd) {
				var ang = -0.6 + j * 0.4, sw2 = Math.sin(t + j * 1.3 + (sd > 0 ? Math.PI : 0)) * 0.25;
				ctx.beginPath(); ctx.moveTo(0, -3);
				ctx.lineTo(Math.cos(ang + sw2) * 4 * sd, -5.5); ctx.lineTo(Math.cos(ang + sw2) * 6.5 * sd, 0); ctx.stroke();
			});
			ctx.beginPath(); ctx.ellipse(-1.2, -3.4, 2.4, 1.9, 0, 0, Math.PI * 2); ctx.fill();
			ctx.beginPath(); ctx.arc(1.4, -3.2, 1.2, 0, Math.PI * 2); ctx.fill();
			return true;
		}
		// a dung beetle, rolling its little ball of sand
		var rot = c.u * 0.12;
		ctx.fillStyle = '#b48a56'; ctx.beginPath(); ctx.arc(5, -3, 3, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = 'rgba(90,60,30,0.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(5, -3, 3, rot, rot + 2); ctx.stroke();
		ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -2.6, 2.6, 2, -0.3, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = col; ctx.lineWidth = 0.8;
		for (var m = 0; m < 3; m++) { var bl = Math.sin(t + m * 2) * 1; ctx.beginPath(); ctx.moveTo(-1 + m * 1.2, -1.5); ctx.lineTo(-2 + m * 1.2 + bl, 0); ctx.stroke(); }
		return true;
	}
	function paintCritters(sky) {
		critters.forEach(function(c) {
			if ((c.kind === 'owl' || c.kind === 'bats') !== sky) return;
			var col = '#1d1424', im = critterArt(c.kind, c);
			if (c.kind === 'owl') {
				var y = c.y + Math.sin(c.t * 1.6) * 14, flap = Math.sin(clock * 9 + c.seed);
				ctx.save(); ctx.translate(c.x, y); ctx.scale(im ? c.dir : -c.dir, 1);   // the art faces right; the stand-in faces left
				var of0 = animFrames('jr-an-owl-', 3);
				if (of0) {
					// mostly a glide on spread wings, with two slow wingbeats every few seconds; the two poses are blended
					// into each other, so the wings sweep rather than jump
					var cyc = (c.t + c.seed) % 3.4, up = cyc < 1.3 ? (1 - Math.cos(cyc / 1.3 * 4 * Math.PI)) / 2 : 0;
					var glideIm = of0[1], upIm = of0[0], osc = 70 / glideIm.width;
					ctx.globalAlpha = 1 - up; ctx.drawImage(glideIm, -glideIm.width * osc / 2, -glideIm.height * osc / 2, glideIm.width * osc, glideIm.height * osc);
					ctx.globalAlpha = up;     ctx.drawImage(upIm, -upIm.width * osc / 2, -upIm.height * osc * 0.62, upIm.width * osc, upIm.height * osc);
					ctx.globalAlpha = 1; ctx.restore(); return;
				}
				if (im) { var osc2 = 60 / im.width; ctx.drawImage(im, -im.width * osc2 / 2, -22, im.width * osc2, im.height * osc2); ctx.restore(); return; }
				ctx.fillStyle = '#2a2036';
				ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, 7); ctx.fill();
				ctx.beginPath(); ctx.arc(-9, -3, 5.5, 0, 7); ctx.fill();
				[0].forEach(function() { ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(4, -2 - 16 * flap, 22, -6 - 12 * flap); ctx.quadraticCurveTo(10, 2, -2, 2); ctx.fill(); });
				ctx.fillStyle = '#ffd27a'; ctx.fillRect(-12, -5, 1.6, 1.6);
				ctx.restore();
				return;
			}
			if (c.kind === 'bats') {
				for (var b = 0; b < 4; b++) {
					var bx = c.x + Math.sin(c.t * (1.3 + b * 0.3) + b * 2) * 140 + Math.sin(c.t * 5 + b) * 20, by = c.y + Math.cos(c.t * (1.7 + b * 0.2) + b) * 50;
					var f = Math.sin(clock * 22 + b * 1.7), a = Math.min(1, c.t, c.life - c.t);
					ctx.globalAlpha = a;
					if (im) { ctx.drawImage(im, bx - 9, by - 6, 18, 18 * im.height / im.width); continue; }
					ctx.fillStyle = '#140e1c'; ctx.beginPath(); ctx.moveTo(bx - 9, by - 4 * f); ctx.quadraticCurveTo(bx - 4, by + 2, bx, by); ctx.quadraticCurveTo(bx + 4, by + 2, bx + 9, by - 4 * f); ctx.quadraticCurveTo(bx, by + 5, bx - 9, by - 4 * f); ctx.fill();
				}
				ctx.globalAlpha = 1;
				return;
			}
			var x = c.u - cam * DAYW + LEAD_X, gy = roadY(c.u) + c.depth;
			var hop = c.kind === 'jerboa' && c.moving ? Math.abs(Math.sin(c.t * 9 + c.seed)) * 16 : c.kind === 'mouse' && c.moving ? Math.abs(Math.sin(c.t * 20)) * 2 : 0;
			ctx.save(); ctx.translate(x, gy - hop); ctx.scale(c.dir, 1);
			ctx.fillStyle = 'rgba(60,30,10,0.25)'; ctx.beginPath(); ctx.ellipse(0, hop, 9, 2, 0, 0, 7); ctx.fill();
			if (drawBug(c)) { ctx.restore(); return; }
			if (im) { var hh = {jerboa: 26, mouse: 14, gecko: 10, hedgehog: 20}[c.kind]; ctx.drawImage(im, -hh * im.width / im.height / 2, -hh, hh * im.width / im.height, hh); ctx.restore(); return; }
			ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
			if (c.kind === 'jerboa') {
				ctx.beginPath(); ctx.ellipse(0, -8, 6, 5, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5, -12, 3.4, 0, 7); ctx.fill();
				ctx.beginPath(); ctx.ellipse(4, -18, 1.6, 4.5, -0.2, 0, 7); ctx.fill();
				ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.quadraticCurveTo(-16, -4, -22, -12); ctx.stroke(); ctx.beginPath(); ctx.arc(-22, -12, 2, 0, 7); ctx.fill();
				ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(hop > 3 ? -5 : 1, 0); ctx.stroke();
			} else if (c.kind === 'mouse') {
				ctx.beginPath(); ctx.ellipse(0, -4, 6, 3.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(6, -5, 2.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5, -8, 1.8, 0, 7); ctx.fill();
				ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.quadraticCurveTo(-12, 0, -16, -3); ctx.stroke();
			} else if (c.kind === 'gecko') {
				var wig = c.moving ? Math.sin(c.t * 30) * 2 : 0;
				ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -1 + wig); ctx.quadraticCurveTo(-4, -3 - wig, 8, -2); ctx.stroke(); ctx.beginPath(); ctx.arc(10, -2.5, 2.4, 0, 7); ctx.fill();
				ctx.lineWidth = 1.4; [[-5, 1], [3, -1]].forEach(function(l) { ctx.beginPath(); ctx.moveTo(l[0], -2); ctx.lineTo(l[0] + 3 * l[1], 2); ctx.moveTo(l[0], -2); ctx.lineTo(l[0] - 3 * l[1], -6); ctx.stroke(); });
			} else {   // hedgehog
				var wd = Math.sin(c.t * 8) * 1;
				ctx.beginPath(); ctx.ellipse(0, -6 - Math.abs(wd), 10, 7, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, -6, 20, 3);
				for (var s = -8; s <= 8; s += 3) { ctx.beginPath(); ctx.moveTo(s - 1.5, -9 + Math.abs(s) * 0.3); ctx.lineTo(s, -14 + Math.abs(s) * 0.5); ctx.lineTo(s + 1.5, -9 + Math.abs(s) * 0.3); ctx.fill(); }
				ctx.beginPath(); ctx.ellipse(11, -5, 4, 2.8, 0.2, 0, 7); ctx.fill();
			}
			ctx.restore();
		});
	}

	// ----- drawing helpers for the stand-in art -----
	function shape(points, fill) { ctx.beginPath(); ctx.moveTo(points[0], points[1]); for (var i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
	function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
	function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
	// the sign that something can be tapped: a little four-pointed sparkle that swells and fades
	function sparkle(x, y, size, a) {
		if (a <= 0.02) return;
		ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
		glow(0, 0, size * 1.6, 'rgb(255,240,190)', 0.5);
		ctx.fillStyle = '#fff8dc'; ctx.beginPath();
		for (var k = 0; k < 8; k++) { var ang = k * Math.PI / 4, rr = k % 2 ? size * 0.22 : size; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr); }
		ctx.closePath(); ctx.fill(); ctx.restore();
	}
	function beckon(seed, every) {   // 0..1..0 once every few seconds, at its own moment
		var t = (clock + seed * 7.3) % every;
		return t < 1.2 ? Math.sin(Math.PI * t / 1.2) : 0;
	}
	function glow(x, y, r, color, a) {
		if (a <= 0) return;
		var g = ctx.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color.replace(')', ',' + a + ')').replace('rgb', 'rgba')); g.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
		ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
	}
	function flicker(seed) { return 0.75 + 0.25 * Math.sin(clock * 9 + seed) * Math.sin(clock * 5.3 + seed * 2); }
	function windows(x, y, w, h, n, seed) {
		var r = rng(seed);
		for (var i = 0; i < n; i++) if (r() < 0.6) rect(x + r() * (w - 5), y + r() * (h - 6), 4, 5, 'rgba(255,207,115,' + (0.6 + 0.4 * flicker(seed + i)).toFixed(2) + ')');
	}
	function palm(x, y, h, col, lean) {
		ctx.strokeStyle = col; ctx.lineCap = 'round';
		ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.5, x + lean, y - h); ctx.stroke();
		var tx = x + lean, ty = y - h, sway = Math.sin(clock * (0.8 + night.wind * 2) + x) * (0.03 + night.wind * 0.08);
		ctx.lineWidth = h * 0.035;
		for (var a = 0; a < 8; a++) {
			var ang = -Math.PI + a * Math.PI / 7 + sway, len = h * (0.42 + (a % 2) * 0.1);
			ctx.beginPath(); ctx.moveTo(tx, ty);
			ctx.quadraticCurveTo(tx + Math.cos(ang) * len * 0.6, ty + Math.sin(ang) * len * 0.6 - h * 0.08, tx + Math.cos(ang) * len, ty + Math.sin(ang) * len * 0.5 + h * 0.12);
			ctx.stroke();
		}
	}
	function acacia(x, y, h, col) {
		ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.05;
		ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - h * 0.05, y - h * 0.5, x - h * 0.25, y - h * 0.82); ctx.moveTo(x - h * 0.02, y - h * 0.5); ctx.quadraticCurveTo(x + h * 0.2, y - h * 0.7, x + h * 0.3, y - h * 0.85); ctx.stroke();
		ctx.beginPath(); ctx.ellipse(x, y - h * 0.9, h * 0.62, h * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
	}
	function olive(x, y, h, col) {
		ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.09;
		ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + h * 0.12, y - h * 0.25, x - h * 0.12, y - h * 0.4, x, y - h * 0.55); ctx.stroke();
		[[0, -0.72, 0.3], [-0.25, -0.62, 0.22], [0.25, -0.6, 0.22], [-0.1, -0.88, 0.2], [0.15, -0.85, 0.2]].forEach(function(b) { circle(x + b[0] * h, y + b[1] * h, b[2] * h, col); });
	}
	function boulders(x, y, h, col) {
		ctx.fillStyle = col;
		[[0, 0.5, 0.8], [0.55, 0.35, 0.55], [-0.5, 0.3, 0.5]].forEach(function(b) { ctx.beginPath(); ctx.ellipse(x + b[0] * h, y, b[2] * h * 0.6, b[1] * h * 1.1, 0, Math.PI, 0); ctx.fill(); });
	}
	function grass(x, y, h, col) {
		ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
		for (var i = 0; i < 26; i++) { var gx = x - h + i * h * 0.08, gh = h * (0.3 + 0.7 * hash(i + x)); ctx.beginPath(); ctx.moveTo(gx, y); ctx.quadraticCurveTo(gx + 4, y - gh * 0.6, gx + 10 + Math.sin(clock * (1 + night.wind * 3) + i) * (3 + night.wind * 6), y - gh); ctx.stroke(); }
	}
	function wall(x, y, h, col) { rect(x - h, y - h * 0.3, h * 2, h * 0.3, col); for (var i = 0; i < 6; i++) rect(x - h + i * h * 0.35, y - h * 0.38, h * 0.2, h * 0.1, col); }
	function animal(x, y, s, col, kind, legs) {
		ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
		var bw = kind === 'hare' ? 10 : kind === 'fox' ? 18 : 22, bh = kind === 'hare' ? 7 : 8;
		ctx.beginPath(); ctx.ellipse(x, y - s * 16, s * bw / 2, s * bh / 2, 0, 0, Math.PI * 2); ctx.fill();
		ctx.lineWidth = s * 2;
		var lh = kind === 'hare' ? 6 : 14;
		[-0.4, -0.25, 0.25, 0.4].forEach(function(p, i) { var sw = Math.sin(legs + i * 1.6) * 3 * s; ctx.beginPath(); ctx.moveTo(x + p * bw * s, y - s * 14); ctx.lineTo(x + p * bw * s + sw, y - s * 14 + lh * s); ctx.stroke(); });
		ctx.beginPath(); ctx.moveTo(x + s * bw * 0.45, y - s * 18); ctx.lineTo(x + s * bw * 0.6, y - s * 28); ctx.stroke();
		circle(x + s * bw * 0.62, y - s * 29, s * 3.2, col);
		if (kind === 'gazelles' || kind === 'ibex') { ctx.lineWidth = s * 1.5; ctx.beginPath(); ctx.moveTo(x + s * bw * 0.6, y - s * 31); ctx.quadraticCurveTo(x + s * bw * 0.4, y - s * 42, x + s * bw * 0.3, y - s * 40); ctx.stroke(); }
		if (kind === 'fox') { ctx.lineWidth = s * 4; ctx.beginPath(); ctx.moveTo(x - s * 9, y - s * 15); ctx.quadraticCurveTo(x - s * 18, y - s * 12, x - s * 22, y - s * 18); ctx.stroke(); }
	}
	function person(x, y, s, col) { shape([x - 5 * s, y, x + 5 * s, y, x + 2.5 * s, y - 20 * s, x - 2.5 * s, y - 20 * s], col); circle(x, y - 23 * s, 3.4 * s, col); }
	function tents(x, y, s, col, fire) {
		shape([x - 70 * s, y, x - 40 * s, y - 34 * s, x - 10 * s, y], col);
		shape([x - 20 * s, y, x + 15 * s, y - 42 * s, x + 50 * s, y], col);
		shape([x + 40 * s, y, x + 62 * s, y - 26 * s, x + 84 * s, y], col);
		if (fire) { glow(x + 5 * s, y - 6 * s, 60 * s, 'rgb(255,170,70)', 0.55 * flicker(x)); circle(x + 5 * s, y - 4 * s, 4 * s, '#ffcf73'); }
	}
	function town(x, y, s, col, seed, n) {
		var r = rng(seed);
		for (var i = 0; i < n; i++) {
			var bx = x + (i - n / 2) * 30 * s + r() * 10, bw = (22 + r() * 18) * s, bh = (20 + r() * 34) * s;
			rect(bx, y - bh, bw, bh + 6, col);
			if (r() < 0.25) { ctx.beginPath(); ctx.arc(bx + bw / 2, y - bh, bw * 0.35, Math.PI, 0); ctx.fillStyle = col; ctx.fill(); }
			windows(bx + 2, y - bh + 4, bw - 4, bh - 8, 2, seed + i);
		}
	}
	var LM_COL = '#21183c';
	function drawStandIn(p, x, y) {
		var col = p.layer === 'road' ? '#140f29' : p.layer === 'far' ? '#1e1838' : LM_COL;
		switch (p.kind) {
			case 'palace':
				town(x + 120, y, 1.4, col, 11, 7);
				[[-60, 0, 150, 60], [-45, -50, 120, 55], [-30, -95, 90, 50], [-15, -135, 60, 45]].forEach(function(t) { rect(x + t[0], y + t[1] - t[3], t[2], t[3] + 6, col); });
				windows(x - 50, y - 60, 130, 50, 6, 3);
				glow(x + 15, y - 190, 40, 'rgb(255,220,140)', 0.35);
				break;
			case 'river':
				ctx.fillStyle = 'rgba(70,90,150,0.55)'; ctx.fillRect(x - 500, y - 4, 1000, 26);
				for (var i = 0; i < 12; i++) rect(x - 480 + i * 80 + (clock * 20 % 80), y + 4 + (i % 3) * 6, 30, 1.5, 'rgba(220,210,255,0.35)');
				palm(x - 160, y, 120, col, 12); palm(x - 120, y, 95, col, -10); grass(x + 120, y, 60, col);
				break;
			case 'oasis':
				ctx.fillStyle = 'rgba(60,80,140,0.6)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 110, 10, 0, 0, Math.PI * 2); ctx.fill();
				palm(x - 90, y, 150, col, 18); palm(x - 40, y, 120, col, -14); palm(x + 70, y, 165, col, 10); grass(x + 10, y, 40, col);
				break;
			case 'ruins':
				[[-70, 110], [-35, 70], [0, 120], [40, 45], [75, 95]].forEach(function(c) { rect(x + c[0], y - c[1], 18, c[1] + 6, col); });
				rect(x - 76, y - 122, 104, 12, col);
				break;
			case 'inn':
				rect(x - 90, y - 60, 180, 66, col); rect(x - 100, y - 70, 30, 76, col); rect(x + 70, y - 70, 30, 76, col);
				ctx.beginPath(); ctx.arc(x, y + 4, 22, Math.PI, 0); ctx.fillStyle = '#3a2a1a'; ctx.fill();
				glow(x + 30, y - 30, 30, 'rgb(255,200,110)', 0.6 * flicker(5)); circle(x + 30, y - 30, 3, '#ffd27a');
				break;
			case 'pass':
				shape([x - 320, y + 6, x - 160, y - 230, x - 60, y - 120, x - 40, y + 6], col); shape([x + 40, y + 6, x + 70, y - 140, x + 190, y - 250, x + 340, y + 6], col);
				break;
			case 'well':
				rect(x - 26, y - 22, 52, 26, col); rect(x - 24, y - 60, 5, 40, col); rect(x + 19, y - 60, 5, 40, col); rect(x - 28, y - 62, 56, 5, col);
				break;
			case 'olives':
				for (var o = 0; o < 7; o++) olive(x - 260 + o * 85, y + 4, 50 + (o % 3) * 12, col);
				break;
			case 'jerusalem':
				rect(x - 260, y - 70, 520, 76, col);
				for (var j = 0; j < 26; j++) rect(x - 260 + j * 20, y - 80, 11, 10, col);
				rect(x - 300, y - 110, 50, 116, col); rect(x + 250, y - 110, 50, 116, col);
				town(x - 40, y - 70, 1.3, col, 21, 12);
				rect(x - 60, y - 200, 140, 90, col); shape([x - 70, y - 200, x + 10, y - 240, x + 90, y - 200], col);
				windows(x - 250, y - 60, 500, 50, 20, 33);
				break;
			case 'shepherds':
				for (var sh = 0; sh < 9; sh++) { ctx.beginPath(); ctx.ellipse(x - 120 + sh * 26 + (sh % 2) * 8, y - 7, 11, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#d9d2ea'; ctx.fill(); circle(x - 110 + sh * 26 + (sh % 2) * 8, y - 11, 3.5, '#d9d2ea'); }
				person(x + 140, y, 1.6, col); person(x + 175, y, 1.5, col);
				glow(x + 158, y - 8, 70, 'rgb(255,170,70)', 0.6 * flicker(9)); circle(x + 158, y - 5, 5, '#ffcf73');
				break;
			case 'bethlehem':
				town(x, y, p.layer === 'far' ? 0.55 : 1.5, col, 41, 10);
				break;
			case 'stable':
				var arrived = cam >= TOTAL - 0.02;
				if (arrived) glow(x, y - 60, 220, 'rgb(255,200,110)', 0.75);
				shape([x - 85, y + 6, x - 85, y - 80, x, y - 135, x + 85, y - 80, x + 85, y + 6], col);
				rect(x - 30, y - 70, 60, 76, arrived ? '#ffcf73' : '#3a2a1a');
				if (arrived) { person(x - 12, y + 4, 1.3, '#7a4e1e'); person(x + 14, y + 4, 1.4, '#7a4e1e'); rect(x - 8, y - 12, 16, 8, '#7a4e1e'); }
				break;
			case 'camp': tents(x, y, 1.1, col, true); break;
			case 'howl':   // a canine sitting on the ridge, muzzle raised to the sky (stand-in until the art arrives)
				var hs = (p.who === 'wolf' ? 1.5 : 1.2), hc = '#141026', lift = Math.sin(clock * 0.7) * 0.06;
				ctx.save(); ctx.translate(x, y + 3); ctx.scale(hs, hs); ctx.fillStyle = hc;
				ctx.beginPath();
				ctx.moveTo(-12, 0);                                   // back of the haunch, on the ground
				ctx.bezierCurveTo(-16, -6, -14, -14, -8, -15);        // haunch
				ctx.bezierCurveTo(-4, -16, -2, -20, -1, -25);         // back, rising to the shoulders
				ctx.lineTo(1, -29);                                   // neck
				ctx.lineTo(3 + lift * 10, -36);                       // throat up to the muzzle
				ctx.lineTo(9 + lift * 10, -42);                       // muzzle tip, pointing up at the sky
				ctx.lineTo(6 + lift * 10, -36);
				ctx.lineTo(5, -33);                                   // brow
				ctx.lineTo(4.5, -38); ctx.lineTo(3, -33);             // ear
				ctx.lineTo(6, -27);                                   // chest
				ctx.bezierCurveTo(7, -20, 6, -10, 5, 0);              // front leg
				ctx.lineTo(2, 0); ctx.lineTo(1.5, -9);                // between the legs
				ctx.lineTo(-1, 0); ctx.closePath(); ctx.fill();
				ctx.beginPath(); ctx.moveTo(-12, -2); ctx.bezierCurveTo(-20, -1, -24, -3, -26, 1); ctx.bezierCurveTo(-22, 0, -17, 1, -11, 1); ctx.fill();   // tail along the ground
				ctx.restore();
				break;
			case 'volcano':
				var vc = '#2c2850';
				shape([x - 230, y + 4, x - 40, y - 150, x + 40, y - 150, x + 250, y + 4], vc);
				shape([x - 62, y - 108, x - 40, y - 150, x + 40, y - 150, x + 66, y - 106, x + 30, y - 118, x + 8, y - 104, x - 20, y - 120], 'rgba(230,235,250,0.85)');   // snow
				glow(x, y - 150, 40, 'rgb(255,140,70)', 0.18 * flicker(4));   // a faint glow at the top
				for (var sm = 0; sm < 6; sm++) {   // a thin plume of smoke drifting with the wind
					var age = ((clock * 0.12 + sm / 6) % 1);
					ctx.fillStyle = 'rgba(150,145,175,' + (0.22 * (1 - age)).toFixed(3) + ')';
					ctx.beginPath(); ctx.ellipse(x + age * 120, y - 158 - age * 110, 10 + age * 34, 6 + age * 16, 0, 0, Math.PI * 2); ctx.fill();
				}
				break;
			case 'angel': glow(x, y - 300, 140, 'rgb(255,236,180)', 0.45); person(x, y - 250, 2.4, 'rgba(255,248,225,0.9)'); break;
			case 'gazelles': case 'ibex': for (var g = 0; g < 4; g++) animal(x + g * 34 - 50, y - (g % 2) * 4, 1.1, col, p.kind, clock * 3 + g); break;
			case 'fox': case 'hare': animal(x, y, 1.3, col, p.kind, clock * 6); break;
			case 'herder': case 'sheep': for (var h = 0; h < 6; h++) animal(x - 80 + h * 26, y, 0.9, col, 'goat', clock * 2 + h); person(x + 90, y, 1.4, col); break;
			case 'heron':
				ctx.fillStyle = 'rgba(70,90,150,0.5)'; ctx.fillRect(x - 160, y - 2, 320, 12);
				for (var hr = 0; hr < 2; hr++) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + hr * 50, y); ctx.lineTo(x + hr * 50, y - 30); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x + hr * 50, y - 38, 10, 6, -0.3, 0, Math.PI * 2); ctx.fill(); }
				break;
			case 'farm': rect(x - 40, y - 40, 80, 46, col); shape([x - 46, y - 40, x, y - 62, x + 46, y - 40], col); rect(x - 6, y - 30, 8, 9, 'rgba(255,207,115,' + (0.8 * flicker(2)).toFixed(2) + ')'); break;
			case 'tents': tents(x, y, 0.9, col, false); break;
			case 'stones': [[-40, 60], [-10, 75], [20, 55], [48, 68]].forEach(function(s) { rect(x + s[0], y - s[1], 18, s[1] + 6, col); }); break;
			case 'owl': palm(x, y, 140, col, 8); circle(x + 8, y - 132, 7, col); var blink = Math.sin(clock * 0.9) > 0.97 ? 0.3 : 1.6; rect(x + 4, y - 134, 1.8, blink, '#ffd27a'); rect(x + 9, y - 134, 1.8, blink, '#ffd27a'); break;
			case 'lanterns': case 'donkey':
				for (var q = 0; q < (p.kind === 'donkey' ? 1 : 3); q++) { var qx = x + q * 40; person(qx, y, 1.2, col); glow(qx + 8, y - 20, 18, 'rgb(255,200,110)', 0.7 * flicker(q)); circle(qx + 8, y - 20, 2.2, '#ffd27a'); }
				if (p.kind === 'donkey') animal(x - 40, y, 1.3, col, 'goat', clock * 2);
				break;
			case 'caravan':
				for (var m = 0; m < 4; m++) drawLogoCamel(JOURNEY_CAMELS[['c2', 'c3', 'c2', 'c3'][m]], x + m * 26, y + 2, 0.22, 0, -1, clock * 3 + m, 1, '#1a1433');
				break;
		}
	}

	// ----- pieces along the road: planted on the ground, never floating -----
	function groundUnder(layer, x, halfW) {
		var y = 0, n = 0, sh = shiftOf(layer);
		for (var f = -0.5; f <= 0.5; f += 0.25) { y += layerY(layer, x + f * halfW - LEAD_X + (layer === 'road' ? cam * DAYW : sh), 'ground'); n++; }
		return y / n;
	}
	function paintPieces(layer) {
		PIECES.forEach(function(p) {
			if (p.layer !== layer) return;
			// the howlers belong to their own night only (the far hills move so slowly they'd still be there the next night),
			// and only once their picture has loaded (no stand-in)
			if ((p.kind === 'howl' || p.kind === 'trotter') && (p.night !== night.day || !art(p.art))) return;
			if ((p.kind === 'angel' || p.kind === 'camp') && p.night !== night.day) return;   // (the angel came in a dream, and last night's camp was packed up: neither carries into the next night)
			var x = screenX(layer, pieceU(p));
			if (x < -600 || x > VW + 600) return;
			// farther away than the camels, so smaller; encounters smaller still, as if farther back
			var im = art(p.art) || art(p.alt), h = p.h * (layer === 'mid' ? (p.small && p.kind !== 'camp' ? 0.58 : 0.7) : 1);
			var dark = p.kind === 'stable' && cam < TOTAL - 0.02;         // the stable waits in the dark until they arrive
			// the hare bounds along, from its animation sheet (all frames at the first frame's scale)
			var frames = p.kind === 'hare' ? animFrames('jr-an-hare-', 4) : null;
			if (frames) {
				var hh = 48, sc = hh / frames[0].height, step = Math.floor(clock * 5) % frames.length, fr = frames[step];
				if (p.seen == null) p.seen = clock;
				var hx = x - (clock - p.seen) * 38;    // an easy lope (far off, so it crosses the screen slowly)
				var hy = layerY(layer, hx - LEAD_X + shiftOf(layer)) + 3 - [0, 4, 7, 3][step];   // on the hill's visible top edge, following its rise and fall
				ctx.save(); ctx.translate(hx, 0); ctx.scale(-1, 1);
				ctx.drawImage(fr, -fr.width * sc / 2, hy - fr.height * sc * (fr.base || 1), fr.width * sc, fr.height * sc);
				ctx.restore();
				return;
			}
			if (im && im.base) {
				var w = h * im.width / im.height;
				var y = groundUnder(layer, x, w / 2) - (p.kind === 'angel' ? 230 : 0);   // on the hills' ground (the angel floats above the camp)
				if (layer === 'far' && p.kind !== 'pass') {   // far off on the ridge: down to its lowest point under the piece, so no sky shows beneath
					var shf = shiftOf(layer), low = -1e9;
					for (var gx = -0.4; gx <= 0.4; gx += 0.1) low = Math.max(low, layerY(layer, x + gx * w - LEAD_X + shf));
					y = Math.max(y, low + 4);
				}
				if (p.kind === 'howl' || p.kind === 'trotter') {   // right on the visible ridge line under its paws, never above it
					var sh2 = shiftOf(layer), ridge = -1e9;
					for (var fx = -0.35; fx <= 0.35; fx += 0.175) ridge = Math.max(ridge, layerY(layer, x + fx * w - LEAD_X + sh2));
					y = ridge + 3;
				}
				if (p.kind === 'angel') glow(x, y - h * 0.5, h * 1.1, 'rgb(255,236,180)', 0.35 * (0.8 + 0.2 * Math.sin(clock * 1.5)));
				if (p.key === 'home') glow(x, y - h * 0.4, h * 1.25, 'rgb(255,186,105)', 0.42 * (0.85 + 0.15 * flicker(4)));   // home: warm light all round it
				var top = y + h * 0.06 - im.base * h;
				ctx.save();
				if (p.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
				if (p.kind === 'howl' || p.kind === 'trotter') {
					// Off on the hills in the moonlight, dimmed and cooled a little to sit in the night. On a howl night they trot
					// along the ridge as it comes into view, stop and stand looking at the caravan, then sit and howl (jackals
					// in a pair). All three poses are from one sheet, drawn at the sheet's own scale to one another.
					ctx.filter = 'brightness(0.78) saturate(0.85) hue-rotate(-6deg)';
					var SH = CANINE_H[p.who], q = clamp((VW * 1.1 - x) / (VW * 0.3), 0, 1);   // (so it's howling well before it passes behind the caravan)
					var runF = animFrames('jr-an-' + p.who + '-run-', 4);   // its run cycle (round 14); until then it just sits and howls
					var pose = p.kind === 'trotter' ? 'trot' : q < 0.5 ? 'trot' : 'stand';   // they run along the ridge, then stop and stand looking at you (and call)
					var off = p.kind === 'trotter' ? -220 + 440 * clamp((VW * 1.1 - x) / (VW * 1.2), 0, 1) : pose === 'trot' ? -120 * (1 - q / 0.5) : 0;
					p.howling = pose === 'stand';
					var pim = pose === 'howl' ? im : pose === 'trot' && runF ? runF[Math.floor(clock * 10 + p.night) % 4] : art('jr-' + p.who + '-' + pose) || im;
					var ph2 = pose === 'howl' ? h : h * SH[pose] / SH.howl, pw = ph2 * pim.width / pim.height;
					var bob = 0;
					var px2 = x + off, shr = shiftOf(layer), ry = -1e9;   // the ridge under where it is now, as it trots
					for (var rx = -0.35; rx <= 0.35; rx += 0.175) ry = Math.max(ry, layerY(layer, px2 + rx * pw - LEAD_X + shr));
					var ptop = ry + 3 + ph2 * 0.06 - (pim.base || 1) * ph2 - bob;
					var one = function(cx, scale, face) {   // face: 1 as drawn (nose to the right), -1 turned round
						// standing on the hill under its own feet, tilted to the slope between its back and front paws
						var dw = pw * scale, dh = ph2 * scale, gy = function(gx) { return layerY(layer, gx - LEAD_X + shr); };
						var yb = gy(cx - dw * 0.32), yf = gy(cx + dw * 0.32), slope = clamp(Math.atan2(yf - yb, dw * 0.64), -0.4, 0.4);
						ctx.save(); ctx.translate(cx, (yb + yf) / 2 + 3); ctx.rotate(slope); ctx.scale(face, 1);
						var dx = -dw / 2, dy = dh * 0.06 - (pim.base || 1) * dh - bob;
						if (pose === 'trot' && !runF && !reduceMotion) {
							// no run frames: the trotting picture's legs swing in turn (front pair and back pair sheared opposite
							// ways each stride), the body rising a little at each push off
							var ph3 = clock * 9 + p.night * 1.3 + cx * 0.01, sw = Math.sin(ph3), cut = 0.58, iw = pim.width, ih = pim.height;
							var up = Math.abs(Math.cos(ph3)) * dh * 0.03;
							ctx.drawImage(pim, 0, 0, iw, ih * cut + 1, dx, dy - up, dw, dh * cut + 1);
							[[0, 0.5, -1], [0.5, 1, 1]].forEach(function(part) {   // back legs, front legs
								ctx.save(); ctx.translate(dx + dw * (part[0] + part[1]) / 2, dy + dh * cut - up);
								ctx.transform(1, 0, 0.45 * sw * part[2], 1, 0, 0);
								ctx.drawImage(pim, iw * part[0], ih * cut, iw * (part[1] - part[0]), ih * (1 - cut), -dw * (part[1] - part[0]) / 2, 0, dw * (part[1] - part[0]) + 0.5, dh * (1 - cut) + up);
								ctx.restore();
							});
						} else ctx.drawImage(pim, dx, dy, dw, dh);
						ctx.restore();
					};
					if (pose === 'howl') {
						if (p.who === 'jackal') { ctx.save(); ctx.translate(x - w * 1.25, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w * 0.44, top + h * 0.12, w * 0.88, h * 0.88); ctx.restore(); }   // a second, facing the other way
						ctx.drawImage(im, x - w / 2, top, w, h);
					} else {
						var face = pose === 'stand' ? -1 : 1;   // trotting on its way; standing, it turns to look at the caravan
						if (p.who === 'jackal' && p.kind === 'howl') one(px2 - w * 1.25 - (pose === 'trot' ? 30 : 0), 0.88, face);   // its mate a little behind
						one(px2, 1, face);
					}
					ctx.filter = 'none';
				} else if (p.kind === 'pass') {
					// a distant range the road winds into: its edges feathered into the hills and sky, hazed like the far
					// hills, and sunk so the middle hills in front hide where it meets the ground
					if (!im.soft) im.soft = feathered(im);
					ctx.filter = p.art === 'jr-far-pass' && art('jr-far-pass') ? 'none' : 'brightness(0.72) saturate(0.8)';   // (the strip is already shaded like the far hills)
					ctx.drawImage(im.soft, x - w / 2, top + h * 0.18, w, h);
					ctx.filter = 'none';
				} else if (p.key === 'home') {
					// every lamp lit for their return: the palace glows warm, with torches burning either side of the gate
					ctx.filter = 'brightness(1.28) saturate(1.15) sepia(0.18)';
					ctx.drawImage(im, x - w / 2, top, w, h);
					ctx.filter = 'none';
					ctx.globalCompositeOperation = 'lighter';
					glow(x, y - h * 0.22, w * 0.3, 'rgb(255,170,70)', 0.35 * flicker(7));   // (warm light from within; no torches, which floated as bright dots)
					ctx.globalCompositeOperation = 'source-over';
				} else
				ctx.drawImage(dark ? (im.dark || (im.dark = tinted(im, 0.45))) : im, x - w / 2, top, w, h);
				var cf = CAMP_FIRES[p.art];   // the camps' own fires, drawn like the kings' one (the pictures were retouched without theirs)
				if (cf && im === art(p.art)) paintFire(x - w / 2 + cf[0] * w / im.width, 1, 1, {y: top + cf[1] * h / im.height, s: h * cf[2] / 100, id: p.art});
				if (p.key === 'owl' && art(p.art)) {   // its eyes catch the light, so it can be seen up in the palm; now and then it blinks
					var shut = Math.sin(clock * 0.8 + p.night) > 0.95;
					[0.609, 0.651].forEach(function(fx) {
						var ex = x - w / 2 + fx * w, ey = top + 0.184 * h;
						glow(ex, ey, h * 0.035, 'rgb(255,214,110)', shut ? 0.15 : 0.7);
						if (!shut) { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, h * 0.008), 0, Math.PI * 2); ctx.fill(); }
					});
				}
				ctx.restore();
			} else drawStandIn(p, x, groundUnder(layer, x, 120) + 4);
		});
	}

	// ----- the camels -----
	// The wise men as characters (round 4): each king has his own camel, in his colour
	var CHARS = [1, 2, 3].map(function(n) {
		return {camel: 'jr-char-camel-' + n, kneel: 'jr-char-camel-' + n + '-kneel', ride: 'jr-char-king-' + n + '-ride', walk: 'jr-char-king-' + n + '-walk', pray: 'jr-char-king-' + n + '-kneel',
			walkFree: 'jr-char-king-' + n + '-walk-free', rest: 'jr-char-king-' + n + '-rest', rideHome: 'jr-char-king-' + n + '-ride-home'};
	});
	var RIDE_H = 0.74, SEAT = [0.43, 0.8];   // a riding king's height (of the camel picture's) and where he sits in his own picture
	var CHAR_H = 150, CHAR_BACK = [0, 220, 440];
	function charsReady() { return CHARS.every(function(c) { return rigReady(c.camel) && art(c.ride) && art(c.walk) && art(c.kneel) && art(c.pray); }); }
	var CARAVAN = [   // front to back
		{n: 'c3', art: 'jr-camel-rider', back: 0, h: 85, ah: 168, aback: 0, seed: 0.0, wasPlanted: []},
		{n: 'c2', art: 'jr-camel-rider-2', back: 110, h: 94, ah: 162, aback: 200, seed: 0.37, wasPlanted: []},
		{n: 'c1', art: 'jr-camel-rider-3', back: 230, h: 108, ah: 158, aback: 395, seed: 0.71, wasPlanted: []}
	];
	function rigReady(name) {
		var r = window.JOURNEY_CAMEL_RIG && JOURNEY_CAMEL_RIG[name];
		return r && r.legs[0].knee && images[name + '-body'] && r.legs.every(function(l, i) { return images[name + '-leg' + i + '-upper'] && images[name + '-leg' + i + '-lower']; }) ? r : null;
	}
	// A real walk. Each foot has a target: while planted it stays put on the ground as the body passes over it;
	// then it lifts, swings forward and plants again. The upper and lower leg bend at the joint (knee in front,
	// hock behind) to reach the target, so the legs fold as they lift and straighten as they bear weight.
	// Camels pace: both legs on one side move together. The body dips a little at the ends of each stride.
	var DUTY = 0.66, OFFSETS = [0, 0.5, 0.06, 0.56];   // each front foot lands just after the hind foot on its side
	function dist2(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
	function rigInfo(r) {
		if (r.info) return r.info;
		var legs = r.legs.map(function(l) {
			var L1 = dist2(l.hip, l.knee), L2 = dist2(l.knee, l.foot), reach = dist2(l.hip, l.foot);
			// which way the joint bends: a front knee points forward, a back hock points backward
			return {L1: L1, L2: L2, reach: reach, side: l.front ? 1 : -1,
				a1: Math.atan2(l.knee[1] - l.hip[1], l.knee[0] - l.hip[0]), a2: Math.atan2(l.foot[1] - l.knee[1], l.foot[0] - l.knee[0])};
		});
		var ground = Math.max.apply(null, r.legs.map(function(l) { return l.foot[1]; }));
		legs.forEach(function(g) { g.ground = ground; });
		var avg = legs.reduce(function(a, g) { return a + g.reach; }, 0) / legs.length, stride = avg * 0.46;
		// how far the body sits down so every leg, even the shortest, still reaches the ground at the ends of a stride
		var crouch = 0;
		r.legs.forEach(function(l, i) {
			var g = legs[i], max = (g.L1 + g.L2) * 0.97, dx = stride / 2, dy = ground - l.hip[1];
			if (dx < max) crouch = Math.max(crouch, dy - Math.sqrt(max * max - dx * dx));
		});
		r.info = {legs: legs, stride: stride, crouch: Math.min(crouch, avg * 0.035), hindX: (r.legs[0].foot[0] + r.legs[1].foot[0]) / 2 - r.w / 2, frontX: (r.legs[2].foot[0] + r.legs[3].foot[0]) / 2 - r.w / 2};
		return r.info;
	}
	// where foot i should be at this point in its step, in the camel image's pixels
	// The foot never stops dead: as it lifts it is still moving back at the walking speed, swings forward,
	// and is moving back at that speed again as it lands (a cubic curve whose ends match the planted motion).
	function footTarget(l, g, f, stride, amount) {
		var off, lift = 0, planted = f < DUTY;
		if (planted) off = stride * (0.5 - f / DUTY);
		else {
			var q = (f - DUTY) / (1 - DUTY), m = -stride * (1 - DUTY) / DUTY;     // end speed, in swing time
			var q2 = q * q, q3 = q2 * q;
			off = (2 * q3 - 3 * q2 + 1) * (-stride / 2) + (q3 - 2 * q2 + q) * m + (-2 * q3 + 3 * q2) * (stride / 2) + (q3 - q2) * m;
			lift = Math.pow(Math.sin(Math.PI * q), 1.4) * g.reach * (l.front ? 0.09 : 0.07);
		}
		// each stride is centred under its own hip, whatever pose the leg happens to be drawn in, and every foot
		// comes down on the same ground line; standing still, the feet are back where the picture has them
		var home = l.foot[0] + (l.hip[0] - l.foot[0]) * amount;
		return {x: home + off * amount, y: l.foot[1] + (g.ground - l.foot[1]) * amount - lift * amount, planted: planted};
	}
	// two-bone reach: where the joint goes so the leg ends at the target
	function solveLeg(l, g, tx, ty) {
		var dx = tx - l.hip[0], dy = ty - l.hip[1], d = clamp(Math.hypot(dx, dy), Math.abs(g.L1 - g.L2) + 1, g.L1 + g.L2 - 0.5);
		var base = Math.atan2(dy, dx), bend = Math.acos(clamp((g.L1 * g.L1 + d * d - g.L2 * g.L2) / (2 * g.L1 * d), -1, 1));
		var a1 = base - g.side * bend, kx = l.hip[0] + Math.cos(a1) * g.L1, ky = l.hip[1] + Math.sin(a1) * g.L1;
		return {a1: a1, kx: kx, ky: ky, a2: Math.atan2(ty - ky, tx - kx)};
	}
	var prints = [];   // footprints in the sand: {u, depth, born}
	function darker(hex) {   // the same shade tinted() gives the far-side legs
		var c = [1, 3, 5].map(function(p) { return parseInt(hex.substr(p, 2), 16); }), t = [30, 15, 40];
		return 'rgb(' + c.map(function(v, i) { return Math.round(v * 0.78 + t[i] * 0.22); }).join(',') + ')';
	}
	// A little life in the camels' faces, from the same pictures: the neck bends so the head nods with each step (or
	// looks slowly about at rest), the eyes blink, and the tail swishes. The neck is drawn in thin strips, each turned a
	// little more about the base of the neck than the one before, so it bends smoothly with no seam. Blinking draws the
	// fur just above the eye down over it, so the lid is the camel's own colour. All three camels share these points.
	var CANINE_H = {jackal: {stand: 398, trot: 403, howl: 437}, wolf: {stand: 396, trot: 397, howl: 444}};   // each pose's height on its sheet
	var CAMEL_FACE = {
		body: {axis: 'x', a: 470, b: 570, pivot: [505, 290], eye: [619.5, 39.5, 15, 9], tail: [20, 188, 54, 262]},
		kneel: {axis: 'y', xr: 380, a: 300, b: 120, pivot: [470, 330], eye: [473.5, 40.5, 15, 9]}
	};
	var holdBlink = null;   // (test mode: hold every camel's eyes at one point of a blink)
	function camelBlink(k) {   // 0 open .. 1 shut: a quick blink every few seconds, at different moments for each camel
		if (holdBlink != null) return holdBlink;
		var t = clock + k.seed * 13, n = Math.floor(t / 4.5), at = 0.4 + hash(n * 3 + Math.round(k.seed * 100)) * 3.4, q = (t - n * 4.5 - at) / 0.24;
		return q > 0 && q < 1 ? Math.sin(Math.PI * q) : 0;
	}
	function drawCamelFace(im, f, theta, shut, swish) {   // draws the picture at (0, 0) in its own pixels
		var W = im.width, H = im.height, P = f.pivot;
		if (reduceMotion) theta = swish = 0;
		function turned(g, th, draw) { g.save(); g.translate(P[0], P[1]); g.rotate(th); g.translate(-P[0], -P[1]); draw(); g.restore(); }
		if (Math.abs(theta) < 0.0005 && !swish) ctx.drawImage(im, 0, 0);
		else {
			// the bent camel is put together at the picture's own size first, its strips overlapping well, and then drawn
			// into the scene in one piece: drawn straight into the scene at its small size, the joins between strips
			// came out part see-through and the hills showed through the neck
			var pad = 40, cv = im.bent || (im.bent = document.createElement('canvas'));
			if (cv.width !== W + pad * 2) { cv.width = W + pad * 2; cv.height = H + pad * 2; }
			var g = cv.getContext('2d');
			g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(pad, pad);
			if (f.axis === 'x') {
				var t = f.tail;
				if (t && swish) {   // everything left of the neck but the tail, then the tail, leaning from its root
					g.drawImage(im, t[2], 0, f.a - t[2], H, t[2], 0, f.a - t[2], H);
					g.drawImage(im, 0, 0, t[2], t[1], 0, 0, t[2], t[1]);
					g.drawImage(im, 0, t[3], t[2], H - t[3], 0, t[3], t[2], H - t[3]);
					g.save(); g.translate(t[2], t[1]); g.transform(1, 0, swish, 1, 0, 0);
					g.drawImage(im, t[0], t[1], t[2] - t[0], t[3] - t[1], t[0] - t[2], 0, t[2] - t[0], t[3] - t[1]);
					g.restore();
				} else g.drawImage(im, 0, 0, f.a + 2, H, 0, 0, f.a + 2, H);
				for (var x = f.a; x < W; x += 4) {
					var th = theta * smooth((x + 2 - f.a) / (f.b - f.a)), sw = Math.min(8, W - x);
					turned(g, th, function() { g.drawImage(im, x, 0, sw, H, x, 0, sw, H); });
				}
			} else {
				g.drawImage(im, 0, 0, f.xr, H, 0, 0, f.xr, H);
				g.drawImage(im, f.xr, f.a - 2, W - f.xr, H - f.a + 2, f.xr, f.a - 2, W - f.xr, H - f.a + 2);
				for (var y = f.a; y > 0; y -= 4) {
					var th2 = theta * smooth((f.a - y + 2) / (f.a - f.b)), y0 = Math.max(0, y - 4), sh = Math.min(H, y + 4) - y0;
					turned(g, th2, function() { g.drawImage(im, f.xr, y0, W - f.xr, sh, f.xr, y0, W - f.xr, sh); });
				}
			}
			ctx.drawImage(cv, -pad, -pad);
		}
		if (shut > 0.05) {   // the lid comes down over the eye, and its lashes with it
			var e = f.eye;
			turned(ctx, theta, function() {
				var top = e[1] - e[3] - 2, low = top + (e[3] * 2 + 4) * shut;
				var lid = lidColors(im, e), g = ctx.createLinearGradient(0, top, 0, top + e[3] * 2 + 4);
				g.addColorStop(0, lid[0]); g.addColorStop(1, lid[1]);
				ctx.save(); ctx.beginPath(); ctx.ellipse(e[0], e[1], e[2] + 2, e[3] + 2, 0, 0, Math.PI * 2); ctx.clip();
				ctx.fillStyle = g; ctx.fillRect(e[0] - e[2] - 3, top - 2, e[2] * 2 + 6, low - top + 2);
				ctx.restore();
				ctx.strokeStyle = 'rgba(40,20,30,' + (0.8 * shut).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
				ctx.beginPath(); ctx.moveTo(e[0] - e[2], low - 1); ctx.quadraticCurveTo(e[0], low + 3 * shut, e[0] + e[2], low - 1); ctx.stroke();
			});
		}
	}
	function lidColors(im, e) {   // the fur just above and just below the eye, read once from the picture
		if (im.lid) return im.lid;
		var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
		var cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
		function at(x, y) { var d = cx.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data, t = [0, 0, 0];
			for (var i = 0; i < d.length; i += 4) { t[0] += d[i]; t[1] += d[i + 1]; t[2] += d[i + 2]; }
			return 'rgb(' + t.map(function(v) { return Math.round(v / 25); }).join(',') + ')'; }
		im.lid = [at(e[0] - e[2] * 0.6, e[1] - e[3] - 7), at(e[0] - e[2] * 0.3, e[1] + e[3] + 7)];
		return im.lid;
	}
	// clicking a camel: it grumbles and tosses its head; one of the back two, while walking, also tries to pass
	// Click a wise man standing about in the evening and he says something, in his own voice, about where they are:
	// at the fire on the way (or on the way home), at Herod's palace, at the manger, or home again (sayings.js)
	var kingBoxes = [], said = null, lastSaid = {};
	function sayPlace() {
		var lm = night.plan && night.plan.landmark, kind = eveningKind();
		return EASTER() ? 'easter' : HOMEMODE ? 'rest' : kind === 'manger' ? 'christmas' : lm === 'home' ? 'home' : kind === 'palace' ? 'herod' : homeward(night.day) ? 'road' : 'fire';
	}
	function talkToKing(pt) {
		var hit = kingBoxes.filter(function(b) { return pt.x > b.x0 && pt.x < b.x1 && pt.y > b.y0 && pt.y < b.y1; }).pop();
		if (hit && hit.n === 0) {   // the armillary sphere
			var ARM = ['An armillary sphere: the wise men’s model of the heavens.', 'Its rings show the paths of the sun and the stars.', '“The heavens declare the glory of God” (Psalm 19:1).'];
			lastSaid.arm = ((lastSaid.arm == null ? -1 : lastSaid.arm) + 1) % ARM.length;
			said = {n: 0, text: ARM[lastSaid.arm], at: clock, dur: 4}; track('armillary'); return true;
		}
		if (!hit || !window.KING_SAYINGS) return false;
		var place = sayPlace(), lines = (KING_SAYINGS[hit.n] || {})[place] || [];
		if (!lines.length) return false;
		var key = hit.n + place, i = Math.floor(Math.random() * lines.length);
		if (lines.length > 1 && i === lastSaid[key]) i = (i + 1) % lines.length;   // never the same line twice running
		lastSaid[key] = i;
		said = {n: hit.n, text: lines[i], at: clock, dur: 2.2 + lines[i].length * 0.06};
		track('king_talk', {king: ['', 'gold', 'frankincense', 'myrrh'][hit.n], place: place});
		sound.animal('voice-' + hit.n + '-say-' + place + '-' + (i + 1), 0.9);
		return true;
	}
	function paintSaid() {   // the words over his head, fading in and out
		if (!said && kingBoxes.length && evening() > 6) {   // now and then a sparkle by one king's head: he has something to say
			var turn = Math.floor((clock + 1) / 6) % kingBoxes.length, kb = kingBoxes[turn];
			sparkle(kb.x + 12, kb.head + 6, 7, beckon(0, 6) * 0.9);
		}
		if (!said) return;
		var t = clock - said.at, b = kingBoxes.filter(function(k) { return k.n === said.n; })[0];
		if (t > said.dur || !b) { if (t > said.dur) said = null; return; }
		var a = clamp(Math.min(t / 0.25, (said.dur - t) / 0.5), 0, 1);
		ctx.save(); ctx.font = 'italic 16px Merienda, Georgia, serif';
		var tw = ctx.measureText(said.text).width, bx = clamp(b.x, tw / 2 + 16, VW - tw / 2 - 16), by = Math.max(TOPV + 40, b.head - 14);
		ctx.translate(bx, by); if (homeward(night.day)) ctx.scale(-1, 1);
		ctx.globalAlpha = a; ctx.fillStyle = 'rgba(7,11,34,0.72)';
		ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-tw / 2 - 12, -20, tw + 24, 30, 12) : ctx.rect(-tw / 2 - 12, -20, tw + 24, 30); ctx.fill();
		ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(said.text, 0, 0);
		ctx.restore();
	}
	// September at home: the camels loaded for the journey: a rolled carpet across the saddle, striped in its king's
	// colour, a leather saddlebag hanging at its side and a water skin behind
	var PACK_COL = ['#a8243c', '#2c4fa6', '#1d7a52'];
	function drawPacks(p, s) {
		var x = p.seatX, y = p.seatY + 4 * s / 0.25, k = s / 0.25, col = PACK_COL[p.n] || '#8a5a2b';
		ctx.save();
		ctx.fillStyle = '#5a3317'; ctx.beginPath(); ctx.ellipse(x - 30 * k, y + 26 * k, 6 * k, 9 * k, 0.2, 0, Math.PI * 2); ctx.fill();   // the water skin
		ctx.fillStyle = 'rgba(255,220,170,0.25)'; ctx.beginPath(); ctx.ellipse(x - 32 * k, y + 23 * k, 2 * k, 4 * k, 0.2, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 8 * k, y + 14 * k, 18 * k, 20 * k, 4 * k) : ctx.rect(x - 8 * k, y + 14 * k, 18 * k, 20 * k); ctx.fill();   // the saddlebag
		ctx.fillStyle = '#5e3416'; ctx.fillRect(x - 8 * k, y + 14 * k, 18 * k, 7 * k);                                  // its flap
		ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.arc(x + 1 * k, y + 20 * k, 1.6 * k, 0, Math.PI * 2); ctx.fill();   // a brass buckle
		for (var i = 0; i < 6; i++) {   // the rolled carpet, lying across the saddle
			ctx.fillStyle = i % 2 ? '#e8d3a8' : col;
			ctx.fillRect(x - 30 * k + i * 8 * k, y - 9 * k, 8 * k, 10 * k);
		}
		ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - 30 * k, y - 2 * k, 48 * k, 3 * k);                      // its rounded shading
		ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + 18 * k, y - 4 * k, 3 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();   // its rolled end
		ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.ellipse(x + 18 * k, y - 4 * k, 1.5 * k, 2.6 * k, 0, 0, Math.PI * 2); ctx.stroke();
		ctx.restore();
	}
	var camelBoxes = [];
	function surgeAt(k) {   // 0..1: how far into its attempt to pass (up, along, level a moment, back)
		if (!(k.surge > 0)) return 0;
		var f = (clock - k.surge) / 4.5;
		if (f >= 1 || f < 0) return 0;
		return f < 0.4 ? smooth(f / 0.4) : f < 0.6 ? 1 : 1 - smooth((f - 0.6) / 0.4);
	}
	function pokeCamel(pt) {
		var hit = camelBoxes.filter(function(b) { return pt.x > b.x0 && pt.x < b.x1 && pt.y > b.y0 && pt.y < b.y1; }).pop();
		if (!hit) return false;
		var urging = hit.i > 0 && walk > 0.5 && evening() === 0 && !(clock - hit.k.surge < 5) && !CARAVAN.some(function(o) { return clock - o.surge < 5; });
		// its king calls to it straight away: urging it on ("Hut-hut-hut!", "Yalla!"), and a moment later it surges forward
		// to pass; otherwise he soothes it ("Easy, easy") after its grumble
		if (urging) {
			if (hit.riding) sound.animal('voice-' + hit.king + '-urge', 0.95);
			hit.k.surge = clock + 0.55;
			track('camel', {pass: 'yes'});
			setTimeout(function() { hit.k.poke = clock; sound.animal('camel-grunt', 0.42); }, 450);
		} else {
			hit.k.poke = clock; sound.animal('camel-grunt', 0.42); track('camel', {pass: 'no'});
			if (hit.riding) setTimeout(function() { sound.animal('voice-' + hit.king + '-calm', 0.8); }, 550);
		}
		return true;
	}
	function camelNod(k, f0) {   // the head dips with each step while walking; at rest it looks slowly about
		var pk = clock - (k.poke || -9), toss = pk < 0.9 ? -0.16 * Math.sin(Math.PI * pk / 0.9) : 0;   // (clicked: a toss of the head)
		return toss + walk * 0.035 * Math.sin(4 * Math.PI * f0 - 0.7) + (1 - walk) * 0.03 * Math.sin(clock * 0.45 + k.seed * 7) * Math.sin(clock * 0.17 + k.seed * 3);
	}
	function camelSwish(k) {   // now and then the tail flicks
		var t = clock * 0.5 + k.seed * 5, burst = Math.max(0, Math.sin(t)) * Math.max(0, Math.sin(t * 0.37 + 1));
		return 0.35 * burst * Math.sin(clock * 5 + k.seed * 9);
	}
	// Cold December nights: every few seconds a little cloud of breath from each camel and king, drifting up and away.
	// Only after dark, and not in rain or a sandstorm.
	function coldNight() {
		var d = dateOfDay(night.day), m = d.getMonth();
		if (!(m === 11 || m === 0) || /rain|storm|sandstorm/.test(night.weather)) return 0;
		return clamp(1 - daylight() * 3, 0, 1);
	}
	var breaths = [];
	function breathe(key, x, y, dir, size) {   // called each frame at a mouth: now and then it breathes out
		var c = coldNight(); if (c <= 0 || reduceMotion) return;
		var b = breaths[key] || (breaths[key] = {next: clock + hash(key.length * 17 + key.charCodeAt(0)) * 3, puffs: []});
		if (clock > b.next) { b.puffs.push({x: x, y: y, t: 0, dir: dir}); b.next = clock + 2.2 + Math.random() * 1.4; }
		var dt = 0.016;
		b.puffs = b.puffs.filter(function(p) {
			p.t += dt; var f = p.t / 1.6; if (f >= 1) return false;
			var px = p.x + p.dir * (8 + 30 * f) * size, py = p.y - 10 * f * size, r = (5 + 14 * f) * size;
			glow(px, py, r, 'rgb(230,235,250)', 0.5 * c * Math.sin(Math.PI * Math.min(1, f * 1.4)));
			return true;
		});
	}
	function drawRigCamel(k, name, r, cx, u, opts) {
		opts = opts || {};
		var s = k.ah / r.h, info = rigInfo(r);
		var cycle = info.stride * s / DUTY;                              // scene units walked per full step
		var targets = r.legs.map(function(l, i) {
			var f = gaitDist / cycle + OFFSETS[i] + k.seed; f -= Math.floor(f);
			return footTarget(l, info.legs[i], f, info.stride, walk);
		});
		// the body rides a little lower while walking, with a gentle, even rise and fall twice each stride
		var f0 = gaitDist / cycle + k.seed; f0 -= Math.floor(f0);
		var drop = walk * (info.crouch + r.h * 0.006 * (1 - Math.cos(4 * Math.PI * f0))) + (opts.lower || 0) * (r.h - r.cut) * LOWER;
		// stand on the ground under the hind and front feet, tilted to match it
		var hx = info.hindX * s, fx = info.frontX * s;
		var yh = groundY(u + hx), yf = groundY(u + fx);
		var angle = clamp(Math.atan2(yf - yh, fx - hx), -0.2, 0.2);
		var y = yh + (yf - yh) * (0 - hx) / (fx - hx) + 8;             // feet a little into the sand
		var alpha = opts.alpha == null ? 1 : opts.alpha;
		if (alpha <= 0.01) return {y: y, s: s, angle: angle};
		// a soft shadow under the body, cast a little left by the Star
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(cx - 10, y - 2); ctx.rotate(angle); ctx.scale(r.w * s * 0.4, 8);
		var sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
		sg.addColorStop(0, 'rgba(80,40,10,0.13)'); sg.addColorStop(0.7, 'rgba(80,40,10,0.07)'); sg.addColorStop(1, 'rgba(80,40,10,0)');
		ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
		ctx.restore();
		// and rocks gently fore and aft with the stride, as a camel's does
		var rock = walk * 0.012 * Math.sin(2 * Math.PI * f0);
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(cx, y + (opts.sink || 0)); ctx.rotate(angle + rock); ctx.scale(s, s); ctx.translate(-r.w / 2, -r.h + drop);
		var idle = Math.sin(clock * 1.6 + k.seed * 9) * 0.8 * (1 - walk);
		function leg(i) {
			var l = r.legs[i], g = info.legs[i], t = targets[i], j = solveLeg(l, g, t.x, t.y - drop);
			var up = images[name + '-leg' + i + '-upper'], lo = images[name + '-leg' + i + '-lower'];
			if (i % 2) { up = up.dark || up; lo = lo.dark || lo; }
			ctx.save();   // lower leg: turns about the joint, which has moved
			ctx.translate(j.kx, j.ky); ctx.rotate(j.a2 - g.a2); ctx.translate(-l.knee[0], -l.knee[1]);
			ctx.drawImage(lo, l.lower.x, l.lower.y);
			ctx.restore();
			ctx.save();   // upper leg: turns about the hip
			ctx.translate(l.hip[0], l.hip[1]); ctx.rotate(j.a1 - g.a1); ctx.translate(-l.hip[0], -l.hip[1]);
			ctx.drawImage(up, l.upper.x, l.upper.y);
			ctx.restore();
			if (l.kneeR) { ctx.fillStyle = i % 2 ? darker(l.color) : l.color; ctx.beginPath(); ctx.arc(j.kx, j.ky, l.kneeR * 0.92, 0, Math.PI * 2); ctx.fill(); }   // a rounded joint, so no notch shows
			// a footprint where each foot comes down
			if (walk > 0.5 && t.planted && !k.wasPlanted[i]) {
				prints.push({u: u + (t.x - r.w / 2) * s, depth: i % 2 ? 0 : 6, born: clock});
			}
			k.wasPlanted[i] = t.planted;
		}
		leg(1); leg(3);                                                  // far-side legs, a shade darker, behind the body
		ctx.save(); ctx.translate(0, idle); drawCamelFace(images[name + '-body'], CAMEL_FACE.body, camelNod(k, f0), camelBlink(k), camelSwish(k)); ctx.restore();
		leg(0); leg(2);
		// the king on his saddle, rocking with the camel
		if (opts.rider && r.saddle) {
			var ri = opts.rider, rh = opts.riderH ? opts.riderH / s : r.h * RIDE_H, rw = rh * ri.width / ri.height, st = opts.seat || SEAT;
			// he sways on the saddle a beat behind the camel's step (and sits quietly breathing when it stands)
			var sway = reduceMotion ? 0 : walk * 0.03 * Math.sin(4 * Math.PI * f0 - 1.6) + (1 - walk) * 0.008 * Math.sin(clock * 1.3 + k.seed * 3);
			ctx.save(); ctx.translate(r.saddle[0], r.saddle[1] + idle + r.h * 0.03); ctx.rotate(sway); ctx.translate(-r.saddle[0], -r.saddle[1] - idle - r.h * 0.03);
			ctx.drawImage(ri, r.saddle[0] - rw * st[0], r.saddle[1] + idle - rh * st[1] + r.h * 0.03, rw, rh);
			ctx.restore();
		}
		ctx.restore();
		if (alpha > 0.5) breathe('camel' + k.n, cx + (735 - r.w / 2) * s, y - (r.h - 120 + drop) * s, 1, s * 4);   // from the nose
		return {y: y, s: s, angle: angle};
	}
	function paintPrints() {
		if (prints.length > 500) prints.splice(0, prints.length - 500);
		ctx.fillStyle = 'rgb(118,62,16)';
		prints.forEach(function(p) {
			var x = p.u - cam * DAYW + LEAD_X;
			if (x < -20 || x > VW + 20) return;
			var a = 0.42 * clamp(1 - (clock - p.born) / 70, 0, 1);
			if (a <= 0) return;
			ctx.globalAlpha = a;
			var y = groundY(p.u) + 8 + p.depth;
			ctx.beginPath(); ctx.ellipse(x, y, 5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
		});
		ctx.globalAlpha = 1;
	}
	var paths = {};
	function logoPaths(c) {
		if (!paths[c.body]) paths[c.body] = {body: new Path2D(c.body), legs: c.legs.map(function(l) { return new Path2D(l.d); })};
		return paths[c.body];
	}
	// the logo's camels: used until the Firefly ones load, and tiny for the merchants on the far hills
	function drawLogoCamel(c, x, y, scale, angle, dir, phase, amount, color) {
		var p = logoPaths(c);
		ctx.save();
		ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale * dir, scale);
		ctx.translate(-c.w / 2, -c.h);
		ctx.fillStyle = color;
		c.legs.forEach(function(l, i) {
			var f = phase + OFFSETS[i]; f -= Math.floor(f);
			var th = (f < DUTY ? -0.3 + 0.6 * f / DUTY : 0.3 - 0.6 * smooth((f - DUTY) / (1 - DUTY))) * amount;
			ctx.save();
			ctx.translate(l.pivot[0], l.pivot[1]); ctx.rotate(th); ctx.translate(-l.pivot[0], -l.pivot[1]);
			ctx.translate(0, c.h); ctx.scale(0.1, -0.1); ctx.fill(p.legs[i]);
			ctx.restore();
		});
		ctx.translate(0, c.h); ctx.scale(0.1, -0.1); ctx.fill(p.body);
		ctx.restore();
	}
	var RIDERS = ['jr-camel-rider', 'jr-camel-rider-2', 'jr-camel-rider-3'];
	function riderOrder(k) {   // a different order on different nights (the same one each time a night is watched)
		var r = rng(k * 53 + 11), order = RIDERS.slice();
		for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
		return order;
	}
	var EVENING = 15;   // seconds after they stop
	function evening() { return show && (show.mode === 'night' || show.mode === 'sofar') ? clamp(show.elapsed - show.seconds, 0, EVENING) : 0; }
	function eveningKind() {
		var lm = night.plan.landmark;
		return lm === 'stable' ? 'manger' : lm === 'herod' || lm === 'home' ? 'palace' : 'fire';
	}
	function fireX() { return LEAD_X + 320; }
	// where king i (0 = the leader) ends up, in scene x, and which way he faces
	function kingSpot(i) {
		var kind = eveningKind();
		if (kind === 'manger') { var sx = screenX('road', pieceU(STABLE)); return {x: sx - 215 + i * 56, dir: 1, pray: true}; }
		if (kind === 'palace') return {x: LEAD_X + 120 + i * 48, dir: 1};
		var fx = fireX();
		return [{x: fx - 70, dir: 1}, {x: fx + 68, dir: -1}, {x: fx - 128, dir: 1, back: true}][i];   // close to the fire, but not in it
	}
	function kingY(x) { return groundY(x - LEAD_X + cam * DAYW) + 4; }
	// The campfire: a ring of stones, crossed logs glowing at their ends, flames that lick and flicker (each tongue drawn
	// hot white-yellow at the root to red at the tip, and added together so they glow where they overlap), a pool of
	// firelight on the sand, sparks drifting up and a thin smoke. grow (0..1) is how far it has caught: it's lit once the
	// kings have walked over, starting small and building to a steady fire.
	// opt: {y: where its base is, s: its size (1 = the kings' fire), id: which fire, so each keeps its own sparks}
	var fires = {}, fireNow = 0, fireKick = -99;
	// a bronze brazier on three legs, its fire burning, by the palace steps at home (Firefly art if it's in)
	function paintBrazier(x) {
		var y = kingY(x), im = art('jr-pr-brazier');
		var fy = y - 44;
		if (im && im.base) { var bh = 60, bw = bh * im.width / im.height, bt = y + 4 - im.base * bh; ctx.drawImage(im, x - bw / 2, bt, bw, bh); fy = bt + bh * 0.1; }   // (the fire sits in its bowl)
		else {
			ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3; ctx.lineCap = 'round';
			[[-14, 0], [14, 0], [0, 3]].forEach(function(l) { ctx.beginPath(); ctx.moveTo(x + l[0] * 0.4, y - 34); ctx.lineTo(x + l[0], y + l[1]); ctx.stroke(); });   // the legs
			var g = ctx.createLinearGradient(0, y - 46, 0, y - 32); g.addColorStop(0, '#d9a441'); g.addColorStop(1, '#6e4416');
			ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, y - 46); ctx.quadraticCurveTo(x, y - 24, x + 20, y - 46); ctx.closePath(); ctx.fill();   // the bowl
			ctx.fillStyle = '#e6bf62'; ctx.fillRect(x - 21, y - 48, 42, 3);   // its rim
		}
		paintFire(x, 1, 0.55, {y: fy, s: 0.6, id: 'brazier'});
	}
	var CAMP_FIRES = {'jr-lm-camp': [400, 282, 0.34], 'jr-lm-camp-2': [545, 515, 0.22], 'jr-lm-camp-3': [530, 505, 0.24]};   // where each camp's fire is, in its picture's pixels, and its size per 100 of the camp's height
	function paintFire(x, a, grow, opt) {
		if (a <= 0) return;
		opt = opt || {};
		grow = grow == null ? 1 : grow;
		var f = fires[opt.id || 'camp'] || (fires[opt.id || 'camp'] = {embers: [], smoke: [], clock: clock});
		var y = opt.y != null ? opt.y : kingY(x), dt = clamp(clock - f.clock, 0, 0.1); f.clock = clock;
		var size = 0.25 + 0.75 * grow;
		ctx.save(); ctx.globalAlpha = a;
		if (opt.s) { ctx.translate(x, y); ctx.scale(opt.s, opt.s); ctx.translate(-x, -y); }
		// firelight on the sand and on whoever stands near
		ctx.globalCompositeOperation = 'lighter';
		ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.32);
		glow(0, 0, 230 * size, 'rgb(255,130,40)', 0.16 * flicker(3) * grow);
		ctx.restore();
		glow(x, y - 30, 190 * size, 'rgb(255,150,60)', 0.22 * flicker(5) * grow);
		ctx.globalCompositeOperation = 'source-over';
		// the stones and the logs
		for (var i = 0; i < 9; i++) {
			var t = i / 9 * Math.PI * 2, sx = x + Math.cos(t) * 26, sy = y - 2 + Math.sin(t) * 6;
			if (Math.sin(t) < -0.2) continue;   // (the back of the ring is hidden behind the fire)
			ctx.fillStyle = '#3b3140'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = 'rgba(255,150,70,' + (0.35 * grow * flicker(i)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy - 1.5, 5, 2, 0, Math.PI, 0); ctx.fill();
		}
		[[0.38, '#3d2414'], [-0.42, '#4a2c17'], [0.05, '#35200f']].forEach(function(l) {
			ctx.save(); ctx.translate(x, y - 5); ctx.rotate(l[0]);
			ctx.fillStyle = l[1]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-22, -3.5, 44, 7, 3.5) : ctx.rect(-22, -3.5, 44, 7); ctx.fill();
			ctx.fillStyle = 'rgba(255,' + Math.round(110 + 60 * flicker(l[0] * 9)) + ',40,' + (0.85 * grow).toFixed(2) + ')';   // embers glowing in the wood
			ctx.fillRect(-8, -2, 16, 3.5);
			ctx.restore();
		});
		// the flames: tongues of different heights, swaying and flickering, each with its own rhythm; the tall ones red
		// and orange, painted over each other, the short ones in front yellow
		var tongues = [[-11, 0.62, 1.3], [9, 0.7, 2.1], [-3, 1, 0.4], [4, 0.85, 3.3], [-8, 0.5, 4.7], [12, 0.45, 5.9]];
		tongues.sort(function(p, q) { return q[1] - p[1]; });   // tallest at the back
		tongues.forEach(function(tg, n) {
			var ph = tg[2], wob = Math.sin(clock * 7.3 + ph) * 0.5 + Math.sin(clock * 13.1 + ph * 2) * 0.3 + Math.sin(clock * 3.1 + ph) * 0.2;
			var hgt = 58 * tg[1] * size * (0.82 + 0.22 * wob), w = (11 - n * 0.6) * size, bx = x + tg[0] * size, by = y - 6;
			var lean = Math.sin(clock * 2.3 + ph) * 5 * size + night.wind * 6, tipX = bx + lean + Math.sin(clock * 9 + ph) * 3;
			var g = ctx.createLinearGradient(0, by, 0, by - hgt), hot = tg[1] < 0.7;
			g.addColorStop(0, hot ? 'rgba(255,224,120,0.95)' : 'rgba(255,170,60,0.95)'); g.addColorStop(0.35, hot ? 'rgba(255,170,50,0.9)' : 'rgba(245,110,30,0.85)');
			g.addColorStop(0.75, 'rgba(215,60,20,0.55)'); g.addColorStop(1, 'rgba(160,30,10,0)');
			ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - w, by);
			ctx.bezierCurveTo(bx - w * 1.1, by - hgt * 0.45, tipX - w * 0.5 + lean * 0.3, by - hgt * 0.7, tipX, by - hgt);
			ctx.bezierCurveTo(tipX + w * 0.4 + lean * 0.3, by - hgt * 0.7, bx + w * 1.1, by - hgt * 0.4, bx + w, by);
			ctx.closePath(); ctx.fill();
		});
		ctx.globalCompositeOperation = 'lighter';
		glow(x, y - 12 * size, 16 * size, 'rgb(255,230,150)', 0.45 * grow * flicker(2));   // the hot heart, low in the fire
		// sparks rising from it
		var embers = f.embers, smoke = f.smoke;
		if (!opt.id && clock - fireKick < 0.25) for (var kk = 0; kk < 3; kk++) embers.push({x: x + (Math.random() - 0.5) * 24, y: y - 16, vx: (Math.random() - 0.5) * 50, vy: -90 - Math.random() * 90, life: 1 + Math.random(), t: 0});   // a king stirred it
		if (!reduceMotion && Math.random() < dt * 14 * grow) embers.push({x: x + (Math.random() - 0.5) * 20, y: y - 20, vx: (Math.random() - 0.5) * 18 + night.wind * 20, vy: -50 - Math.random() * 60, life: 1.2 + Math.random() * 1.4, t: 0});
		embers = f.embers = embers.filter(function(e) {
			e.t += dt; e.x += (e.vx + Math.sin(clock * 3 + e.life * 9) * 12) * dt; e.y += e.vy * dt; e.vy *= 0.995;
			var f = 1 - e.t / e.life; if (f <= 0) return false;
			ctx.fillStyle = 'rgba(255,' + Math.round(150 + 80 * f) + ',60,' + f.toFixed(2) + ')'; ctx.fillRect(e.x, e.y, 1.6, 1.6);
			return true;
		});
		ctx.globalCompositeOperation = 'source-over';
		// and a thin smoke drifting away above it
		if (!reduceMotion && Math.random() < dt * 3 * grow) smoke.push({x: x + (Math.random() - 0.5) * 8, y: y - 50 * size, r: 6, t: 0, life: 4 + Math.random() * 2});
		smoke = f.smoke = smoke.filter(function(p) {
			p.t += dt; p.y -= 16 * dt; p.x += (6 + night.wind * 30) * dt; p.r += 5 * dt;
			var f = 1 - p.t / p.life; if (f <= 0) return false;
			glow(p.x, p.y, p.r, 'rgb(150,140,160)', 0.12 * f * Math.min(1, p.t * 2));
			return true;
		});
		ctx.restore();
	}

	// The kings' stride: their robes hide their legs, so the hem and feet move instead. The bottom of the picture is
	// cut off and drawn in two halves (back and front foot) that step forward and back in turn, with the hem
	// swinging; the body above rises a touch over each step. Set KING_STRIDE to false to go back to the plain walk.
	var KING_STRIDE = true;
	function drawKing(im, x, y, h, dir, bob, tilt, a, ph, look) {
		if (!im || a <= 0) return;
		var w = h * im.width / im.height, base = im.base || 1, top = -h * base;
		ctx.save(); ctx.globalAlpha = a;
		ctx.translate(x, y - bob); ctx.rotate(tilt); ctx.scale(dir, 1);
		if (!KING_STRIDE || ph == null) {
			if (!bob && !tilt && !reduceMotion) ctx.scale(1, 1 + 0.008 * Math.sin(clock * 1.5 + x * 0.05));   // standing still, he breathes
			if (look > 0.01) {   // looking up at the Star: the head and shoulders tip back about the neck, the top turning most.
				// Put together at the picture's own size first (overlapping strips), then drawn in one piece, so no seams show
				var W = im.width, H = im.height, nk = 0.24 * (im.base || 1), sy = H * nk, pad = Math.round(W * 0.3);
				var cv = im.looking || (im.looking = document.createElement('canvas'));
				if (cv.width !== W + pad * 2) { cv.width = W + pad * 2; cv.height = H + pad; }
				var g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(pad, pad);
				g.drawImage(im, 0, sy - 2, W, H - sy + 2, 0, sy - 2, W, H - sy + 2);
				var px = W * 0.42, py = sy;
				for (var st = 5; st >= 0; st--) {
					var y0 = sy * st / 6, y1 = Math.min(sy + 3, sy * (st + 1) / 6 + 6), ang = -0.28 * look * (1 - st / 6);
					g.save(); g.translate(px, py); g.rotate(ang); g.translate(-px, -py);
					g.drawImage(im, 0, y0, W, y1 - y0, 0, y0, W, y1 - y0);
					g.restore();
				}
				ctx.drawImage(cv, -w / 2 - pad * w / W, top - pad * h / H, w * cv.width / W, h * cv.height / H);
				ctx.restore(); return;
			}
			ctx.drawImage(im, -w / 2, top, w, h); ctx.restore(); return;
		}
		var split = 0.84, srcSplit = im.height * base * split, srcBottom = im.height * base;
		var ySplit = top + h * base * split, hLow = h * base * (1 - split), stepAmt = Math.sin(ph), reach = w * 0.045;
		// the body, down to the knees
		ctx.drawImage(im, 0, 0, im.width, srcSplit + 2, -w / 2, top, w, h * base * split + 2 * h / im.height);
		// the hem and feet: back half and front half step in turn, and the hem swings with them
		[[0, 0.5, -1], [0.5, 1, 1]].forEach(function(part) {
			var sx0 = im.width * part[0], sw = im.width * (part[1] - part[0]), off = stepAmt * reach * part[2];
			ctx.save();
			ctx.translate(0, ySplit);
			ctx.transform(1, 0, stepAmt * 0.06 * part[2], 1, 0, 0);   // the bottom swings further than the top of the strip
			ctx.drawImage(im, sx0, srcSplit, sw, srcBottom - srcSplit, -w / 2 + w * part[0] + off, 0, w * (part[1] - part[0]) + 0.5, hLow);
			ctx.restore();
		});
		ctx.restore();
	}
	// the wise men on their own camels, and what they do when the night's walk is over. All of a king's poses come from
	// one character sheet at the same scale, so he stays the same man; and once he's down he walks behind the kneeling
	// camels, which hide the change from sitting to standing.
	var LOWER = 0.5;                                           // how far a camel lowers itself (of its leg length) before it settles
	var KING_H = CHAR_H * 0.8;                                 // a standing king's height
	var SEATS = [[0.45, 0.97], [0.45, 0.8], [0.5, 0.8]];        // where each king sits in his riding picture
	function kingScale(c) { var w = art(c.walkFree) || art(c.walk); return KING_H / ((w.base || 1) * w.height); }
	function paintCharacters() {
		var order = riderOrder(night.day).map(function(n) { return RIDERS.indexOf(n); });
		var e = evening(), kind = eveningKind();
		paintPrints();
		var plan = CARAVAN.map(function(k, i) {
			// a camel clicked while walking tries to pass the one ahead: it hurries forward, stepping out towards us (a little
			// lower and larger) so it goes alongside, draws level, then gives up and drops back into line
			var sg = surgeAt(k), gap = i > 0 ? CHAR_BACK[i] - CHAR_BACK[i - 1] : 0;
			var n = order[i], c = CHARS[n], r = rigReady(c.camel), cx = LEAD_X - CHAR_BACK[i] + gap * 0.95 * sg, u = cam * DAYW - CHAR_BACK[i] + gap * 0.95 * sg;
			if (i > 0 && sg > 0.9 && !CARAVAN[i - 1].answered) { CARAVAN[i - 1].answered = true; CARAVAN[i - 1].poke = clock; sound.animal('camel-grunt', 0.32); }   // the one ahead grumbles at it
			if (sg === 0) CARAVAN.forEach(function(o) { if (o !== k && !(o.surge > clock - 5)) o.answered = false; });
			k.ah = CHAR_H * (1 + 0.07 * sg); if (k.art !== c.camel) { k.art = c.camel; k.wasPlanted = []; }
			var t0 = 0.8 + [0, 0.22, 0.12][i];                         // nearly together, a little out of step
			var p = {k: k, c: c, r: r, cx: cx, u: u, n: n, t0: t0, sink: 22 * sg, sg: sg, i: i,
				// the camel goes down (its walking picture becomes its kneeling one, from the same sheet) and its king comes
				// down with it in the same moment; then he stands up behind it and walks off
				kneelA: PACKED() ? 0 : smooth((e - t0) / 0.5),   // (in September at home they stand, loaded for the road)
				stand: smooth((e - 2.0 - i * 0.35) / 0.45),           // once all three camels are down, the kings get up in turn
				spot: kingSpot(i), walkStart: 2.6 + i * 0.35};
			p.g = drawRigCamel(k, c.camel, r, cx, u, {alpha: 0, sink: 22 * sg});    // where the camel stands (nothing drawn yet)
			p.g.y += 22 * sg;
			p.ks = kingScale(c);
			p.seatX = cx + (r.saddle[0] - r.w / 2) * p.g.s; p.seatY = p.g.y - (r.h - r.saddle[1]) * p.g.s;
			return p;
		});
		// 1. kings who are down, walking behind the camels to their places
		var kings = [], fireLit = 1e9;
		plan.forEach(function(p, i) {
			if (p.stand <= 0) return;
			var c = p.c, gifts = p.spot.pray;
			var x0 = p.seatX - 6, dist = Math.abs(p.spot.x - x0);
			var walkDur = Math.max(1, Math.min(dist / 50, EVENING - p.walkStart - 1.6)), wt = clamp((e - p.walkStart) / walkDur, 0, 1);
			fireLit = Math.min(fireLit, p.walkStart + walkDur);   // the first king to reach the fireplace lights it
			var ew = wt * wt * (3 - 2 * wt), x = x0 + (p.spot.x - x0) * ew, y = kingY(x) - 5;
			var stepping = wt > 0 && wt < 1, ph = dist * ew / 26 * Math.PI;
			var bob = stepping ? (1 - Math.cos(2 * ph)) * 1.1 : 0, tilt = stepping ? Math.sin(ph) * 0.012 : 0;
			var still = art(c.rest) || art(c.walkFree), walking = art(c.walkFree) || art(c.walk);   // (the gift appears as he kneels at the manger)
			if (wt <= 0) kings.push({n: p.n, im: still, x: x, y: y, ks: p.ks, dir: 1, a: p.stand});                       // just stood up
			else if (wt < 1) kings.push({n: p.n, im: walking, x: x, y: y, ks: p.ks, dir: 1, bob: bob, tilt: tilt, a: 1, ph: ph});
			else {
				var arrived = smooth((e - p.walkStart - walkDur) / 0.35);
				var end = gifts ? art(c.pray) : still;
				kings.push({n: p.n, im: walking, x: x, y: y, ks: p.ks, dir: 1, a: 1 - arrived});
				var lean = 0;
				if (kind === 'fire' && arrived >= 1 && !reduceMotion) {   // they take turns tending the fire: one leans in to it every few seconds
					var cyc = (clock + 2) / 7, turn = Math.floor(cyc) % 3, q = cyc - Math.floor(cyc);
					if (turn === i && q < 0.3) { lean = Math.sin(Math.PI * q / 0.3) * 0.16 * (fireX() > x ? 1 : -1); if (q > 0.12 && q < 0.16) fireKick = clock; }
				}
				var look = 0;
				if (!gifts && arrived >= 1 && !reduceMotion && lean === 0) {   // now and then each looks up at the Star for a few seconds
					var lc = (clock + i * 3.3) / 11, lq = lc - Math.floor(lc);
					if (lq > 0.55 && lq < 0.85) look = Math.sin(Math.PI * (lq - 0.55) / 0.3);
				}
				kings.push({n: p.n, im: end, x: x, y: y, ks: p.ks, dir: gifts ? 1 : p.spot.dir, a: arrived, tilt: lean, look: look});
			}
		});
		kingBoxes = [];
		kings.forEach(function(q, i) {
			if (!q.im) return;   // (its picture still loading)
			drawKing(q.im, q.x, q.y, q.im.height * q.ks, q.dir, q.bob || 0, q.tilt || 0, q.a, q.ph, q.look || 0);
			var kh = q.im.height * q.ks * (q.im.base || 1), kw = q.im.width * q.ks;
			if (q.a > 0.9) kingBoxes.push({n: q.n + 1, x0: q.x - kw * 0.35, x1: q.x + kw * 0.35, y0: q.y - kh, y1: q.y, head: q.y - kh - 8, x: q.x});
			if (q.a > 0.5) { var hh = q.im.height * q.ks * (q.im.base || 1); breathe('king' + q.n, q.x + q.dir * hh * 0.1, q.y - hh * 0.86, q.dir, 1); }   // (standing about at the fire)
		});
		// 2. the camels, and the kings still on them (one stepping out to pass is nearer us, so drawn last)
		camelBoxes = [];
		plan.slice().sort(function(a, b) { return a.sg - b.sg; }).forEach(function(p) {
			var c = p.c, r = p.r, s = p.g.s, ri = (homeward(night.day) && art(c.rideHome)) || art(c.ride);   // going home their hands are empty: the gifts were given
			var riding = e <= 0;
			drawRigCamel(p.k, c.camel, r, p.cx, p.u, {alpha: 1 - p.kneelA, rider: riding ? ri : null, riderH: ri.height * p.ks, seat: SEATS[p.n], sink: p.sink});
			if (PACKED()) drawPacks(p, s);
			camelBoxes.push({k: p.k, i: p.i, king: p.n + 1, riding: riding, x0: p.cx - r.w * s * 0.45, x1: p.cx + r.w * s * 0.5, y0: p.g.y - r.h * s * (p.kneelA > 0.5 ? 0.6 : 1), y1: p.g.y});
			var kim = art(c.kneel), ks = r.kneelSeat, kw = kim.width * s, kh = kim.height * s;
			var kx = ks ? p.seatX - ks[0] * s : p.cx - kw / 2, ky = p.g.y + 4 - (ks ? ks[3] : kh / s * (kim.base || 1)) * s;   // seats lined up
			if (p.kneelA > 0) {
				ctx.save(); ctx.globalAlpha = p.kneelA;
				ctx.translate(kx, ky); ctx.scale(kw / kim.width, kh / kim.height);
				var nz = (clock * 0.11 + p.k.seed * 3) % 1, nuzzle = nz < 0.12 && !reduceMotion ? Math.sin(Math.PI * nz / 0.12) * 0.13 : 0;   // now and then it stretches its head forward and down
				var pk2 = clock - (p.k.poke || -9), toss2 = pk2 < 0.9 ? -0.16 * Math.sin(Math.PI * pk2 / 0.9) : 0;
				drawCamelFace(kim, CAMEL_FACE.kneel, (1 - walk) * 0.04 * Math.sin(clock * 0.4 + p.k.seed * 7) + nuzzle + toss2, camelBlink(p.k), 0);
				ctx.restore();
				if (p.kneelA > 0.5) breathe('camel' + p.k.n, kx + 590 / kim.width * kw, ky + 85 / kim.height * kh, 1, s * 4);   // (its nose, kneeling)
			}
			if (!riding && p.stand < 1) {   // on the saddle, coming down with the camel, until he stands up
				var rh = ri.height * p.ks, rw = rh * ri.width / ri.height, sx = SEATS[p.n];
				var downY = ks ? ky + ks[1] * s : p.seatY + (r.h - r.cut) * 0.5 * s;
				var seatY = p.seatY + (downY - p.seatY) * p.kneelA;
				ctx.save(); ctx.globalAlpha = 1 - p.stand;
				ctx.drawImage(ri, p.seatX - rw * sx[0], seatY - rh * sx[1] + r.h * 0.03 * s, rw, rh);
				ctx.restore();
			}
		});
		fireNow = kind === 'fire' ? smooth((e - fireLit) / 3.5) : 0;   // (the crackle is heard as the fire catches, not before)
		if (kind === 'fire') paintFire(fireX(), smooth((e - fireLit) / 0.8), fireNow);
		if (HOMEMODE && !EASTER()) paintBrazier(LEAD_X + 300);   // at home, a brazier burns by the palace steps (not on Easter morning)
		var arm = HOMEMODE && art('jr-pr-armillary');   // and the wise men's armillary sphere, their model of the heavens (tap it)
		if (arm && arm.base) {
			var ax = LEAD_X + 400, ay = kingY(ax) + 4, ah = 92, aw = ah * arm.width / arm.height;
			ctx.drawImage(arm, ax - aw / 2, ay - arm.base * ah, aw, ah);
			kingBoxes.push({n: 0, x0: ax - aw / 2, x1: ax + aw / 2, y0: ay - ah, y1: ay, head: ay - ah - 6, x: ax});
			sparkle(ax + aw * 0.3, ay - ah * 0.8, 6, beckon(3, 8) * 0.9);
		}   // lit when the first of them gets there, catching and building up
	}
	// the page waits for the wise men and their camels to load, so nothing stands in for them first; if the art is
	// very slow (or missing) it gives up after a few seconds and uses the logo's camels
	var loadStart = performance.now();
	function sceneReady() {   // tonight's sky and land, as well as the characters
		if (!charsReady()) return false;
		var want = [night.sky.art].concat(['far', 'mid', 'road'].map(function(l) { return stageAt(Math.max(0, cam)).art[l].filter(function(n) { return ART_READY.indexOf(n) >= 0; }); }));
		return want.every(function(w) { return Array.isArray(w) ? !w.length || w.some(art) : ART_READY.indexOf(w) < 0 || art(w); });
	}
	var ready = false;
	function artWaiting() { if (!ready) ready = sceneReady() || performance.now() - loadStart > 25000; return !ready; }
	var fadeIn = 0;
	function paintCaravan() {
		if (charsReady()) return paintCharacters();
		if (artWaiting()) return;
		var order = riderOrder(night.day);
		CARAVAN.forEach(function(k, i) { if (k.art !== order[i]) { k.art = order[i]; k.wasPlanted = []; } });
		var firefly = CARAVAN.every(function(k) { return rigReady(k.art); });
		paintPrints();
		CARAVAN.forEach(function(k) {
			if (firefly) { var r = rigReady(k.art); drawRigCamel(k, k.art, r, LEAD_X - k.aback, cam * DAYW - k.aback); return; }
			var back = k.back * 1.35, c = JOURNEY_CAMELS[k.n], uu = cam * DAYW - back;
			drawLogoCamel(c, LEAD_X - back, roadY(uu) + 3, (k.h / c.h) * 1.35, clamp(Math.atan2(roadY(uu + 50) - roadY(uu - 50), 100), -0.15, 0.15), 1, gaitDist / 45 + k.seed, walk, '#F7B13F');
		});
	}

	// ----- the sky, the moon and the Star -----
	var stars = [], meteors = [];
	function makeStars() {
		var r = rng(night.day * 977 + 3);
		stars = [];
		for (var i = 0; i < night.stars; i++) stars.push({x: r() * 4000, y: r(), s: r() < 0.08 ? 1.7 : 0.5 + r() * 0.9, o: 0.35 + r() * 0.6, tw: r() < 0.35 ? 2 + r() * 4 : 0, ph: r() * 6});
	}
	// Cranes on their autumn migration (October and November): on some nights a long V of them crosses the sky high
	// overhead, wings beating slowly. Dark against a day sky, pale against the night.
	function cranesTonight(k) {
		var m = dateOfDay(k).getMonth();
		return (m === 9 || m === 10) && !/storm|sandstorm|rain|fog/.test(planFor(k).weather) && hash(k * 3 + 400) < 0.35;
	}
	function paintCranes() {
		if (!cranesTonight(night.day) || !show || show.mode !== 'night' || reduceMotion) return;
		var t0 = 0.15 + hash(night.day + 410) * 0.4, f = (nightT() - t0) / 0.3;   // they take about a third of the walk to cross
		if (f <= 0 || f >= 1) return;
		var n = 9 + Math.floor(hash(night.day + 420) * 8), lx = VW + 80 - f * (VW + 400), ly = TOPV + 210 + hash(night.day + 430) * 80 - f * 40;
		var dl = daylight(), col = dl > 0.3 ? 'rgba(50,40,60,0.75)' : 'rgba(225,225,240,0.55)';
		ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
		for (var i = 0; i < n; i++) {
			var side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2), x = lx + rank * 26 + Math.sin(i * 1.7) * 2, y = ly + side * rank * 13;   // the V, leader in front
			var flap = Math.sin(clock * 4 + i * 0.6), wy = -5 * flap, s = 9;
			ctx.beginPath(); ctx.moveTo(x - s, y + wy); ctx.quadraticCurveTo(x - s * 0.4, y - 1 + wy * 0.3, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - 1 + wy * 0.3, x + s, y + wy); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 0.5); ctx.stroke();   // its long neck stretched out ahead
		}
	}
	// By day two vultures ride the warm air, circling slowly high over the hills, broad wings held still and tilting
	function paintVultures() {
		var dl = daylight();
		if (dl < 0.35 || /rain|storm|sandstorm|fog/.test(night.weather)) return;
		var cx = VW * (0.3 + hash(night.day + 500) * 0.4) - skyDrift() * 0.3, cy = TOPV + 230 + hash(night.day + 510) * 60;
		for (var i = 0; i < 2; i++) {
			var a = clock * (0.22 + i * 0.05) + i * 2.4, rx = 120 + i * 50, ry = 30 + i * 10;
			var x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, bank = Math.cos(a) * 0.25, s = 1 - i * 0.15;   // banking as it turns
			ctx.save(); ctx.translate(x, y); ctx.rotate(bank); ctx.scale(s, s);
			ctx.globalAlpha = Math.min(1, (dl - 0.35) * 3);
			ctx.fillStyle = 'rgba(52,40,52,0.8)';
			ctx.beginPath();   // long broad wings with fingered tips, a short fanned tail
			ctx.moveTo(0, -2); ctx.quadraticCurveTo(-10, -5, -20, -2); ctx.lineTo(-23, 0); ctx.lineTo(-20, 1); ctx.lineTo(-22, 2.5); ctx.lineTo(-18, 2.5);
			ctx.quadraticCurveTo(-9, 3, 0, 2); ctx.quadraticCurveTo(9, 3, 18, 2.5); ctx.lineTo(22, 2.5); ctx.lineTo(20, 1); ctx.lineTo(23, 0); ctx.lineTo(20, -2);
			ctx.quadraticCurveTo(10, -5, 0, -2); ctx.fill();
			ctx.beginPath(); ctx.ellipse(0, 1, 2.6, 4, 0, 0, Math.PI * 2); ctx.fill();
			ctx.restore();
		}
	}
	// A constellation for each week, on clear nights after dark: its stars shine a little brighter, and clicking one of
	// them traces the figure and names it. The wise men studied the stars; several of these are named in the Bible.
	var CONSTELLATIONS = [
		{name: 'Orion, the hunter', ref: 'Job 9:9', stars: [[0.2, 0.1], [0.75, 0.18], [0.38, 0.5], [0.5, 0.47], [0.62, 0.44], [0.3, 0.92], [0.82, 0.86], [0.48, 0]],
		 lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [1, 7]]},
		{name: 'The Pleiades, the seven sisters', ref: 'Amos 5:8', stars: [[0.3, 0.4], [0.45, 0.3], [0.52, 0.45], [0.62, 0.38], [0.58, 0.58], [0.72, 0.52], [0.4, 0.6]], lines: [[0, 1], [1, 3], [3, 5], [5, 4], [4, 6], [6, 0], [2, 1], [2, 4]]},
		{name: 'The Great Bear', ref: 'Job 38:32', stars: [[0, 0.3], [0.17, 0.25], [0.32, 0.32], [0.46, 0.42], [0.5, 0.68], [0.8, 0.72], [0.82, 0.44]],
		 lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]},
		{name: 'Cassiopeia, the queen', ref: '', stars: [[0, 0.3], [0.24, 0.68], [0.46, 0.4], [0.7, 0.72], [0.95, 0.22]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]]},
		{name: 'Leo, the lion', ref: 'Revelation 5:5', stars: [[0.18, 0.82], [0.16, 0.56], [0.26, 0.36], [0.4, 0.3], [0.46, 0.46], [0.66, 0.58], [0.95, 0.72], [0.62, 0.84]],
		 lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [4, 5], [5, 6], [6, 7], [7, 0]]},
		{name: 'Cygnus, the swan', ref: '', stars: [[0.5, 0], [0.5, 0.42], [0.5, 1], [0.08, 0.34], [0.92, 0.5]], lines: [[0, 1], [1, 2], [3, 1], [1, 4]]},
		{name: 'Taurus, the bull', ref: '', stars: [[0.42, 0.56], [0.5, 0.62], [0.58, 0.52], [0.5, 0.44], [0.12, 0.08], [0.9, 0.1], [0.3, 0.5]],
		 lines: [[6, 0], [0, 1], [1, 2], [2, 3], [3, 0], [6, 4], [2, 5]]}
	];
	var traced = {t: -99};
	function constellation() {   // tonight's, and where it is (or null)
		if (!night || /storm|rain|sandstorm|fog/.test(night.weather) || night.day === TOTAL) return null;
		var c = CONSTELLATIONS[Math.floor((HOMEMODE ? YEARDAY : night.day) / 7) % CONSTELLATIONS.length];
		var bx = VW * 0.1 - skyDrift() * 0.2, by = TOPV + 115, bw = 230, bh = 160;
		return {c: c, pts: c.stars.map(function(p) { return [bx + p[0] * bw, by + p[1] * bh]; })};
	}
	function paintConstellation(clearSky) {
		var k = constellation(), seen = clearSky * (1 - Math.min(1, daylight() * 4)) * (1 - Math.min(1, (show && show.mode === 'night' ? 0 : 0)));
		if (!k || seen < 0.1) return;
		var tr = clock - traced.t, on = traced.day === night.day ? clamp(Math.min(tr / 0.4, (8 - tr) / 1.2), 0, 1) : 0;
		if (on > 0) {   // its lines drawn in one after another, then the name
			ctx.strokeStyle = 'rgba(200,215,255,' + (0.5 * on * seen).toFixed(3) + ')'; ctx.lineWidth = 1;
			k.c.lines.forEach(function(l, i) {
				var f = clamp((tr - i * 0.15) / 0.3, 0, 1); if (f <= 0) return;
				var a = k.pts[l[0]], b = k.pts[l[1]];
				ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); ctx.stroke();
			});
			var lx = k.pts.reduce(function(m, p) { return m + p[0]; }, 0) / k.pts.length, ly = Math.max.apply(null, k.pts.map(function(p) { return p[1]; })) + 26;
			ctx.save(); ctx.globalAlpha = on * seen * clamp((tr - 0.6) / 0.5, 0, 1);
			ctx.translate(lx, ly); if (homeward(night.day)) ctx.scale(-1, 1);   // (the words the right way round on the way home)
			ctx.textAlign = 'center'; ctx.fillStyle = '#e8e3ff'; ctx.font = 'italic 17px Merienda, Georgia, serif'; ctx.fillText(k.c.name, 0, 0);
			if (k.c.ref) { ctx.fillStyle = '#FFDB59'; ctx.font = '12px Inter, Arial, sans-serif'; ctx.fillText(k.c.ref, 0, 18); }
			ctx.restore();
		}
		k.pts.forEach(function(p, i) {   // its stars, a little brighter than the rest
			var tw = 0.75 + 0.25 * Math.sin(clock * 2 + i * 1.9) + 0.9 * beckon(i * 0.02, 25);   // (and every so often they all brighten together: tap us)
			glow(p[0], p[1], 9 + 4 * on, 'rgb(220,230,255)', 0.55 * seen * tw);
			ctx.globalAlpha = seen; ctx.fillStyle = '#fff'; ctx.fillRect(p[0] - 1.2, p[1] - 1.2, 2.4, 2.4); ctx.globalAlpha = 1;
		});
	}
	function traceAt(p) {   // a click near one of tonight's constellation stars traces it
		var k = constellation(); if (!k || daylight() > 0.2) return false;
		var xs = k.pts.map(function(q) { return q[0]; }), ys = k.pts.map(function(q) { return q[1]; });   // anywhere in the figure (easy with a finger)
		if (p.x < Math.min.apply(null, xs) - 30 || p.x > Math.max.apply(null, xs) + 30 || p.y < Math.min.apply(null, ys) - 30 || p.y > Math.max.apply(null, ys) + 30) return false;
		traced = {t: clock, day: night.day}; track('constellation', {name: constellation().c.name}); return true;
	}
	// The moon's face: its dark seas where they really are (as seen from the northern hemisphere), the bright craters
	// Tycho and Copernicus with their rays, a scatter of small craters and a little darkening towards the edge. Made once
	// in greys and tinted by the moon's colour (orange as it rises), so the phase shadow can be laid over it.
	var moonFace = null, moonCanvas = null;
	function makeMoonFace() {
		var N = 160, c = document.createElement('canvas'); c.width = c.height = N;
		var g = c.getContext('2d'), R = N / 2, r = rng(4242);
		g.fillStyle = '#f2efe6'; g.fillRect(0, 0, N, N);
		[[-0.52, -0.02, 0.36, 0.30], [-0.28, -0.42, 0.25, 0.36], [0.20, -0.36, 0.15, 0.34], [0.36, -0.08, 0.19, 0.34], [0.70, -0.27, 0.10, 0.40],
		 [0.60, 0.16, 0.13, 0.28], [-0.14, 0.36, 0.17, 0.26], [-0.50, 0.40, 0.09, 0.30], [0.40, 0.32, 0.08, 0.28], [0.05, -0.62, 0.12, 0.18],
		 [-0.70, -0.30, 0.14, 0.22], [0.12, 0.06, 0.10, 0.20]].forEach(function(m) {
			g.filter = 'blur(' + (R * 0.08) + 'px)';
			g.fillStyle = 'rgba(118,116,126,' + (m[3] * 0.45) + ')';
			for (var k = 0; k < 14; k++) {   // each sea many small overlapping blots, softened, so it has a ragged natural edge
				var x = R + (m[0] + (r() - 0.5) * m[2] * 1.1) * R, y = R + (m[1] + (r() - 0.5) * m[2] * 1.1) * R, rr = m[2] * R * (0.35 + r() * 0.4);
				g.beginPath(); g.ellipse(x, y, rr, rr * (0.6 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
			}
			g.filter = 'none';
		});
		for (var i = 0; i < 26; i++) {   // a few small craters in the bright highlands, mostly the south
			var a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.9, cx = R + Math.cos(a) * d * R, cy = R + Math.abs(Math.sin(a)) * d * R * (r() < 0.75 ? 1 : -1), cr = 0.6 + Math.pow(r(), 3) * 2.6;
			g.fillStyle = 'rgba(120,118,128,0.18)'; g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill();
			g.strokeStyle = 'rgba(255,255,250,0.25)'; g.lineWidth = 0.6; g.beginPath(); g.arc(cx + 0.3, cy + 0.3, cr, Math.PI * 0.1, Math.PI * 1.1); g.stroke();
		}
		[[-0.10, 0.70, 1.0], [-0.30, -0.06, 0.6]].forEach(function(t) {   // Tycho and Copernicus, bright with rays
			var tx = R + t[0] * R, ty = R + t[1] * R;
			for (var k = 0; k < 14; k++) {
				var aa = r() * Math.PI * 2, len = R * (0.25 + r() * 0.5) * t[2];
				g.strokeStyle = 'rgba(255,255,248,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(aa) * len, ty + Math.sin(aa) * len); g.stroke();
			}
			g.fillStyle = 'rgba(255,255,250,0.7)'; g.beginPath(); g.arc(tx, ty, 1.4 * t[2] + 0.8, 0, Math.PI * 2); g.fill();
		});
		var limb = g.createRadialGradient(R, R, R * 0.55, R, R, R);
		limb.addColorStop(0, 'rgba(60,55,70,0)'); limb.addColorStop(1, 'rgba(60,55,70,0.22)');
		g.fillStyle = limb; g.fillRect(0, 0, N, N);
		return c;
	}
	function paintSky() {
		var sk = night.sky, im = art(sk.art);
		if (im) { var sc = Math.max(VW / im.width, (VH - TOPV) / im.height); ctx.drawImage(im, (VW - im.width * sc) / 2, VH - im.height * sc, im.width * sc, im.height * sc); }
		else {
			var g = ctx.createLinearGradient(0, TOPV, 0, VH);
			g.addColorStop(0, sk.top); g.addColorStop(0.5, sk.mid); g.addColorStop(0.8, sk.low); g.addColorStop(1, sk.glow);
			ctx.fillStyle = g; ctx.fillRect(0, TOPV, VW, VH - TOPV);
		}
		// storms darken the sky; a sandstorm turns it the color of dust
		if (night.weather === 'storm' || night.weather === 'rain') tint('rgba(8,8,22,A)', 0.5 * wx.level);
		if (night.weather === 'sandstorm') tint('rgba(120,78,40,A)', 0.55 * wx.level);
		var clearSky = 1 - wx.cover;
		// on evening skies the sun is setting ahead of them as the night begins: it sinks behind the far hills, its
		// glow fades, and the stars come out as it goes
		var sunset = 0, day = daylight();
		if (EASTER()) {   // Easter morning: the sun coming up over the hills in the east, the stars fading
			sunset = 0.85;
			var ex = VW * 0.6, ey = 455;   // (the scene is drawn turned round at home, so this is to the left of centre: the east)
			glow(ex, ey, 520, 'rgb(255,190,120)', 0.45); glow(ex, ey, 180, 'rgb(255,230,160)', 0.6);
			ctx.save(); var eg = ctx.createRadialGradient(ex, ey - 6, 4, ex, ey, 44);
			eg.addColorStop(0, '#fffbe6'); eg.addColorStop(0.6, '#ffe09a'); eg.addColorStop(1, '#ffb257');
			ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 44, 0, Math.PI * 2); ctx.fill(); ctx.restore();
		}
		var hi = noon();
		if (day > 0) {   // the afternoon sky: blue above, warm towards the sun, fading as the sun goes down (at midday clear blue)
			var mix = function(a, b) { return a.map(function(v, i) { return Math.round(v + (b[i] - v) * hi); }).join(','); };
			var wash = ctx.createLinearGradient(0, TOPV, 0, 520);
			wash.addColorStop(0, 'rgba(' + mix([96, 140, 214], [66, 128, 214]) + ',' + ((0.75 + 0.2 * hi) * day).toFixed(3) + ')');
			wash.addColorStop(0.6, 'rgba(' + mix([214, 160, 170], [132, 182, 232]) + ',' + ((0.6 + 0.33 * hi) * day).toFixed(3) + ')');
			wash.addColorStop(1, 'rgba(' + mix([255, 184, 112], [226, 220, 196]) + ',' + ((0.75 + 0.2 * hi) * day).toFixed(3) + ')');
			ctx.fillStyle = wash; ctx.fillRect(0, TOPV, VW, VH - TOPV);
		}
		if (day > 0.005) {
			sunset = day;
			var high = night.plan.sun === 'day' ? 1 - (evening() > 0 ? 1 : smooth(nightT())) : 0;   // (by day it starts high, crossing to the west)
			var hx = VW * (homeward(night.day) ? 0.2 + 0.25 * high : 0.8 - 0.25 * high), hy = 300 + 225 * (1 - day) - 190 * high, hr = 40 + 8 * (1 - day) - 6 * high;   // high and small, sinking, larger and redder as it nears the hills
			glow(hx, hy, 460, 'rgb(255,170,90)', 0.35 * day * clearSky);
			glow(hx, hy, 160, 'rgb(255,215,140)', 0.5 * day * clearSky);
			ctx.save(); ctx.globalAlpha = clearSky;
			var hg = ctx.createRadialGradient(hx, hy - 8, 4, hx, hy, hr);
			hg.addColorStop(0, '#fffbe6'); hg.addColorStop(0.6, day > 0.6 ? '#ffe39a' : '#ffb257'); hg.addColorStop(1, day > 0.6 ? '#ffc56b' : '#ff7a3d');
			ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
			ctx.restore();
		}
		else if (/dusk/.test(night.skyKey) && !(show && show.mode === 'sofar') && !(night.plan && night.plan.sun === 'late')) {
			var wet = night.weather === 'rain' || night.weather === 'storm';
			sunset = wet ? 1 - smooth((nightT() - 0.72) / 0.28) : 1 - smooth(nightT() / 0.32);   // (on a rainy evening it sets as the rain clears, behind the rainbow)
			if (sunset > 0.01) {
				var sx = VW * (homeward(night.day) ? 0.2 : 0.8), sy = 392 + 118 * (1 - sunset), sr = 46;   // always in the west: ahead of them going, behind them coming home (the homeward scene is drawn mirrored)
				glow(sx, sy, 420, 'rgb(255,150,80)', 0.32 * sunset * clearSky);
				glow(sx, sy, 150, 'rgb(255,190,110)', 0.45 * sunset * clearSky);
				ctx.save(); ctx.globalAlpha = (0.55 + 0.45 * sunset) * clearSky;
				var sg = ctx.createRadialGradient(sx, sy - 8, 4, sx, sy, sr);
				sg.addColorStop(0, '#fff2c0'); sg.addColorStop(0.6, '#ffb257'); sg.addColorStop(1, '#ff7a3d');
				ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
				ctx.restore();
			}
		}
		var skyH = 520 - TOPV, sh = shiftOf('sky');
		paintConstellation(clearSky);
		stars.forEach(function(s) {
			var x = ((s.x - sh) % (VW + 40) + VW + 40) % (VW + 40) - 20, y = TOPV + s.y * skyH;
			var o = s.o * clearSky * (1 - 0.9 * sunset) * (s.tw && !reduceMotion ? 0.55 + 0.45 * Math.sin(clock * 6 / s.tw + s.ph) : 1);
			if (o < 0.03) return;
			ctx.globalAlpha = o; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, s.s, s.s);
		});
		ctx.globalAlpha = 1;
		var mw = moonWords(night.phase);
		if (mw && night.day !== TOTAL && clearSky > 0.05) {
			var mx = VW * night.moonX - skyDrift() * 0.5, my = TOPV + 0.2 * skyH + 80, mr = 22;   // drifting a little through the night   // clear of the date in the corner and of the Star
			var sp = starPos(); if (Math.abs(mx - sp.x) < 140) mx = sp.x - 140;   // never on top of the Star (it moves into this part of the sky as Christmas nears)
			// a full moon rises big and orange from behind the hills, and shrinks and whitens as it climbs
			var full = night.phase > 0.44 && night.phase < 0.56, rise = full ? smooth(nightT() / 0.5) : 1;
			my = 455 + (my - 455) * rise; mr = 40 + (26 - 40) * rise;
			var moonCol = full ? 'rgb(' + Math.round(242 + 2 * rise) + ',' + Math.round(163 + 77 * rise) + ',' + Math.round(92 + 128 * rise) + ')' : '#f4f0dc';
			var sunUp = Math.max(day, sunset);   // in daylight the moon is a pale ghost, brightening as the sun goes down
			var lit = (1 - Math.cos(night.phase * 2 * Math.PI)) / 2;    // how much of it is lit: near new moon it can hardly be seen
			ctx.globalAlpha = clearSky * (1 - 0.6 * sunUp);
			glow(mx, my, 90 * mr / 22, rise < 1 ? 'rgb(250,180,110)' : 'rgb(220,225,255)', (0.18 + 0.12 * (1 - rise)) * (1 - sunUp) * Math.min(1, lit * 2.5));
			// the moon is made on a little canvas of its own: its face, tinted, then the unlit part taken away (at night
			// not quite all of it, leaving the faint earthshine; by day all of it, so the sky shows there)
			if (!moonFace) moonFace = makeMoonFace();
			var mc = moonCanvas || (moonCanvas = document.createElement('canvas')), M = Math.ceil(mr * 2 * dpr * S) + 2;
			if (mc.width !== M) { mc.width = mc.height = M; }
			var g = mc.getContext('2d'), R = M / 2;
			g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, M, M);
			g.save(); g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
			g.translate(R, R); if (homeward(night.day)) g.scale(-1, 1);   // (the scene is drawn mirrored on the way home; the moon isn't)
			g.drawImage(moonFace, -R, -R, M, M); g.restore();
			g.globalCompositeOperation = 'multiply'; g.fillStyle = moonCol; g.fillRect(0, 0, M, M);
			g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.fill();
			var ph = night.phase, kk = Math.cos(ph * 2 * Math.PI), rr = R + 1;   // (the shadow a touch larger, so no rim is left round the dark part)
			g.globalCompositeOperation = 'destination-out';
			g.fillStyle = 'rgba(0,0,0,' + (0.9 + 0.1 * Math.min(1, day * 3)).toFixed(3) + ')';
			g.beginPath();
			if (ph < 0.5) { g.arc(R, R, rr, Math.PI / 2, -Math.PI / 2, false); g.ellipse(R, R, Math.abs(kk) * rr, rr, 0, -Math.PI / 2, Math.PI / 2, kk < 0); }
			else { g.arc(R, R, rr, -Math.PI / 2, Math.PI / 2, false); g.ellipse(R, R, Math.abs(kk) * rr, rr, 0, Math.PI / 2, -Math.PI / 2, kk < 0); }
			g.fill();
			if (day < 0.3) {   // at night the dark part is the night sky's colour, not see-through to the glow behind it
				g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(8,10,30,' + (0.9 * (1 - day / 0.3) * Math.min(1, lit * 4)).toFixed(3) + ')';
				g.beginPath(); g.arc(R, R, rr, 0, Math.PI * 2); g.fill();
			}
			ctx.drawImage(mc, mx - mr, my - mr, mr * 2, mr * 2);
			ctx.globalAlpha = 1;
		}
		// a comet for a week in November: a soft head with a long tail streaming away
		if (cometNight(night.day) && clearSky > 0.1) {
			var cx = VW * 0.3 - skyDrift() * 0.4, cy = TOPV + skyH * 0.28 + 40;
			ctx.save(); ctx.globalAlpha = clearSky; ctx.translate(cx, cy); ctx.rotate(-0.5);
			var tail = ctx.createLinearGradient(0, 0, 190, 0);
			tail.addColorStop(0, 'rgba(225,235,255,0.55)'); tail.addColorStop(1, 'rgba(225,235,255,0)');
			ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(100, -14, 190, -22); ctx.lineTo(190, 18); ctx.quadraticCurveTo(100, 10, 0, 2); ctx.fill();
			ctx.restore(); ctx.globalAlpha = clearSky;
			glow(cx, cy, 14, 'rgb(235,240,255)', 0.8); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1.2, cy - 1.2, 2.4, 2.4);
			ctx.globalAlpha = 1;
		}
		// shooting stars now and then; many on meteor-shower nights
		var md = HOMEMODE ? ymd(now()).slice(5) : '', shower = HOMEMODE ? /^(01-0[34]|04-2[1-3]|05-0[5-7]|08-1[1-3])$/.test(md) : night.plan.note && /meteor/.test(night.plan.note) && !weatherOverride;   // (at home: the Quadrantids, Lyrids, Eta Aquariids and Perseids)
		if (!reduceMotion && clearSky > 0.6 && sunset < 0.15 && Math.random() < (shower ? 0.025 : 0.002) * timeScale) meteors.push({x: VW * (0.3 + Math.random() * 0.7), y: TOPV + Math.random() * skyH * 0.4, t: 0});
		meteors = meteors.filter(function(m) { return m.t < 1; });
		meteors.forEach(function(m) {
			var x = m.x - m.t * 260, y = m.y + m.t * 120, a = Math.sin(m.t * Math.PI);
			var g2 = ctx.createLinearGradient(x, y, x + 90, y - 42); g2.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.strokeStyle = g2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 42); ctx.stroke();
		});
	}
	// The Star starts small, low on the right, when they set out. Night by night it grows and drifts in toward the
	// middle of the sky; on the last night it comes to rest over the stable.
	function starPos() {
		var p = clamp(cam / TOTAL, 0, 1), sx = screenX('road', pieceU(STABLE)), arrive = cam > TOTAL ? 0 : clamp(cam - (TOTAL - 1.1), 0, 1);
		var x = VW * (0.88 - 0.26 * smooth(p)), y = TOPV + (150 - TOPV) * 0.35 + 150 - 50 * smooth(p);
		sx = clamp(sx, VW * 0.3, VW * 0.82);   // stays in the sky until the stable comes into view, then settles over it
		return {x: x + (sx - x) * smooth(arrive), y: y + 30 * arrive, arrive: arrive, size: 0.42 + 0.78 * Math.pow(p, 1.3)};
	}
	function paintStar() {
		// the Star leads them; storms hide it for a while; on the last night it comes to rest over the stable
		var p = Math.max(0, Math.min(cam, TOTAL)) / TOTAL, s = starPos(), seen = (1 - wx.cover * 0.85) * clamp(1 - (cam - TOTAL) / 1.2, 0, 1) * (1 - 0.65 * daylight());   // (faint by day)
		if (seen <= 0.01) return;
		var pulse = reduceMotion ? 1 : 1 + 0.06 * Math.sin(clock * 1.3);
		glow(s.x, s.y, (60 + 160 * p) * pulse * s.size, 'rgb(255,219,89)', (0.3 + 0.4 * p) * seen);
		glow(s.x, s.y, 30 * pulse * s.size, 'rgb(255,251,232)', 0.9 * seen);
		ctx.globalAlpha = seen;
		ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.size, s.size); ctx.fillStyle = '#fffbe8'; ctx.beginPath();
		for (var i = 0; i < 16; i++) { var r = i % 2 ? 5 : (i % 4 === 0 ? 34 : 18), a = i * Math.PI / 8 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
		ctx.closePath(); ctx.fill(); ctx.restore();
		ctx.globalAlpha = 1;
	}
	function paintStarRay() {
		var s = starPos();
		if (s.arrive <= 0) return;
		var bottom = roadY(pieceU(STABLE)) - 150;
		var g = ctx.createLinearGradient(0, s.y, 0, bottom);
		g.addColorStop(0, 'rgba(255,251,232,' + 0.8 * s.arrive + ')'); g.addColorStop(1, 'rgba(255,219,89,0)');
		ctx.fillStyle = g; ctx.fillRect(s.x - 2, s.y, 4, bottom - s.y);
	}

	// ----- foreground pieces that rush past in front -----
	function anyFgArt() { return Object.keys(FG_ART).some(function(kd) { return FG_ART[kd].some(art); }); }
	// In the wind, plants and trees bend and sway from their feet: leaning downwind (the way they travel), swaying with
	// the gusts, each to its own rhythm. Rocks and walls stay put; a calm night is still.
	function plantBend(kind, i) {
		if (kind === 'boulders' || kind === 'wall' || reduceMotion) return 0;
		var wnd = night.weather === 'wind' ? 1 : night.weather === 'sandstorm' || night.weather === 'storm' ? wx.level : night.weather === 'rain' ? 0.4 * wx.level : 0;
		if (wnd <= 0.02) return 0;
		var give = kind === 'grass' || kind === 'reeds' ? 1.6 : kind === 'palm' ? 1 : 0.6;   // grass bends most, olives and acacias least
		var gust = 0.6 + 0.4 * Math.sin(clock * 0.7 + i * 0.3) * Math.sin(clock * 0.31 + i);
		var sway = Math.sin(clock * (1.6 + hash(i + 300) * 0.8) + i * 2.1) + 0.35 * Math.sin(clock * 4.3 + i);
		return wnd * give * (0.05 + 0.045 * gust * sway);
	}
	function paintForeground() {
		var seg = 1000, sh = shiftOf('fg');
		var first = Math.floor((sh - LEAD_X - 500) / seg), last = Math.floor((sh - LEAD_X + VW + 500) / seg);
		var restShift = restAt * DAYW * SPEED.fg;
		for (var i = first; i <= last; i++) {
			if (hash(i + 5000) < 0.5) continue;
			var u = i * seg + hash(i + 6000) * seg * 0.6, x = u - sh + LEAD_X;
			var restX = u - restShift + LEAD_X;
			if (restX > LEAD_X - 600 && restX < LEAD_X + 620) continue;            // keep clear where they stop, the fire and the kings round it too
			var day = (u - LEAD_X) / (DAYW * SPEED.fg);
			if (day < -PROLOGUE - 1 || day > END + 1) continue;
			if (PIECES.some(function(p) { return !p.small && day > p.pass - 0.3 && day < p.pass + 0.15; })) continue;   // keep clear while a landmark is in view
			var kinds = FG_KINDS[stageAt(day).key], withArt = kinds.filter(function(kd) { return FG_ART[kd].some(art); });
			if (withArt.length) kinds = withArt;
			else if (anyFgArt()) continue;
			var kind = kinds[Math.floor(hash(i + 7000) * kinds.length)];
			var h = 120 + hash(i + 8000) * 120, col = '#0d0919';
			var names = FG_ART[kind].filter(art), im = art(names[Math.floor(hash(i + 9000) * names.length)]);
			if (im && im.base) {
				var w = h * 1.15 * im.width / im.height, bend = plantBend(kind, i);
				if (!bend) { ctx.drawImage(im, x - w / 2, VH + 16 - im.base * h * 1.15, w, h * 1.15); continue; }
				ctx.save(); ctx.translate(x, VH + 16); ctx.transform(1, 0, -bend, 1, 0, 0);   // bending from its foot: the top moves most
				ctx.drawImage(im, -w / 2, -im.base * h * 1.15, w, h * 1.15); ctx.restore();
				continue;
			}
			var y = VH + 14;
			if (kind === 'palm') palm(x, y, h * 1.3, col, (hash(i) - 0.5) * 80);
			else if (kind === 'acacia') acacia(x, y, h, col);
			else if (kind === 'olive') olive(x, y, h, col);
			else if (kind === 'boulders') boulders(x, y, h * 0.6, col);
			else if (kind === 'wall') wall(x, y, h * 0.7, col);
			else grass(x, y, h * 0.5, col);
		}
	}

	// ----- weather in front of everything -----
	function paintNearWeather() {
		if (wx.drops.length) {
			ctx.strokeStyle = 'rgba(200,210,255,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
			var slant = 0.18 + night.wind * 0.25;
			wx.drops.forEach(function(d) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * slant, d.y - d.l); });
			ctx.stroke();
			ctx.strokeStyle = 'rgba(210,220,255,0.45)';
			wx.splashes.forEach(function(s) {
				var u = cam * DAYW + s.x - LEAD_X, y = roadY(u) + 6 + s.depth * 60;
				ctx.globalAlpha = 1 - s.t; ctx.beginPath(); ctx.ellipse(s.x, y, 2 + s.t * 7, 0.8 + s.t * 2, 0, Math.PI, 0); ctx.stroke();
			});
			ctx.globalAlpha = 1;
		}
		if (wx.dust.length) wx.dust.forEach(function(p) { ctx.globalAlpha = 0.28 * wx.level * (0.5 + p.d * 0.5); ctx.drawImage(DUST, p.x, p.y - p.s / 2, p.s * 1.6, p.s); });
		ctx.globalAlpha = 1;
		if (wx.streaks.length) {
			ctx.fillStyle = 'rgba(255,214,150,0.55)';
			wx.streaks.forEach(function(p) { ctx.fillRect(p.x, p.y, p.s * (night.weather === 'sandstorm' ? 14 : 4), p.s * 0.8); });
		}
		if (night.weather === 'sandstorm') tint('rgba(150,100,55,A)', 0.22 * wx.level);
		if (night.weather === 'fog') paintMist(VH - 20, 0.35, 1.4, 1.2);
		if (wx.flash > 0) tint('rgba(215,220,255,A)', 0.22 * wx.flash);
	}

	// ----- Pip: a little mouse who travels with the wise men every night. Find him (click or tap) for a surprise -----
	// While they walk he roams: he sits somewhere on the sand for a while (and gets left behind as the caravan moves
	// on), then trots off to a new spot near the camels: ahead, between them, or behind. Tonight's spots come from the
	// date, so a night always plays the same. When they stop he scurries off and hides in the camp, and stays there.
	var PIP_KEY = 'journey-pip-found' + (SEASON === 2026 ? '' : '-' + SEASON);   // (a fresh tally each year's journey)
	var PIP_HOME_KEY = 'journey-pip-home';
	// Something small to find in the sand at camp each evening (besides Pip): click it to pick it up
	var FIND_KEY = 'journey-finds';
	var FINDS = [['feather', 'A desert lark’s feather'], ['sandal', 'Someone’s lost sandal'], ['shell', 'A little shell, far from the sea'],
		['coin', 'An old copper coin'], ['ring', 'An old signet ring'], ['shard', 'A piece of painted pottery'], ['date', 'A fallen date']];
	var find = {got: -1};
	function findDay() { return HOMEMODE ? 1000 + YEARDAY : night.day; }
	function findKey() { return HOMEMODE ? 'home-' + ymd(now()) : String(night.day); }   // (one find a day at home)
	function findsMade() { try { return JSON.parse(localStorage.getItem(FIND_KEY) || '[]'); } catch (e) { return []; } }
	function findSpot() {   // tonight's: a place on the sand, clear of the fire and the caravan
		var fd = findDay(), r = rng(fd * 131 + 7), x = [VW * 0.08, VW * 0.42, VW * 0.62, VW * 0.95][Math.floor(r() * 4)] + (r() - 0.5) * 60;
		var base = cam * DAYW - LEAD_X;
		return {x: x, y: groundY(base + x) + 8 + r() * 10, kind: FINDS[fd % FINDS.length]};
	}
	function paintFind() {
		var e = evening(); if (e < 4 || pip.card) return;
		var f = findSpot(), key = findKey(), have = findsMade().indexOf(key) >= 0, since = clock - find.at;
		if (find.got === findDay() && since < 3.5) {   // just picked up: it rises and fades, with its name and the tally
			var up = smooth(since / 0.8);
			ctx.save(); ctx.globalAlpha = 1 - smooth((since - 2.5) / 1);
			drawFind(f.kind[0], f.x, f.y - 30 * up, 1.8 + 0.8 * up);
			ctx.font = 'italic 15px Merienda, Georgia, serif';
			var half = ctx.measureText(f.kind[1] + '!').width / 2 + 12;   // kept on screen, however near the edge it was found
			ctx.translate(clamp(f.x, half, VW - half), f.y - 52); if (homeward(night.day)) ctx.scale(-1, 1);
			ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
			ctx.fillText(f.kind[1] + '!', 0, 0);
			ctx.font = '11px Inter, Arial, sans-serif'; ctx.fillStyle = '#FFDB59'; var nf = findsMade().length; ctx.fillText(nf + (nf === 1 ? ' thing' : ' things') + ' found along the way', 0, 16);
			ctx.restore(); return;
		}
		if (have) return;
		ctx.save(); ctx.globalAlpha = smooth((e - 4) / 1.5);
		var bk = beckon(night.day, 3.5), hop = reduceMotion ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(1, bk * 2))) * 3 * (bk > 0 ? 1 : 0);
		glow(f.x, f.y - 3, 16, 'rgb(255,240,200)', 0.3 + 0.2 * Math.sin(clock * 2.2));
		drawFind(f.kind[0], f.x, f.y - hop, 2.2);
		sparkle(f.x + 9, f.y - 12 - hop, 6, bk);   // every few seconds it glints and gives a tiny hop: tap me
		ctx.restore();
	}
	function drawFind(kind, x, y, s) {
		ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
		ctx.fillStyle = 'rgba(70,35,10,0.45)'; ctx.beginPath(); ctx.ellipse(0.5, 0.4, 6.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();   // its shadow in the sand, so it stands out
		if (kind === 'feather') { ctx.fillStyle = '#ece4d4'; ctx.beginPath(); ctx.ellipse(0, -2, 7, 2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a7a66'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(7, -4); ctx.stroke(); }
		else if (kind === 'sandal') { ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.ellipse(0, -1.5, 7, 2.6, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(2, -4.5); ctx.stroke(); }
		else if (kind === 'shell') { ctx.fillStyle = '#f2d6c4'; ctx.beginPath(); ctx.arc(0, -2, 4, Math.PI, 0); ctx.lineTo(0, 0); ctx.fill(); ctx.strokeStyle = '#c99a86'; ctx.lineWidth = 0.6; for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 1.8, -5.5); ctx.stroke(); } }
		else if (kind === 'coin') { ctx.fillStyle = '#4a2a12'; ctx.beginPath(); ctx.ellipse(0, -1.5, 4.8, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b8743a'; ctx.beginPath(); ctx.ellipse(0, -1.5, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e4a56a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, -1.5, 2.6, 1.4, 0, 0, Math.PI * 2); ctx.stroke(); }
		else if (kind === 'ring') {   // a bronze signet ring standing on its edge, half in the sand, so you see its hole
			ctx.lineWidth = 2.8; ctx.strokeStyle = '#3a2410'; ctx.beginPath(); ctx.ellipse(0, -4.2, 3.6, 4.2, 0, 0, Math.PI * 2); ctx.stroke();   // dark edge
			ctx.lineWidth = 1.6; ctx.strokeStyle = '#c98f35'; ctx.beginPath(); ctx.ellipse(0, -4.2, 3.6, 4.2, 0, 0, Math.PI * 2); ctx.stroke();   // the band
			ctx.strokeStyle = '#f2cf7a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(0, -4.2, 3.6, 4.2, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();   // its lit side
			ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.ellipse(0, -8.8, 2.9, 1.7, 0, 0, Math.PI * 2); ctx.fill();   // the seal on top
			ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.ellipse(0, -9, 2.2, 1.15, 0, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = 'rgba(255,248,220,0.95)'; ctx.beginPath(); ctx.arc(-0.8, -9.3, 0.5, 0, Math.PI * 2); ctx.fill();   // a glint
			ctx.fillStyle = '#e6bf78'; ctx.beginPath(); ctx.ellipse(0, 0.2, 5.2, 1.3, 0, Math.PI, 0); ctx.fill();   // sand drifted over its foot
		}
		else if (kind === 'shard') { ctx.fillStyle = '#b5603a'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-3, -4); ctx.lineTo(4, -3); ctx.lineTo(5, 0); ctx.fill(); ctx.strokeStyle = '#2e4d7a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(3, -1.6); ctx.stroke(); }
		else { ctx.fillStyle = '#7a3a1c'; ctx.beginPath(); ctx.ellipse(0, -2, 3.4, 2, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,200,150,0.5)'; ctx.beginPath(); ctx.ellipse(-1, -2.8, 1.2, 0.6, 0.4, 0, Math.PI * 2); ctx.fill(); }
		ctx.restore();
	}
	function pickUp(p) {
		if (evening() < 4 || pip.card) return false;
		var f = findSpot(), key = findKey(), made = findsMade();
		if (made.indexOf(key) >= 0 || Math.hypot(p.x - f.x, p.y - (f.y - 3)) > 24) return false;
		made.push(key); try { localStorage.setItem(FIND_KEY, JSON.stringify(made)); } catch (err) {}
		find = {got: findDay(), at: clock}; track('find', {item: f.kind[0], total: made.length});
		return true;
	}
	var pip = {box: null, near: false, hop: -1, hopT: 0, u: null, state: 'trot', target: 0, until: 0, rng: null, last: 0, dir: 1, card: false};
	function pipFound() { try { return JSON.parse(localStorage.getItem(PIP_KEY) || '[]'); } catch (e) { return []; } }
	var PIP_SPOTS = [130, -110, -330, 250, -470, 60];          // around the caravan, from the lead camel (scene units)
	function pipReset() {
		pip.rng = rng(night.day * 977 + 31); pip.u = null; pip.sx = null; pip.state = 'trot'; pip.until = 0; pip.hop = -1; pip.last = clock;
	}
	function pipStep(dt) {
		var base = cam * DAYW - LEAD_X;                          // world position of the screen's left edge
		if (pip.u == null) { pip.u = base + Math.max(40, LEAD_X - CHAR_BACK[2] - 160); pip.target = pip.u; pip.state = 'sit'; pip.until = clock + 3 + pip.rng() * 3; }
		var e = evening();
		if (e > 0.6) {
			if (!pip.eve) { pip.eve = true; pip.state = 'sit'; pip.called = false; pip.until = clock + 0.8; }   // (his walking target was a place on the road; in the evening they're places on the screen)
			pipEvening(dt, base); return;
		}
		pip.eve = false;
		var sx = pip.u - base;
		if (show && show.mode === 'sofar' && e === 0) {
			// the time-lapse races along far faster than a mouse can run, so he keeps up with the caravan instead
			// (his place is kept on screen, not on the ground): darting from spot to spot around the camels at
			// super speed, with short pauses
			if (pip.sx == null) pip.sx = clamp(sx, 24, VW - 24);
			sx = pip.sx;
			if (pip.state === 'sit') {
				if (clock > pip.until) { pip.target = LEAD_X + PIP_SPOTS[Math.floor(pip.rng() * PIP_SPOTS.length)]; pip.state = 'trot'; }
			} else {
				var dd = Math.sign(pip.target - sx), st = 520 * dt;
				pip.dir = 1;   // always facing the way they travel (dropping back just means he's slower than the camels)
				if (Math.abs(pip.target - sx) <= st) { sx = pip.target; pip.state = 'sit'; pip.until = clock + 1.2 + pip.rng() * 1.8; }
				else sx += dd * st;
			}
			pip.sx = clamp(sx, 24, VW - 24);
			pip.u = base + pip.sx;
			return;
		}
		pip.sx = null;
		if (pip.state === 'sit') {
			// he sits a while; if the caravan has left him far behind, he sets off sooner
			if (clock > pip.until || sx < 30 || sx > VW - 30) {
				var off = PIP_SPOTS[Math.floor(pip.rng() * PIP_SPOTS.length)];
				pip.target = clamp(cam * DAYW + off + (walk > 0.5 ? 60 : 0), base + 40, base + VW - 40);    // a little ahead of where that spot is now, as they're moving (and on screen)
				pip.state = 'trot';
			}
		} else {
			var tgt = pip.target, d2 = Math.sign(tgt - pip.u), step = 150 * dt;
			pip.dir = d2 || pip.dir;
			if (Math.abs(tgt - pip.u) <= step || (d2 > 0 ? pip.u >= base + VW - 25 : pip.u <= base + 25)) { pip.u = clamp(tgt, base + 24, base + VW - 24); pip.state = 'sit'; pip.until = clock + 5 + pip.rng() * 5; }   // (or he's reached the edge of the screen)
			else pip.u += d2 * step;
		}
		pip.u = clamp(pip.u, base + 24, base + VW - 24);             // always on screen
	}
	// In the evening Pip explores the camp: he trots to a spot, stops and looks about (turning now and then, sometimes
	// a hop or two), then off somewhere else. When his way crosses the fire he goes round it on the near side (lower on
	// the sand, so in front of it). Click or tap the sand and he runs over to that spot (with a happy hop when he gets
	// there); bring the pointer near and he turns to look at it and bounces.
	function pipRound(x) {   // how far in front of the fire he goes as he passes it
		if (eveningKind() !== 'fire' || fireNow <= 0) return 0;
		var d = (x - fireX()) / 95;
		return Math.abs(d) < 1 ? 26 * Math.cos(d * Math.PI / 2) : 0;
	}
	function pipEvening(dt, base) {
		var sx = pip.u - base;
		if (pip.state === 'sit') {
			if (pip.near) { pip.until = Math.max(pip.until, clock + 1); return; }   // he stays to watch the pointer
			if (pip.rng() < dt * 0.35) pip.face = -(pip.face || 1);               // looking about
			if (pip.rng() < dt * 0.25 && !(pip.skip > clock)) pip.skip = clock + 0.9; // a little hop or two
			if (clock > pip.until) { pip.target = 40 + pip.rng() * (VW - 80); pip.state = 'trot'; pip.called = false; }
		} else {
			var d = Math.sign(pip.target - sx), step = (pip.called ? 190 : 110) * dt;
			pip.dir = d || pip.dir;
			if (Math.abs(pip.target - sx) <= step) {
				sx = pip.target; pip.state = 'sit'; pip.face = pip.dir; pip.until = clock + 1.5 + pip.rng() * 3;
				if (pip.called) { pip.skip = clock + 1.2; pip.called = false; }
			} else sx += d * step;
		}
		pip.u = base + clamp(sx, 24, VW - 24);
	}
	function pipCall(evt) {   // a click or tap on the sand in the evening: Pip comes running to that spot
		if (evening() <= 2.9 || pip.card || pip.u == null) return false;
		var p = sceneXY(evt), base = cam * DAYW - LEAD_X;
		if (p.y < groundY(base + p.x) - 70) return false;                        // (only on the ground, not the sky)
		pip.target = clamp(p.x, 30, VW - 30); pip.state = 'trot'; pip.called = true;
		return true;
	}
	// Pip is drawn from the sand mouse, warmed a little: darker than the sand, so he's easier to spot. He moves in
	// little springy hops (squashing as he lands) with a soft shadow on the sand that shrinks as he jumps; when found
	// he gives a big hop, then keeps bouncing happily while his card is open.
	var PIP_LOOK = 'sepia(0.6) saturate(1.6) brightness(1.15)', PIP_WAVE_LOOK = 'sepia(0.35) saturate(1.1) brightness(0.72) hue-rotate(-12deg)';
	function paintPip() {
		if (!charsReady()) { pip.box = null; return; }
		if (pip.rng == null) pipReset();
		var dt = Math.min(0.1, clock - pip.last); pip.last = clock;
		if (playing || evening() > 0) pipStep(dt);
		var x = pip.u - (cam * DAYW - LEAD_X), y = groundY(pip.u) + 6 + pipRound(pip.u - (cam * DAYW - LEAD_X));
		var moving = pip.state === 'trot', hop = 0, squash = 0;
		if (moving) { var ph = (clock * (show && show.mode === 'sofar' ? 6 : 3.2)) % 1; hop = Math.sin(ph * Math.PI) * 7; squash = ph < 0.12 ? (1 - ph / 0.12) * 0.18 : 0; }
		if (pip.hop >= 0) { pip.hopT += dt; var q = Math.min(1, pip.hopT / 0.7); hop = Math.sin(q * Math.PI) * 30; if (q > 0.92) squash = 0.2; if (pip.hopT > 0.75) pip.hop = -1; }
		else if (pip.card) hop = Math.abs(Math.sin(clock * 4.5)) * 9;                // happy bounces while his card is open
		else if (pip.near && !moving) hop = 3 + Math.abs(Math.sin(clock * 6)) * 2;   // a little excited bounce when a pointer comes near
		else if (pip.skip > clock && !moving) { var sk = (clock * 2.6) % 1; hop = Math.sin(sk * Math.PI) * 9; squash = sk < 0.1 ? 0.15 : 0; }   // hopping in place
		var waving = false;   // (always the original Pip)
		var im = waving ? art('jr-pip-wave') : art('jr-cr-sand-mouse');
		if (!im) return;
		var lapse = show && show.mode === 'sofar' && evening() === 0;
		var h = waving ? 26 : 20, w = h * im.width / im.height, dir = lapse ? 1 : moving ? pip.dir : pip.near && pip.lookX != null ? (pip.lookX < x ? -1 : 1) : pip.face || (hash(night.day) < 0.5 ? 1 : -1);
		// his shadow, smaller and fainter the higher he is
		var sh = 1 - Math.min(1, hop / 34);
		ctx.fillStyle = 'rgba(70,35,10,' + (0.28 * sh).toFixed(3) + ')';
		ctx.beginPath(); ctx.ellipse(x, y + 1, 10 * (0.55 + 0.45 * sh), 2.6 * (0.55 + 0.45 * sh), 0, 0, Math.PI * 2); ctx.fill();
		ctx.save();
		ctx.translate(x, y - hop); ctx.scale(dir * (1 + squash * 0.6), 1 - squash);
		ctx.filter = waving ? PIP_WAVE_LOOK : PIP_LOOK;
		ctx.drawImage(im, -w / 2, -h * (im.base || 1), w, h);
		ctx.filter = 'none';
		ctx.restore();
		pip.box = {x: x, y: y - h / 2 - hop};
	}
	function sceneXY(evt) {
		var rect = canvas.getBoundingClientRect(), cx = (evt.clientX - rect.left) / S, cy = (evt.clientY - rect.top - (rect.height - VH * S)) / S;
		if (homeward(night.day)) cx = VW - cx;
		return {x: cx, y: cy};
	}
	function nearPip(evt, reach) { if (!pip.box) return false; var p = sceneXY(evt); return Math.hypot(p.x - pip.box.x, p.y - pip.box.y) < reach; }
	var pipCard = document.getElementById('pip-card');
	function findPip() {
		track('pip_found');
		pip.hop = 0; pip.hopT = 0;
		if (HOMEMODE) {   // at home: a card for each week of the year, and how many days Pip has been found at home
			var hk = ymd(now()), home = []; try { home = JSON.parse(localStorage.getItem(PIP_HOME_KEY) || '[]'); } catch (e) {}
			if (home.indexOf(hk) < 0) { home.push(hk); try { localStorage.setItem(PIP_HOME_KEY, JSON.stringify(home)); } catch (e) {} }
			var cards = window.PIP_HOME_CARDS || [''];
			pipCard.querySelector('p').textContent = EASTER() ? 'Happy Easter! Early on the first day of the week, the women found the stone rolled away. “He is not here: for he is risen” (Matthew 28:6).' : cards[Math.floor(YEARDAY / 7) % cards.length];
			pipCard.querySelector('.pip-count').textContent = 'You’ve found Pip on ' + home.length + (home.length === 1 ? ' day' : ' days') + ' at home. A new card every week!';
		} else {
		var key = String(dateOfDay(viewIdx).getMonth() + 1).padStart(2, '0') + '-' + String(dateOfDay(viewIdx).getDate()).padStart(2, '0');
		var found = pipFound(); if (found.indexOf(key) < 0) { found.push(key); try { localStorage.setItem(PIP_KEY, JSON.stringify(found)); } catch (e) {} mapPaws(); }
		pipCard.querySelector('p').textContent = (window.PIP_CARDS || {})[key] || '';
		pipCard.querySelector('.pip-count').textContent = 'You’ve found Pip on ' + found.length + (found.length === 1 ? ' night' : ' nights') + ' of ' + (END + 1) + '.';
		}
		pip.wasPlaying = playing; playing = false; pip.card = true; updateControls();   // the scene waits while the card is open
		pipCard.hidden = false; verseEl.style.visibility = 'hidden'; pipCard.querySelector('button').focus();
	}
	canvas.addEventListener('click', function(evt) { if (nearPip(evt, evt.pointerType === 'touch' ? 40 : 26)) findPip(); else if (pickUp(sceneXY(evt)) || talkToKing(sceneXY(evt)) || pokeCamel(sceneXY(evt)) || traceAt(sceneXY(evt))) return; else if (evt.pointerType !== 'touch') pipCall(evt); });
	canvas.addEventListener('pointerdown', function(evt) { if (evt.pointerType === 'touch') { if (nearPip(evt, 40)) { evt.preventDefault(); findPip(); } else if (!pickUp(sceneXY(evt)) && !talkToKing(sceneXY(evt)) && !pokeCamel(sceneXY(evt)) && !traceAt(sceneXY(evt))) pipCall(evt); } });
	canvas.addEventListener('mousemove', function(evt) { pip.near = nearPip(evt, 70); pip.lookX = sceneXY(evt).x; var k = constellation(), sp = sceneXY(evt); canvas.style.cursor = nearPip(evt, 26) || kingBoxes.some(function(b) { return sp.x > b.x0 && sp.x < b.x1 && sp.y > b.y0 && sp.y < b.y1; }) || camelBoxes.some(function(b) { return sp.x > b.x0 && sp.x < b.x1 && sp.y > b.y0 && sp.y < b.y1; }) || (k && daylight() < 0.2 && k.pts.some(function(q) { return Math.hypot(q[0] - sp.x, q[1] - sp.y) < 40; })) ? 'pointer' : ''; });
	canvas.addEventListener('mouseleave', function() { pip.near = false; });
	document.getElementById('pip-close').addEventListener('click', function() {
		pipCard.hidden = true; verseEl.style.visibility = ''; pip.card = false;
		if (pip.wasPlaying) { pip.wasPlaying = false; playing = true; updateControls(); }
	});
	document.getElementById('pip-key').addEventListener('click', findPip);   // for keyboard users

	// ----- the journey map in the header: one road with picture milestones, evenly spaced by stage of the story,
	// a little camel walking along it (turning round after Christmas), and the Star over Bethlehem growing brighter
	var SVGNS = 'http://www.w3.org/2000/svg';
	var mapRoad = document.getElementById('map-road'), mapDone = document.getElementById('map-done'), mapCamel = document.getElementById('map-camel'), mapText = document.getElementById('map-text');
	var MILES = [   // [day, icon, name]
		[-PROLOGUE, 'palace', 'Home'], [dayOf('10-04'), 'river', 'The river'], [dayOf('11-01'), 'palm', 'The oasis'],
		[dayOf('11-27'), 'hills', 'The pass'], [dayOf('12-21'), 'walls', 'Jerusalem'], [TOTAL, 'star', 'Bethlehem']];
	var ICONS = {   // little line drawings, about 14 units tall, sitting on (0, 0)
		palace: 'M-7 0 V-6 H7 V0 M-4 -6 V-9 A4 4 0 0 1 4 -9 V-6 M0 -13 V-15',
		river: 'M-8 -3 Q-4 -6 0 -3 T8 -3 M-8 -8 Q-4 -11 0 -8 T8 -8',
		palm: 'M0 0 Q1 -6 0 -11 M0 -11 Q-5 -13 -8 -9 M0 -11 Q5 -13 8 -9 M0 -11 Q-3 -15 -6 -15 M0 -11 Q3 -15 6 -15',
		hills: 'M-9 0 L-4 -9 L-1 -4 L3 -12 L9 0',
		walls: 'M-8 0 V-8 H-6 V-10 H-4 V-8 H-1 V-10 H1 V-8 H4 V-10 H6 V-8 H8 V0 M-2 0 V-4 A2 2 0 0 1 2 -4 V0'
	};
	function mapX(day) {   // evenly spaced milestones; the days in between share the road between them
		var L = mapRoad.getTotalLength(), n = MILES.length - 1;
		if (day > TOTAL) return L * (1 - clamp((day - TOTAL) / (END - TOTAL), 0, 1));   // the way home: back along the road
		for (var i = 0; i < n; i++) {
			if (day <= MILES[i + 1][0]) return L * (i + clamp((day - MILES[i][0]) / (MILES[i + 1][0] - MILES[i][0]), 0, 1)) / n;
		}
		return L;
	}
	function mapSetup() {
		if (!mapRoad) return;
		// the marker: a camel and rider from the Follow the Star logo, shrunk to fit the road
		var cm = window.JOURNEY_CAMELS && JOURNEY_CAMELS.c2;
		if (cm) {
			var H = 22, sc = H / cm.h, inner = document.createElementNS(SVGNS, 'g');
			inner.setAttribute('transform', 'scale(' + sc.toFixed(4) + ') translate(' + (-cm.w / 2) + ',' + (-cm.h) + ') translate(0,' + cm.h + ') scale(0.1,-0.1)');
			[cm.body].concat(cm.legs.map(function(l) { return l.d; })).forEach(function(d) { var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); inner.appendChild(p); });
			mapCamel.innerHTML = ''; mapCamel.appendChild(inner);
		}
		var g = document.getElementById('map-icons');
		MILES.forEach(function(m) {
			var p = mapRoad.getPointAtLength(mapX(m[0]));
			if (m[1] === 'star') {
				var glow = document.createElementNS(SVGNS, 'circle'); glow.setAttribute('id', 'map-star-glow'); glow.setAttribute('cx', p.x); glow.setAttribute('cy', p.y - 9); glow.setAttribute('r', 8); glow.setAttribute('fill', 'rgba(255,219,89,0.25)'); g.appendChild(glow);
				var st = document.createElementNS(SVGNS, 'path'); st.setAttribute('class', 'star');
				st.setAttribute('d', 'M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z'); st.setAttribute('transform', 'translate(' + p.x + ',' + (p.y - 9) + ')');
				g.appendChild(st);
			} else {
				var ic = document.createElementNS(SVGNS, 'path'); ic.setAttribute('class', 'ico'); ic.setAttribute('d', ICONS[m[1]]);
				ic.setAttribute('transform', 'translate(' + p.x + ',' + (p.y - 4) + ')'); ic.dataset.day = m[0];
				var t = document.createElementNS(SVGNS, 'title'); t.textContent = m[2]; ic.appendChild(t);
				g.appendChild(ic);
			}
		});
		mapPaws();
	}
	function mapPaws() {   // the nights Pip has been found: tiny paw dots under the road
		var g = document.getElementById('map-paws'); if (!g || !mapRoad) return;
		g.innerHTML = '';
		pipFound().forEach(function(key) {
			var p = mapRoad.getPointAtLength(mapX(dayOf(key) + 0.4)), c = document.createElementNS(SVGNS, 'circle');
			c.setAttribute('cx', p.x); c.setAttribute('cy', p.y + 6); c.setAttribute('r', 1.4); g.appendChild(c);
		});
	}
	var mapLast = -99;
	function mapDayAt(clientX, clientY, anyY) {   // the night nearest a point on the map's road (anyY: while a finger slides, ignore drift off the road)
		var svgEl = mapRoad.ownerSVGElement, pt = svgEl.createSVGPoint(); pt.x = clientX; pt.y = clientY;
		var p = pt.matrixTransform(svgEl.getScreenCTM().inverse()), best = 0, bd = 1e9;
		for (var k = 0; k <= TOTAL; k++) { var q = mapRoad.getPointAtLength(mapX(k + 0.5)), d = Math.abs(q.x - p.x) + (anyY ? 0 : Math.abs(q.y - p.y) * 0.5); if (d < bd) { bd = d; best = k; } }
		return anyY || bd < 30 ? best : -1;
	}
	if (mapRoad) {
		var mapEl2 = document.getElementById('map'), mapTip = document.getElementById('map-tip'), mapTouch = null, mapTouchEnd = 0;
		var shortDate = function(k) { return dateOfDay(k).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}); };
		var notYet = function(k) { mapTip.textContent = 'Not yet · come back on ' + dateOfDay(k).toLocaleDateString('en-US', {month: 'long', day: 'numeric'}); mapTip.hidden = false; };
		var tipAt = function(x, k, finger) {   // under a finger the tip sits to one side, toward the middle, so the finger doesn't cover it
			var r = mapEl2.getBoundingClientRect(), left = x - r.left;
			if (finger) left += left > r.width / 2 ? -64 : 64;
			mapTip.textContent = shortDate(k) + (k <= lastOpen ? '' : ' · not yet');
			mapTip.style.left = left + 'px'; mapTip.hidden = false;
		};
		mapEl2.addEventListener('mousemove', function(e) {
			var k = mapDayAt(e.clientX, e.clientY), open = k >= 0 && k <= lastOpen;
			mapEl2.style.cursor = open ? 'pointer' : '';
			if (k >= 0) tipAt(e.clientX, k); else mapTip.hidden = true;
		});
		mapEl2.addEventListener('mouseleave', function() { mapTip.hidden = true; });
		mapEl2.addEventListener('click', function(e) {
			if (Date.now() - mapTouchEnd < 800) return;   // a finger already handled it
			var k = mapDayAt(e.clientX, e.clientY);
			if (k < 0) return;
			if (k > lastOpen) { notYet(k); return; }
			track('map_jump', {to: k + 1}); playNight(k, 0.3);
		});
		// Phones and tablets: press on the road, slide to pick a night (the date shows beside your finger), let go to go there.
		mapEl2.addEventListener('pointerdown', function(e) {
			if (e.pointerType === 'mouse') return;
			var k = mapDayAt(e.clientX, e.clientY);
			if (k < 0) return;
			e.preventDefault(); mapTouch = {id: e.pointerId, k: k};
			try { mapEl2.setPointerCapture(e.pointerId); } catch (err) {}
			tipAt(e.clientX, k, true);
		});
		mapEl2.addEventListener('pointermove', function(e) {
			if (!mapTouch || e.pointerId !== mapTouch.id) return;
			e.preventDefault(); mapTouch.k = mapDayAt(e.clientX, e.clientY, true);
			tipAt(e.clientX, mapTouch.k, true);
		});
		var mapLift = function(e, go) {
			if (!mapTouch || e.pointerId !== mapTouch.id) return;
			var k = Math.min(mapTouch.k, lastOpen), want = mapTouch.k;
			mapTouch = null; mapTouchEnd = Date.now();
			if (!go) { mapTip.hidden = true; return; }
			if (want > lastOpen) { notYet(want); setTimeout(function() { mapTip.hidden = true; }, 2500); return; }
			mapTip.hidden = true; track('map_jump', {to: k + 1}); playNight(k, 0.3);
		};
		mapEl2.addEventListener('pointerup', function(e) { mapLift(e, true); });
		mapEl2.addEventListener('pointercancel', function(e) { mapLift(e, false); });
	}
	function mapUpdate() {
		if (!mapRoad || Math.abs(cam - mapLast) < 0.002) return;
		mapLast = cam;
		var L = mapRoad.getTotalLength(), at = mapX(cam), home = cam > TOTAL;
		var done = home ? L : at, pts = [];
		for (var t = 0; t <= done; t += 4) { var q = mapRoad.getPointAtLength(t); pts.push(q.x.toFixed(1) + ' ' + q.y.toFixed(1)); }
		mapDone.setAttribute('d', pts.length > 1 ? 'M' + pts.join(' L') : '');
		var p = mapRoad.getPointAtLength(at), a = mapRoad.getPointAtLength(Math.min(L, at + 2)), b = mapRoad.getPointAtLength(Math.max(0, at - 2));
		var ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
		mapCamel.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + (p.y - 1).toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + (home ? -1 : 1) + ',1)');
		document.querySelectorAll('#map-icons .ico').forEach(function(ic) { ic.classList.toggle('done', cam >= +ic.dataset.day - 0.05); });
		var sg = document.getElementById('map-star-glow');   // the Star brightens as Christmas nears
		if (sg) { var pr = clamp((cam + PROLOGUE) / (TOTAL + PROLOGUE), 0, 1); sg.setAttribute('r', (6 + 8 * pr).toFixed(1)); sg.setAttribute('fill', 'rgba(255,219,89,' + (0.15 + 0.35 * pr).toFixed(2) + ')'); }
		var k = show && show.mode === 'sofar' ? clamp(Math.floor(cam + 0.15), 0, realToday) : viewIdx, left = TOTAL - k, d = dateOfDay(k);
		var where = left > 1 ? '<b>' + left + ' nights</b> to Bethlehem' : left === 1 ? '<b>1 night</b> to Bethlehem' : left === 0 ? '<b>Bethlehem</b>' : (END - k > 0 ? '<b>' + (END - k) + (END - k === 1 ? ' night' : ' nights') + '</b> to home' : '<b>Home again</b>');
		if (HOMEMODE) { var tg = Math.ceil((new Date(SEASON + 1, 9, 1) - startOfDay(now())) / DAY); mapText.innerHTML = longDate(now()) + ' · Home in the East · <b>' + tg + ' days</b> until the Star rises'; }
		else mapText.innerHTML = d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'}) + ' · Day ' + (k + 1) + ' of ' + (END + 1) + ' · ' + where;
	}

	// ----- weather scenery -----
	// a pale rainbow as a storm or rain clears, and lingering at the start of the next night
	function paintRainbow() {
		var t = nightT(), w = night.weather, a = 0;
		if (!litSky(night.day)) return;                                  // only while there's daylight left in the sky, never at night
		if (w === 'storm' || w === 'rain') a = smooth((t - 0.76) / 0.12);
		else if (w === 'clouds') a = 1 - smooth((t - 0.15) / 0.25);   // (a clear sky after rain has no shower left to make one)
		a *= 1 - smooth(evening() / 4);                                  // and it fades as night falls over the camp
		if (a <= 0.01) return;
		var cx = VW * (homeward(night.day) ? 0.7 : 0.3), cy = 700, R = Math.min(560, VW * 0.42);   // opposite the setting sun, as a real rainbow is
		var cols = ['255,90,90', '255,170,80', '255,235,110', '120,220,120', '110,170,255', '150,120,255', '200,130,255'];
		ctx.save(); ctx.lineWidth = 6; ctx.globalAlpha = 0.16 * a;
		cols.forEach(function(c, i) { ctx.strokeStyle = 'rgb(' + c + ')'; ctx.beginPath(); ctx.arc(cx, cy, R - i * 6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
		ctx.restore();
	}
	// before a sandstorm, a tall brown wall of dust rolls in over the far hills
	function paintDustWall() {
		if (night.weather !== 'sandstorm') return;
		var t = nightT(), grow = smooth(t / 0.24) * (1 - smooth((t - 0.32) / 0.12));
		if (grow <= 0.01) return;
		var base = 480, hgt = 300 * grow, sh = shiftOf('far');
		var g = ctx.createLinearGradient(0, base - hgt, 0, base);
		g.addColorStop(0, 'rgba(150,100,60,0)'); g.addColorStop(0.25, 'rgba(150,100,60,' + (0.55 * grow).toFixed(2) + ')'); g.addColorStop(1, 'rgba(130,85,50,' + (0.85 * grow).toFixed(2) + ')');
		ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-20, base);
		for (var x = -20; x <= VW + 20; x += 20) ctx.lineTo(x, base - hgt * (0.82 + 0.18 * Math.sin((x + sh) / 90 + clock * 0.6)) );
		ctx.lineTo(VW + 20, base); ctx.closePath(); ctx.fill();
	}
	// snow on the tops of the far mountains in winter. It is measured on the mountains themselves (every few units
	// along the ridge, not across the screen), so it travels with them as they scroll instead of rippling; and only a
	// peak that stands well above its own valleys gets a cap, deeper the higher it rises.
	var SNOWY_FAR = ['jr-far-mountains', 'jr-far-mountains-2', 'jr-far-rocky-peaks'];   // the far hills with real peaks (Judea's are low and rounded)
	function paintSnowCaps() {
		if (!snowSeason(night.day)) return;
		var sh = shiftOf('far'), STEP = 4, REACH = 40, u0 = Math.floor((-20 - LEAD_X + sh) / STEP) * STEP - REACH * STEP;
		var n = Math.ceil((VW + 40) / STEP) + REACH * 2, ys = [];
		for (var i = 0; i <= n; i++) ys.push(layerY('far', u0 + i * STEP));
		var snowy = SNOWY_FAR.map(art).filter(Boolean), LW = LAYER.far.w;
		var caps = [];   // [x, top, depth] along the ridge
		for (var j = REACH; j <= n - REACH; j++) {
			var low = -1e9;
			for (var m = j - REACH; m <= j + REACH; m++) low = Math.max(low, ys[m]);   // the valley floor near this point (screen y grows down)
			var u = u0 + j * STEP, rise = low - ys[j] - 30, depth = rise > 0 ? Math.min(44, rise * 0.45) : 0;
			if (depth > 0 && hasLayerArt('far') && snowy.indexOf(tileInfo('far', Math.floor(u / LW)).im) < 0) depth = 0;   // flat-topped mesas and plains stay bare
			if (depth > 0) depth += Math.sin(u * 0.21) * Math.min(3, depth * 0.3);
			caps.push([u - sh + LEAD_X, ys[j], depth]);
		}
		ctx.save(); ctx.fillStyle = 'rgba(232,238,252,0.8)';
		for (var k = 0; k < caps.length; k++) {   // one shape for each run of snowy ridge
			if (caps[k][2] <= 0.5) continue;
			var e = k, most = 0; while (e + 1 < caps.length && caps[e + 1][2] > 0.5) e++;
			for (var z = k; z <= e; z++) most = Math.max(most, caps[z][2]);
			if (most < 6) { k = e; continue; }   // too shallow to read as snow: it would only be a thin white line
			ctx.beginPath(); ctx.moveTo(caps[k][0], caps[k][1]);
			for (var q = k + 1; q <= e; q++) ctx.lineTo(caps[q][0], caps[q][1]);
			for (q = e; q >= k; q--) ctx.lineTo(caps[q][0], caps[q][1] + caps[q][2]);
			ctx.closePath(); ctx.fill();
			k = e;
		}
		ctx.restore();
	}
	// A mirage in the midday heat: a shimmering pool of sky lying in the low ground ahead, across the feet of the far
	// hills. It's always ahead of them: each one fades away as they come closer, and another shows further on.
	function paintMirage() {
		var m = noon() * (night.weather === 'clear' || night.weather === 'haze' || night.weather === 'wind' ? 1 : 0);
		if (m <= 0.02) return;
		var sh = shiftOf('mid'), seg = 700, first = Math.floor((sh - 600) / seg), last = Math.floor((sh + VW + 600) / seg);
		for (var i = first; i <= last; i++) {   // (one every so often along the way, so there's nearly always one ahead)
			var u = i * seg + hash(i + 3200) * seg * 0.3, w = 260 + hash(i + 3300) * 260, x = u - sh;   // (a place on the middle hills, as they scroll)
			if (x + w / 2 < 0 || x - w / 2 > VW) continue;
			var a = m * smooth((x - VW * 0.2) / (VW * 0.45));   // fading as they draw near
			if (a <= 0.01) continue;
			var y = layerY('mid', x - LEAD_X + sh) + 10;   // lying on the flats just beyond the near hills' crest
			ctx.save(); ctx.globalAlpha = a;
			var g = ctx.createLinearGradient(0, y - 16, 0, y + 6);
			g.addColorStop(0, 'rgba(150,190,240,0)'); g.addColorStop(0.45, 'rgba(150,190,240,0.55)'); g.addColorStop(0.7, 'rgba(180,212,248,0.6)'); g.addColorStop(1, 'rgba(150,190,240,0)');
			ctx.fillStyle = g; ctx.filter = 'blur(3px)';   // soft and hazy, its ends melting into the land
			ctx.beginPath(); ctx.ellipse(x, y, w / 2, 12, 0, 0, Math.PI * 2); ctx.fill();
			ctx.filter = 'none';
			// the shimmer: thin bright lines that waver and break up
			ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
			for (var k = 0; k < 6; k++) {
				var ly = y - 9 + k * 3.2, len = w * (0.25 + 0.5 * hash(i * 7 + k)), lx = x - w * 0.35 + hash(i * 11 + k) * w * 0.3;
				ctx.globalAlpha = a * (0.35 + 0.35 * Math.sin(clock * (2.5 + k) + k * 1.7));
				ctx.beginPath();
				for (var t = 0; t <= 1.001; t += 0.1) { var px = lx + t * len, py = ly + Math.sin(clock * 3 + px * 0.05 + k) * 0.9; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
				ctx.stroke();
			}
			ctx.restore();
		}
	}
	// Cloud shadows: in daylight with clouds about, soft dark patches drift across the land, over hills and road alike
	function paintCloudShadows() {
		var d = daylight(), c = night.weather === 'clouds' ? 1 : night.weather === 'haze' || night.weather === 'wind' ? 0.5 : 0;
		if (d <= 0.05 || !c || reduceMotion) return;
		var sh = shiftOf('mid'), span = VW + 900;
		for (var i = 0; i < 4; i++) {
			var r = rng(night.day * 61 + i), w = 260 + r() * 300, sp = 10 + night.wind * 30;
			var x = ((r() * span - sh * 0.9 - clock * sp) % span + span) % span - 450, y = 540 + r() * 120;
			ctx.save(); ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(70,40,90,' + (0.5 * d * c).toFixed(3) + ')'; ctx.globalCompositeOperation = 'multiply';
			ctx.beginPath();   // a lumpy patch, like the cloud above it, flattened onto the ground
			for (var k = 0; k < 5; k++) { var bx = x + (k - 2) * w * 0.18, by = y + (r() - 0.5) * 14, br = w * (0.16 + r() * 0.1); ctx.moveTo(bx + br, by); ctx.ellipse(bx, by, br, br * 0.24, 0, 0, Math.PI * 2); }
			ctx.fill(); ctx.restore();
		}
	}
	// On windy nights, and ahead of a sandstorm, thin streamers of sand blow off the dune crests
	function paintCrestSand() {
		var w = night.weather, on = w === 'wind' ? 1 : w === 'sandstorm' ? 1 - smooth((nightT() - 0.2) / 0.1) : 0;
		if (on <= 0.02 || reduceMotion) return;
		var sh = shiftOf('mid'), ys = [];
		for (var x = -60; x <= VW + 60; x += 4) ys.push(layerY('mid', x - LEAD_X + sh));
		for (var i = 10; i < ys.length - 10; i++) {   // the peaks: the highest point for 40 units either side, standing clear of them
			var y = ys[i], peak = true;
			for (var j = i - 10; j <= i + 10; j++) if (ys[j] < y) { peak = false; break; }
			if (!peak || Math.max(ys[i - 10], ys[i + 10]) - y < 8) continue;
			var x = -60 + i * 4, seed = Math.floor((x - LEAD_X + sh) / 40);
			for (var k = 0; k < 4; k++) {   // a plume streaming off downwind (to the left, the way they travel), each wisp drifting out and fading
				var ph = (clock * (0.45 + 0.12 * k) + hash(seed + k * 7)) % 1, len = 40 + 110 * ph;
				var g = ctx.createLinearGradient(x, y, x - len, y);
				g.addColorStop(0, 'rgba(240,206,150,' + (0.7 * on * (1 - ph * 0.8)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(240,206,150,0)');
				ctx.strokeStyle = g; ctx.lineWidth = 2.5 + 7 * ph; ctx.lineCap = 'round';
				ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.quadraticCurveTo(x - len * 0.45, y - 4 - 6 * ph - k * 2, x - len, y - 2 - 16 * ph - k * 4); ctx.stroke();
			}
			i += 10;
		}
	}
	// After rain the desert blooms (Isaiah 35:1): for three nights wildflowers dot the sand, most just after the rain
	function bloom(k) {
		for (var b = 1; b <= 3; b++) { var p = planFor(k - b); if (p && (p.weather === 'rain' || p.weather === 'storm')) return [1, 0.65, 0.35][b - 1]; }
		return 0;
	}
	var FLOWER_COLS = ['#f28fb1', '#ffd45e', '#f6f1e4', '#c39bf0', '#ff9f6b'];
	function paintBlooms() {
		var amt = EASTER() ? 1 : bloom(night.day);   // (and on Easter morning the desert is in flower)
		if (!amt || /storm|sandstorm/.test(night.weather)) return;
		var base = cam * DAYW - LEAD_X, seg = 46;
		for (var i = Math.floor((base - 40) / seg); i <= Math.floor((base + VW + 40) / seg); i++) {
			if (hash(i + 7700) > amt * 0.8) continue;
			var u = i * seg + hash(i + 7800) * seg, x = u - base, depth = hash(i + 7900);   // scattered over the near sand, some further back
			var y = groundY(u) + 10 + depth * 46, sc = 0.7 + depth * 0.6, col = FLOWER_COLS[Math.floor(hash(i + 8100) * FLOWER_COLS.length)];
			var n = 1 + Math.floor(hash(i + 8200) * 3);   // a little clump
			for (var f = 0; f < n; f++) {
				var fx = x + (f - (n - 1) / 2) * 6 * sc, hgt = (6 + hash(i * 3 + f) * 6) * sc, sway = Math.sin(clock * 1.5 + i + f) * night.wind * 2;
				ctx.strokeStyle = '#6f8a4a'; ctx.lineWidth = 1.1 * sc;
				ctx.beginPath(); ctx.moveTo(fx, y); ctx.quadraticCurveTo(fx, y - hgt * 0.6, fx + sway, y - hgt); ctx.stroke();
				ctx.fillStyle = col;
				for (var p = 0; p < 5; p++) { var a = p / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(fx + sway + Math.cos(a) * 1.9 * sc, y - hgt + Math.sin(a) * 1.9 * sc, 1.4 * sc, 0, Math.PI * 2); ctx.fill(); }
				ctx.fillStyle = col === '#ffd45e' ? '#c9761e' : '#ffd45e'; ctx.beginPath(); ctx.arc(fx + sway, y - hgt, 1 * sc, 0, Math.PI * 2); ctx.fill();
			}
		}
	}
	// little whirlwinds of sand crossing the dunes on windy nights, and ahead of a sandstorm
	function paintDustDevils() {
		var w = night.weather, t = nightT();
		var on = w === 'wind' ? 1 : w === 'sandstorm' ? 1 - smooth((t - 0.2) / 0.1) : 0;
		if (on <= 0 || reduceMotion) return;
		for (var i = 0; i < 2; i++) {
			var span = VW + 400, x = ((i * 700 + 300 - clock * (40 + i * 18) - shiftOf('mid') * 0.6) % span + span) % span - 200;
			var base = layerY('mid', x - LEAD_X + shiftOf('mid')) + 6, hgt = 90 + i * 30;
			for (var k = 0; k < 14; k++) {
				var f = k / 13, rx = 6 + f * 22, cy = base - f * hgt, wob = Math.sin(clock * 5 + k * 0.7 + i) * 6 * f;
				ctx.fillStyle = 'rgba(214,170,110,' + (0.26 * on * (1 - f * 0.6)).toFixed(3) + ')';
				ctx.beginPath(); ctx.ellipse(x + wob, cy, rx, 4 + f * 3, 0, 0, Math.PI * 2); ctx.fill();
			}
		}
	}

	function paint() {
		var t = show ? clamp(show.elapsed / show.seconds, 0, 1) : 1;
		var shake = wx.shake > 0 ? Math.sin(clock * 60) * 3 * wx.shake : 0;
		if (homeward(night.day)) ctx.setTransform(-dpr * S, 0, 0, dpr * S, canvas.width, dpr * (canvas.clientHeight - VH * S));   // mirrored: they walk the other way
		else ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, dpr * (canvas.clientHeight - VH * S));
		paintSky();
		paintStar();
		paintCritters(true);                                             // the owl and bats
		paintCranes();
		paintVultures();
		paintClouds(wx.level, 'back');
		ctx.translate(shake, shake * 0.4);
		paintRainbow();
		paintLayer('far'); paintSnowCaps(); paintPieces('far');
		paintDustWall();
		paintClouds(wx.level, 'front');                                  // the big, near clouds pass in front of the far hills
		if (night.weather === 'haze') { var g = ctx.createLinearGradient(0, 380, 0, 520); g.addColorStop(0, 'rgba(160,140,200,0)'); g.addColorStop(1, 'rgba(160,140,200,0.2)'); ctx.fillStyle = g; ctx.fillRect(0, 380, VW, 140); }
		if (night.weather === 'fog') paintMist(468, 0.5, 0.4, 1);
		var mm = morningMist(); if (mm > 0.01) paintMist(472, 0.55 * mm, 0.4, 1.1);
		if (night.weather === 'sandstorm') tint('rgba(160,108,58,A)', 0.5 * wx.level, TOPV);
		paintBolt();
		paintStarRay();
		paintLayer('mid'); paintMirage(); paintCrestSand(); paintPieces('mid');
		paintDustDevils();
		if (night.weather === 'fog') paintMist(560, 0.45, 0.8, 1.1);
		if (mm > 0.01) paintMist(566, 0.5 * mm, 0.8, 1.2);
		if (night.weather === 'sandstorm') tint('rgba(160,108,58,A)', 0.28 * wx.level, TOPV);
		paintLayer('road');
		paintGrain();
		paintCloudShadows();   // (on the land, under the characters)
		paintBlooms();
		paintPieces('road');
		paintCaravan();
		paintFind();
		paintPip();
		paintSaid();
		paintCritters(false);
		paintForeground();
		paintNearWeather();
		var dl = daylight();
		if (dl > 0) {   // the warm afternoon light over everything, going as the sun goes
			ctx.save(); ctx.globalCompositeOperation = 'soft-light';
			var nn = noon();   // (at midday whiter and stronger)
			ctx.fillStyle = 'rgba(255,' + Math.round(196 + 40 * nn) + ',' + Math.round(130 + 80 * nn) + ',' + ((0.75 + 0.2 * nn) * dl).toFixed(3) + ')'; ctx.fillRect(-20, TOPV, VW + 40, VH - TOPV + 20);
			ctx.globalCompositeOperation = 'screen';
			ctx.fillStyle = 'rgba(' + Math.round(120 + 40 * nn) + ',' + Math.round(90 + 50 * nn) + ',' + Math.round(60 + 60 * nn) + ',' + ((0.22 + 0.2 * nn) * dl).toFixed(3) + ')'; ctx.fillRect(-20, TOPV, VW + 40, VH - TOPV + 20);
			ctx.restore();
		}
		mapUpdate();
		// fade in from the night once the wise men are loaded
		if (!artWaiting()) fadeIn = Math.min(1, fadeIn + 0.04);
		if (fadeIn < 1) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(7,11,34,' + (1 - fadeIn).toFixed(3) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
	}

	// ----- the show: each night they walk one stretch of road on their own, like a short film -----
	var show = null;   // {from, to, seconds, elapsed, delay, mode, spawns}
	var playing = false;
	function easeWalk(t) {   // set off gently, walk steadily, slow to a stop
		var a = 0.06, b = 0.1, total = 1 - a / 2 - b / 2, p;
		if (t < a) p = t * t / (2 * a);
		else if (t < 1 - b) p = a / 2 + (t - a);
		else p = a / 2 + (1 - b - a) + (b / 2 - (1 - t) * (1 - t) / (2 * b));
		return Math.min(1, p / total);
	}
	function setNight(k) {
		viewIdx = k;
		night = nightFor(k);
		makeStars();
		sound.music(k, k === TOTAL, TOTAL - k);
		PIECES.forEach(function(p) { p.heard = false; p.seen = null; p.nextCall = 0; });
		setNightSounds = function() {
		var kinds = PIECES.filter(function(p) { return p.night === k; }).map(function(p) { return p.kind + ' ' + p.key; }).join(' ');
		sound.preload(['voice-1-say', 'voice-2-say', 'voice-3-say']);   // (the kings' sayings, for a click in the evening)
		sound.preload(['camel-grunt', 'voice-1-urge', 'voice-1-calm', 'voice-2-urge', 'voice-2-calm', 'voice-3-urge', 'voice-3-calm']);   // (ready for a click on a camel)
		sound.preload([/howl/.test(kinds) ? 'jackal' : '', /howl/.test(kinds) ? 'wolf' : '', /fox/.test(kinds) ? 'fox' : '', /sheep|shepherd/.test(kinds) ? 'sheep' : '', /sheep|shepherd/.test(kinds) ? 'lamb' : '', /herder/.test(kinds) ? 'goat' : '', /donkey|caravan/.test(kinds) ? 'donkey' : '', /jerusalem-gate|herod/.test(kinds) ? 'shofar' : ''].filter(Boolean));
		};
		setNightSounds();
		if (pipCard) { pipCard.hidden = true; verseEl.style.visibility = ''; pip.card = false; }
		pipReset();
		critters = []; prints = []; wx.drops = []; wx.dust = []; wx.streaks = []; wx.bolt = null; wx.flash = 0;
		drawText();
		updateControls();
	}
	// Google Analytics (the Google tag on every page of the site): what visitors do on The Journey, as events named
	// journey_… with the night and date. Nothing about who they are; not sent in test mode. See /privacy/.
	function track(name, data) {
		if (TEST || typeof window.gtag !== 'function') return;
		var d = viewIdx >= 0 ? dateOfDay(viewIdx) : now();
		var p = {night: viewIdx + 1, date: String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')};
		for (var key in (data || {})) p[key] = data[key];
		window.gtag('event', 'journey_' + name, p);
	}
	var tracked = {};
	function trackOnce(name, data) { var key = name + viewIdx; if (tracked[key]) return; tracked[key] = 1; track(name, data); }
	function playNight(k, delay) {
		setNight(k);
		var st = stretch(k), seconds = (st[1] - st[0]) * DAYW / WALK;
		var r = rng(k * 71 + 5), list = night.plan.critters || [];
		if (night.weather === 'storm' || night.weather === 'sandstorm') list = [];       // everything hides in a storm
		var spawns = list.map(function(c, i) { return {kind: c, at: 0.15 + 0.7 * (i + 0.5) / list.length + (r() - 0.5) * 0.08}; });
		show = {from: st[0], to: st[1], seconds: seconds, elapsed: 0, delay: delay || 0.8, mode: 'night', spawns: spawns};
		track('night', {tonight: k === realToday ? 'yes' : 'no'});
		cam = st[0]; restAt = st[1];
		if (reduceMotion) { show.elapsed = show.seconds + showTail(); cam = st[1]; playing = false; stepWeather(0, 1); updateControls(); return; }
		playing = true; updateControls(); untuck(6000);
	}
	function playSoFar() {
		track("so_far");
		setNight(realToday);
		var to = stretch(realToday)[1], days = to + PROLOGUE;
		show = {from: -PROLOGUE, to: to, seconds: Math.min(90, 12 + days * 1.4), elapsed: 0, delay: 0.6, mode: 'sofar', spawns: [], k: -1};
		soFarDay(0);
		cam = -PROLOGUE; restAt = to;
		playing = true; updateControls();
	}
	// in the time-lapse, each day brings its own sky, moon, weather and critters as it passes
	function soFarDay(k) {
		if (!show || show.mode !== 'sofar' || show.k === k) return;
		show.k = k;
		night = nightFor(k);
		makeStars();
		wx.drops = []; wx.dust = []; wx.streaks = []; wx.bolt = null; wx.flash = 0;
		(night.plan.critters || []).forEach(function(c, i) { setTimeout(function() { if (show && show.mode === 'sofar' && show.k === k) spawnCritter(c); }, 250 + i * 400); });
	}
	function showTail() { return show && (show.mode === 'night' || show.mode === 'sofar') && charsReady() ? EVENING : 0; }   // the evening after they stop
	function showDone() { return !show || show.elapsed >= show.seconds + showTail(); }
	function advanceShow(dt) {
		if (!show || !playing) return;
		if (artWaiting()) return;                                       // don't start walking until they're here
		if (show.delay > 0) { show.delay -= dt; return; }
		show.elapsed += dt;
		var t = Math.min(1, show.elapsed / show.seconds);
		cam = show.from + (show.to - show.from) * easeWalk(t);
		show.spawns.forEach(function(s) { if (!s.done && t >= s.at) { s.done = true; spawnCritter(s.kind); } });
		if (show.mode === 'sofar') soFarDay(clamp(Math.floor(cam + 0.15), 0, realToday));   // (it ends on tonight)
		if (show.elapsed >= show.seconds + showTail()) { playing = false; updateControls(); document.body.classList.remove('tucked'); }
	}

	// ----- words over the scene -----
	var whenEl = document.getElementById('when'), captionEl = document.getElementById('caption'), titleEl = document.getElementById('title');
	var lastWhen = '', lastCaption = '', firstShow = true, lastVerse = false, verseEl = document.getElementById('verse-end');
	function readingFor(d) { var from = START; return JOURNEY_READINGS[clamp(Math.round((startOfDay(d) - from) / DAY), 0, JOURNEY_READINGS.length - 1)]; }
	function updateOverlay() {
		var k = show && show.mode === 'sofar' ? clamp(Math.floor(cam + 0.15), 0, realToday) : viewIdx;
		var when = 'Day ' + (k + 1) + ' of ' + (END + 1) + '<b>' + longDate(dateOfDay(k)) + '</b>';
		if (when !== lastWhen) { whenEl.innerHTML = when; lastWhen = when; }
		var t = show ? show.elapsed / show.seconds : 1, wd = WEATHER[night.weather], cap = '';
		var near = null;
		PIECES.forEach(function(p) { var at = p.kind === 'stable' ? TOTAL : p.pass; if (p.caption && cam > at - (p.small ? 0.1 : 0.14) && cam < at + 0.05 && (!near || p.small < near.small)) near = p; });
		var titleOn = firstShow && show && show.elapsed < 3.5;
		if (titleOn || (firstShow && show && show.elapsed < 4.4)) cap = '';   // let the title fade before the first caption
		else if (near) cap = daylight() > 0.5 && near.dayCaption ? near.dayCaption : near.caption;
		else if (show && show.mode === 'night' && wd.caption && t > 0.06 && t < 0.2) cap = wd.caption;
		else if (show && show.mode === 'night' && wd.clears && t > 0.84 && t < 0.97) cap = wd.clears;
		// at the end of the night: a few words about where they rest, then the day's reading fades in
		var after = show ? show.elapsed - show.seconds : -1, tail = showTail();
		var verseOn = show && (show.mode === 'night' || show.mode === 'sofar') && (tail ? after >= 8 : showDone() && after >= 0);
		if (!verseOn && show && after >= (tail ? 2.5 : 0) && after < (tail ? 7 : 99) && viewIdx !== TOTAL && viewIdx !== END)
			cap = show.mode === 'sofar' ? 'Tonight they rest here' : night.plan.camp ? 'They make camp for the night' : tail ? 'They rest by the fire' : 'They rest for the night';
		if (verseOn) cap = '';
		if (cap !== lastCaption) { lastCaption = cap; if (cap) captionEl.firstChild.textContent = cap; captionEl.classList.toggle('on', !!cap); }
		if (verseOn !== lastVerse) {
			lastVerse = verseOn;
			if (verseOn && show) trackOnce('night_finished', {mode: show.mode});   // watched to the end
			if (verseOn) {
				var rd = readingFor(dateOfDay(viewIdx));
				verseEl.querySelector('blockquote').textContent = '\u201c' + rd.text + '\u201d';
				verseEl.querySelector('cite').textContent = rd.ref + ' (KJV)';
			}
			verseEl.classList.toggle('on', !!verseOn);
		}
		titleEl.style.opacity = titleOn ? 1 : 0;
		if (show && show.elapsed > 4.4) firstShow = false;
	}

	// ----- controls: earlier nights, pause, watch again, the journey so far -----
	var setNightSounds = function() {};

	// ----- full screen, and a cleaner view on phones -----
	var stageEl = document.querySelector('.stage'), fullBtn = document.getElementById('full'), mapEl = document.getElementById('map');
	var canFull = !!(stageEl.requestFullscreen || stageEl.webkitRequestFullscreen);   // not on iPhone, where only videos may go full screen
	var fsEl = function() { return document.fullscreenElement || document.webkitFullscreenElement; };
	if (canFull) fullBtn.hidden = false;
	fullBtn.addEventListener('click', function() {
		track('full_screen');
		if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
		else (stageEl.requestFullscreen || stageEl.webkitRequestFullscreen).call(stageEl);
	});
	function onFull() {
		var on = !!fsEl();
		document.body.classList.toggle('is-full', on);
		fullBtn.textContent = on ? '✕' : '⛶'; fullBtn.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen');
		if (mapEl) (on ? stageEl : document.querySelector('header')).appendChild(mapEl);   // the map comes along into full screen
		setTimeout(resize, 50);
	}
	document.addEventListener('fullscreenchange', onFull); document.addEventListener('webkitfullscreenchange', onFull);
	// on a short (sideways phone) screen, tuck the header and buttons away a few seconds after the night starts
	// playing; a tap anywhere on the scene brings them back for a few seconds
	var tuckTimer = null, tapHinted = false;
	function shortScreen() { return window.innerHeight <= 500 && window.innerWidth > window.innerHeight; }
	function untuck(wait) {
		document.body.classList.remove('tucked');
		clearTimeout(tuckTimer);
		tuckTimer = setTimeout(function() {
			if (!(shortScreen() && playing && pipCard.hidden)) return;
			document.body.classList.add('tucked');
			if (!tapHinted) { tapHinted = true; var th = document.getElementById('tap-hint'); th.classList.add('show'); setTimeout(function() { th.classList.remove('show'); }, 3500); }   // the first time only
		}, wait || 4000);
	}
	stageEl.addEventListener('pointerdown', function(e) { if (document.body.classList.contains('tucked')) untuck(4000); });
	document.querySelector('.player').addEventListener('pointerdown', function() { untuck(6000); });
	window.addEventListener('scroll', function() { if (window.scrollY > 10) untuck(4000); }, {passive: true});
	var prevBtn = document.getElementById('prev'), nextBtn = document.getElementById('next'), playBtn = document.getElementById('play');
	var soFarBtn = document.getElementById('sofar'), tonightBtn = document.getElementById('tonight-btn'), dayEl = document.getElementById('ctl-day');
	function updateControls() {
		prevBtn.disabled = viewIdx <= 0;
		nextBtn.disabled = viewIdx >= lastOpen;
		var d = dateOfDay(viewIdx);
		dayEl.innerHTML = (viewIdx === realToday ? (viewIdx === TOTAL ? 'Christmas Day' : viewIdx === END ? 'Home again' : 'Tonight') : 'Night ' + (viewIdx + 1)) + '<small>' + d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}) + '</small>';
		var done = showDone();
		playBtn.textContent = playing ? 'Pause' : done ? 'Watch again' : 'Play';
		playBtn.hidden = reduceMotion;
		soFarBtn.hidden = reduceMotion || realToday < 2 || homeward(viewIdx);   // the journey so far is the way there
		tonightBtn.classList.toggle('away', viewIdx === realToday);   // keeps its place, so the other buttons don't shift
		if (TEST) document.querySelectorAll('#plan-table tr[data-k]').forEach(function(tr) { tr.classList.toggle('on', +tr.dataset.k === viewIdx); });
	}
	prevBtn.addEventListener('click', function() { if (viewIdx > 0) playNight(viewIdx - 1); });
	nextBtn.addEventListener('click', function() { if (viewIdx < lastOpen) playNight(viewIdx + 1); });
	tonightBtn.addEventListener('click', function() { playNight(realToday); });
	playBtn.addEventListener('click', function() {
		if (playing) playing = false;
		else if (showDone()) { if (show && show.mode === 'sofar') playSoFar(); else playNight(viewIdx, 0.3); return; }
		else playing = true;
		updateControls();
	});
	soFarBtn.addEventListener('click', playSoFar);
	var soundBtn = document.getElementById('sound');
	function soundLabel(on) { soundBtn.textContent = on ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
	soundBtn.addEventListener('click', function() { var son = sound.toggle(); track('sound', {on: son ? 'yes' : 'no'}); soundLabel(son); sound.music(viewIdx, viewIdx === TOTAL, TOTAL - viewIdx); setNightSounds(); });
	soundLabel(false);
	soundBtn.hidden = !sound.hasAny();   // no button until there are recordings to play
	if (sound.wanted()) soundBtn.classList.add('remembered');   // they had it on last time: browsers still need a click to start it
	document.addEventListener('keydown', function(e) {
		if (e.target.closest('input, textarea, select, button') || e.altKey || e.metaKey || e.ctrlKey) return;
		if (e.key === 'ArrowLeft' && !prevBtn.disabled) prevBtn.click();
		if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
	});

	// ----- test mode (/journey/?test): every night open, faster playback, weather override, the whole plan -----
	if (TEST) (function() {
		var panel = document.getElementById('test-panel'), table = document.getElementById('plan-table');
		panel.hidden = false; table.hidden = false;
		panel.querySelectorAll('[data-speed]').forEach(function(b) {
			b.addEventListener('click', function() { timeScale = +b.dataset.speed; panel.querySelectorAll('[data-speed]').forEach(function(o) { o.classList.toggle('on', o === b); }); });
		});
		var sel = document.getElementById('test-weather');
		WEATHER_KINDS.forEach(function(w) { var o = document.createElement('option'); o.value = w; o.textContent = w; sel.appendChild(o); });
		sel.addEventListener('change', function() { weatherOverride = sel.value || null; playNight(viewIdx, 0.3); });
		document.getElementById('test-skip').addEventListener('click', function() { if (show) { show.delay = 0; show.elapsed = Math.max(show.elapsed, show.seconds * 0.5 - 0.01); } });
		var rows = '<thead><tr><th>Night</th><th>Date</th><th>Land</th><th>Sky</th><th>Weather</th><th>Landmark</th><th>Encounter</th><th>Critters</th><th>Camp</th><th>Also in the sky / land</th><th>Reading</th><th>Note</th></tr></thead><tbody>';
		function extras(k) {   // the scenery that comes from the date rather than the plan
			var x = [], ph = moonPhase(dateOfDay(k)), w = planFor(k).weather;
			if (k <= 4) x.push('smoking mountain');
			if (cometNight(k)) x.push('comet');
			if (ph > 0.44 && ph < 0.56 && k !== TOTAL) x.push('orange moonrise');
			if (litSky(k) && (w === 'storm' || w === 'rain')) x.push('rainbow as it clears'); else if (litSky(k) && w === 'clouds') x.push('rainbow at first');
			if (w === 'wind') x.push('dust devils');
			if (w === 'sandstorm') x.push('wall of dust, dust devils');
			if (snowSeason(k)) x.push('snow on the peaks');
			if (cranesTonight(k)) x.push('cranes flying over');
			if (PIECES.some(function(p) { return p.kind === 'trotter' && p.night === k; })) x.push('a jackal running across the hills');
			if (bloom(k)) x.push('flowers after the rain');
			return x;
		}
		var from = START;
		for (var k = 0; k <= END; k++) {
			var p = planFor(k), d = dateOfDay(k), r = JOURNEY_READINGS[clamp(Math.round((d - from) / DAY), 0, JOURNEY_READINGS.length - 1)];
			rows += '<tr data-k="' + k + '" class="w-' + p.weather + '"><td>' + (k + 1) + '</td><td>' + d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}) + '</td><td>' + stageAt(k).label + '</td><td>' + p.sky + '</td><td>' + p.weather +
				'</td><td>' + (p.landmark || '') + '</td><td>' + (p.encounter || '') + (p.howl ? (p.encounter ? ', ' : '') + p.howl + ' howling' : '') + '</td><td>' + (p.critters || []).join(', ') + '</td><td>' + (p.camp ? 'yes' : '') + '</td><td>' + extras(k).join(', ') + '</td><td>' + r.ref + '</td><td>' + (p.note || '') + '</td></tr>';
		}
		table.querySelector('table').innerHTML = rows + '</tbody>';
		table.addEventListener('click', function(e) { var tr = e.target.closest('tr[data-k]'); if (tr) { playNight(+tr.dataset.k, 0.3); canvas.scrollIntoView({behavior: 'smooth'}); } });
		// what's covered: every weather, landmark, encounter and critter, with its first night
		var seen = {};
		for (k = 0; k <= END; k++) { var q = planFor(k); [q.weather, q.landmark, q.encounter].concat(q.critters || []).forEach(function(x) { if (x && !(x in seen)) seen[x] = k + 1; }); }
		// for automated review: jump to a moment of a night and hold it there
		window.journeyTest = {
			moon: function() { return {phase: night.phase, words: moonWords(night.phase), day: night.day, cover: wx.cover, moonX: night.moonX, sh: shiftOf('sky'), VW: VW}; },
			pip: function() { return pip.box && {x: pip.box.x, y: pip.box.y, target: pip.target, called: pip.called, state: pip.state}; },
			findPip: function() { findPip(); },
			kings: function() { return kingBoxes.map(function(b) { return {n: b.n, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2}; }); },
			said: function() { return said && said.text; },
			camels: function() { return camelBoxes.map(function(b) { return {i: b.i, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, surge: surgeAt(b.k)}; }); },
			find: function() { var f = findSpot(); return {x: f.x, y: f.y, kind: f.kind[0]}; },
			trace: function() { traced = {t: clock, day: night.day}; var k = constellation(); return k && k.c.name; },
			drawn: function() { var d = Object.keys(drawnNames).sort(); drawnNames = {}; return d; },
			blink: function(v) { holdBlink = v; },
			owl: function() { spawnCritter('owl'); },
			bugs: function() { return critters.filter(function(c) { return /scorpion|centipede|spider|beetle|snake/.test(c.kind); }).map(function(c) { return [c.u - cam * DAYW + LEAD_X, roadY(c.u) + c.depth]; }); },
			spawn: function(k) { spawnCritter(k); var c = critters[critters.length - 1]; c.u = cam * DAYW + 120 + critters.length * 40; c.dir = -1; return critters.length; },
			// every piece: which night, when it passes (0..1 of the night) and where it is on screen then
			pieces: function() {
				return PIECES.map(function(p) {
					var k = clamp(p.night, 0, END), st = stretch(k), target = (p.pass - st[0]) / (st[1] - st[0]), lo = 0, hi = 1;
					for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (easeWalk(mid) < target) lo = mid; else hi = mid; }
					return {night: k, kind: p.kind, key: p.key, layer: p.layer, frac: clamp(lo, 0, 1), art: !!(art(p.art) && art(p.art).base), screenX: LEAD_X + p.off, S: S};
				});
			},
			go: function(k, frac) {
				playNight(k, 0); show.delay = 0;
				show.elapsed = frac <= 1 ? frac * show.seconds : show.seconds + (frac - 1) * 2 * EVENING; advanceShow(0.0001);
				playing = false; gaitDist = cam * DAYW; walk = frac < 0.98 ? 1 : 0; clock = 50;
				stepWeather(0.016, frac); paint(); updateOverlay(); updateControls();
				return {night: k + 1, weather: night.weather, cam: cam};
			}
		};
		document.getElementById('plan-coverage').textContent = 'Covered: ' + Object.keys(seen).map(function(x) { return x + ' (night ' + seen[x] + ')'; }).join(' · ');
	})();

	// ----- the frame loop (stops while the scene is off screen or the tab is hidden) -----
	var last = performance.now(), running = false, visible = true, soundClock = 0;
	function frame(ts) {
		var dt = Math.min(0.05, (ts - last) / 1000) * timeScale; last = ts; clock += dt;
		var before = cam;
		advanceShow(dt);
		var moved = Math.abs(cam - before) * DAYW;
		gaitDist += show && show.mode === 'sofar' ? Math.min(moved, WALK * 2.5 * dt) : moved;   // time-lapse: legs at a brisk pace, not a blur
		var moving = moved / Math.max(dt, 0.001) > 3;
		walk += ((moving ? 1 : 0) - walk) * Math.min(1, dt * (moving ? 5 : 2.5));
		// weather follows the night; in the time-lapse, each day's weather plays out within that day
		var wt = show && show.mode === 'sofar' ? clamp(cam - (Math.floor(cam + 0.15) - 0.15), 0, 1) : show ? clamp(show.elapsed / show.seconds, 0, 1) : 1;
		stepWeather(dt, wt);
		stepCritters(dt);
		soundClock -= dt;
		if (soundClock <= 0) {   // the soundscape follows the weather, a few times a second
			soundClock = 0.25;
			var w = night.weather, lv = wx.level, t = show ? show.elapsed / show.seconds : 1;
			// what they're passing: water near the river and oases, sheep near the shepherds
			var nearBy = function(kinds) { return PIECES.some(function(p) { return kinds.indexOf(p.kind) >= 0 && Math.abs(cam - p.pass) < 0.18; }) ? 1 : 0; };
			sound.update({fast: show && show.mode === 'sofar' && playing && evening() === 0 ? 3 : 1, wind: night.wind * (w === 'wind' ? 1 : 0.4), rain: w === 'rain' || w === 'storm' ? lv : 0, sandstorm: w === 'sandstorm' ? lv : 0,
				storm: w === 'storm' ? lv : 0, clear: (w === 'clear' || w === 'haze') && night.day !== TOTAL, camp: HOMEMODE && !EASTER() ? 0.5 : evening() > 0 ? fireNow : 0,
				water: nearBy(['river', 'oasis', 'heron', 'well']), sheep: nearBy(['shepherds', 'sheep']), walking: walk});
			// the animals they pass call out now and then while they're in view (sheep and lambs, goats, a donkey)
			PIECES.forEach(function(p) {
				if (!playing || cam < p.pass - 0.16 || cam > p.pass + 0.12) return;
				if (show && show.mode === 'sofar') sound.preload(/sheep|shepherds/.test(p.kind) ? ['sheep', 'lamb'] : p.kind === 'herder' ? ['goat'] : ['donkey']);
				// (the merchants' caravan: their camels grumbling and a donkey braying, a little quieter as they're farther off)
				var calls = /sheep|shepherd/.test(p.kind) ? ['sheep', 'lamb'] : p.kind === 'herder' ? ['goat', 'goat', 'sheep'] : p.kind === 'donkey' ? ['donkey'] : p.kind === 'caravan' ? ['camel-grunt', 'camel-grunt', 'donkey', 'camel-grunt'] : p.kind === 'howl' ? (p.howling ? [p.who] : null) : p.kind === 'fox' ? ['fox'] : p.kind === 'owl' ? ['owl'] : null;
				if (calls && clock > (p.nextCall || 0)) {
					var lapse = show && show.mode === 'sofar';
					if (p.nextCall || lapse) sound.animal(calls[Math.floor(Math.random() * calls.length)], p.kind === 'caravan' ? 0.22 : p.kind === 'fox' ? 0.24 : p.kind === 'howl' ? 0.3 : 0.35);   // (far off, and the fox's cry kept soft)
					p.nextCall = clock + (p.nextCall ? (p.kind === 'caravan' ? 2.5 + Math.random() * 3 : p.who === 'wolf' ? 6 + Math.random() * 4 : p.kind === 'fox' ? 12 + Math.random() * 6 : p.kind === 'howl' ? 7 + Math.random() * 5 : 4 + Math.random() * 5) / (show && show.mode === 'sofar' ? 2.5 : 1) : 0.4);
				}
				if (/jerusalem-gate|herod/.test(p.key) && !p.heard && Math.abs(cam - p.pass) < 0.03) { p.heard = true; sound.animal('shofar'); }   // a ram's horn at Jerusalem
			});
		}
		meteors.forEach(function(m) { m.t += dt * 1.5; });
		paint();
		updateOverlay();
		if (running) requestAnimationFrame(frame);
	}
	function setRunning(on) {
		if (on && !running && !reduceMotion) { running = true; last = performance.now(); requestAnimationFrame(frame); }
		if (!on) running = false;
	}
	new IntersectionObserver(function(entries) { visible = entries[0].isIntersecting; setRunning(visible && !document.hidden); }).observe(canvas);
	document.addEventListener('visibilitychange', function() { setRunning(visible && !document.hidden); });
	window.addEventListener('resize', function() { resize(); });

	// ----- below the scene: countdown, reading, the night, and Follow the Star itself -----
	// the countdown and Follow the Star use the real date; the reading and the night follow the night being shown
	function drawText() {
		var d = now(), day = startOfDay(d), days = Math.round((CHRISTMAS - day) / DAY);
		var shown = dateOfDay(viewIdx), past = viewIdx < realToday, future = viewIdx > realToday;
		document.getElementById('day-label').textContent = 'Day ' + (viewIdx + 1) + ' of the journey · ' + longDate(shown);
		if (days > 1) { document.getElementById('days-left').textContent = days + ' days'; document.getElementById('days-label').textContent = 'until we celebrate the birth of Jesus'; }
		else if (days === 1) { document.getElementById('days-left').textContent = 'Tomorrow'; document.getElementById('days-label').textContent = 'we celebrate the birth of Jesus'; }
		else if (days === 0) { document.getElementById('days-left').textContent = 'Merry Christmas'; document.getElementById('days-label').textContent = 'Unto us a Saviour is born'; }
		else {
			var toHome = Math.round((HOME - day) / DAY);
			document.getElementById('days-left').textContent = toHome > 0 ? 'On their way home' : 'Home again';
			document.getElementById('days-label').textContent = toHome > 0 ? 'The wise men are going home another way' : 'The wise men are home';
		}
		var tick = document.getElementById('ticking');
		if (!forced && days > 0) { var ms = CHRISTMAS - d; tick.textContent = Math.floor(ms / DAY) + ' days, ' + Math.floor(ms / 36e5) % 24 + ' hours, ' + Math.floor(ms / 6e4) % 60 + ' minutes'; }
		else tick.textContent = '';
		var words = nightWords(night);
		document.getElementById('tonight').textContent = (past ? 'That night on the road: ' : future ? 'That night (preview): ' : 'Tonight on the road: ') + words.charAt(0).toLowerCase() + words.slice(1);
		document.getElementById('verse-label').textContent = viewIdx === realToday ? 'Today’s reading' : 'The reading for ' + shown.toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
		var from = new Date(JOURNEY_READINGS_FROM + 'T00:00:00');
		var r = JOURNEY_READINGS[clamp(Math.round((startOfDay(shown) - from) / DAY), 0, JOURNEY_READINGS.length - 1)];
		document.getElementById('verse-text').textContent = r.text;
		document.getElementById('verse-ref').textContent = r.ref + ' (KJV)';
		var ev = document.getElementById('event-countdown'), key = ymd(day), html;
		var tonight = NIGHTS.filter(function(n) { return n[0] === key; })[0];
		var next = NIGHTS.filter(function(n) { return n[0] > key; })[0];
		var toFirst = NIGHTS.length ? Math.round((new Date(NIGHTS[0][0] + 'T00:00:00') - day) / DAY) : -1;
		var buy = d >= SALE_OPENS ? '<br><a class="btn" href="/tickets/">Buy tickets</a>' : '<br>Tickets go on sale <b>Sunday, November 8 at 9 am</b>.';
		if (tonight) html = '<b>Follow the Star is on tonight</b>, ' + tonight[2] + '.' + buy;
		else if (toFirst > 0) html = 'Walk the journey yourself: <b>Follow the Star begins in ' + toFirst + (toFirst === 1 ? ' day' : ' days') + '</b>, December 4–13.' + buy;
		else if (next) html = 'Next performance: <b>' + next[1] + '</b>, ' + next[2] + '.' + buy;
		else html = 'Thank you for following the star with us this year.';
		ev.innerHTML = html;
	}

	if (TEST && params.get('night')) viewIdx = clamp(+params.get('night') - 1, 0, END);   // ?test&night=15
	mapSetup();
	resize();
	if (HOMEMODE) {
		// January 7 to September 30: they're home in the East. The evening of their homecoming, kept alive: the kings by
		// the palace steps, the camels resting, Pip about, something to find, and tonight's real sky (the moon's real
		// phase, the meteor showers on their nights, a constellation each week). A countdown to October 1, and last
		// year's journey to watch again, night by night.
		var doneEl = document.getElementById('done'), toGo = Math.ceil((new Date(SEASON + 1, 9, 1) - startOfDay(now())) / DAY);
		doneEl.querySelector('p').innerHTML = 'The Star rises again on <b>October 1</b>: ' + toGo + (toGo === 1 ? ' day' : ' days') + ' to go.' +
			'<br><span class="hint">Tap the wise men, the camels, Pip and the stars.</span>';
		var again = document.createElement('button'); again.type = 'button'; again.className = 'btn again'; again.textContent = 'Watch last year’s journey';
		doneEl.appendChild(again); doneEl.hidden = false;
		['when', 'title', 'caption', 'verse-end'].forEach(function(id) { document.getElementById(id).style.display = 'none'; });
		var nightCtl = [TEST ? null : '.player .nights', '#play', '#tonight-btn', '#sofar'].map(function(q) { return q && document.querySelector(q); }).filter(Boolean);
		nightCtl.forEach(function(el) { el.style.display = 'none'; });   // (sound and full screen stay)
		if (TEST) {   // test mode: ◀ ▶ step a day back or forward, to check the weather, moon, Pip's cards and finds day by day
			var stepDay = function(n) { var d = new Date(now()); d.setDate(d.getDate() + n); params.set('date', ymd(d)); params.delete('weather'); location.search = params.toString(); };
			var homeLabel = function() { dayEl.innerHTML = 'Home · ' + homeWeather() + '<small>' + now().toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'}) + '</small>'; };
			prevBtn.disabled = false; nextBtn.disabled = false;
			prevBtn.addEventListener('click', function(e) { if (HOMEMODE) { e.stopImmediatePropagation(); stepDay(-1); } }, true);
			nextBtn.addEventListener('click', function(e) { if (HOMEMODE) { e.stopImmediatePropagation(); stepDay(1); } }, true);
			homeLabel(); setInterval(function() { if (HOMEMODE) { homeLabel(); prevBtn.disabled = nextBtn.disabled = false; } }, 500);
		}
		document.getElementById('today').style.display = 'none';
		var stayHome = function() {
			playNight(END, 0); show.elapsed = show.seconds + EVENING * 0.8; cam = stretch(END)[1]; walk = 0; playing = true;
			night.phase = moonPhase(now());          // tonight's real moon
			var hw = params.get('weather') || homeWeather();   // (?weather=rain to try one)
			night.weather = hw; night.plan = Object.assign({}, night.plan, {weather: hw});
			night.skyKey = hw === 'storm' ? 'storm' : hw === 'sandstorm' ? 'sandstorm' : hw === 'rain' || hw === 'clouds' ? 'clouds' : 'night';
			night.sky = SKIES[night.skyKey] || SKIES.night;
			night.wind = hw === 'sandstorm' ? 1 : hw === 'wind' ? 0.6 : hw === 'storm' ? 0.5 : 0.15;
			if (EASTER()) { night.weather = 'clear'; night.plan = Object.assign({}, night.plan, {weather: 'clear'}); night.skyKey = 'predawn'; night.sky = SKIES.predawn; }
			makeStars();
		};
		stayHome();
		if (EASTER()) {
			doneEl.querySelector('h2').textContent = 'He is risen!';
			doneEl.querySelector('p').innerHTML = '“He is not here: for he is risen, as he said.” <span class="hint">(Matthew 28:6)</span><br>' + doneEl.querySelector('p').innerHTML;
		} setRunning(true); track('home_visit', {days_to_go: toGo});
		again.addEventListener('click', function() {   // back on the road: every night of last year's journey can be watched
			doneEl.hidden = true; HOMEMODE = false; lastOpen = END; realToday = END;
			['when', 'title', 'caption', 'verse-end'].forEach(function(id) { document.getElementById(id).style.display = ''; });
			nightCtl.forEach(function(el) { el.style.display = ''; });
			track('watch_again'); playNight(0, 0.8); updateControls();
		});
		setInterval(drawText, 60000);
		return;
	}
	if (reduceMotion) { playNight(viewIdx); paint(); updateOverlay(); }
	else { playNight(viewIdx, 1.6); setRunning(true); }
	setInterval(drawText, 60000);
})();
