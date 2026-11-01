// The site is static: Cloudflare serves src/ as it is. This runs first only for the tickets pages (run_worker_first in
// wrangler.jsonc). Until the public sale opens, /tickets/ (and /es/tickets/, /ru/tickets/) sends visitors to the home
// page, which gives the date, so the Zeffy links can't be found early, even in the page's source. Volunteers have their
// own page for the pre-sale week (src/v/…). From the opening time on, the tickets page is served as usual.
const SALE_OPENS = '2026-11-08T09:00:00-08:00';   // Sunday, November 8, 9 am Pacific

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const m = url.pathname.match(/^\/(?:(es|ru)\/)?tickets(?:\/|$)/);
		if (m && Date.now() < Date.parse(env.SALE_OPENS || SALE_OPENS)) {   // (SALE_OPENS can be set to test it: wrangler dev --var)
			return new Response(null, {status: 302, headers: {Location: m[1] ? '/' + m[1] + '/' : '/', 'Cache-Control': 'no-store'}});
		}
		return env.ASSETS.fetch(request);
	}
};
