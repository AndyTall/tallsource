import { useEffect, useMemo, useState } from 'react';
import { applyFilter, type FilterState } from '../lib/filter';
import type { SearchIndexEntry } from '../lib/search-index';

const FIT_STYLES = ['slim-tall', 'standard-tall', 'big-and-tall'];
const REGULAR_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const TALL_SIZES = ['ST', 'SXT', 'MT', 'MXT', 'LT', 'LXT', 'XLT', 'XLXT', 'XXLT', '2XLT', '2XLXT', '3XLT', '3XLXT', '4XLT', '5XLT'];
const CATEGORIES = ['shirts', 'pants', 'suits', 'outerwear', 'activewear', 'underwear'];
const PRICE_TIERS = ['$', '$$', '$$$'];

const emptyState: FilterState = {
  fit_styles: [], styles: [], categories: [], activities: [],
  tall_sizes: [], price_tiers: [],
  min_sleeve_in: null, min_inseam_in: null,
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export default function BrandFilter() {
  const [entries, setEntries] = useState<SearchIndexEntry[]>([]);
  const [state, setState] = useState<FilterState>(emptyState);

  useEffect(() => {
    fetch('/api/search-index.json')
      .then((r) => r.json())
      .then(setEntries);
  }, []);

  const filtered = useMemo(() => applyFilter(entries, state), [entries, state]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6 rounded-lg border border-slate-200 p-4">
        <FilterGroup
          label="Fit"
          options={FIT_STYLES}
          selected={state.fit_styles}
          onToggle={(v) => setState((s) => ({ ...s, fit_styles: toggle(s.fit_styles, v) }))}
        />
        <FilterGroup
          label="Regular sizes (long-cut brands)"
          options={REGULAR_SIZES}
          selected={state.tall_sizes}
          onToggle={(v) => setState((s) => ({ ...s, tall_sizes: toggle(s.tall_sizes, v) }))}
        />
        <FilterGroup
          label="Tall sizes"
          options={TALL_SIZES}
          selected={state.tall_sizes}
          onToggle={(v) => setState((s) => ({ ...s, tall_sizes: toggle(s.tall_sizes, v) }))}
        />
        <FilterGroup
          label="Categories"
          options={CATEGORIES}
          selected={state.categories}
          onToggle={(v) => setState((s) => ({ ...s, categories: toggle(s.categories, v) }))}
        />
        <FilterGroup
          label="Price"
          options={PRICE_TIERS}
          selected={state.price_tiers}
          onToggle={(v) => setState((s) => ({ ...s, price_tiers: toggle(s.price_tiers, v) }))}
        />
        <NumericFilter
          label="Min sleeve length (inches)"
          value={state.min_sleeve_in}
          onChange={(v) => setState((s) => ({ ...s, min_sleeve_in: v }))}
        />
        <NumericFilter
          label="Min inseam (inches)"
          value={state.min_inseam_in}
          onChange={(v) => setState((s) => ({ ...s, min_inseam_in: v }))}
        />
        <button
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() => setState(emptyState)}
        >
          Reset filters
        </button>
      </aside>
      <section>
        <p className="mb-4 text-sm text-slate-600">
          Showing {filtered.length} of {entries.length} brands
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((b) => (
            <a
              key={b.slug}
              href={`/brands/${b.slug}`}
              className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-400"
            >
              <h3 className="text-lg font-semibold">{b.name}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {b.price_tier} · {b.fit_styles.join(', ')}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Tall sizes: {b.tall_sizes_offered.join(', ') || '—'}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterGroup(props: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{props.label}</h4>
      <div className="space-y-1">
        {props.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={props.selected.includes(o)}
              onChange={() => props.onToggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function NumericFilter(props: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{props.label}</label>
      <input
        type="number"
        step="0.5"
        value={props.value ?? ''}
        onChange={(e) =>
          props.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
        }
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
