import type { Brand } from './schema';
import { TALL_SIZE_VOCABULARY, BIG_SIZE_VOCABULARY } from './schema';

type LdNode = Record<string, unknown>;

const TALL_SET = new Set<string>(TALL_SIZE_VOCABULARY);
const BIG_SET = new Set<string>(BIG_SIZE_VOCABULARY);

function sizeGroupFor(size: string): 'Tall' | 'Big' {
  if (TALL_SET.has(size)) return 'Tall';
  if (BIG_SET.has(size)) return 'Big';
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
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'SizeSpecification',
      name: `${brand.name} ${row.size}`,
      sizeSystem: 'https://schema.org/WearableSizeSystemUS',
      sizeGroup: sizeGroupFor(row.size),
      suggestedMeasurement: [
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
        {
          '@type': 'QuantitativeValue',
          name: 'Neck',
          minValue: row.neck[0],
          maxValue: row.neck[1],
          unitCode: 'INH',
        },
      ],
    });
  }

  return nodes;
}
