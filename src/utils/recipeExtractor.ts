// Utility functions for extracting recipe data from HTML

export interface ExtractedRecipeImage {
  url: string;
  alt?: string;
  source: 'recipe' | 'meta' | 'page';
}

export interface ExtractedRecipeData {
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  images?: ExtractedRecipeImage[];
  sourceUrl: string;
}

// Convert ISO 8601 duration to human-readable format
export function formatDuration(duration: string): string {
  if (!duration || !duration.startsWith('PT')) return duration;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  return parts.join(' ') || duration;
}

function parseHtml(html: string): Document | null {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(html, 'text/html');
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  const withoutTags = value.includes('<')
    ? parseHtml(`<!doctype html><body>${value}`)?.body.textContent || value
    : value;
  const decoded = parseHtml(`<!doctype html><body>${withoutTags}`)?.body.textContent || withoutTags;
  return decoded
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textFromUnknown(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeText(String(value));
  }
  if (Array.isArray(value)) {
    return normalizeText(value.map(textFromUnknown).filter(Boolean).join(' '));
  }
  if (typeof value === 'object') {
    const item = value as {
      text?: unknown;
      name?: unknown;
      headline?: unknown;
      item?: unknown;
      value?: unknown;
    };
    return (
      textFromUnknown(item.text) ||
      textFromUnknown(item.name) ||
      textFromUnknown(item.headline) ||
      textFromUnknown(item.item) ||
      textFromUnknown(item.value)
    );
  }
  return '';
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const normalized = normalizeText(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stringListFromUnknown(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(item => stringListFromUnknown(item)));
  }
  const text = textFromUnknown(value);
  return text ? [text] : [];
}

function parseInstructionList(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return stringListFromUnknown(value);
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(item => parseInstructionList(item)));
  }
  if (typeof value === 'object') {
    const item = value as {
      text?: unknown;
      name?: unknown;
      itemListElement?: unknown;
      item?: unknown;
      step?: unknown;
    };
    const nested = [
      ...parseInstructionList(item.itemListElement),
      ...parseInstructionList(item.item),
      ...parseInstructionList(item.step),
    ];
    if (nested.length > 0) return nested;

    const text = textFromUnknown(item.text) || textFromUnknown(item.name);
    return text ? [text] : [];
  }
  return [];
}

function firstString(value: unknown): string | undefined {
  const values = stringListFromUnknown(value);
  return values[0];
}

function tagListFromRecipe(item: Record<string, unknown>): string[] {
  const tags = [
    ...stringListFromUnknown(item.recipeCategory),
    ...stringListFromUnknown(item.recipeCuisine),
    ...stringListFromUnknown(item.keywords).flatMap(keyword =>
      keyword.split(',').map(part => normalizeText(part))
    ),
  ];
  return uniqueStrings(tags.map(tag => tag.toLowerCase()).filter(tag => tag.length <= 32));
}

function getMetaContent(doc: Document | null, selectors: string[]): string | undefined {
  if (!doc) return undefined;
  for (const selector of selectors) {
    const value = doc.querySelector<HTMLMetaElement>(selector)?.content;
    const text = normalizeText(value);
    if (text) return text;
  }
  return undefined;
}

function getFirstElementText(doc: Document | null, selectors: string[]): string | undefined {
  if (!doc) return undefined;
  for (const selector of selectors) {
    const text = normalizeText(doc.querySelector(selector)?.textContent);
    if (text) return text;
  }
  return undefined;
}

function getFirstElementAttribute(doc: Document | null, selectors: string[], attributes: string[]): string | undefined {
  if (!doc) return undefined;
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (!element) continue;
    for (const attribute of attributes) {
      const text = normalizeText(element.getAttribute(attribute));
      if (text) return text;
    }
  }
  return undefined;
}

function cleanPageTitle(title: string | undefined): string | undefined {
  const text = normalizeText(title);
  if (!text) return undefined;
  return text.split(/\s+[|-]\s+/)[0]?.trim() || text;
}

