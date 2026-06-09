import type { ExtractedRecipeData } from './recipeExtractor';

type RecipeTagInferenceInput = Pick<
  ExtractedRecipeData,
  'title' | 'description' | 'ingredients' | 'instructions' | 'tags' | 'prepTime' | 'cookTime' | 'sourceUrl'
>;

type TagInferenceRule = {
  patterns: RegExp[];
  infer?: (recipe: RecipeTagInferenceInput) => boolean;
};

const TAG_INFERENCE_RULES: Record<string, TagInferenceRule> = {
  breakfast: {
    patterns: [
      /\bbreakfast\b/,
      /\bbrunch\b/,
      /\bpancakes?\b/,
      /\bwaffles?\b/,
      /\boatmeal\b/,
      /\bgranola\b/,
      /\bfrittata\b/,
      /\bfrench toast\b/,
      /\bbreakfast burritos?\b/,
    ],
  },
  lunch: {
    patterns: [
      /\blunch\b/,
      /\blunchbox\b/,
      /\bsandwich(?:es)?\b/,
      /\bwraps?\b/,
      /\bgrain bowls?\b/,
      /\brice bowls?\b/,
      /\bmeal prep\b/,
    ],
  },
  dinner: {
    patterns: [
      /\bdinner\b/,
      /\bsupper\b/,
      /\bmain course\b/,
      /\bmain dish\b/,
      /\bentree\b/,
      /\bpastas?\b/,
      /\blasagnas?\b/,
      /\bcasseroles?\b/,
      /\bstir fries?\b/,
      /\bcurr(?:y|ies)\b/,
      /\btacos?\b/,
      /\benchiladas?\b/,
      /\bpizzas?\b/,
      /\bburgers?\b/,
      /\brisottos?\b/,
      /\bmeatloaf\b/,
      /\bchilis?\b/,
    ],
  },
  dessert: {
    patterns: [
      /\bdesserts?\b/,
      /\bcakes?\b/,
      /\bcookies?\b/,
      /\bbrownies?\b/,
      /\bblondies?\b/,
      /\bcupcakes?\b/,
      /\bcheesecakes?\b/,
      /\bpies?\b/,
      /\bice cream\b/,
      /\bpuddings?\b/,
      /\bcrumbles?\b/,
      /\bcobblers?\b/,
      /\bmousses?\b/,
      /\btiramisu\b/,
      /\bfrosting\b/,
    ],
  },
  vegetarian: {
    patterns: [
      /\bvegetarian\b/,
      /\bmeatless\b/,
      /\bveggie\b/,
      /\bplant based\b/,
      /\bvegan\b/,
    ],
  },
  vegan: {
    patterns: [
      /\bvegan\b/,
      /\bplant based\b/,
    ],
  },
  'gluten-free': {
    patterns: [
      /\bgluten free\b/,
      /\bglutenfree\b/,
      /\bgf\b/,
    ],
  },
  quick: {
    patterns: [
      /\bquick\b/,
      /\beasy\b/,
      /\bfast\b/,
      /\bweeknight\b/,
      /\b(?:15|20|25|30) minute\b/,
      /\b(?:15|20|25|30) min\b/,
      /\bunder 30 minutes\b/,
      /\bin 30 minutes\b/,
    ],
    infer: recipe => {
      const totalMinutes = parseMinutes(recipe.prepTime) + parseMinutes(recipe.cookTime);
      return totalMinutes > 0 && totalMinutes <= 30;
    },
  },
  healthy: {
    patterns: [
      /\bhealthy\b/,
      /\bhealthier\b/,
      /\bwholesome\b/,
      /\blight\b/,
      /\blow calorie\b/,
      /\blow carb\b/,
      /\bprotein packed\b/,
      /\bhigh protein\b/,
      /\bwhole grain\b/,
      /\bnutritious\b/,
    ],
  },
  appetizer: {
    patterns: [
      /\bappetizers?\b/,
      /\bstarters?\b/,
      /\bhors d oeuvres?\b/,
      /\bparty bites?\b/,
      /\bdips?\b/,
      /\bbruschetta\b/,
      /\bdeviled eggs?\b/,
      /\bcrostini\b/,
    ],
  },
  soup: {
    patterns: [
      /\bsoups?\b/,
      /\bstews?\b/,
      /\bchowders?\b/,
      /\bbisques?\b/,
      /\bramens?\b/,
      /\bpho\b/,
    ],
  },
  salad: {
    patterns: [
      /\bsalads?\b/,
      /\bslaws?\b/,
      /\btabbouleh\b/,
      /\bpanzanella\b/,
    ],
  },
  'side-dish': {
    patterns: [
      /\bside dishes?\b/,
      /\bsides?\b/,
      /\bmashed potatoes\b/,
      /\broasted vegetables\b/,
      /\bcoleslaw\b/,
      /\brice pilaf\b/,
      /\bfries\b/,
    ],
  },
  snack: {
    patterns: [
      /\bsnacks?\b/,
      /\btrail mix\b/,
      /\benergy bites?\b/,
      /\bgranola bars?\b/,
      /\bpopcorn\b/,
      /\bchips\b/,
      /\bcrackers?\b/,
    ],
  },
  beverage: {
    patterns: [
      /\bbeverages?\b/,
      /\bdrinks?\b/,
      /\bsmoothies?\b/,
      /\bcocktails?\b/,
      /\bmocktails?\b/,
      /\blemonade\b/,
      /\bjuice\b/,
      /\blattes?\b/,
      /\btea\b/,
    ],
  },
};

function normalizeTagKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function normalizeSearchText(values: Array<string | undefined>): string {
  return values
    .filter((value): value is string => !!value)
    .join(' ')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceUrlSearchText(sourceUrl: string | undefined): string {
  if (!sourceUrl) return '';

  try {
    const parsed = new URL(sourceUrl);
    return decodeURIComponent(parsed.pathname);
  } catch {
    return sourceUrl;
  }
}

function parseMinutes(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.toLowerCase();
  let total = 0;

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (hourMatch) {
    total += Number(hourMatch[1]) * 60;
  }

  const minuteMatch = normalized.match(/(\d+)\s*(?:minutes?|mins?|m)\b/);
  if (minuteMatch) {
    total += Number(minuteMatch[1]);
  }

  if (!hourMatch && !minuteMatch && /^\s*\d+\s*$/.test(value)) {
    total = Number(value.trim());
  }

  return Number.isFinite(total) ? total : 0;
}

function collectExplicitSuggestedTags(tags: string[] | undefined, suggestedTags: string[]): string[] {
  if (!tags) return [];

  const suggestedByKey = new Map(
    suggestedTags.map(tag => [normalizeTagKey(tag), tag])
  );
  const selectedTags: string[] = [];

  tags.forEach(tag => {
    const suggestedTag = suggestedByKey.get(normalizeTagKey(tag));
    if (suggestedTag && !selectedTags.includes(suggestedTag)) {
      selectedTags.push(suggestedTag);
    }
  });

  return selectedTags;
}

export function inferSuggestedRecipeTags(
  recipe: RecipeTagInferenceInput,
  suggestedTags: string[]
): string[] {
  const normalizedSuggestedTags = suggestedTags
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
  const selectedTags = collectExplicitSuggestedTags(recipe.tags, normalizedSuggestedTags);
  const selectedTagSet = new Set(selectedTags);
  const searchText = normalizeSearchText([
    recipe.title,
    recipe.description,
    sourceUrlSearchText(recipe.sourceUrl),
    ...(recipe.tags || []),
    ...(recipe.ingredients || []),
    ...(recipe.instructions || []),
  ]);

  normalizedSuggestedTags.forEach(tag => {
    if (selectedTagSet.has(tag)) return;

    const rule = TAG_INFERENCE_RULES[tag];
    if (!rule) return;

    const matchesPattern = rule.patterns.some(pattern => pattern.test(searchText));
    if (matchesPattern || rule.infer?.(recipe)) {
      selectedTags.push(tag);
      selectedTagSet.add(tag);
    }
  });

  return selectedTags;
}
