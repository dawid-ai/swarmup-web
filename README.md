# swarmup-web: the swarmup.tech website

The source of [swarmup.tech](https://swarmup.tech), the website of
[SwarmUp](https://github.com/dawid-ai/swarmup). It ships on its own schedule: a change here goes
live without an app release.

## What is where

| Path                          | What it is                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `pages/home.html`             | The home page body. The build wraps it in the header and footer.                 |
| `pages/founder.html`          | The founder page body: who builds SwarmUp, and how to work with him.             |
| `pages/install.md`            | The install guide, written in Markdown.                                          |
| `assets/site.css`             | The theme for every page, the docs included: paper, ink and one acid accent.     |
| `assets/site.js`              | Presses the hero's four seats in turn, and fades sections in.                    |
| `assets/hero.js`              | Draws the mark in 3D in the home page hero, from `brand/icon.glb`.               |
| `assets/brand/`               | Renders of the 3D brand kit: lockups, tiles, illustrations, status loops.        |
| `assets/vendor/`              | three.js 0.165 (MIT), which `hero.js` loads from the site itself.                |
| `assets/logo.svg`             | The flat mark: the source of the tiles, and the header on a site without brand/. |
| `assets/favicon.svg`          | The browser tab icon; `favicon.ico` is its fallback.                             |
| `assets/apple-touch-icon.png` | The 180 x 180 icon for an iOS home screen: the kit's front icon on paper.        |
| `assets/og.png`               | The 1200 x 630 card a shared link shows: the headline and the mark.              |
| `build.mjs`                   | Builds the site into `dist/site`: pages, download page, docs, changelog, 404.    |
| `scripts/`                    | The docs build (`build-docs.mjs`) and the link check (`check-docs-links.mjs`).   |
| `test/`                       | Tests of the site and docs builds on scratch repos, and of the real home page.   |
| `.github/workflows/`          | `pages.yml` builds and deploys the site to GitHub Pages.                         |

Some pages come from files of the tool, [dawid-ai/swarmup](https://github.com/dawid-ai/swarmup), so
they never drift apart:

- `README.md` and `docs/*.md` become the docs under `/docs`.
- `UPDATES.md` becomes the changelog page.
- The download page reads the newest release of `dawid-ai/swarmup` from GitHub.

## Brand

The mark, the colors and the type follow the brand sheet of the 3D brand kit. The files in
`assets/brand/` are copies of its renders, resized for the web; replace them from the kit, don't
edit them here. Two files are re-encoded, not only resized: `brand/spin.webp` keeps every second
frame of the kit's 256 px loop (60 frames at 15 per second), which keeps the home page inside its
weight budget, and `apple-touch-icon.png` is the kit's front icon flattened onto paper, because
iOS paints transparency black. The rules that matter on a page:

- The mark goes on paper or ink only, never on acid, a photo or a gradient.
- Acid marks one thing per screen. Stamp red means failure and nothing else.
- Provider colors say who did the work. Keep the tile order: pink, orange, cyan, violet.
- A moving image has a still: `<picture>` swaps it in under `prefers-reduced-motion`.

## Examples and numbers on the pages

The ticker, the receipt, the example task and the app vignettes on the home page are invented
examples, written to be recognized. They are not measurements and they name no real project. The
receipt says so in its last line.

The founder section of the home page and the founder page are the exception: their figures come
from SwarmUp's own queue (`swarmup report --days 30`). They are typed into the pages, not read at
build time; change both pages and the date range together.

## Change the site

Keep a checkout of the tool next to this one: `C:devswarmup` and `C:devswarmup-web`. The
build reads it from `../swarmup`, or from `--root DIR` or `SWARMUP_TOOL`.

1. Edit the files above.
2. Check: `npm run lint`, `npm test`, then `npm run build` and open `dist/site/index.html`.
3. Publish: push to `main`. The `pages` workflow builds the site against `main` of the tool
   and deploys it to GitHub Pages, which serves it at `swarmup.tech`.

The workflow also runs once a day, so docs merged into the tool go live within a day; run it by
hand (**Actions > pages > Run workflow**) to publish them right away. A new release needs no
rebuild: the download page asks GitHub for the newest release in the browser.