function collectTextList(doc: Document | null, selectors: string[], options: { minLength?: number; maxLength?: number } = {}): string[] {
  if (!doc) return [];
  const minLength = options.minLength ?? 1;
  const maxLength = options.maxLength ?? 500;
  const candidates: string[] = [];

  selectors.forEach(selector => {
    doc.querySelectorAll(selector).forEach(element => {
      const text = normalizeText(element.textContent)
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim();
      if (
        text.length >= minLength &&
        text.length <= maxLength &&
        !/^(ingredients?|instructions?|directions?|method)$/i.test(text)
      ) {
        candidates.push(text);
      }
    });
  });

  return uniqueStrings(candidates);
}

function resolveImageUrl(value: string | null | undefined, baseUrl: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.href;
  } catch {
    return null;
  }
}

function parseSrcSet(srcset: string | null | undefined): string[] {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map(candidate => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function addImageCandidate(
  images: ExtractedRecipeImage[],
  seen: Set<string>,
  baseUrl: string,
  value: string | null | undefined,
  source: ExtractedRecipeImage['source'],
  alt?: string | null
) {
  const url = resolveImageUrl(value, baseUrl);
  if (!url || seen.has(url)) return;

  seen.add(url);
  images.push({
    url,
    alt: alt?.trim() || undefined,
    source,
  });
}

function addStructuredImageCandidates(
  images: ExtractedRecipeImage[],
  seen: Set<string>,
  baseUrl: string,
  value: unknown
) {
  if (!value) return;

  if (typeof value === 'string') {
    addImageCandidate(images, seen, baseUrl, value, 'recipe');
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => addStructuredImageCandidates(images, seen, baseUrl, item));
    return;
  }

  if (typeof value === 'object') {
    const image = value as { url?: unknown; contentUrl?: unknown; thumbnailUrl?: unknown };
    [image.url, image.contentUrl, image.thumbnailUrl].forEach(candidate => {
      if (typeof candidate === 'string') {
        addImageCandidate(images, seen, baseUrl, candidate, 'recipe');
      }
    });
  }
}

function getFirstStructuredImageUrl(value: unknown, baseUrl: string): string | undefined {
  const images: ExtractedRecipeImage[] = [];
  addStructuredImageCandidates(images, new Set<string>(), baseUrl, value);
  return images[0]?.url;
}

function getJsonLdItems(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap(item => getJsonLdItems(item));
  }
  if (typeof data !== 'object') return [];

  const item = data as {
    '@graph'?: unknown;
    itemListElement?: unknown;
    item?: unknown;
    mainEntity?: unknown;
    about?: unknown;
  };

  return [
    data,
    ...getJsonLdItems(item['@graph']),
    ...getJsonLdItems(item.itemListElement),
    ...getJsonLdItems(item.item),
    ...getJsonLdItems(item.mainEntity),
    ...getJsonLdItems(item.about),
  ];
}

function isRecipeJsonLdItem(item: unknown): item is { '@type'?: string | string[]; image?: unknown } {
  if (!item || typeof item !== 'object') return false;
  const type = (item as { '@type'?: string | string[] })['@type'];
  if (Array.isArray(type)) return type.includes('Recipe');
  return typeof type === 'string' && type.includes('Recipe');
}

function getRecipeJsonLdItems(doc: Document | null): Record<string, unknown>[] {
  if (!doc) return [];
  const recipes: Record<string, unknown>[] = [];

  doc.querySelectorAll('script[type]').forEach(script => {
    const type = script.getAttribute('type')?.toLowerCase() || '';
    if (!type.includes('application/ld+json')) return;

    try {
      const data = JSON.parse(script.textContent || '');
      getJsonLdItems(data).forEach(item => {
        if (isRecipeJsonLdItem(item)) {
          recipes.push(item as Record<string, unknown>);
        }
      });
    } catch {
      // Keep looking; many pages have one malformed JSON-LD block and another valid one.
    }
  });

  return recipes;
}

function recipeCandidateScore(item: Record<string, unknown>): number {
  return [
    textFromUnknown(item.name),
    textFromUnknown(item.description),
    ...stringListFromUnknown(item.recipeIngredient),
    ...parseInstructionList(item.recipeInstructions),
    ...tagListFromRecipe(item),
  ].filter(Boolean).length;
}

