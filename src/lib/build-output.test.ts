import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

describe('built site smoke tests', () => {
  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error('dist/ not found — run `npm run build` before this test');
    }
  });

  it('homepage has a title and description', async () => {
    const html = await readFile(path.join(DIST, 'index.html'), 'utf-8');
    expect(html).toMatch(/<title>.*TallSource.*<\/title>/);
    expect(html).toMatch(/<meta name="description"/);
  });

  it('brand page contains JSON-LD with Organization', async () => {
    const html = await readFile(path.join(DIST, 'brands/ely-cattleman.html'), 'utf-8');
    expect(html).toMatch(/application\/ld\+json/);
    expect(html).toMatch(/"@type":"Organization"/);
    expect(html).toMatch(/"@type":"SizeSpecification"/);
  });

  it('brand page contains semantic size chart table', async () => {
    const html = await readFile(path.join(DIST, 'brands/ely-cattleman.html'), 'utf-8');
    expect(html).toMatch(/<table/);
    expect(html).toMatch(/<th[^>]*>Chest<\/th>/);
  });

  it('sizing guide has FAQPage schema', async () => {
    const html = await readFile(path.join(DIST, 'sizing-guide.html'), 'utf-8');
    expect(html).toMatch(/"@type":"FAQPage"/);
  });

  it('robots.txt allows GPTBot, ClaudeBot, Google-Extended', async () => {
    const txt = await readFile(path.join(DIST, 'robots.txt'), 'utf-8');
    expect(txt).toMatch(/GPTBot/);
    expect(txt).toMatch(/ClaudeBot/);
    expect(txt).toMatch(/Google-Extended/);
  });

  it('sitemap-0.xml contains brand and core pages', async () => {
    const xml = await readFile(path.join(DIST, 'sitemap-0.xml'), 'utf-8');
    expect(xml).toMatch(/\/brands\/ely-cattleman/);
    expect(xml).toMatch(/\/sizing-guide/);
    expect(xml).toMatch(/\/methodology/);
  });
});
