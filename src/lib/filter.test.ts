import { describe, it, expect } from 'vitest';
import { applyFilter, type FilterState } from './filter';
import type { SearchIndexEntry } from './search-index';

const a: SearchIndexEntry = {
  slug: 'a', name: 'A', price_tier: '$$',
  fit_styles: ['slim-tall'], styles: ['casual'], categories: ['shirts'],
  activities: [], tall_sizes_offered: ['LT'], big_sizes_offered: [],
  max_sleeve_in: 37, max_inseam_in: null,
  min_chest_in: 38, max_chest_in: 42,
};
const b: SearchIndexEntry = {
  ...a, slug: 'b', name: 'B',
  fit_styles: ['big-and-tall'], categories: ['pants'],
  tall_sizes_offered: ['XLT', 'XXLT'],
  big_sizes_offered: ['2X', '3X'],
  max_sleeve_in: 38.5, max_inseam_in: 38,
  min_chest_in: 50, max_chest_in: 60,
};

describe('applyFilter', () => {
  const empty: FilterState = {
    fit_styles: [], styles: [], categories: [], activities: [],
    tall_sizes: [], price_tiers: [],
    min_sleeve_in: null, min_inseam_in: null,
  };

  it('returns all when filter is empty', () => {
    expect(applyFilter([a, b], empty)).toEqual([a, b]);
  });

  it('filters by fit_style (any-of)', () => {
    expect(applyFilter([a, b], { ...empty, fit_styles: ['slim-tall'] })).toEqual([a]);
  });

  it('filters by min sleeve length', () => {
    expect(applyFilter([a, b], { ...empty, min_sleeve_in: 38 })).toEqual([b]);
  });

  it('filters by min inseam, excludes brands with null inseam', () => {
    expect(applyFilter([a, b], { ...empty, min_inseam_in: 36 })).toEqual([b]);
  });

  it('filters by tall size offered', () => {
    expect(applyFilter([a, b], { ...empty, tall_sizes: ['XXLT'] })).toEqual([b]);
  });

  it('combines multiple filters with AND', () => {
    expect(applyFilter([a, b], {
      ...empty, fit_styles: ['big-and-tall'], min_sleeve_in: 38,
    })).toEqual([b]);
  });
});
