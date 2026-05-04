import { z } from 'zod';

const PRICE_TIERS = ['$', '$$', '$$$'] as const;
const FIT_STYLES = ['slim-tall', 'standard-tall', 'big-and-tall'] as const;
const STYLES = [
  'casual', 'preppy', 'formal', 'dress', 'workwear', 'outdoor',
  'streetwear', 'vintage', 'heritage', 'western', 'athleisure',
  'performance', 'minimalist', 'tactical',
] as const;
const CATEGORIES = [
  'shirts', 'pants', 'suits', 'outerwear', 'activewear', 'underwear',
  'accessories', 'shoes',
] as const;
const ACTIVITIES = [
  'running', 'hiking', 'cycling', 'fishing', 'hunting',
  'motorsport', 'watersports', 'golf', 'climbing', 'skiing',
] as const;
const TALL_SIZES = [
  'ST', 'SXT',
  'MT', 'MXT',
  'LT', 'LXT',
  'XLT', 'XLXT',
  'XXLT', '2XLT', '2XLXT',
  '3XLT', '3XLXT',
  '4XLT',
  '5XLT',
] as const;
const BIG_SIZES = ['2X', '3X', '4X', '5X', '6X', '7X', '8X'] as const;
const TOP_SIZE_LABELS = [...TALL_SIZES, ...BIG_SIZES] as const;

const range = z
  .tuple([z.number(), z.number()])
  .refine(([min, max]) => min <= max, { message: 'min must be <= max' });

const topSizeRow = z.object({
  size: z.enum(TOP_SIZE_LABELS),
  chest: range,
  sleeve: range,
  neck: range.optional(),
  shoulder: range.optional(),
  body_length: range.optional(),
});

const bottomSizeRow = z.object({
  size: z.string(),
  waist: z.number(),
  inseam: z.number(),
  hip: z.number().optional(),
});

const dressShirtRow = z.object({
  size: z.string(),       // e.g., "16x35", "17.5x36"
  neck: z.number(),       // numeric inches
  sleeve: z.number(),     // numeric inches
  chest: range.optional(),  // optional [min, max]
});

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const brandSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  name: z.string().min(1),
  website: z.url(),
  price_tier: z.enum(PRICE_TIERS),
  fit_styles: z.array(z.enum(FIT_STYLES)).min(1),
  styles: z.array(z.enum(STYLES)).default([]),
  height_range_in: z
    .object({ min: z.number().int(), max: z.number().int() })
    .optional(),
  categories: z.array(z.enum(CATEGORIES)).min(1),
  activities: z.array(z.enum(ACTIVITIES)).default([]),
  tall_sizes_offered: z.array(z.enum(TALL_SIZES)).default([]),
  big_sizes_offered: z.array(z.enum(BIG_SIZES)).default([]),
  size_charts: z.object({
    tops: z.array(topSizeRow).default([]),
    bottoms: z.array(bottomSizeRow).default([]),
    dress_shirts: z.array(dressShirtRow).default([]),
  }),
  fit_notes: z.string().optional(),
  returns_summary: z.string().optional(),
  ships_to: z.array(z.string()).default([]),
  verified: z.object({
    by: z.string().min(1),
    on: dateString,
    source_url: z.url(),
    last_human_review: dateString.optional(),
  }),
  last_updated: dateString,
});

export type Brand = z.infer<typeof brandSchema>;

export const STYLE_VOCABULARY = STYLES;
export const FIT_STYLE_VOCABULARY = FIT_STYLES;
export const CATEGORY_VOCABULARY = CATEGORIES;
export const ACTIVITY_VOCABULARY = ACTIVITIES;
export const TALL_SIZE_VOCABULARY = TALL_SIZES;
export const BIG_SIZE_VOCABULARY = BIG_SIZES;
