export type UserPreferences = {
  occasion?: string[];
  vibe?: string[];
  colorSeason?: string[];
  budget?: string[];
  color?: string[]; // lightweight add for the green/red test
  [k: string]: unknown;
};

// Lightweight taxonomy. Expand over time.
const OCCASION_KEYWORDS: Record<string, string[]> = {
  Wedding: ["bridal", "lehenga", "gown", "sherwani"],
  "Wedding/Engagement": ["bridal", "lehenga", "gown"],
  Navratri: ["lehenga", "choli", "ghagra"],
  Diwali: ["ethnic", "festive", "saree", "lehenga"],
  Eid: ["modest", "abaya", "kaftan"],
  Christmas: ["red", "green", "party", "sequin"],
  Concert: ["band tee", "leather", "bomber"],
  "Formal Dinner": ["evening", "gown"],
};

const VIBE_KEYWORDS: Record<string, string[]> = {
  Minimal: ["minimal", "clean", "plain"],
  Elegant: ["elegant", "satin", "silk"],
  Trendy: ["streetwear", "y2k"],
  Chic: ["chic", "modern"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red"],
  green: ["green"],
  blue: ["blue"],
  black: ["black"],
  white: ["white"],
};

function normalize(str?: string): string {
  return (str || "").toLowerCase();
}

// Build up to 3 ranked query strings from the preferences
export function buildQueries(preferences: UserPreferences): string[] {
  const occasion = normalize(preferences.occasion?.[0] as string);
  const vibe = normalize(preferences.vibe?.[0] as string);
  const color = normalize((preferences.color?.[0] as string) || "");

  const occasionTerms = Object.entries(OCCASION_KEYWORDS)
    .find(([key]) => normalize(key) === occasion)?.[1] || [];

  const vibeTerms = Object.entries(VIBE_KEYWORDS)
    .find(([key]) => normalize(key) === vibe)?.[1] || [];

  const colorTerms = COLOR_KEYWORDS[color] || [];

  // Base product type anchors
  const anchors = ["dress", "gown", "outfit", "ethnic"];

  const q1 = uniq([...anchors.slice(0, 1), ...occasionTerms, ...vibeTerms, ...colorTerms]).join(" ");
  const q2 = uniq([anchors[1], ...vibeTerms, ...colorTerms]).join(" ");
  const q3 = uniq([anchors[2], ...occasionTerms, ...colorTerms]).join(" ");

  return [q1, q2, q3].filter(Boolean).slice(0, 3);
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}