function applyStructuredRecipe(result: ExtractedRecipeData, item: Record<string, unknown>, url: string) {
  result.title ||= textFromUnknown(item.name);
  result.description ||= textFromUnknown(item.description);

  const ingredients = stringListFromUnknown(item.recipeIngredient);
  if (!result.ingredients && ingredients.length > 0) {
    result.ingredients = ingredients;
  }

  const instructions = parseInstructionList(item.recipeInstructions);
  if (!result.instructions && instructions.length > 0) {
    result.instructions = instructions;
  }

  const tags = tagListFromRecipe(item);
  if (!result.tags && tags.length > 0) {
    result.tags = tags;
  }

  if (!result.prepTime && typeof item.prepTime === 'string') {
    result.prepTime = formatDuration(item.prepTime);
  }
  if (!result.cookTime && typeof item.cookTime === 'string') {
    result.cookTime = formatDuration(item.cookTime);
  }
  if (!result.servings) {
    result.servings = firstString(item.recipeYield) || firstString(item.yield);
  }
  if (!result.imageUrl && item.image) {
    result.imageUrl = getFirstStructuredImageUrl(item.image, url);
  }
}

export function extractImagesFromHtml(html: string, url: string): ExtractedRecipeImage[] {
  const images: ExtractedRecipeImage[] = [];
  const seen = new Set<string>();
  const doc = parseHtml(html);

  if (!doc) return images;

  doc.querySelectorAll('script[type]').forEach(script => {
    const type = script.getAttribute('type')?.toLowerCase() || '';
    if (!type.includes('application/ld+json')) return;

    try {
      const data = JSON.parse(script.textContent || '');
      getJsonLdItems(data).forEach(item => {
        if (isRecipeJsonLdItem(item)) {
          addStructuredImageCandidates(images, seen, url, item.image);
        }
      });
    } catch {
      // Ignore invalid JSON-LD and keep collecting images from the rest of the page.
    }
  });

  [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ].forEach(selector => {
    doc.querySelectorAll<HTMLMetaElement>(selector).forEach(meta => {
      addImageCandidate(images, seen, url, meta.content, 'meta');
    });
  });

  doc.querySelectorAll<HTMLLinkElement>('link[rel~="image_src"], link[as="image"]').forEach(link => {
    addImageCandidate(images, seen, url, link.getAttribute('href'), 'meta');
  });

  doc.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    const alt = img.getAttribute('alt');
    [
      img.getAttribute('src'),
      img.getAttribute('data-src'),
      img.getAttribute('data-lazy-src'),
      img.getAttribute('data-original'),
      img.getAttribute('data-pin-media'),
    ].forEach(candidate => addImageCandidate(images, seen, url, candidate, 'page', alt));

    [
      img.getAttribute('srcset'),
      img.getAttribute('data-srcset'),
      img.getAttribute('data-lazy-srcset'),
    ].flatMap(parseSrcSet).forEach(candidate => {
      addImageCandidate(images, seen, url, candidate, 'page', alt);
    });
  });

  doc.querySelectorAll<HTMLSourceElement>('source[srcset]').forEach(source => {
    parseSrcSet(source.getAttribute('srcset')).forEach(candidate => {
      addImageCandidate(images, seen, url, candidate, 'page');
    });
  });

  return images;
}

