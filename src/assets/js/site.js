document.addEventListener('DOMContentLoaded', function() {
	var header = document.querySelector('header');
	var logo = document.querySelector('#heroLogo');

	function onScroll() {
		var scrollY = window.scrollY;

		if (logo)
			logo.style.left = 1.1 * scrollY + 'px';

		header.classList.toggle('scrolled', scrollY > 690);
	}

	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	// photo flip cards
	document.querySelectorAll('.photos figure').forEach(function(figure) {
		var front = figure.querySelector('.front');
		var back = figure.querySelector('.back');

		front.addEventListener('click', function() {
			front.classList.add('flipFront');
			back.classList.add('flipBack');
		});

		back.addEventListener('click', function() {
			back.classList.remove('flipBack');
			front.classList.remove('flipFront');
		});
	});

	// videos: show a poster image, and only load the player when clicked
	// data-video-src plays a video file natively; data-video-id embeds a YouTube video
	document.querySelectorAll('.video-facade').forEach(function(link) {
		link.addEventListener('click', function(evt) {
			evt.preventDefault();

			var player;

			if (link.dataset.videoSrc) {
				player = document.createElement('video');
				player.src = link.dataset.videoSrc;
				player.poster = link.querySelector('img').src;
				player.controls = true;
				player.playsInline = true;
				player.setAttribute('aria-label', link.dataset.videoTitle);
			} else {
				player = document.createElement('iframe');
				player.src = 'https://www.youtube-nocookie.com/embed/' + link.dataset.videoId + '?autoplay=1&rel=0&playsinline=1';
				player.title = link.dataset.videoTitle;
				player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
				player.referrerPolicy = 'strict-origin-when-cross-origin';
				player.allowFullscreen = true;
			}

			link.replaceWith(player);
			player.focus();

			if (player.play)
				player.play();
		});
	});

	// show elements from a set date onward, e.g. the Buy Tickets button from the public sale
	// <a data-show-after="2026-11-08T09:00:00-08:00" hidden>
	document.querySelectorAll('[data-show-after]').forEach(function(el) {
		if (Date.now() >= Date.parse(el.dataset.showAfter))
			el.hidden = false;
	});

	// someone whose browser is set to another language this page is in: a one-time suggestion to see it in theirs
	(function() {
		var WORDS = {es: ['¿Ver esta página en español?', 'Sí'], ru: ['Открыть эту страницу на русском?', 'Да'], en: ['See this page in English?', 'Yes']};
		var here = document.documentElement.lang || 'en';
		var want = String((navigator.languages || [navigator.language])[0] || '').slice(0, 2).toLowerCase();
		var alt = document.querySelector('link[rel="alternate"][hreflang="' + want + '"]');
		if (!alt || want === here || !WORDS[want] || document.getElementById('lang-ask')) return;
		try { if (localStorage.getItem('lang-asked')) return; } catch (e) { return; }
		var done = function() { try { localStorage.setItem('lang-asked', '1'); } catch (e) {} box.remove(); };
		var box = document.createElement('div'); box.className = 'lang-suggest'; box.lang = want;
		box.innerHTML = '<span></span><a></a><button type="button" aria-label="✕">✕</button>';
		box.querySelector('span').textContent = WORDS[want][0];
		var go = box.querySelector('a'); go.textContent = WORDS[want][1]; go.hreflang = want;
		go.href = new URL(alt.href).pathname + location.search + location.hash;
		go.addEventListener('click', done); box.querySelector('button').addEventListener('click', done);
		document.body.appendChild(box);
	})();

	// footer copyright year
	document.querySelectorAll('.year').forEach(function(el) {
		el.textContent = new Date().getFullYear();
	});
});
