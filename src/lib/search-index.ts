import type { Brand } from './schema';

export interface SearchIndexEntry {
  slug: string;
  name: string;
  price_tier: string;
  fit_styles: string[];
  styles: string[];
  categories: string[];
  activities: string[];
  tall_sizes_offered: string[];
  big_sizes_offered: string[];
  max_sleeve_in: number | null;
  max_inseam_in: number | null;
  min_chest_in: number | null;
  max_chest_in: number | null;
}

export function buildSearchIndex(brands: Brand[]): SearchIndexEntry[] {
  return brands.map((b) => {
    const tops = b.size_charts.tops;
    const bottoms = b.size_charts.bottoms;
    const sleevesFromTops = tops.map((t) => t.sleeve[1]);
    const sleevesFromDressShirts = b.size_charts.dress_shirts.map((d) => d.sleeve);
    const allSleeves = [...sleevesFromTops, ...sleevesFromDressShirts];
    const chestsMin = tops.map((t) => t.chest[0]);
    const chestsMax = tops.map((t) => t.chest[1]);
    const inseams = bottoms.map((bm) => bm.inseam);
    return {
      slug: b.slug,
      name: b.name,
      price_tier: b.price_tier,
      fit_styles: b.fit_styles,
      styles: b.styles,
      categories: b.categories,
      activities: b.activities,
      tall_sizes_offered: b.tall_sizes_offered,
      big_sizes_offered: b.big_sizes_offered,
      max_sleeve_in: allSleeves.length ? Math.max(...allSleeves) : null,
      max_inseam_in: inseams.length ? Math.max(...inseams) : null,
      min_chest_in: chestsMin.length ? Math.min(...chestsMin) : null,
      max_chest_in: chestsMax.length ? Math.max(...chestsMax) : null,
    };
  });
}
