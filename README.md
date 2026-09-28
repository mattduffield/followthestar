# Follow the Star

Website for [Follow the Star](https://followthestar.church), a live walkthrough nativity in Gladstone, Oregon.

It's a plain static site: HTML, CSS and a little JavaScript. There is no server code, build step or package manager.

## Project layout

```
src/                    ← the website (deploy this folder)
├── index.html          home page
├── faq/index.html      FAQ page (served at /faq/)
├── 404.html            "page not found" page
├── assets/
│   ├── css/base.css    reset and utility styles
│   ├── css/site.css    shared header, footer and layout styles
│   ├── js/site.js      scroll effects, photo flip cards, footer year
│   └── images/         global/, home/, faq/
├── favicon.ico
├── manifest.json
├── browserconfig.xml
├── robots.txt
└── sitemap.xml
```

Styles used by only one page are kept in a `<style>` block inside that page. The header and footer are repeated in each HTML file, so if you change them, update every page.

## Previewing locally

Serve the `src` folder with any static web server, for example:

```sh
cd src
python3 -m http.server 8000
```

Then open http://localhost:8000.

Opening the files directly (`file://`) won't work properly, because the pages use root-relative paths like `/assets/...`.

## Common updates

Each year:

- **Dates and times:** in `src/index.html`, update the "Performances start…" and "Tickets go on sale…" text and the rows in the performance schedule (`<div class="schedule">`).
- **Year count:** in `src/faq/index.html`, update the "this will be our Nth year" answer.

## Adding a page

1. Create `src/<name>/index.html` by copying an existing page, so it keeps the header, footer and `<head>` tags.
2. Update the `<title>`, the description and `og:` meta tags, and the `application/ld+json` block.
3. Link to it as `/<name>/`.
4. Add it to `src/sitemap.xml`.

## External services

| Service | Used for |
|---|---|
| [TicketLeap](https://ftsgladstone.ticketleap.com/) | Ticket sales ("Buy Tickets" button) |
| [Church Center](https://oregonadventist.churchcenter.com/people/forms/579221) | Volunteer form (opens in a modal via `js.churchcenter.com`) |
| PayPal | Donate button on the home page |
| Google Tag Manager (`GTM-KBN7NC3`) | Analytics |
| Google Fonts | Inter and Merienda fonts |
| Google Maps | Embedded map on the home page |

## Deployment

Publish the `src` folder as the site root on any static host. The host should be configured to:

- serve `404.html` for missing pages (Netlify, Cloudflare Pages and GitHub Pages do this automatically)
- redirect HTTP to HTTPS, and `www.followthestar.church` to `followthestar.church`
- optionally, send security headers such as `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`