// Extract recipe data from HTML content
export function extractRecipeFromHtml(html: string, url: string): ExtractedRecipeData {
  const result: ExtractedRecipeData = { sourceUrl: url };
  const doc = parseHtml(html);
  const images = extractImagesFromHtml(html, url);
  if (images.length > 0) {
    result.images = images;
  }

  const structuredRecipe = getRecipeJsonLdItems(doc)
    .sort((a, b) => recipeCandidateScore(b) - recipeCandidateScore(a))[0];
  if (structuredRecipe) {
    applyStructuredRecipe(result, structuredRecipe, url);
  }

  // Fallback: try to extract title from visible headings, meta tags, or title element.
  if (!result.title) {
    result.title =
      getFirstElementText(doc, [
        '[itemprop="name"]',
        '.wprm-recipe-name',
        '.tasty-recipes-title',
        '.recipe-title',
        'article h1',
        'h1',
      ]) ||
      getMetaContent(doc, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
      ]) ||
      cleanPageTitle(doc?.querySelector('title')?.textContent || undefined);
  }

  // Fallback: try to extract description from visible recipe content or meta tags.
  if (!result.description) {
    result.description =
      getFirstElementText(doc, [
        '[itemprop="description"]',
        '.wprm-recipe-summary',
        '.tasty-recipes-description',
        '.recipe-description',
        '.entry-summary',
      ]) ||
      getMetaContent(doc, [
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[name="description"]',
      ]);
  }

  if (!result.ingredients) {
    const ingredients = collectTextList(doc, [
      '[itemprop="recipeIngredient"]',
      '[itemprop="ingredients"]',
      '.wprm-recipe-ingredient',
      '.tasty-recipes-ingredients li',
      '.recipe-ingredients li',
      '.ingredients li',
      '.ingredient-list li',
      '[class*="ingredient" i] li',
      '[id*="ingredient" i] li',
    ], { maxLength: 220 });
    if (ingredients.length > 0) {
      result.ingredients = ingredients;
    }
  }

  if (!result.instructions) {
    const instructions = collectTextList(doc, [
      '[itemprop="recipeInstructions"] li',
      '[itemprop="recipeInstructions"] [itemprop="text"]',
      '[itemprop="instructions"] li',
      '.wprm-recipe-instruction',
      '.tasty-recipes-instructions li',
      '.recipe-instructions li',
      '.instructions li',
      '.directions li',
      '.method li',
      '[class*="instruction" i] li',
      '[class*="direction" i] li',
      '[class*="method" i] li',
      '[id*="instruction" i] li',
      '[id*="direction" i] li',
    ], { minLength: 4, maxLength: 700 });
    if (instructions.length > 0) {
      result.instructions = instructions;
    }
  }

  if (!result.prepTime) {
    const prepTime = getFirstElementAttribute(doc, [
      '[itemprop="prepTime"]',
      'time[class*="prep" i]',
      '[class*="prep-time" i]',
    ], ['content', 'datetime']) || getFirstElementText(doc, [
      '[itemprop="prepTime"]',
      '[class*="prep-time" i]',
    ]);
    if (prepTime) {
      result.prepTime = formatDuration(prepTime);
    }
  }

  if (!result.cookTime) {
    const cookTime = getFirstElementAttribute(doc, [
      '[itemprop="cookTime"]',
      'time[class*="cook" i]',
      '[class*="cook-time" i]',
    ], ['content', 'datetime']) || getFirstElementText(doc, [
      '[itemprop="cookTime"]',
      '[class*="cook-time" i]',
    ]);
    if (cookTime) {
      result.cookTime = formatDuration(cookTime);
    }
  }

  if (!result.servings) {
    result.servings = getFirstElementAttribute(doc, [
      '[itemprop="recipeYield"]',
      '[itemprop="yield"]',
    ], ['content']) || getFirstElementText(doc, [
      '[itemprop="recipeYield"]',
      '[itemprop="yield"]',
      '[class*="servings" i]',
      '[class*="yield" i]',
    ]);
  }

  // Fallback: try to extract image from meta tags
  if (!result.imageUrl) {
    result.imageUrl = getMetaContent(doc, [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]);
  }

  if (result.imageUrl) {
    const resolvedImageUrl = resolveImageUrl(result.imageUrl, url);
    result.imageUrl = resolvedImageUrl || result.imageUrl;
  } else if (images[0]) {
    result.imageUrl = images[0].url;
  }

  return result;
}

// Fetch and extract recipe from URL via proxy
export async function fetchAndExtractRecipe(url: string): Promise<ExtractedRecipeData> {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
  const endpoint = configuredApiUrl
    ? `${configuredApiUrl}/api/proxy-fetch`
    : import.meta.env.DEV
      ? '/api/proxy-fetch'
      : 'https://recipesaurus-api.andreay226.workers.dev/api/proxy-fetch';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch URL' }));
    throw new Error(error.error || 'Failed to fetch recipe');
  }

  const { html } = await response.json();
  return extractRecipeFromHtml(html, url.trim());
}
