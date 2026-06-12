export const RECIPE_DETAIL_ROUTE_PARAM = 'recipe';
export const LEGACY_RECIPE_DETAIL_ROUTE_PARAM = 'recipeId';

export function getRecipeDetailRouteId(search: string | URLSearchParams): string | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get(RECIPE_DETAIL_ROUTE_PARAM) ?? params.get(LEGACY_RECIPE_DETAIL_ROUTE_PARAM);
}

export function clearRecipeDetailRouteParams(params: URLSearchParams): URLSearchParams {
  const nextParams = new URLSearchParams(params);
  nextParams.delete(RECIPE_DETAIL_ROUTE_PARAM);
  nextParams.delete(LEGACY_RECIPE_DETAIL_ROUTE_PARAM);
  return nextParams;
}
