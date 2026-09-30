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

	// footer copyright year
	document.querySelectorAll('.year').forEach(function(el) {
		el.textContent = new Date().getFullYear();
	});
});
