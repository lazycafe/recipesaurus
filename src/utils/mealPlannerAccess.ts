const MEAL_PLANNER_ALLOWED_USER_IDS = new Set([
  '01e661dd94b580d2ac099044800a3096',
  '43edf8080df3693f5e0c7176d95ac39e',
]);

export function canAccessMealPlanner(userId: string | null | undefined): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  return Boolean(userId && MEAL_PLANNER_ALLOWED_USER_IDS.has(userId));
}
