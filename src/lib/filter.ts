import type { SearchIndexEntry } from './search-index';

export interface FilterState {
  fit_styles: string[];
  styles: string[];
  categories: string[];
  activities: string[];
  tall_sizes: string[];
  price_tiers: string[];
  min_sleeve_in: number | null;
  min_inseam_in: number | null;
}

const anyOf = (selected: string[], values: string[]) =>
  selected.length === 0 || selected.some((s) => values.includes(s));

export function applyFilter(
  entries: SearchIndexEntry[],
  state: FilterState
): SearchIndexEntry[] {
  return entries.filter((e) => {
    if (!anyOf(state.fit_styles, e.fit_styles)) return false;
    if (!anyOf(state.styles, e.styles)) return false;
    if (!anyOf(state.categories, e.categories)) return false;
    if (!anyOf(state.activities, e.activities)) return false;
    if (!anyOf(state.tall_sizes, e.tall_sizes_offered)) return false;
    if (state.price_tiers.length > 0 && !state.price_tiers.includes(e.price_tier)) return false;
    if (state.min_sleeve_in !== null) {
      if (e.max_sleeve_in === null || e.max_sleeve_in < state.min_sleeve_in) return false;
    }
    if (state.min_inseam_in !== null) {
      if (e.max_inseam_in === null || e.max_inseam_in < state.min_inseam_in) return false;
    }
    return true;
  });
}
