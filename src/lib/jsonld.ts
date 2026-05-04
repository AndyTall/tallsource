import type { Brand } from './schema';
import { TALL_SIZE_VOCABULARY, BIG_SIZE_VOCABULARY, REGULAR_SIZE_VOCABULARY } from './schema';

type LdNode = Record<string, unknown>;

const TALL_SET = new Set<string>(TALL_SIZE_VOCABULARY);
const BIG_SET = new Set<string>(BIG_SIZE_VOCABULARY);
const REGULAR_SET = new Set<string>(REGULAR_SIZE_VOCABULARY);

function sizeGroupFor(size: string): 'Tall' | 'Big' | 'Regular' {
  if (TALL_SET.has(size)) return 'Tall';
  if (BIG_SET.has(size)) return 'Big';
  if (REGULAR_SET.has(size)) return 'Regular';
  return 'Tall';
}

export function brandToJsonLd(brand: Brand, pageUrl: string): LdNode[] {
  const nodes: LdNode[] = [];

  nodes.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: brand.website,
    sameAs: [pageUrl],
  });

  nodes.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: pageUrl,
    name: `${brand.name} — Tall Sizes & Size Chart`,
    about: { '@type': 'Organization', name: brand.name },
    dateModified: brand.last_updated,
  });

  for (const row of brand.size_charts.tops) {
    const measurements: LdNode[] = [
      {
        '@type': 'QuantitativeValue',
        name: 'Chest',
        minValue: row.chest[0],
        maxValue: row.chest[1],
        unitCode: 'INH',
      },
      {
        '@type': 'QuantitativeValue',
        name: 'Sleeve',
        minValue: row.sleeve[0],
        maxValue: row.sleeve[1],
        unitCode: 'INH',
      },
    ];
    if (row.neck) {
      measurements.push({
        '@type': 'QuantitativeValue',
        name: 'Neck',
        minValue: row.neck[0],
        maxValue: row.neck[1],
        unitCode: 'INH',
      });
    }
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'SizeSpecification',
      name: `${brand.name} ${row.size}`,
      sizeSystem: 'https://schema.org/WearableSizeSystemUS',
      sizeGroup: sizeGroupFor(row.size),
      suggestedMeasurement: measurements,
    });
  }

  for (const row of brand.size_charts.dress_shirts) {
    const measurements: LdNode[] = [
      {
        '@type': 'QuantitativeValue',
        name: 'Neck',
        value: row.neck,
        unitCode: 'INH',
      },
      {
        '@type': 'QuantitativeValue',
        name: 'Sleeve',
        value: row.sleeve,
        unitCode: 'INH',
      },
    ];
    if (row.chest) {
      measurements.push({
        '@type': 'QuantitativeValue',
        name: 'Chest',
        minValue: row.chest[0],
        maxValue: row.chest[1],
        unitCode: 'INH',
      });
    }
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'SizeSpecification',
      name: `${brand.name} Dress Shirt ${row.size}`,
      sizeSystem: 'https://schema.org/WearableSizeSystemUS',
      sizeGroup: 'Tall',
      suggestedMeasurement: measurements,
    });
  }

  return nodes;
}
