import type { APIRoute } from 'astro';
import { loadAllBrands } from '../../lib/brands';
import { buildSearchIndex } from '../../lib/search-index';

export const GET: APIRoute = async () => {
  const brands = await loadAllBrands();
  const index = buildSearchIndex(brands);
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
