// The website build (build.mjs) on scratch repos, with a releases fixture instead of
// the GitHub API.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebGLSurface } from '../assets/hero-surface.js';

const scripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const BASE: Record<string, string> = {
  'package.json': '{"repository":"github:me/proj"}',
  'README.md': '# Proj\n\nSee [the protocol](docs/protocol.md).\n',
  'docs/protocol.md': '# Protocol\n\n## Statuses\n',
  'docs/media/shot.png': 'png',
  'UPDATES.md':
    '# Updates\n\n## v1.1.0 (2026-11-01)\n\n- New things. Every change: [CHANGELOG.md](CHANGELOG.md).\n',
  'CHANGELOG.md': '# Changelog\n',
  'swarmup-web/pages/home.html':
    '<h1>Proj</h1>\n<a href="download.html">Get it</a> <a href="docs/index.html">Docs</a>\n<img src="media/shot.png" alt="">\n',
  'swarmup-web/pages/install.md':
    '# Install\n\nGet it from the [download page](download.html), then read ' +
    '[statuses](../../docs/protocol.md#statuses), [the overview](../../README.md) and ' +
    '[the license](../../LICENSE).\n\n## macOS and Linux\n',
  LICENSE: 'MIT\n',
};

function repo(files: Record<string, string> = {}) {
  const d = mkdtempSync(join(tmpdir(), 'ops-site-'));
  dirs.push(d);
  for (const [name, body] of Object.entries({ ...BASE, ...files })) {
    mkdirSync(dirname(join(d, name)), { recursive: true });
    writeFileSync(join(d, name), body);
  }
  return d;
}

