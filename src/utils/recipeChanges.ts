import type { Recipe, RecipeSourceSnapshot } from '../client/types';

export interface RecipeChangeGroup {
  label: string;
  items: string[];
}

function normalize(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatValue(value: string | null | undefined): string {
  return value?.trim() || 'blank';
}

function valueChanged(original: string | null | undefined, current: string | null | undefined): boolean {
  return normalize(original) !== normalize(current);
}

function mapByNormalizedValue(items: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const key = normalize(item);
    if (key && !map.has(key)) {
      map.set(key, item.trim());
    }
  }
  return map;
}

function listDiff(original: string[], current: string[]): { added: string[]; removed: string[] } {
  const originalMap = mapByNormalizedValue(original);
  const currentMap = mapByNormalizedValue(current);

  return {
    added: [...currentMap.entries()]
      .filter(([key]) => !originalMap.has(key))
      .map(([, value]) => value),
    removed: [...originalMap.entries()]
      .filter(([key]) => !currentMap.has(key))
      .map(([, value]) => value),
  };
}

function appendListChanges(items: string[], added: string[], removed: string[]): void {
  if (added.length > 0) {
    items.push(`Added ${added.join('; ')}`);
  }
  if (removed.length > 0) {
    items.push(`Removed ${removed.join('; ')}`);
  }
}

function snapshotFromRecipe(recipe: Recipe): RecipeSourceSnapshot | null {
  return recipe.sourceRecipe || null;
}

export function getRecipeChangeSummary(recipe: Recipe): RecipeChangeGroup[] {
  const source = snapshotFromRecipe(recipe);
  if (!source) return [];

  const detailItems: string[] = [];
  const detailFields: Array<[string, string | null | undefined, string | null | undefined]> = [
    ['Title', source.title, recipe.title],
    ['Description', source.description, recipe.description],
    ['Prep time', source.prepTime, recipe.prepTime],
    ['Cook time', source.cookTime, recipe.cookTime],
    ['Servings', source.servings, recipe.servings],
  ];

  for (const [label, original, current] of detailFields) {
    if (valueChanged(original, current)) {
      detailItems.push(`${label} changed from ${formatValue(original)} to ${formatValue(current)}`);
    }
  }

  const ingredientItems: string[] = [];
  const ingredientDiff = listDiff(source.ingredients, recipe.ingredients);
  appendListChanges(ingredientItems, ingredientDiff.added, ingredientDiff.removed);

  const instructionItems: string[] = [];
  const instructionDiff = listDiff(source.instructions, recipe.instructions);
  appendListChanges(instructionItems, instructionDiff.added, instructionDiff.removed);
  if (
    instructionItems.length === 0 &&
    source.instructions.map(normalize).join('\n') !== recipe.instructions.map(normalize).join('\n')
  ) {
    instructionItems.push('Edited the instruction order or wording');
  }

  const tagItems: string[] = [];
  const tagDiff = listDiff(source.tags, recipe.tags);
  appendListChanges(tagItems, tagDiff.added, tagDiff.removed);

  return [
    { label: 'Details', items: detailItems },
    { label: 'Ingredients', items: ingredientItems },
    { label: 'Instructions', items: instructionItems },
    { label: 'Tags', items: tagItems },
  ].filter(group => group.items.length > 0);
}

export function isRecipeModifiedFromSource(recipe: Recipe): boolean {
  return getRecipeChangeSummary(recipe).length > 0;
}
