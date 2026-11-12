# swarmup-web: the swarmup.tech website

The source of [swarmup.tech](https://swarmup.tech), the website of
[SwarmUp](https://github.com/dawid-ai/swarmup). It ships on its own schedule: a change here goes
live without an app release.

## What is where

| Path                 | What it is                                                                      |
| -------------------- | ------------------------------------------------------------------------------- |
| `pages/home.html`    | The home page body. The build wraps it in the header and footer.                |
| `pages/founder.html` | The founder page body: who builds SwarmUp, and how to work with him.            |
| `pages/install.md`   | The install guide, written in Markdown.                                         |
| `assets/site.css`    | The theme for every page, the docs included: paper, ink and one acid accent.    |
| `assets/site.js`     | Steps the home page schematic through its stages, and fades sections in.        |
| `assets/logo.svg`    | The mark in the header (four squares: you, two AI providers, the orchestrator). |
| `assets/favicon.svg` | The browser tab icon.                                                           |
| `assets/og.png`      | The 1200 x 630 card a shared link shows: the headline and the receipt.          |
| `schematic.mjs`      | Draws the schematic SVG in `pages/home.html` from node and line lists.          |
| `build.mjs`          | Builds the site into `dist/site`: pages, download page, docs, changelog, 404.   |
| `scripts/`           | The docs build (`build-docs.mjs`) and the link check (`check-docs-links.mjs`).  |
| `test/`              | Tests of the site and docs builds on scratch repos, and of the real home page.  |
| `.github/workflows/` | `pages.yml` builds and deploys the site to GitHub Pages.                        |

Some pages come from files of the tool, [dawid-ai/swarmup](https://github.com/dawid-ai/swarmup), so
they never drift apart:

- `README.md` and `docs/*.md` become the docs under `/docs`.
- `UPDATES.md` becomes the changelog page.
- `docs/media/` holds the screenshots the home page shows.
- The download page reads the newest release of `dawid-ai/swarmup` from GitHub.

## Numbers on the pages

The receipt and the ticker on the home page, its 56:1 ratio, and the figures on the founder page
come from SwarmUp's own queue: `swarmup report --days 30` and `swarmup wrapped --days 30`. They
are typed into the pages, not read at build time. When you refresh them, change the home page,
the founder page and the date range together, and render `assets/og.png` again, because the card
shows the same receipt.

## Change the site

Keep a checkout of the tool next to this one: `C:devswarmup` and `C:devswarmup-web`. The
build reads it from `../swarmup`, or from `--root DIR` or `SWARMUP_TOOL`.

1. Edit the files above. To change the schematic, edit the lists in `schematic.mjs`, then run
   `npm run schematic`; the tests fail when the page and the lists disagree.
2. Check: `npm run lint`, `npm test`, then `npm run build` and open `dist/site/index.html`.
3. Publish: push to `main`. The `pages` workflow builds the site against `main` of the tool
   and deploys it to GitHub Pages, which serves it at `swarmup.tech`.

The workflow also runs once a day, so docs merged into the tool go live within a day; run it by
hand (**Actions > pages > Run workflow**) to publish them right away. A new release needs no
rebuild: the download page asks GitHub for the newest release in the browser.
