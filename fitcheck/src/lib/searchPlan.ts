// src/lib/searchPlan.ts

export type BucketKey =
  | "Tops"
  | "Dresses"
  | "Bottoms"
  | "Outerwear"
  | "Active"
  | "Swim"
  | "Footwear"
  | "Bags"
  | "Accessories";

export type Seed = { query: string; filters?: Record<string, any> };

export const BUCKETS: Record<BucketKey, { query: string; synonyms: string[] }> =
  {
    Tops: {
      query: "t-shirt",
      synonyms: ["button up shirt", "blouse", "hoodie", "knit sweater"],
    },
    Dresses: {
      query: "dress",
      synonyms: ["slip dress", "maxi dress", "day dress", "bodycon dress"],
    },
    Bottoms: {
      query: "jeans",
      synonyms: ["wide leg pants", "trousers", "cargo pants", "skirt"],
    },
    Outerwear: {
      query: "jacket",
      synonyms: ["bomber jacket", "trench coat", "denim jacket", "puffer"],
    },
    Active: {
      query: "leggings",
      synonyms: ["sports bra", "joggers", "sweatshirt", "workout set"],
    },
    Swim: {
      query: "swimsuit",
      synonyms: ["bikini set", "one piece swimsuit", "swim trunks"],
    },
    Footwear: {
      query: "sneakers",
      synonyms: ["chelsea boots", "heeled sandals", "loafers"],
    },
    Bags: {
      query: "tote bag",
      synonyms: ["crossbody bag", "shoulder bag", "backpack"],
    },
    Accessories: {
      query: "accessories",
      synonyms: ["leather belt", "baseball cap", "sunglasses", "hoop earrings"],
    },
  };

export const OCCASION_SEEDS: Record<string, string[]> = {
  Concert: ["graphic tee", "cargo pants", "bomber jacket"],
  Vacation: ["vacation dress", "linen shirt", "packable jacket"],
  "Date Night": ["going out top", "slip dress", "heeled sandals"],
  "Formal Dinner": ["blazer", "evening dress", "trouser"],
  Graduation: ["blazer", "midi dress", "loafer"],
  Birthday: ["party dress", "statement top"],
  "Wedding/Engagement": ["wedding guest dress", "strappy heel"],
};

export const VIBE_PREFIX: Record<string, string[]> = {
  "Elegant & Classy": ["elegant", "tailored", "polished"],
  Soft: ["soft", "romantic", "flowy"],
  Bold: ["bold", "statement", "vibrant"],
  Minimal: ["minimal", "clean", "classic"],
  Chic: ["chic", "sleek", "refined"],
  Trendy: ["trendy", "on trend", "viral"],
  Vintage: ["vintage", "retro"],
  Bohemian: ["boho", "bohemian"],
  Active: ["performance", "technical"],
};

export const SEASON_COLORS: Record<string, string[]> = {
  "True Winter": ["BLACK", "WHITE", "COBALT", "FUCHSIA"],
  "True Spring": ["CORAL", "TURQUOISE", "APPLE GREEN", "IVORY"],
  "True Summer": ["NAVY", "SOFT PINK", "SLATE", "LAVENDER"],
  "Soft Summer": ["DUSTY ROSE", "SAGE", "SLATE", "MIST BLUE"],
  "Bright Spring": ["BRIGHT CORAL", "LIME", "AQUA", "LEMON"],
  "True Autumn": ["RUST", "OLIVE", "MUSTARD", "CHOCOLATE"],
  "Light Spring": ["PEACH", "MINT", "BUTTER", "SOFT AQUA"],
  "Dark Winter": ["CHARCOAL", "BURGUNDY", "EMERALD", "INK"],
  "Don't know": [],
};

export function parseBudget(b: string | undefined): {
  min?: number;
  max?: number;
} {
  switch (b) {
    case "<$50":
      return { max: 50 };
    case "$50-100":
      return { min: 50, max: 100 };
    case "$100-250":
      return { min: 100, max: 250 };
    case "$250-500":
      return { min: 250, max: 500 };
    case "$500+":
      return { min: 500 };
    default:
      return {};
  }
}

export type SearchPlan = {
  seeds: Seed[];
  filters: Record<string, any>;
  budget?: { min?: number; max?: number };
  colors?: string[];
  occasion?: string;
  vibe?: string;
  cats?: BucketKey[];
};

export function buildSearchPlan(input: {
  occasion?: string;
  vibe?: string;
  colorSeason?: string;
  budget?: string;
  categories?: BucketKey[];
}): SearchPlan {
  const price = parseBudget(input.budget);
  const colors = SEASON_COLORS[input.colorSeason ?? ""] || [];
  const filters: Record<string, any> = {};
  if (colors.length) filters.color = colors;
  if (price.min != null || price.max != null) filters.price = price;

  const cats = (input.categories || []).slice(0, 4);
  const baseSeeds: Seed[] = cats.map((k) => ({ query: BUCKETS[k].query }));

  const occasionSeeds: Seed[] = (
    input.occasion ? OCCASION_SEEDS[input.occasion] || [] : []
  )
    .slice(0, 3)
    .map((q) => ({ query: q }));

  const prefixes = input.vibe ? VIBE_PREFIX[input.vibe] || [] : [];
  const decorated: Seed[] = [];
  const chosen = [...baseSeeds, ...occasionSeeds].slice(0, 6);
  chosen.forEach((s, i) => {
    const pref = prefixes[i % Math.max(1, prefixes.length)] || "";
    decorated.push({ query: pref ? `${pref} ${s.query}` : s.query });
  });

  const uniq = new Map<string, Seed>();
  decorated.forEach((s) => uniq.set(s.query.toLowerCase(), s));

  const seeds = Array.from(uniq.values()).map((s) =>
    Object.keys(filters).length ? { ...s, filters } : s
  );

  return {
    seeds,
    filters,
    budget: price,
    colors,
    occasion: input.occasion,
    vibe: input.vibe,
    cats,
  };
}
