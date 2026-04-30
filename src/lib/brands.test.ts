import { describe, it, expect } from 'vitest';
import { parseBrandYaml } from './brands';

const validYaml = `
slug: test-brand
name: Test Brand
website: https://example.com
price_tier: $$
fit_styles:
  - standard-tall
styles:
  - casual
categories:
  - shirts
tall_sizes_offered:
  - LT
  - XLT
size_charts:
  tops:
    - size: LT
      chest: [42, 44]
      sleeve: [36, 37]
      neck: [16, 16.5]
  bottoms: []
verified:
  by: Andy W.
  on: 2026-04-30
  source_url: https://example.com/sizes
last_updated: 2026-04-30
`;

describe('parseBrandYaml', () => {
  it('parses valid YAML into a Brand', () => {
    const brand = parseBrandYaml(validYaml, 'test-brand.yml');
    expect(brand.slug).toBe('test-brand');
    expect(brand.tall_sizes_offered).toEqual(['LT', 'XLT']);
  });

  it('throws with the file path on invalid YAML', () => {
    expect(() => parseBrandYaml('::: not yaml :::', 'broken.yml'))
      .toThrow(/broken\.yml/);
  });

  it('throws with the file path on schema violation', () => {
    const bad = validYaml.replace('price_tier: $$', 'price_tier: free');
    expect(() => parseBrandYaml(bad, 'bad.yml')).toThrow(/bad\.yml/);
  });
});
