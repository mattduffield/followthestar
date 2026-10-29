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
tools/                  ← helper scripts run on your computer (not part of the website)
└── script-scenes.py    makes the volunteers page's script PDFs, one per scene
```

Styles used by only one page are kept in a `<style>` block inside that page. The header and footer are repeated in each HTML file, so if you change them, update every page.

## Previewing locally

Serve the `src` folder with any static web server, for example:

```sh
cd src
python3 -m http.server 8022
```

Then open http://localhost:8000.

Opening the files directly (`file://`) won't work properly, because the pages use root-relative paths like `/assets/...`.

## Common updates

Each year:

- **Dates and times:** in `src/index.html`, update the "Performances start…" and "Tickets go on sale…" text and the rows in the performance schedule (`<div class="schedule">`).
- **Year count:** in `src/faq/index.html`, update the "this will be our Nth year" answer.

## The script by scene (volunteers page)

The volunteers page (`src/volunteers/index.html`, under **Script**) has a Download button for each scene: the Assistant Guide's introduction and Scenes 1 to 8, in `src/volunteers/script/` (`introduction.pdf`, `scene-1.pdf` … `scene-8.pdf`). The "Open the full script" button goes to the Google Doc itself.

The scene PDFs are copies, made from the Google Doc: **after the script is edited in Google Docs, make them again**, then commit and push:

```sh
python3 tools/script-scenes.py
git add src/volunteers/script
git commit -m 'Volunteers: the scene scripts updated from the Google Doc'
git push
```

It needs only Python 3 and Google Chrome (which turns each scene into a PDF), and reads the Doc through its public link, so the Doc must stay shared as "Anyone with the link: Viewer". The file names never change, so the page's links don't need touching.

How it splits the script:

- Everything before the **SCENE 1** heading is the introduction.
- Each scene runs from its **SCENE n** heading (a paragraph starting with "SCENE" and the number) to the next one, so the guide's lines walking to the next scene stay with the scene they end. The line after the heading (or after a line break in the same paragraph) is the scene's title.
- Each PDF keeps the Doc's own formatting and has a small line at the top: the scene and the date it was made.

If a SCENE heading is renamed or removed, it stops with an error ("expected the introduction and scenes 1 to 8") instead of making wrong PDFs. If scenes are added or removed for good, update the check in `tools/script-scenes.py` (`range(9)`: the introduction plus 8 scenes) and the list on the volunteers page, then add the new wording to `src/lang/es/volunteers.json` and `src/lang/ru/volunteers.json` and run `python3 docs/site-lang.py build` so the Spanish and Russian pages match.

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

The site is hosted on Cloudflare Workers as static assets, connected to this GitHub repository. Every push to `main` deploys automatically.

`wrangler.jsonc` tells Cloudflare to publish the `src` folder and to use `src/404.html` for missing pages. The Worker project name in Cloudflare must match `name` in that file (`followthestar`).

To deploy manually, run `npx wrangler deploy`. To check the config without deploying, run `npx wrangler deploy --dry-run`.

The domain is set up in the Cloudflare dashboard:

- `followthestar.church` and `www.followthestar.church` are added under the Worker's Settings → Domains & Routes
- a Redirect Rule sends `www.followthestar.church` to `followthestar.church`
- SSL/TLS → Edge Certificates → Always Use HTTPS is turned on

To send extra response headers (such as `Strict-Transport-Security` or `X-Content-Type-Options: nosniff`), add a `src/_headers` file. Cloudflare applies it and doesn't publish it as a page.
