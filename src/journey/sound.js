// Sound for The Journey: real recordings, mixed low, off until the visitor turns it on.
//
//   amb-*     background loops, faded in and out with the weather and what they're passing
//   one-shot  thunder, a camel's grumble, an owl, a sheep, lamb, goat or donkey, the shofar at Jerusalem
//   music-*   background music, a different piece on different nights
//
// Files live in /journey/audio/ (made by docs/sound/process-audio.py, which also writes audio-ready.js).
// A sound that isn't there yet is simply silent.
var JourneySound = (function() {
	'use strict';

	var READY = window.JOURNEY_AUDIO_READY || [];
	var KEY = 'journey-sound';
	// background loops and how loud each is at full strength (the mix is kept low on purpose)
	var BEDS = {
		'amb-night': 0.35, 'amb-crickets': 0.18, 'amb-wind': 0.4, 'amb-sandstorm': 0.55, 'amb-rain': 0.4, 'amb-storm-rain': 0.5,
		'amb-campfire': 0.35, 'amb-water': 0.3, 'amb-sheep': 0.25, 'amb-camel-bells': 0.16, 'amb-footsteps': 0.22
	};
	var MUSIC_LEVEL = 0.28;

	var ac = null, master, musicGain, buffers = {}, loading = {}, beds = {}, on = false, music = null, musicName = '', nextGrunt = 0;

	function has(name) { return READY.indexOf(name) >= 0; }
	function variants(prefix) { return READY.filter(function(n) { return n === prefix || n.indexOf(prefix + '-') === 0; }); }
	function load(name) {
		if (!has(name) || buffers[name] || loading[name]) return;
		loading[name] = fetch('/journey/audio/' + name + '.mp3?v=' + (window.JOURNEY_AUDIO_VERSION || '')).then(function(r) { return r.arrayBuffer(); })
			.then(function(b) { return ac.decodeAudioData(b); }).then(function(buf) { buffers[name] = buf; }).catch(function() {});
	}
	function start() {
		if (ac) return;
		ac = new (window.AudioContext || window.webkitAudioContext)();
		master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
		musicGain = ac.createGain(); musicGain.gain.value = MUSIC_LEVEL; musicGain.connect(master);
		// only what every night needs straight away; the rest load the first time they're wanted (saves data on phones)
		['amb-night', 'amb-camel-bells', 'amb-footsteps'].forEach(load);
		variants('camel-grunt').forEach(load);
	}

	// a background loop: starts silently the first time it's wanted, then just fades up and down
	function bed(name, level) {
		var b = beds[name];
		if (!b) {
			if (!level || !buffers[name]) { load(name); return; }
			var src = ac.createBufferSource(); src.buffer = buffers[name]; src.loop = true;
			var g = ac.createGain(); g.gain.value = 0;
			src.connect(g); g.connect(master); src.start(0, Math.random() * buffers[name].duration);
			b = beds[name] = {gain: g, level: 0};
		}
		if (Math.abs(b.level - level) > 0.005) { b.gain.gain.setTargetAtTime(level, ac.currentTime, 1.2); b.level = level; }
	}
	function once(prefix, volume, delay) {
		if (!on) return;
		variants(prefix).forEach(load);   // load on first use (it plays from the next time)
		var list = variants(prefix).filter(function(n) { return buffers[n]; });
		if (!list.length) return;
		var src = ac.createBufferSource(), g = ac.createGain();
		src.buffer = buffers[list[Math.floor(Math.random() * list.length)]];
		src.playbackRate.value = 0.94 + Math.random() * 0.12;              // no two quite the same
		g.gain.value = volume;
		src.connect(g); g.connect(master); src.start(ac.currentTime + (delay || 0));
		return src;
	}

	// ----- called by the scene -----
	// state: {wind, rain, storm, sandstorm 0..1, clear, camp, water, sheep, walking 0..1}
	function update(state) {
		if (!on) return;
		if (state.storm > 0) variants('thunder').forEach(load);   // ready before the first strike
		var calm = 1 - Math.max(state.storm, state.sandstorm, state.rain * 0.7);
		bed('amb-night', BEDS['amb-night'] * calm);
		bed('amb-crickets', state.clear ? BEDS['amb-crickets'] * calm : 0);
		bed('amb-wind', BEDS['amb-wind'] * Math.min(1, state.wind + state.storm * 0.4));
		bed('amb-sandstorm', BEDS['amb-sandstorm'] * state.sandstorm);
		bed('amb-rain', BEDS['amb-rain'] * state.rain * (1 - state.storm));
		bed('amb-storm-rain', BEDS['amb-storm-rain'] * state.storm);
		bed('amb-campfire', state.camp ? BEDS['amb-campfire'] : 0);
		bed('amb-water', BEDS['amb-water'] * state.water);
		bed('amb-sheep', BEDS['amb-sheep'] * state.sheep);
		bed('amb-camel-bells', BEDS['amb-camel-bells'] * state.walking);
		bed('amb-footsteps', BEDS['amb-footsteps'] * state.walking);
		// a camel grumbles now and then while they walk
		// a camel grumbles now and then while they walk: the first a few seconds in, then every 12 to 25 seconds
		if (!nextGrunt) nextGrunt = ac.currentTime + 4 + Math.random() * 5;
		if (state.walking > 0.8 && ac.currentTime > nextGrunt) {
			once('camel-grunt', 0.3);
			nextGrunt = ac.currentTime + (12 + Math.random() * 13) / (state.fast || 1);   // more often in the time-lapse
		}
	}
	function thunder(near) {
		if (!on) return;
		once(near ? 'thunder-near' : 'thunder-far', near ? 0.8 : 0.55);
		musicGain.gain.setTargetAtTime(MUSIC_LEVEL * 0.4, ac.currentTime, 0.1);   // the music dips under the thunder
		musicGain.gain.setTargetAtTime(MUSIC_LEVEL, ac.currentTime + 2.5, 1);
	}
	function hoot() { once('owl', 0.4, 0.6); }
	function animal(kind, volume) { once(kind, volume || 0.35, 0.3); }
	// fetch tonight's animal sounds ahead of time, so the first bleat isn't lost while it downloads
	function preload(prefixes) { if (!ac) return; prefixes.forEach(function(p) { variants(p).forEach(load); }); }

	// music: one piece per night, looped and faded in
	function setMusic(nightIndex, christmas) {
		var list = variants('music').filter(function(n) { return n !== 'music-christmas'; });
		if (christmas && has('music-christmas')) list = ['music-christmas'];   // its own piece for Christmas Day
		if (!list.length) return;
		musicName = list[nightIndex % list.length];
		if (!on) return;
		if (music && music.name === musicName) return;
		if (music) { var old = music; old.gain.gain.setTargetAtTime(0, ac.currentTime, 1); setTimeout(function() { old.el.pause(); }, 4000); }
		var el = new Audio('/journey/audio/' + musicName + '.mp3?v=' + (window.JOURNEY_AUDIO_VERSION || '')); el.loop = true; el.crossOrigin = 'anonymous';
		var g = ac.createGain(); g.gain.value = 0;
		ac.createMediaElementSource(el).connect(g); g.connect(musicGain);
		el.play().catch(function() {});
		g.gain.setTargetAtTime(1, ac.currentTime, 2);
		music = {el: el, gain: g, name: musicName};
	}

	function toggle(want) {
		on = want == null ? !on : want;
		try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
		if (on) { start(); ac.resume(); }
		else if (ac) { Object.keys(beds).forEach(function(k) { beds[k].gain.gain.setTargetAtTime(0, ac.currentTime, 0.3); beds[k].level = 0; }); if (music) { music.el.pause(); music = null; } }
		return on;
	}
	function wanted() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }

	return {preload: preload, toggle: toggle, isOn: function() { return on; }, wanted: wanted, update: update, thunder: thunder, hoot: hoot, animal: animal,
		music: setMusic, step: function() {}, bell: function() {}, hasAny: function() { return READY.length > 0; }};
})();
