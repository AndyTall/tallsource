import type { APIRoute } from 'astro';
import { loadAllBrands } from '../../lib/brands';

export const GET: APIRoute = async () => {
  const brands = await loadAllBrands();
  const slim = brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    size_charts: b.size_charts,
  }));
  return new Response(JSON.stringify({ brands: slim }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
