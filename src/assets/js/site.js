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

	// footer copyright year
	document.querySelectorAll('.year').forEach(function(el) {
		el.textContent = new Date().getFullYear();
	});
});
