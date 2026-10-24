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
	var START = new Date(2026, 9, 1);           // the wise men set out
	var CHRISTMAS = new Date(2026, 11, 25);     // they reach the stable
	var SALE_OPENS = new Date('2026-11-08T09:00:00-08:00');
	var NIGHTS = [
		['2026-12-04', 'Friday, December 4', '6–9 pm'], ['2026-12-05', 'Saturday, December 5', '5–9 pm'],
		['2026-12-06', 'Sunday, December 6', '5–9 pm'], ['2026-12-10', 'Thursday, December 10', '6–9 pm'],
		['2026-12-11', 'Friday, December 11', '6–9 pm'], ['2026-12-12', 'Saturday, December 12', '5–9 pm'],
		['2026-12-13', 'Sunday, December 13', '5–9 pm']
	];
	var DAY = 864e5;
	var TOTAL = Math.round((CHRISTMAS - START) / DAY);   // Christmas is night TOTAL
	var HOME = new Date(2027, 0, 6);
	var END = Math.round((HOME - START) / DAY);          // home again on January 6, the last night
	function homeward(k) { return k > TOTAL; }          // after Christmas they head home: the scene turns round
	function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	function dateOfDay(k) { return new Date(START.getFullYear(), START.getMonth(), START.getDate() + Math.floor(k)); }
	function dayOf(md) { var p = md.split('-'), y = START.getFullYear() + (p[0] - 1 < START.getMonth() ? 1 : 0); return Math.round((new Date(y, p[0] - 1, +p[1]) - START) / DAY); }
	function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
	function longDate(d) { return d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'}); }
	var forced = params.get('date') ? new Date(params.get('date') + 'T19:00:00') : null;   // ?date=2026-12-12 to pretend it's that day
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
		pass:      {kind: 'pass', art: 'jr-lm-mountain-pass', caption: 'Through the mountain pass', h: 300},
		well:      {kind: 'well', art: 'jr-lm-well', caption: 'A well by the road', h: 110, layer: 'road', off: 420},
		olives:    {kind: 'olives', art: 'jr-lm-olive-grove', caption: 'Olive groves of Judea', h: 170},
		'jerusalem-far':  {kind: 'jerusalem', art: 'jr-lm-jerusalem', caption: 'Jerusalem on the hills ahead', h: 120, layer: 'far', at: 0.55},
		'jerusalem-gate': {kind: 'jerusalem', art: 'jr-lm-jerusalem-gate', alt: 'jr-lm-jerusalem', caption: 'At the gates of Jerusalem: “Where is he that is born King of the Jews?”', h: 260, at: 1, off: 330},
		herod:            {kind: 'palace', art: 'jr-lm-herod-palace', alt: 'jr-lm-jerusalem', caption: 'King Herod: “Go and search diligently for the young child”', h: 270, at: 1, off: 320},
		jerusalem:        {kind: 'jerusalem', art: 'jr-lm-jerusalem', caption: 'Leaving Jerusalem, the Star goes before them', h: 300, at: 0.3},
		angel:            {kind: 'angel', art: 'jr-en-angel', caption: 'Warned in a dream, they go home another way', h: 150, at: 0.92, off: 260},
		home:             {kind: 'palace', art: 'jr-lm-east-palace', caption: 'Home again', h: 290, at: 1, off: 300},
		shepherds: {kind: 'shepherds', art: 'jr-lm-shepherds', caption: 'Shepherds keeping watch', h: 140},
		bethlehem: {kind: 'bethlehem', art: 'jr-lm-bethlehem', caption: 'Bethlehem', h: 210, at: 0.5},
		stable:    {kind: 'stable', art: 'jr-lm-stable', caption: 'They have found him', h: 165, layer: 'road', at: 1, off: 390}
	};
	var ENCOUNTERS = {
		gazelles:  {art: 'jr-en-gazelles', caption: 'Gazelles in the starlight', h: 95, flip: true},
		herder:    {art: 'jr-en-goat-herder', caption: 'A herder and his goats', h: 110, flip: true},
		heron:     {art: 'jr-en-herons', caption: 'Herons by the water', h: 105},
		farm:      {art: 'jr-en-farmhouse', caption: 'A farmhouse with a lamp still lit', h: 115},
		owl:       {art: 'jr-en-owl', caption: 'An owl in a palm tree', h: 170},
		tents:     {art: 'jr-en-bedouin-tents', caption: 'The tents of desert herders', h: 105},
		fox:       {art: 'jr-en-fox', caption: 'A desert fox watching them pass', h: 70, flip: true},
		merchants: {art: 'jr-en-merchants', caption: 'Merchants heading the other way', h: 85, kind: 'caravan'},
		hare:      {art: 'jr-en-hare', caption: 'A hare in the moonlight', h: 60, flip: true},
		stones:    {art: 'jr-en-standing-stones', caption: 'Standing stones', h: 120},
		ibex:      {art: 'jr-en-ibex', caption: 'Wild ibex on the rocks', h: 110, flip: true},
		lanterns:  {art: 'jr-en-lantern-travelers', caption: 'Other travelers with lanterns', h: 105, flip: true},
		sheep:     {art: 'jr-en-sheep', caption: 'A shepherd and his sheep', h: 110, flip: true},
		donkey:    {art: 'jr-en-donkey', caption: 'A traveler with a donkey', h: 110, flip: true}
	};
	var CAMPS = ['jr-lm-camp', 'jr-lm-camp-2', 'jr-lm-camp-3'];

	// every piece on the road, from the plan
	var PIECES = [];
	function addPiece(k, spec, key, at, small) {
		var st = stretch(k), a = spec.at != null ? spec.at : at;
		PIECES.push({night: k, key: key, kind: spec.kind || key, art: spec.art, alt: spec.alt, caption: spec.caption, h: spec.h, small: small, flip: !!spec.flip,
			layer: spec.layer || 'mid', pass: st[0] + a * (st[1] - st[0]), off: spec.off != null ? spec.off : (spec.layer === 'far' ? 300 : 340)});
	}
	for (var k = 0; k <= END; k++) {
		var p = planFor(k);
		if (p.landmark && LANDMARKS[p.landmark]) addPiece(k, LANDMARKS[p.landmark], p.landmark, 0.3, false);
		if (p.encounter && ENCOUNTERS[p.encounter]) addPiece(k, ENCOUNTERS[p.encounter], p.encounter, 0.22, true);   // early, so it's gone before they stop
		if (p.camp) addPiece(k, {kind: 'camp', art: CAMPS[k % 3], caption: '', h: 130, at: 1, off: 300}, 'camp', 1, true);
	}
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
	var rank = function(n) { return /^jr-char-/.test(n) ? 0 : /^jr-(sky|far|mid|near)-/.test(n) ? 1 : 2; };   // (characters first, then sky and land)
	ART_READY = ART_READY.filter(function(n) { return !/^jr-camel-rider/.test(n); }).sort(function(a, b) { return rank(a) - rank(b); });
	ART_READY.forEach(function(n) {
		var rig = window.JOURNEY_CAMEL_RIG && JOURNEY_CAMEL_RIG[n];
		if (rig) {
			loadArt(n + '-body');
			rig.legs.forEach(function(l, i) { ['upper', 'lower'].forEach(function(part) { loadArt(n + '-leg' + i + '-' + part, function(im) { if (i % 2) im.dark = tinted(im, 0.78); }); }); });
			return;
		}
		if (/^jr-sky-/.test(n)) loadArt(n);
		else if (/^jr-(far|mid|near)-/.test(n) && n !== 'jr-far-bethlehem') loadArt(n, skyline);
		else loadArt(n, footing);
	});	pump();

	function art(name) { return name && images[name] || null; }
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

	var realDay = Math.floor((now() - START) / DAY), over = realDay > END && !TEST;      // once they're home, the journey is over
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
	function drawTilePart(im, layer, x, n, f0, f1) {
		var b = box(im, layer), dx = x + f0 * b.w, dw = (f1 - f0) * b.w;
		var s0 = (n % 2 ? 1 - f1 : f0) * im.width, sw = (f1 - f0) * im.width;
		if (n % 2) { ctx.save(); ctx.translate(dx + dw, 0); ctx.scale(-1, 1); ctx.drawImage(im, s0, 0, sw, im.height, -0.5, b.y, dw + 1, b.h); ctx.restore(); }
		else ctx.drawImage(im, s0, 0, sw, im.height, dx - 0.5, b.y, dw + 1, b.h);
		if (b.y + b.h < VH + 10) { ctx.fillStyle = im.bottom; ctx.fillRect(dx - 0.5, b.y + b.h - 1, dw + 1, VH + 10 - b.y - b.h); }
	}
	function paintLayerArt(layer) {
		var w = LAYER[layer].w, u0 = shiftOf(layer) - LEAD_X, n = Math.floor(u0 / w);
		for (var x = n * w - u0; x < VW; x += w, n++) {
			var cur = tileInfo(layer, n), prev = tileInfo(layer, n - 1);
			if (prev.im && prev.im !== cur.im) {
				// the land changes here: the old art carries on and the new fades in, in narrow strips
				drawTilePart(prev.im, layer, x, n, 0, 1);
				var STRIPS = 14;
				for (var s = 0; s < STRIPS; s++) {
					ctx.globalAlpha = smooth((s + 0.5) / STRIPS);
					drawTilePart(cur.im, layer, x, n, s * FADE / STRIPS, (s + 1) * FADE / STRIPS);
				}
				ctx.globalAlpha = 1;
				drawTilePart(cur.im, layer, x, n, FADE, 1);
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
	function weatherLevel(t) {
		var w = night.weather;
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
			var a = (dark ? 0.92 : w === 'clouds' ? 0.75 : 0.4) * coverage * (0.55 + depth * 0.45);
			if (a < 0.02) continue;
			ctx.globalAlpha = a;
			ctx.drawImage(cloudArt(dark, i), x, y, cw, ch);
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
		var raining = (night.weather === 'rain' || night.weather === 'storm') ? wx.level : 0;
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
			c.v = {jerboa: 150, mouse: 190, gecko: 220, hedgehog: 34}[kind] * (0.85 + Math.random() * 0.3);
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
			var go = c.kind === 'jerboa' ? (Math.sin(c.t * 7 + c.seed) > -0.2 ? 1 : 0) : c.kind === 'mouse' || c.kind === 'gecko' ? (Math.sin(c.t * 2.2 + c.seed) > -0.45 ? 1 : 0.05) : 1;
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
				if (p.kind === 'angel') glow(x, y - h * 0.5, h * 1.1, 'rgb(255,236,180)', 0.35 * (0.8 + 0.2 * Math.sin(clock * 1.5)));
				var top = y + h * 0.06 - im.base * h;
				ctx.save();
				if (p.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
				ctx.drawImage(dark ? (im.dark || (im.dark = tinted(im, 0.45))) : im, x - w / 2, top, w, h);
				ctx.restore();
			} else drawStandIn(p, x, groundUnder(layer, x, 120) + 4);
		});
	}

	// ----- the camels -----
	// The wise men as characters (round 4): each king has his own camel, in his colour
	var CHARS = [1, 2, 3].map(function(n) {
		return {camel: 'jr-char-camel-' + n, kneel: 'jr-char-camel-' + n + '-kneel', ride: 'jr-char-king-' + n + '-ride', walk: 'jr-char-king-' + n + '-walk', pray: 'jr-char-king-' + n + '-kneel',
			walkFree: 'jr-char-king-' + n + '-walk-free', rest: 'jr-char-king-' + n + '-rest'};
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
		ctx.drawImage(images[name + '-body'], 0, idle);
		leg(0); leg(2);
		// the king on his saddle, rocking with the camel
		if (opts.rider && r.saddle) {
			var ri = opts.rider, rh = opts.riderH ? opts.riderH / s : r.h * RIDE_H, rw = rh * ri.width / ri.height, st = opts.seat || SEAT;
			ctx.drawImage(ri, r.saddle[0] - rw * st[0], r.saddle[1] + idle - rh * st[1] + r.h * 0.03, rw, rh);
		}
		ctx.restore();
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
	function evening() { return show && show.mode === 'night' ? clamp(show.elapsed - show.seconds, 0, EVENING) : 0; }
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
	function paintFire(x, a) {
		if (a <= 0) return;
		var y = kingY(x);
		ctx.save(); ctx.globalAlpha = a;
		glow(x, y - 26, 210, 'rgb(255,160,60)', 0.55 * flicker(3));
		glow(x, y - 14, 60, 'rgb(255,220,140)', 0.6 * flicker(5));
		ctx.fillStyle = '#4a2a14'; ctx.save(); ctx.translate(x, y - 4); ctx.rotate(0.35); ctx.fillRect(-24, -3.5, 48, 7); ctx.rotate(-0.7); ctx.fillRect(-24, -3.5, 48, 7); ctx.restore();
		[[0, 56, '#ff9a2e'], [0, 40, '#ffd166'], [0, 22, '#fff3c4']].forEach(function(f, n) {
			var hgt = f[1] * (0.85 + 0.25 * Math.sin(clock * (9 + n * 3) + n)), w = 15 - n * 4;
			ctx.fillStyle = f[2]; ctx.beginPath(); ctx.moveTo(x - w, y - 4);
			ctx.quadraticCurveTo(x - w * 0.6 + Math.sin(clock * 7 + n) * 2, y - hgt * 0.6, x + Math.sin(clock * 5 + n) * 3, y - 4 - hgt);
			ctx.quadraticCurveTo(x + w * 0.6, y - hgt * 0.5, x + w, y - 4); ctx.fill();
		});
		ctx.restore();
	}
	function drawKing(im, x, y, h, dir, bob, tilt, a) {
		if (!im || a <= 0) return;
		var w = h * im.width / im.height;
		ctx.save(); ctx.globalAlpha = a;
		ctx.translate(x, y - bob); ctx.rotate(tilt); ctx.scale(dir, 1);
		ctx.drawImage(im, -w / 2, -h * (im.base || 1), w, h);
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
			var n = order[i], c = CHARS[n], r = rigReady(c.camel), cx = LEAD_X - CHAR_BACK[i], u = cam * DAYW - CHAR_BACK[i];
			k.ah = CHAR_H; if (k.art !== c.camel) { k.art = c.camel; k.wasPlanted = []; }
			var t0 = 0.8 + [0, 0.22, 0.12][i];                         // nearly together, a little out of step
			var p = {k: k, c: c, r: r, cx: cx, u: u, n: n, t0: t0,
				// the camel goes down (its walking picture becomes its kneeling one, from the same sheet) and its king comes
				// down with it in the same moment; then he stands up behind it and walks off
				kneelA: smooth((e - t0) / 0.5),
				stand: smooth((e - 2.0 - i * 0.35) / 0.45),           // once all three camels are down, the kings get up in turn
				spot: kingSpot(i), walkStart: 2.6 + i * 0.35};
			p.g = drawRigCamel(k, c.camel, r, cx, u, {alpha: 0});    // where the camel stands (nothing drawn yet)
			p.ks = kingScale(c);
			p.seatX = cx + (r.saddle[0] - r.w / 2) * p.g.s; p.seatY = p.g.y - (r.h - r.saddle[1]) * p.g.s;
			return p;
		});
		// 1. kings who are down, walking behind the camels to their places
		var kings = [];
		plan.forEach(function(p, i) {
			if (p.stand <= 0) return;
			var c = p.c, gifts = p.spot.pray;
			var x0 = p.seatX - 6, dist = Math.abs(p.spot.x - x0);
			var walkDur = Math.max(1, Math.min(dist / 50, EVENING - p.walkStart - 1.6)), wt = clamp((e - p.walkStart) / walkDur, 0, 1);
			var ew = wt * wt * (3 - 2 * wt), x = x0 + (p.spot.x - x0) * ew, y = kingY(x) - 5;
			var stepping = wt > 0 && wt < 1, ph = dist * ew / 26 * Math.PI;
			var bob = stepping ? (1 - Math.cos(2 * ph)) * 1.1 : 0, tilt = stepping ? Math.sin(ph) * 0.012 : 0;
			var still = art(c.rest) || art(c.walkFree), walking = art(c.walkFree) || art(c.walk);   // (the gift appears as he kneels at the manger)
			if (wt <= 0) kings.push({im: still, x: x, y: y, ks: p.ks, dir: 1, a: p.stand});                       // just stood up
			else if (wt < 1) kings.push({im: walking, x: x, y: y, ks: p.ks, dir: 1, bob: bob, tilt: tilt, a: 1});
			else {
				var arrived = smooth((e - p.walkStart - walkDur) / 0.35);
				var end = gifts ? art(c.pray) : still;
				kings.push({im: walking, x: x, y: y, ks: p.ks, dir: 1, a: 1 - arrived});
				kings.push({im: end, x: x, y: y, ks: p.ks, dir: gifts ? 1 : p.spot.dir, a: arrived});
			}
		});
		kings.forEach(function(q) { drawKing(q.im, q.x, q.y, q.im.height * q.ks, q.dir, q.bob || 0, q.tilt || 0, q.a); });
		// 2. the camels, and the kings still on them
		plan.forEach(function(p) {
			var c = p.c, r = p.r, s = p.g.s, ri = art(c.ride);
			var riding = e <= 0;
			drawRigCamel(p.k, c.camel, r, p.cx, p.u, {alpha: 1 - p.kneelA, rider: riding ? ri : null, riderH: ri.height * p.ks, seat: SEATS[p.n]});
			var kim = art(c.kneel), ks = r.kneelSeat, kw = kim.width * s, kh = kim.height * s;
			var kx = ks ? p.seatX - ks[0] * s : p.cx - kw / 2, ky = p.g.y + 4 - (ks ? ks[3] : kh / s * (kim.base || 1)) * s;   // seats lined up
			if (p.kneelA > 0) {
				ctx.save(); ctx.globalAlpha = p.kneelA;
				ctx.drawImage(kim, kx, ky, kw, kh);
				ctx.restore();
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
		if (kind === 'fire') paintFire(fireX(), smooth((e - 1.6) / 1.2));
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
		var skyH = 520 - TOPV, sh = shiftOf('sky');
		stars.forEach(function(s) {
			var x = ((s.x - sh) % (VW + 40) + VW + 40) % (VW + 40) - 20, y = TOPV + s.y * skyH;
			var o = s.o * clearSky * (s.tw && !reduceMotion ? 0.55 + 0.45 * Math.sin(clock * 6 / s.tw + s.ph) : 1);
			if (o < 0.03) return;
			ctx.globalAlpha = o; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, s.s, s.s);
		});
		ctx.globalAlpha = 1;
		var mw = moonWords(night.phase);
		if (mw && night.day !== TOTAL && clearSky > 0.05) {
			var mx = VW * night.moonX - sh * 0.5 % VW, my = TOPV + 0.2 * skyH + 80, mr = 22;   // clear of the date in the corner and of the Star
			ctx.globalAlpha = clearSky;
			glow(mx, my, 90, 'rgb(220,225,255)', 0.18);
			ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.clip();
			ctx.fillStyle = '#f4f0dc'; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
			var ph = night.phase, kk = Math.cos(ph * 2 * Math.PI);
			ctx.fillStyle = 'rgba(10,12,40,0.93)';
			ctx.beginPath();
			if (ph < 0.5) { ctx.arc(mx, my, mr, Math.PI / 2, -Math.PI / 2, false); ctx.ellipse(mx, my, Math.abs(kk) * mr, mr, 0, -Math.PI / 2, Math.PI / 2, kk < 0); }
			else { ctx.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(mx, my, Math.abs(kk) * mr, mr, 0, Math.PI / 2, -Math.PI / 2, kk < 0); }
			ctx.fill(); ctx.restore();
			ctx.globalAlpha = 1;
		}
		// shooting stars now and then; many on meteor-shower nights
		var shower = night.plan.note && /meteor/.test(night.plan.note) && !weatherOverride;
		if (!reduceMotion && clearSky > 0.6 && Math.random() < (shower ? 0.025 : 0.002) * timeScale) meteors.push({x: VW * (0.3 + Math.random() * 0.7), y: TOPV + Math.random() * skyH * 0.4, t: 0});
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
		var p = Math.max(0, Math.min(cam, TOTAL)) / TOTAL, s = starPos(), seen = (1 - wx.cover * 0.85) * clamp(1 - (cam - TOTAL) / 1.2, 0, 1);
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
	function paintForeground() {
		var seg = 1000, sh = shiftOf('fg');
		var first = Math.floor((sh - LEAD_X - 500) / seg), last = Math.floor((sh - LEAD_X + VW + 500) / seg);
		var restShift = restAt * DAYW * SPEED.fg;
		for (var i = first; i <= last; i++) {
			if (hash(i + 5000) < 0.5) continue;
			var u = i * seg + hash(i + 6000) * seg * 0.6, x = u - sh + LEAD_X;
			var restX = u - restShift + LEAD_X;
			if (restX > LEAD_X - 600 && restX < LEAD_X + 200) continue;            // keep clear where they stop
			var day = (u - LEAD_X) / (DAYW * SPEED.fg);
			if (day < -PROLOGUE - 1 || day > END + 1) continue;
			if (PIECES.some(function(p) { return !p.small && day > p.pass - 0.3 && day < p.pass + 0.15; })) continue;   // keep clear while a landmark is in view
			var kinds = FG_KINDS[stageAt(day).key], withArt = kinds.filter(function(kd) { return FG_ART[kd].some(art); });
			if (withArt.length) kinds = withArt;
			else if (anyFgArt()) continue;
			var kind = kinds[Math.floor(hash(i + 7000) * kinds.length)];
			var h = 120 + hash(i + 8000) * 120, col = '#0d0919';
			var names = FG_ART[kind].filter(art), im = art(names[Math.floor(hash(i + 9000) * names.length)]);
			if (im && im.base) { var w = h * 1.15 * im.width / im.height; ctx.drawImage(im, x - w / 2, VH + 16 - im.base * h * 1.15, w, h * 1.15); continue; }
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
	var PIP_KEY = 'journey-pip-found';
	var pip = {box: null, near: false, hop: -1, hopT: 0, u: null, state: 'trot', target: 0, until: 0, rng: null, last: 0, dir: 1, card: false};
	function pipFound() { try { return JSON.parse(localStorage.getItem(PIP_KEY) || '[]'); } catch (e) { return []; } }
	function pipHide() {   // where Pip hides tonight, once they've stopped (scene x)
		if (eveningKind() === 'manger') return screenX('road', pieceU(STABLE)) - 150;
		var r = Math.floor(hash(night.day * 13 + 5) * 4);
		return [fireX() + 30, LEAD_X + 105, LEAD_X - 330, LEAD_X - CHAR_BACK[2] - 120][r];
	}
	var PIP_SPOTS = [130, -110, -330, 250, -470, 60];          // around the caravan, from the lead camel (scene units)
	function pipReset() {
		pip.rng = rng(night.day * 977 + 31); pip.u = null; pip.state = 'trot'; pip.until = 0; pip.hop = -1; pip.last = clock;
	}
	function pipStep(dt) {
		var base = cam * DAYW - LEAD_X;                          // world position of the screen's left edge
		if (pip.u == null) { pip.u = base + Math.max(40, LEAD_X - CHAR_BACK[2] - 160); pip.target = pip.u; pip.state = 'sit'; pip.until = clock + 3 + pip.rng() * 3; }
		var e = evening();
		if (e > 2.9) {                                          // evening: off to tonight's hiding place, and stay there
			var hideU = base + pipHide();
			if (Math.abs(hideU - pip.u) > 2) { pip.state = 'trot'; var d = Math.sign(hideU - pip.u); pip.dir = d; pip.u += d * Math.min(Math.abs(hideU - pip.u), 150 * dt); }
			else pip.state = 'sit';
			return;
		}
		var sx = pip.u - base;
		if (pip.state === 'sit') {
			// he sits a while; if the caravan has left him far behind, he sets off sooner
			if (clock > pip.until || sx < 30 || sx > VW - 30) {
				var off = PIP_SPOTS[Math.floor(pip.rng() * PIP_SPOTS.length)];
				pip.target = cam * DAYW + off + (walk > 0.5 ? 60 : 0);    // a little ahead of where that spot is now, as they're moving
				pip.state = 'trot';
			}
		} else {
			var tgt = pip.target, d2 = Math.sign(tgt - pip.u), step = 150 * dt;
			pip.dir = d2 || pip.dir;
			if (Math.abs(tgt - pip.u) <= step) { pip.u = tgt; pip.state = 'sit'; pip.until = clock + 5 + pip.rng() * 5; }
			else pip.u += d2 * step;
		}
		pip.u = clamp(pip.u, base + 24, base + VW - 24);             // always on screen
	}
	// Pip is drawn from the sand mouse, warmed a little: darker than the sand, so he's easier to spot. He moves in
	// little springy hops (squashing as he lands) with a soft shadow on the sand that shrinks as he jumps; when found
	// he gives a big hop, then waves while his card is open.
	var PIP_LOOK = 'sepia(0.6) saturate(1.6) brightness(1.15)', PIP_WAVE_LOOK = 'sepia(0.35) saturate(1.1) brightness(0.72) hue-rotate(-12deg)';
	function paintPip() {
		if (!charsReady()) { pip.box = null; return; }
		if (pip.rng == null) pipReset();
		var dt = Math.min(0.1, clock - pip.last); pip.last = clock;
		if (playing || evening() > 0) pipStep(dt);
		var x = pip.u - (cam * DAYW - LEAD_X), y = groundY(pip.u) + 6;
		var moving = pip.state === 'trot', hop = 0, squash = 0;
		if (moving) { var ph = (clock * 3.2) % 1; hop = Math.sin(ph * Math.PI) * 7; squash = ph < 0.12 ? (1 - ph / 0.12) * 0.18 : 0; }
		if (pip.hop >= 0) { pip.hopT += dt; var q = Math.min(1, pip.hopT / 0.7); hop = Math.sin(q * Math.PI) * 30; if (q > 0.92) squash = 0.2; if (pip.hopT > 0.75) pip.hop = -1; }
		else if (pip.near && !moving) hop = 3 + Math.abs(Math.sin(clock * 6)) * 2;   // a little excited bounce when a pointer comes near
		var waving = pip.card && pip.hop < 0 && art('jr-pip-wave');
		var im = waving ? art('jr-pip-wave') : art('jr-cr-sand-mouse');
		if (!im) return;
		var h = waving ? 26 : 20, w = h * im.width / im.height, dir = moving ? pip.dir : (hash(night.day) < 0.5 ? 1 : -1);
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
		pip.hop = 0; pip.hopT = 0;
		var key = String(dateOfDay(viewIdx).getMonth() + 1).padStart(2, '0') + '-' + String(dateOfDay(viewIdx).getDate()).padStart(2, '0');
		var found = pipFound(); if (found.indexOf(key) < 0) { found.push(key); try { localStorage.setItem(PIP_KEY, JSON.stringify(found)); } catch (e) {} mapPaws(); }
		pipCard.querySelector('p').textContent = (window.PIP_CARDS || {})[key] || '';
		pipCard.querySelector('.pip-count').textContent = 'You’ve found Pip on ' + found.length + (found.length === 1 ? ' night' : ' nights') + ' of ' + (END + 1) + '.';
		pip.wasPlaying = playing; playing = false; pip.card = true; updateControls();   // the scene waits while the card is open
		pipCard.hidden = false; verseEl.style.visibility = 'hidden'; pipCard.querySelector('button').focus();
	}
	canvas.addEventListener('click', function(evt) { if (nearPip(evt, evt.pointerType === 'touch' ? 40 : 26)) findPip(); });
	canvas.addEventListener('pointerdown', function(evt) { if (evt.pointerType === 'touch' && nearPip(evt, 40)) { evt.preventDefault(); findPip(); } });
	canvas.addEventListener('mousemove', function(evt) { pip.near = nearPip(evt, 70); canvas.style.cursor = nearPip(evt, 26) ? 'pointer' : ''; });
	document.getElementById('pip-close').addEventListener('click', function() {
		pipCard.hidden = true; verseEl.style.visibility = ''; pip.card = false;
		if (pip.wasPlaying) { pip.wasPlaying = false; playing = true; updateControls(); }
	});
	document.getElementById('pip-key').addEventListener('click', findPip);   // for keyboard users

	// ----- the journey map in the header: the way there along the top, the way home along the bottom -----
	var mapOut = document.getElementById('map-out'), mapHome = document.getElementById('map-home');
	var mapDot = document.getElementById('map-dot'), mapText = document.getElementById('map-text'), mapDone = document.getElementById('map-done');
	var SVGNS = 'http://www.w3.org/2000/svg';
	function mapPoint(day) {   // where a moment of the journey sits on the map
		if (day <= TOTAL) { var L = mapOut.getTotalLength(); return mapOut.getPointAtLength(L * clamp((day + PROLOGUE) / (TOTAL + PROLOGUE), 0, 1)); }
		var H = mapHome.getTotalLength(); return mapHome.getPointAtLength(H * clamp((day - TOTAL) / (END - TOTAL), 0, 1));
	}
	function mapSetup() {
		if (!mapOut) return;
		var icons = document.getElementById('map-icons');
		var marks = [[-PROLOGUE, 'Home', 1], [dayOf('10-04'), 'River', 0, 1], [dayOf('11-01'), 'Oasis'], [dayOf('11-27'), 'Pass'], [dayOf('12-21'), 'Jerusalem', 1, 1], [TOTAL, 'Bethlehem', 1]];
		marks.forEach(function(m) {
			var p = mapPoint(m[0]), c = document.createElementNS(SVGNS, 'circle');
			c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', m[2] ? 3.5 : 2.2); if (m[2]) c.setAttribute('class', 'big');
			icons.appendChild(c);
			var t = document.createElementNS(SVGNS, 'text'); t.setAttribute('x', p.x); t.setAttribute('y', m[3] ? p.y + 13 : p.y - 7); t.textContent = m[1];
			icons.appendChild(t);
		});
		var star = document.createElementNS(SVGNS, 'text'), sp = mapPoint(TOTAL);   // the Star over Bethlehem
		star.setAttribute('x', sp.x + 12); star.setAttribute('y', sp.y + 3); star.textContent = '✦'; star.setAttribute('style', 'fill:#FFDB59;font-size:11px');
		icons.appendChild(star);
		mapPaws();
	}
	function mapPaws() {   // the nights Pip has been found
		var g = document.getElementById('map-paws'); if (!g) return;
		g.innerHTML = '';
		pipFound().forEach(function(key) {
			var k = dayOf(key), p = mapPoint(k + 0.5), c = document.createElementNS(SVGNS, 'circle');
			c.setAttribute('cx', p.x); c.setAttribute('cy', p.y + (k > TOTAL ? 6 : -6)); c.setAttribute('r', 1.6); g.appendChild(c);
		});
	}
	var mapLast = -99;
	function mapUpdate() {
		if (!mapOut || Math.abs(cam - mapLast) < 0.002) return;
		mapLast = cam;
		var p = mapPoint(cam); mapDot.setAttribute('cx', p.x); mapDot.setAttribute('cy', p.y);
		// the road travelled, in gold
		mapDone.innerHTML = '';
		var outL = mapOut.getTotalLength(), done = clamp((Math.min(cam, TOTAL) + PROLOGUE) / (TOTAL + PROLOGUE), 0, 1) * outL;
		var pts = []; for (var t = 0; t <= done; t += 4) { var q = mapOut.getPointAtLength(t); pts.push(q.x.toFixed(1) + ' ' + q.y.toFixed(1)); }
		if (cam > TOTAL) { var hl = mapHome.getTotalLength(), hd = clamp((cam - TOTAL) / (END - TOTAL), 0, 1) * hl; for (t = 0; t <= hd; t += 4) { q = mapHome.getPointAtLength(t); pts.push(q.x.toFixed(1) + ' ' + q.y.toFixed(1)); } }
		if (pts.length > 1) { var path = document.createElementNS(SVGNS, 'path'); path.setAttribute('d', 'M' + pts.join(' L')); mapDone.appendChild(path); }
		var k = clamp(Math.floor(cam + 0.15), 0, END), left = TOTAL - k;
		mapText.textContent = 'Day ' + (k + 1) + ' · ' + (left > 1 ? left + ' nights to Bethlehem' : left === 1 ? '1 night to Bethlehem' : left === 0 ? 'Bethlehem' : (END - k > 0 ? (END - k) + (END - k === 1 ? ' night' : ' nights') + ' to home' : 'Home again'));
	}

	function paint() {
		var t = show ? clamp(show.elapsed / show.seconds, 0, 1) : 1;
		var shake = wx.shake > 0 ? Math.sin(clock * 60) * 3 * wx.shake : 0;
		if (homeward(night.day)) ctx.setTransform(-dpr * S, 0, 0, dpr * S, canvas.width, dpr * (canvas.clientHeight - VH * S));   // mirrored: they walk the other way
		else ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, dpr * (canvas.clientHeight - VH * S));
		paintSky();
		paintStar();
		paintCritters(true);                                             // the owl and bats
		paintClouds(wx.level, 'back');
		ctx.translate(shake, shake * 0.4);
		paintLayer('far'); paintPieces('far');
		paintClouds(wx.level, 'front');                                  // the big, near clouds pass in front of the far hills
		if (night.weather === 'haze') { var g = ctx.createLinearGradient(0, 380, 0, 520); g.addColorStop(0, 'rgba(160,140,200,0)'); g.addColorStop(1, 'rgba(160,140,200,0.2)'); ctx.fillStyle = g; ctx.fillRect(0, 380, VW, 140); }
		if (night.weather === 'fog') paintMist(468, 0.5, 0.4, 1);
		if (night.weather === 'sandstorm') tint('rgba(160,108,58,A)', 0.5 * wx.level, TOPV);
		paintBolt();
		paintStarRay();
		paintLayer('mid'); paintPieces('mid');
		if (night.weather === 'fog') paintMist(560, 0.45, 0.8, 1.1);
		if (night.weather === 'sandstorm') tint('rgba(160,108,58,A)', 0.28 * wx.level, TOPV);
		paintLayer('road');
		paintGrain();
		paintPieces('road');
		paintCaravan();
		paintPip();
		paintCritters(false);
		paintForeground();
		paintNearWeather();
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
		sound.music(k, k === TOTAL);
		PIECES.forEach(function(p) { p.heard = false; p.seen = null; p.nextCall = 0; });
		setNightSounds = function() {
		var kinds = PIECES.filter(function(p) { return p.night === k; }).map(function(p) { return p.kind + ' ' + p.key; }).join(' ');
		sound.preload([/sheep|shepherds/.test(kinds) ? 'sheep' : '', /sheep|shepherds/.test(kinds) ? 'lamb' : '', /herder/.test(kinds) ? 'goat' : '', /donkey|caravan/.test(kinds) ? 'donkey' : '', /jerusalem-gate|herod/.test(kinds) ? 'shofar' : ''].filter(Boolean));
		};
		setNightSounds();
		if (pipCard) { pipCard.hidden = true; verseEl.style.visibility = ''; pip.card = false; }
		pipReset();
		critters = []; prints = []; wx.drops = []; wx.dust = []; wx.streaks = []; wx.bolt = null; wx.flash = 0;
		drawText();
		updateControls();
	}
	function playNight(k, delay) {
		setNight(k);
		var st = stretch(k), seconds = (st[1] - st[0]) * DAYW / WALK;
		var r = rng(k * 71 + 5), list = night.plan.critters || [];
		if (night.weather === 'storm' || night.weather === 'sandstorm') list = [];       // everything hides in a storm
		var spawns = list.map(function(c, i) { return {kind: c, at: 0.15 + 0.7 * (i + 0.5) / list.length + (r() - 0.5) * 0.08}; });
		show = {from: st[0], to: st[1], seconds: seconds, elapsed: 0, delay: delay || 0.8, mode: 'night', spawns: spawns};
		cam = st[0]; restAt = st[1];
		if (reduceMotion) { show.elapsed = show.seconds + showTail(); cam = st[1]; playing = false; stepWeather(0, 1); updateControls(); return; }
		playing = true; updateControls(); untuck(6000);
	}
	function playSoFar() {
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
	function showTail() { return show && show.mode === 'night' && charsReady() ? EVENING : 0; }   // the evening after they stop
	function showDone() { return !show || show.elapsed >= show.seconds + showTail(); }
	function advanceShow(dt) {
		if (!show || !playing) return;
		if (artWaiting()) return;                                       // don't start walking until they're here
		if (show.delay > 0) { show.delay -= dt; return; }
		show.elapsed += dt;
		var t = Math.min(1, show.elapsed / show.seconds);
		cam = show.from + (show.to - show.from) * easeWalk(t);
		show.spawns.forEach(function(s) { if (!s.done && t >= s.at) { s.done = true; spawnCritter(s.kind); } });
		if (show.mode === 'sofar') soFarDay(clamp(Math.floor(cam + 0.15), 0, END));
		if (show.elapsed >= show.seconds + showTail()) { playing = false; updateControls(); document.body.classList.remove('tucked'); }
	}

	// ----- words over the scene -----
	var whenEl = document.getElementById('when'), captionEl = document.getElementById('caption'), titleEl = document.getElementById('title');
	var lastWhen = '', lastCaption = '', firstShow = true, lastVerse = false, verseEl = document.getElementById('verse-end');
	function readingFor(d) { var from = new Date(JOURNEY_READINGS_FROM + 'T00:00:00'); return JOURNEY_READINGS[clamp(Math.round((startOfDay(d) - from) / DAY), 0, JOURNEY_READINGS.length - 1)]; }
	function updateOverlay() {
		var k = show && show.mode === 'sofar' ? clamp(Math.floor(cam + 0.15), 0, END) : viewIdx;
		var when = 'Day ' + (k + 1) + ' of ' + (END + 1) + '<b>' + longDate(dateOfDay(k)) + '</b>';
		if (when !== lastWhen) { whenEl.innerHTML = when; lastWhen = when; }
		var t = show ? show.elapsed / show.seconds : 1, wd = WEATHER[night.weather], cap = '';
		var near = null;
		PIECES.forEach(function(p) { var at = p.kind === 'stable' ? TOTAL : p.pass; if (p.caption && cam > at - (p.small ? 0.1 : 0.14) && cam < at + 0.05 && (!near || p.small < near.small)) near = p; });
		var titleOn = firstShow && show && show.elapsed < 3.5;
		if (titleOn || (firstShow && show && show.elapsed < 4.4)) cap = '';   // let the title fade before the first caption
		else if (near) cap = near.caption;
		else if (show && show.mode === 'night' && wd.caption && t > 0.06 && t < 0.2) cap = wd.caption;
		else if (show && show.mode === 'night' && wd.clears && t > 0.84 && t < 0.97) cap = wd.clears;
		// at the end of the night: a few words about where they rest, then the day's reading fades in
		var after = show ? show.elapsed - show.seconds : -1, tail = showTail();
		var verseOn = show && show.mode === 'night' && (tail ? after >= 8 : showDone() && after >= 0);
		if (!verseOn && show && after >= (tail ? 2.5 : 0) && after < (tail ? 7 : 99) && viewIdx !== TOTAL && viewIdx !== END)
			cap = show.mode === 'sofar' ? 'Tonight they rest here' : night.plan.camp ? 'They make camp for the night' : tail ? 'They rest by the fire' : 'They rest for the night';
		if (verseOn) cap = '';
		if (cap !== lastCaption) { lastCaption = cap; if (cap) captionEl.firstChild.textContent = cap; captionEl.classList.toggle('on', !!cap); }
		if (verseOn !== lastVerse) {
			lastVerse = verseOn;
			if (verseOn) {
				var rd = readingFor(dateOfDay(viewIdx));
				verseEl.querySelector('blockquote').textContent = rd.text;
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
	soundBtn.addEventListener('click', function() { soundLabel(sound.toggle()); sound.music(viewIdx, viewIdx === TOTAL); setNightSounds(); });
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
		var rows = '<thead><tr><th>Night</th><th>Date</th><th>Land</th><th>Sky</th><th>Weather</th><th>Landmark</th><th>Encounter</th><th>Critters</th><th>Camp</th><th>Reading</th><th>Note</th></tr></thead><tbody>';
		var from = new Date(JOURNEY_READINGS_FROM + 'T00:00:00');
		for (var k = 0; k <= END; k++) {
			var p = planFor(k), d = dateOfDay(k), r = JOURNEY_READINGS[clamp(Math.round((d - from) / DAY), 0, JOURNEY_READINGS.length - 1)];
			rows += '<tr data-k="' + k + '" class="w-' + p.weather + '"><td>' + (k + 1) + '</td><td>' + d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}) + '</td><td>' + stageAt(k).label + '</td><td>' + p.sky + '</td><td>' + p.weather +
				'</td><td>' + (p.landmark || '') + '</td><td>' + (p.encounter || '') + '</td><td>' + (p.critters || []).join(', ') + '</td><td>' + (p.camp ? 'yes' : '') + '</td><td>' + r.ref + '</td><td>' + (p.note || '') + '</td></tr>';
		}
		table.querySelector('table').innerHTML = rows + '</tbody>';
		table.addEventListener('click', function(e) { var tr = e.target.closest('tr[data-k]'); if (tr) { playNight(+tr.dataset.k, 0.3); canvas.scrollIntoView({behavior: 'smooth'}); } });
		// what's covered: every weather, landmark, encounter and critter, with its first night
		var seen = {};
		for (k = 0; k <= END; k++) { var q = planFor(k); [q.weather, q.landmark, q.encounter].concat(q.critters || []).forEach(function(x) { if (x && !(x in seen)) seen[x] = k + 1; }); }
		// for automated review: jump to a moment of a night and hold it there
		window.journeyTest = {
			pip: function() { return pip.box; },
			findPip: function() { findPip(); },
			owl: function() { spawnCritter('owl'); },
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
			sound.update({wind: night.wind * (w === 'wind' ? 1 : 0.4), rain: w === 'rain' || w === 'storm' ? lv : 0, sandstorm: w === 'sandstorm' ? lv : 0,
				storm: w === 'storm' ? lv : 0, clear: (w === 'clear' || w === 'haze') && night.day !== TOTAL, camp: !!night.plan.camp && t > 0.85,
				water: nearBy(['river', 'oasis', 'heron', 'well']), sheep: nearBy(['shepherds', 'sheep']), walking: walk});
			// the animals they pass call out now and then while they're in view (sheep and lambs, goats, a donkey)
			PIECES.forEach(function(p) {
				if (!playing || cam < p.pass - 0.16 || cam > p.pass + 0.12) return;
				// (the merchants' caravan: their camels grumbling and a donkey braying, a little quieter as they're farther off)
				var calls = /sheep|shepherds/.test(p.kind) ? ['sheep', 'lamb'] : p.kind === 'herder' ? ['goat', 'goat', 'sheep'] : p.kind === 'donkey' ? ['donkey'] : p.kind === 'caravan' ? ['camel-grunt', 'camel-grunt', 'donkey', 'camel-grunt'] : null;
				if (calls && clock > (p.nextCall || 0)) {
					if (p.nextCall) sound.animal(calls[Math.floor(Math.random() * calls.length)], p.kind === 'caravan' ? 0.22 : 0.35);
					p.nextCall = clock + (p.nextCall ? (p.kind === 'caravan' ? 2.5 + Math.random() * 3 : 4 + Math.random() * 5) : 0.8);
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
		var toFirst = Math.round((new Date(2026, 11, 4) - day) / DAY);
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
	if (over) {
		// once they're home: a still picture of them at the palace, and a simple message
		document.getElementById('done').hidden = false;
		['when', 'title', 'caption'].forEach(function(id) { document.getElementById(id).style.display = 'none'; });
		document.querySelector('.player').style.display = 'none';
		document.getElementById('today').style.display = 'none';
		playNight(END, 0); show.elapsed = show.seconds; cam = stretch(END)[1]; playing = false; walk = 0;
		paint(); setRunning(true);
		return;
	}
	if (reduceMotion) { playNight(viewIdx); paint(); updateOverlay(); }
	else { playNight(viewIdx, 1.6); setRunning(true); }
	setInterval(drawText, 60000);
})();
