import yaml from 'js-yaml';
import { brandSchema, type Brand } from './schema';

export function parseBrandYaml(content: string, fileLabel: string): Brand {
  let raw: unknown;
  try {
    // Use JSON_SCHEMA so date-shaped strings (e.g. "2026-04-30") stay as
    // strings rather than being auto-converted to JS Date objects. The brand
    // schema validates date strings with a regex; Date instances would fail.
    raw = yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse YAML in ${fileLabel}: ${msg}`);
  }
  const result = brandSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Schema violation in ${fileLabel}: ${issues}`);
  }
  return result.data;
}

export async function loadAllBrands(): Promise<Brand[]> {
  const modules = import.meta.glob<string>('/src/data/brands/*.yml', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const brands: Brand[] = [];
  for (const [path, content] of Object.entries(modules)) {
    const fileName = path.split('/').pop() ?? path;
    brands.push(parseBrandYaml(content, fileName));
  }
  brands.sort((a, b) => a.name.localeCompare(b.name));
  return brands;
}
