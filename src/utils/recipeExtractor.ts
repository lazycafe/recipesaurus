// Utility functions for extracting recipe data from HTML

export interface ExtractedRecipeData {
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
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

// Extract recipe data from HTML content
export function extractRecipeFromHtml(html: string, url: string): ExtractedRecipeData {
  const result: ExtractedRecipeData = { sourceUrl: url };

  // Try to find JSON-LD schema.org Recipe data
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        const recipes = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of recipes) {
          if (item['@type'] === 'Recipe' || item['@type']?.includes('Recipe')) {
            result.title = item.name || '';
            result.description = item.description || '';
            if (item.recipeIngredient) {
              result.ingredients = Array.isArray(item.recipeIngredient)
                ? item.recipeIngredient
                : [item.recipeIngredient];
            }
            if (item.recipeInstructions) {
              const instructions = item.recipeInstructions;
              if (Array.isArray(instructions)) {
                result.instructions = instructions
                  .map((i: { text?: string; '@type'?: string } | string) =>
                    typeof i === 'string' ? i : i.text || ''
                  )
                  .filter(Boolean);
              } else if (typeof instructions === 'string') {
                result.instructions = [instructions];
              }
            }
            if (item.prepTime) {
              result.prepTime = formatDuration(item.prepTime);
            }
            if (item.cookTime) {
              result.cookTime = formatDuration(item.cookTime);
            }
            if (item.recipeYield) {
              result.servings = Array.isArray(item.recipeYield)
                ? item.recipeYield[0]
                : String(item.recipeYield);
            }
            if (item.image) {
              result.imageUrl = Array.isArray(item.image)
                ? item.image[0]
                : typeof item.image === 'object'
                  ? item.image.url
                  : item.image;
            }
            break;
          }
        }
      } catch {
        // Continue to next match
      }
    }
  }

  // Fallback: try to extract title from meta tags or title element
  if (!result.title) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle) {
      result.title = ogTitle[1];
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        result.title = titleMatch[1].trim();
      }
    }
  }

  // Fallback: try to extract description from meta tags
  if (!result.description) {
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDesc) {
      result.description = ogDesc[1];
    } else {
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (metaDesc) {
        result.description = metaDesc[1];
      }
    }
  }

  // Fallback: try to extract image from meta tags
  if (!result.imageUrl) {
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImage) {
      result.imageUrl = ogImage[1];
    }
  }

  return result;
}

// Fetch and extract recipe from URL via proxy
export async function fetchAndExtractRecipe(url: string): Promise<ExtractedRecipeData> {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://recipesaurus-api.andreay226.workers.dev';
  const response = await fetch(`${apiUrl}/api/proxy-fetch`, {
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
