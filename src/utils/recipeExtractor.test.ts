import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractImagesFromHtml, extractRecipeFromHtml, fetchAndExtractRecipe } from './recipeExtractor';

describe('recipeExtractor image extraction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collects structured, meta, and page images as absolute URLs', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Soup",
              "image": [
                "https://cdn.example.com/recipe.jpg",
                { "url": "/structured.jpg" }
              ]
            }
          </script>
          <meta property="og:image" content="/og.jpg" />
          <link rel="image_src" href="./linked.jpg" />
        </head>
        <body>
          <img src="hero.jpg" alt="Hero" />
          <img data-src="/lazy.jpg" alt="Lazy" />
          <img srcset="/small.jpg 320w, /large.jpg 960w" />
          <img src="data:image/png;base64,placeholder" />
        </body>
      </html>
    `;

    expect(extractImagesFromHtml(html, 'https://example.com/recipes/soup')).toEqual([
      { url: 'https://cdn.example.com/recipe.jpg', source: 'recipe' },
      { url: 'https://example.com/structured.jpg', source: 'recipe' },
      { url: 'https://example.com/og.jpg', source: 'meta' },
      { url: 'https://example.com/recipes/linked.jpg', source: 'meta' },
      { url: 'https://example.com/recipes/hero.jpg', alt: 'Hero', source: 'page' },
      { url: 'https://example.com/lazy.jpg', alt: 'Lazy', source: 'page' },
      { url: 'https://example.com/small.jpg', source: 'page' },
      { url: 'https://example.com/large.jpg', source: 'page' },
    ]);
  });

  it('uses the first collected image as the recipe image fallback', () => {
    const recipe = extractRecipeFromHtml(
      '<html><body><img src="/first.jpg" alt="First"></body></html>',
      'https://example.com/recipe'
    );

    expect(recipe.imageUrl).toBe('https://example.com/first.jpg');
    expect(recipe.images).toEqual([
      { url: 'https://example.com/first.jpg', alt: 'First', source: 'page' },
    ]);
  });

  it('handles JSON-LD image objects when choosing the primary image', () => {
    const recipe = extractRecipeFromHtml(
      `
        <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Object Image Recipe",
            "image": [{ "url": "/object-image.jpg" }]
          }
        </script>
      `,
      'https://example.com/recipe'
    );

    expect(recipe.imageUrl).toBe('https://example.com/object-image.jpg');
  });

  it('extracts nested JSON-LD recipes with instruction sections and tags', () => {
    const recipe = extractRecipeFromHtml(
      `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebPage", "name": "Not the recipe" },
              {
                "@type": ["Thing", "Recipe"],
                "name": "Layered Lasagna",
                "description": "A Sunday dinner favorite.",
                "recipeIngredient": ["1 lb noodles", "2 cups sauce"],
                "recipeInstructions": [
                  {
                    "@type": "HowToSection",
                    "name": "Prep",
                    "itemListElement": [
                      { "@type": "HowToStep", "text": "Boil the noodles." }
                    ]
                  },
                  {
                    "@type": "HowToSection",
                    "name": "Bake",
                    "itemListElement": [
                      { "@type": "HowToStep", "name": "Layer with sauce." },
                      { "@type": "HowToStep", "text": "Bake until bubbling." }
                    ]
                  }
                ],
                "recipeCategory": "Dinner",
                "recipeCuisine": "Italian",
                "keywords": "pasta, comfort food",
                "prepTime": "PT20M",
                "cookTime": "PT1H",
                "recipeYield": ["8 servings"]
              }
            ]
          }
        </script>
      `,
      'https://example.com/lasagna'
    );

    expect(recipe).toMatchObject({
      title: 'Layered Lasagna',
      description: 'A Sunday dinner favorite.',
      ingredients: ['1 lb noodles', '2 cups sauce'],
      instructions: ['Boil the noodles.', 'Layer with sauce.', 'Bake until bubbling.'],
      tags: ['dinner', 'italian', 'pasta', 'comfort food'],
      prepTime: '20 mins',
      cookTime: '1 hr',
      servings: '8 servings',
    });
  });

  it('falls back to common recipe HTML when structured data is missing', () => {
    const recipe = extractRecipeFromHtml(
      `
        <html>
          <head>
            <meta content="Crispy Potatoes - Test Kitchen" property="og:title" />
            <meta name="description" content="Golden potatoes with herbs." />
          </head>
          <body>
            <article>
              <h1>Crispy Potatoes</h1>
              <ul class="recipe-ingredients">
                <li>2 lb potatoes</li>
                <li>1 tbsp olive oil</li>
              </ul>
              <ol class="recipe-instructions">
                <li>Cut the potatoes.</li>
                <li>Roast until crisp.</li>
              </ol>
            </article>
          </body>
        </html>
      `,
      'https://example.com/potatoes'
    );

    expect(recipe.title).toBe('Crispy Potatoes');
    expect(recipe.description).toBe('Golden potatoes with herbs.');
    expect(recipe.ingredients).toEqual(['2 lb potatoes', '1 tbsp olive oil']);
    expect(recipe.instructions).toEqual(['Cut the potatoes.', 'Roast until crisp.']);
  });

  it('uses the same-origin proxy endpoint in local dev', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: '<h1>Imported Recipe</h1>' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const recipe = await fetchAndExtractRecipe('https://example.com/recipe');

    expect(fetchMock).toHaveBeenCalledWith('/api/proxy-fetch', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    }));
    expect(recipe.title).toBe('Imported Recipe');
  });
});