function node(script: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [join(scripts, script), ...args], {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, GITHUB_ACTIONS: '' },
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

const asset = (name: string, tag: string) => ({
  name,
  size: 3 * 1048576,
  browser_download_url: `https://github.com/me/proj/releases/download/${tag}/${name}`,
});
const RELEASES = [
  { tag_name: 'v1.2.0', draft: true, assets: [asset('Proj-Setup.exe', 'v1.2.0')] },
  { tag_name: 'v1.1.1', draft: false, assets: [asset('promo.mp4', 'v1.1.1')] },
  {
    tag_name: 'v1.1.0',
    draft: false,
    prerelease: false,
    html_url: 'https://github.com/me/proj/releases/tag/v1.1.0',
    published_at: '2026-11-01T10:00:00Z',
    assets: [
      asset('Proj-Setup.exe', 'v1.1.0'),
      asset('Proj-Setup.exe.blockmap', 'v1.1.0'),
      asset('latest.yml', 'v1.1.0'),
    ],
  },
];

const page = (d: string, p: string) => readFileSync(join(d, 'dist', 'site', p), 'utf8');

describe('website', () => {
  it('builds every page, names the newest release with an installer, and passes the link check', () => {
    const d = repo();
    const fixture = join(d, 'releases.json');
    writeFileSync(fixture, JSON.stringify(RELEASES));
    const r = node('../build.mjs', '--root', d, '--releases', fixture);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/download v1\.1\.0/);

    // Drafts and releases without an installer are skipped; update metadata is not listed.
    const download = page(d, 'download.html');
    expect(download).toContain(
      'href="https://github.com/me/proj/releases/download/v1.1.0/Proj-Setup.exe"',
    );
    expect(download).toContain('<strong>v1.1.0</strong> (stable, 2026-11-01)');
    expect(download).not.toContain('v1.2.0/');
    expect(download).not.toContain('blockmap</a>');
    expect(download).not.toContain('latest.yml</a>');
    // The browser check for a newer release knows which one the build showed.
    expect(download).toContain('var shown = "v1.1.0"');
    expect(download).toContain('https://api.github.com/repos/me/proj/releases');

    const install = page(d, 'install.html');
    expect(install).toContain('href="download.html"');
    expect(install).toContain('href="docs/protocol.html#statuses"');
    expect(install).toContain('href="docs/index.html"');
    expect(install).toContain('href="https://github.com/me/proj/blob/main/LICENSE"');
    expect(install).toContain('id="macos-and-linux"');

    expect(page(d, 'changelog.html')).toContain(
      'href="https://github.com/me/proj/blob/main/CHANGELOG.md"',
    );
    expect(page(d, 'index.html')).toContain('<h1>Proj</h1>');
    expect(existsSync(join(d, 'dist', 'site', 'media', 'shot.png'))).toBe(true);
    expect(page(d, 'CNAME')).toBe('swarmup.tech\n');
    expect(page(d, 'docs/protocol.html')).toContain('href="../index.html"');
    expect(page(d, '404.html')).toContain('"protocol.html"');
    expect(page(d, '404.html')).toContain('href="/site.css"');

    const check = node('check-docs-links.mjs', join(d, 'dist', 'site'));
    expect(check.code, check.out).toBe(0);
  });

  it('links the releases page when no release is known', () => {
    const d = repo();
    const r = node('../build.mjs', '--root', d, '--offline', '--domain', 'example.tech');
    expect(r.code, r.out).toBe(0);
    expect(page(d, 'download.html')).toContain('href="https://github.com/me/proj/releases"');
    expect(page(d, 'download.html')).toContain('var shown = null');
    expect(page(d, 'CNAME')).toBe('example.tech\n');
  });

  it('marks a hyphenated tag as a pre-release even when GitHub does not', () => {
    const d = repo();
    const fixture = join(d, 'releases.json');
    const beta = { ...RELEASES[2], tag_name: 'v2.0.0-beta.1' };
    writeFileSync(fixture, JSON.stringify([beta]));
    expect(node('../build.mjs', '--root', d, '--releases', fixture).code).toBe(0);
    expect(page(d, 'download.html')).toContain('(pre-release, 2026-11-01)');
  });

  it('fails on a broken link in a site page and writes nothing', () => {
    const d = repo({
      'swarmup-web/pages/install.md': '# Install\n\n[gone](../docs/gone.md)\n',
      'swarmup-web/pages/home.html': '<a href="nowhere.html">x</a>',
    });
    const r = node('../build.mjs', '--root', d, '--offline');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/swarmup-web\/pages\/install\.md: broken link \.\.\/docs\/gone\.md/);
    expect(r.out).toMatch(/swarmup-web\/pages\/home\.html: broken link nowhere\.html/);
    expect(existsSync(join(d, 'dist', 'site'))).toBe(false);
  });

  it('refuses an output folder that holds a source', () => {
    const d = repo();
    const r = node('../build.mjs', '--root', d, '--out', d, '--offline');
    expect(r.code).toBe(2);
    expect(existsSync(join(d, 'README.md'))).toBe(true);
  });

  it('lays the home page out full width and writes the script, stylesheet and icon it links (AO-0216)', () => {
    const d = repo({
      'swarmup-web/pages/home.html':
        '<h1>Proj</h1>\n<a href="download.html">Get it</a>\n<script src="site.js" defer></script>\n',
    });
    const r = node('../build.mjs', '--root', d, '--offline');
    expect(r.code, r.out).toBe(0);
    expect(page(d, 'index.html')).toContain('<main class="wide">');
    expect(page(d, 'install.html')).toContain('<main class="prose">');
    expect(page(d, 'index.html')).toContain('<link rel="icon" href="favicon.svg"');
    expect(page(d, 'install.html')).toContain('href="site.css"');
    expect(page(d, 'site.js')).toContain("querySelectorAll('[data-tab]')");
    expect(page(d, 'favicon.svg')).toMatch(/^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(page(d, '404.html')).toContain('href="/favicon.svg"');
    // The header shows the rendered lockup, from the site root on every page.
    expect(page(d, 'index.html')).toContain('<img src="brand/lockup-ink.png" alt="SwarmUp"');
    expect(page(d, 'docs/protocol.html')).toContain('<img src="../brand/lockup-ink.png"');
    expect(page(d, '404.html')).toContain('<img src="/brand/lockup-ink.png"');
    expect(existsSync(join(d, 'dist', 'site', 'brand', 'lockup-ink.png'))).toBe(true);
    expect(existsSync(join(d, 'dist', 'site', 'favicon.ico'))).toBe(true);
    // iOS takes its home screen icon from the site root on every page.
    expect(page(d, 'index.html')).toContain(
      '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
    );
    expect(page(d, 'docs/protocol.html')).toContain('href="../apple-touch-icon.png"');
    expect(page(d, '404.html')).toContain('href="/apple-touch-icon.png"');
    expect(existsSync(join(d, 'dist', 'site', 'apple-touch-icon.png'))).toBe(true);
    const check = node('check-docs-links.mjs', join(d, 'dist', 'site'));
    expect(check.code, check.out).toBe(0);
  });

  it('puts the docs pages in the site header, footer and stylesheet (AO-0216)', () => {
    const d = repo({
      'docs/guides/setup.md': '# Setup $1\n\nBack to [the protocol](../protocol.md).\n',
    });
    const r = node('../build.mjs', '--root', d, '--offline');
    expect(r.code, r.out).toBe(0);
    const top = page(d, 'docs/protocol.html');
    expect(top).toContain('<title>Protocol · SwarmUp</title>');
    expect(top).toContain('<header class="top">');
    expect(top).toContain('<main class="docs">');
    expect(top).toContain('<article class="prose">');
    expect(top).toContain('href="../site.css"');
    expect(top).toContain('<a href="../docs/index.html" aria-current="page">Docs</a>');
    expect(top).toContain('<footer class="bottom">');
    expect(top).not.toContain('{{');
    expect(page(d, 'docs/index.html')).toContain('<title>Docs · SwarmUp</title>');
    // A page one folder down reaches the site root two levels up; a $ in a title stays as is.
    const nested = page(d, 'docs/guides/setup.html');
    expect(nested).toContain('href="../../site.css"');
    expect(nested).toContain('<title>Setup $1 · SwarmUp</title>');
    expect(nested).toContain('href="../protocol.html"');
    // The old GitHub-style docs stylesheet is gone; the site's has the docs rules.
    expect(existsSync(join(d, 'dist', 'site', 'docs', 'style.css'))).toBe(false);
    expect(page(d, 'site.css')).toContain('main.docs');
    const check = node('check-docs-links.mjs', join(d, 'dist', 'site'));
    expect(check.code, check.out).toBe(0);
  });

  it('builds the founder page and its nav entry only when the root has one', () => {
    const without = repo();
    expect(node('../build.mjs', '--root', without, '--offline').code).toBe(0);
    expect(existsSync(join(without, 'dist', 'site', 'founder.html'))).toBe(false);
    expect(page(without, 'index.html')).not.toContain('founder.html');

    const d = repo({
      'swarmup-web/pages/founder.html':
        '<h1>Me</h1>\n<a href="download.html">Get it</a> <img src="media/shot.png" alt="">\n',
      'swarmup-web/pages/home.html': '<h1>Proj</h1>\n<a href="founder.html">Who</a>\n',
    });
    const r = node('../build.mjs', '--root', d, '--offline');
    expect(r.code, r.out).toBe(0);
    expect(page(d, 'founder.html')).toContain('<main class="wide">');
    expect(page(d, 'founder.html')).toContain('<title>Founder · SwarmUp</title>');
    expect(page(d, 'index.html')).toContain('<a href="founder.html">Founder</a>');
    expect(page(d, 'docs/protocol.html')).toContain('<a href="../founder.html">Founder</a>');
    expect(page(d, '404.html')).toContain('href="/founder.html"');
    expect(existsSync(join(d, 'dist', 'site', 'media', 'shot.png'))).toBe(true);
    const check = node('check-docs-links.mjs', join(d, 'dist', 'site'));
    expect(check.code, check.out).toBe(0);

    const broken = repo({ 'swarmup-web/pages/founder.html': '<a href="nowhere.html">x</a>' });
    const bad = node('../build.mjs', '--root', broken, '--offline');
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/swarmup-web\/pages\/founder\.html: broken link nowhere\.html/);
  });

  it('gives the home page a share card: title, description and image', () => {
    const d = repo();
    expect(node('../build.mjs', '--root', d, '--offline').code).toBe(0);
    const home = page(d, 'index.html');
    expect(home).toContain('<meta property="og:url" content="https://swarmup.tech/">');
    expect(home).toContain('<meta property="og:image" content="https://swarmup.tech/og.png">');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image">');
    // The card says how large its image is and what it shows.
    expect(home).toContain('<meta property="og:image:width" content="1200">');
    expect(home).toContain('<meta property="og:image:height" content="630">');
    expect(home).toMatch(/<meta property="og:image:alt" content="The SwarmUp mark[^"]+">/);
    expect(existsSync(join(d, 'dist', 'site', 'og.png'))).toBe(true);
    // A page without a description, and the docs, carry no card.
    expect(page(d, 'install.html')).not.toContain('og:title');
    expect(page(d, 'docs/protocol.html')).not.toContain('og:title');
  });

  it('leaves documents marked export-ignore out of the docs', () => {
    const d = repo({
      '.gitattributes': 'docs/internal/** export-ignore\ndocs/notes.md export-ignore\n',
      'docs/internal/plan.md': '# Internal plan\n',
      'docs/notes.md': '# Working notes\n',
    });
    // The attributes are read through git, so the scratch folder becomes a repository.
    expect(spawnSync('git', ['init', '-q'], { cwd: d, windowsHide: true }).status).toBe(0);
    const r = node('../build.mjs', '--root', d, '--offline');
    expect(r.code, r.out).toBe(0);
    expect(existsSync(join(d, 'dist', 'site', 'docs', 'protocol.html'))).toBe(true);
    expect(existsSync(join(d, 'dist', 'site', 'docs', 'internal', 'plan.html'))).toBe(false);
    expect(existsSync(join(d, 'dist', 'site', 'docs', 'notes.html'))).toBe(false);
    expect(page(d, 'docs/protocol.html')).not.toMatch(/Internal plan|Working notes/);
    const check = node('check-docs-links.mjs', join(d, 'dist', 'site'));
    expect(check.code, check.out).toBe(0);
  });

  it('writes the progressive 3D mark with its model, loader and local library', () => {
    const d = repo();
    expect(node('../build.mjs', '--root', d, '--offline').code).toBe(0);
    for (const file of [
      'hero.js',
      'hero-loader.js',
      'hero-surface.js',
      'brand/icon.glb',
      'vendor/three/three.module.min.js',
      'vendor/three/addons/loaders/GLTFLoader.js',
    ]) {
      expect(existsSync(join(d, 'dist', 'site', file)), file).toBe(true);
    }
    expect(page(d, 'hero-loader.js')).toContain('prefers-reduced-motion');
    const css = page(d, 'site.css');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/animation: none !important/);
  });

  it('builds the real home page: the 3D mark, four seats and the brand images', () => {
    const real =
      process.env.SWARMUP_TOOL ?? fileURLToPath(new URL('../../swarmup/', import.meta.url));
    const out = mkdtempSync(join(tmpdir(), 'ops-site-real-'));
    dirs.push(out);
    const r = node('../build.mjs', '--root', real, '--out', out, '--offline');
    expect(r.code, r.out).toBe(0);
    const home = readFileSync(join(out, 'index.html'), 'utf8');
    // Without JavaScript the still render shows, with all four seats as text under it.
    expect(home.match(/data-tab\b/g)).toHaveLength(4);
    expect(home).not.toMatch(/<button[^>]*data-tab[^>]*hidden/);
    expect(home).toMatch(/data-hero>\s*<img\s+src="brand\/mark-hero\.webp"/);
    expect(home).toContain('"three": "./vendor/three/three.module.min.js"');
    expect(home).not.toContain('<script type="module" src="hero.js">');
    expect(home).toContain('<script src="hero-loader.js" defer>');
    // Every brand image the page shows is in the site, and no app screenshot is.
    const images = [...home.matchAll(/\s(?:src|srcset)="(brand\/[^"]+)"/g)].map((m) => m[1]);
    expect(images.length).toBeGreaterThan(20);
    for (const image of images) expect(existsSync(join(out, image)), image).toBe(true);
    expect(home).not.toContain('media/');
    // No page names the product's former brand, and no internal document is built.
    const built = (dir: string): string[] =>
      readdirSync(join(out, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? built(join(dir, e.name))
          : e.name.endsWith('.html')
            ? [join(dir, e.name)]
            : [],
      );
    for (const file of built('.')) {
      expect(readFileSync(join(out, file), 'utf8'), file).not.toMatch(/agent ?ops/i);
    }
    for (const internal of ['proposals', 'launch', 'research']) {
      expect(existsSync(join(out, 'docs', internal))).toBe(false);
    }
    expect(existsSync(join(out, 'docs', 'swarmup-rename.html'))).toBe(false);
    // The founder section of the home page and the founder page quote the same 30 days. They are
    // the only measured figures; the receipt and the ticker are examples.
    const founder = readFileSync(join(out, 'founder.html'), 'utf8');
    for (const figure of ['1,977', '229.8']) {
      expect(home).toContain(figure);
      expect(founder).toContain(figure);
    }
  });

  it('keeps the static hero when the screen is narrow or reduced motion is preferred', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../assets/hero-loader.js', import.meta.url)),
      'utf8',
    );
    const runLoader = (wide: boolean, reduced: boolean) => {
      const frames: Array<() => void> = [];
      const scripts: Array<{ type?: string; src?: string }> = [];
      const media = (query: string) => ({
        matches: query.includes('900px') ? wide : reduced,
        addEventListener() {},
      });
      const window = {
        matchMedia: media,
        requestAnimationFrame(callback: () => void) {
          frames.push(callback);
        },
      };
      const document = {
        querySelector: () => ({}),
        createElement: () => ({}),
        head: { appendChild: (script: { type?: string; src?: string }) => scripts.push(script) },
      };
      runInNewContext(source, { document, window });
      return { frames, scripts };
    };

    expect(runLoader(false, false)).toMatchObject({ frames: [], scripts: [] });
    expect(runLoader(true, true)).toMatchObject({ frames: [], scripts: [] });

    const eligible = runLoader(true, false);
    expect(eligible.scripts).toHaveLength(0);
    eligible.frames.shift()?.();
    expect(eligible.scripts).toHaveLength(0);
    eligible.frames.shift()?.();
    expect(eligible.scripts).toEqual([{ type: 'module', src: 'hero.js' }]);
  });

  it('keeps the static hero without logging when WebGL is unavailable', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unavailable = {
      createElement: () => ({ getContext: () => null }),
    };
    const blocked = {
      createElement: () => ({
        getContext: () => {
          throw new Error('WebGL blocked');
        },
      }),
    };
    expect(createWebGLSurface(unavailable as unknown as Document)).toBeNull();
    expect(createWebGLSurface(blocked as unknown as Document)).toBeNull();
    expect(logged).not.toHaveBeenCalled();
    logged.mockRestore();
  });
});
