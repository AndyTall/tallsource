import { useEffect, useState } from 'react';
import type { Brand } from '../lib/schema';

interface BrandsResponse {
  brands: Pick<Brand, 'slug' | 'name' | 'size_charts'>[];
}

export default function CompareTool({ initialSlugs }: { initialSlugs: string[] }) {
  const [allBrands, setAllBrands] = useState<BrandsResponse['brands']>([]);
  const [selected, setSelected] = useState<string[]>(initialSlugs);

  useEffect(() => {
    fetch('/api/brands-compare.json')
      .then((r) => r.json())
      .then((d: BrandsResponse) => setAllBrands(d.brands));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length > 0) {
      url.searchParams.set('b', selected.join(','));
    } else {
      url.searchParams.delete('b');
    }
    window.history.replaceState(null, '', url.toString());
  }, [selected]);

  const picked = allBrands.filter((b) => selected.includes(b.slug));

  return (
    <div>
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold">Add brand to compare</label>
        <select
          className="rounded border border-slate-300 px-3 py-2"
          onChange={(e) => {
            if (e.target.value && !selected.includes(e.target.value) && selected.length < 4) {
              setSelected([...selected, e.target.value]);
            }
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>Pick a brand...</option>
          {allBrands
            .filter((b) => !selected.includes(b.slug))
            .map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Compare up to 4 brands.</p>
      </div>

      {picked.length === 0 && (
        <p className="text-slate-500">Select at least one brand to start comparing.</p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {picked.map((b) => (
          <div key={b.slug} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{b.name}</h3>
              <button
                className="text-xs text-slate-500 hover:text-red-600"
                onClick={() => setSelected(selected.filter((s) => s !== b.slug))}
              >
                Remove
              </button>
            </div>
            {b.size_charts.tops.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr><th className="text-left">Size</th><th className="text-left">Chest</th><th className="text-left">Sleeve</th></tr>
                </thead>
                <tbody>
                  {b.size_charts.tops.map((r) => (
                    <tr key={r.size}>
                      <td>{r.size}</td>
                      <td>{r.chest[0]}–{r.chest[1]}"</td>
                      <td>{r.sleeve[0]}–{r.sleeve[1]}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
