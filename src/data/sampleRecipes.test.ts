import { describe, expect, it } from 'vitest';
import { SAMPLE_RECIPES } from './sampleRecipes';

describe('sample recipe catalog', () => {
  it('includes curated public Recipesaurus recipes', () => {
    const curatedRecipes = SAMPLE_RECIPES.filter(recipe => recipe.ownerName === 'Recipesaurus');

    expect(SAMPLE_RECIPES).toHaveLength(75);
    expect(curatedRecipes).toHaveLength(35);
    expect(SAMPLE_RECIPES.map(recipe => recipe.title)).toEqual(expect.arrayContaining([
      'Soft Herb Omelette',
      'Roasted Tomato Basil Pasta',
      'Vegan Black Bean Tacos',
      'Lemon Dill Baked Salmon',
      'Hearty Lentil Vegetable Soup',
      'Classic Caesar Salad',
      'Mushroom Risotto',
      'Margherita Pizza',
      'Banana Walnut Bread',
      'Beef and Broccoli Stir-Fry',
      'Chicken Noodle Soup',
      'Quinoa Stuffed Peppers',
      'Weeknight Beef and Bean Chili',
      'Greek Yogurt Berry Parfait',
      'Shrimp Fried Rice',
      'Buttermilk Pancakes',
      'Caprese Salad',
      'Sesame Noodle Salad',
      'Baked Mac and Cheese',
      'Quinoa Chickpea Power Bowl',
      'Herb Roasted Pork Loin',
      'Vegetable Lasagna',
      'Blueberry Muffins',
      'Spaghetti and Meatballs',
      'Avocado Egg Toast',
      'Fresh Kimchi Geotjeori',
      'Korean Braised Cod Daegu Jorim',
      'Bulgogi Jeongol Beef Hot Pot',
      'Donkkaseu Korean Pork Cutlet',
      'Jjampong Spicy Seafood Noodle Soup',
      'Bibimmyeon Cold Spicy Noodles',
      'Kkanpunggi Spicy Garlic Fried Chicken',
      'Jjimdak Soy Braised Chicken',
      'Spicy Garlic Eggplant Muchim',
      'Haemul Pajeon Seafood Pancake',
    ]));
  });

  it('keeps curated recipes detailed with unique accurate image sources', () => {
    const curatedRecipes = SAMPLE_RECIPES.filter(recipe => recipe.ownerName === 'Recipesaurus');
    const imageUrls = curatedRecipes.map(recipe => recipe.imageUrl);
    const sourceUrls = curatedRecipes.map(recipe => recipe.sourceUrl);

    expect(curatedRecipes.every(recipe => recipe.ingredients.length >= 10)).toBe(true);
    expect(curatedRecipes.every(recipe => recipe.instructions.length >= 8)).toBe(true);
    expect(new Set(imageUrls).size).toBe(curatedRecipes.length);
    expect(new Set(sourceUrls).size).toBe(curatedRecipes.length);
    expect(curatedRecipes.every(recipe => recipe.imageUrl?.includes('commons.wikimedia.org/wiki/Special:FilePath'))).toBe(true);
    expect(curatedRecipes.every(recipe => recipe.sourceUrl?.startsWith('https://'))).toBe(true);
    expect(curatedRecipes.filter(recipe => recipe.sourceUrl?.includes('seonkyounglongest.com')).length).toBe(10);
  });
});
