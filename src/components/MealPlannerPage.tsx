import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookPlus,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  Send,
  Sparkles,
} from 'lucide-react';
import { useClient } from '../client/ClientContext';
import { useRecipes } from '../context/RecipeContext';
import { useCookbooks } from '../context/CookbookContext';
import { RecipeDetail } from './RecipeDetail';
import type { MealPlanHistoryItem, MealPlanResult, MealPlanUsage } from '../client/types';
import type { Recipe } from '../types/Recipe';
import type { FormEvent, ReactNode } from 'react';

const MAX_REQUEST_LENGTH = 1000;
const PAID_WEEKLY_LIMIT = 50;
const HISTORY_ITEMS_PER_PAGE = 5;

const SAMPLE_REQUESTS = [
  'Plan my lunches and dinners for this week using recipes I own and a few new easy recipes. Make them a mix of Asian and healthy dishes.',
  'Give me three high-protein dinners using my saved chicken recipes and quick vegetable sides.',
  'Build a low-effort Sunday meal prep plan with leftovers for work lunches.',
];

function formatResetDate(timestamp: number | null): string {
  if (!timestamp) return 'next week';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function formatHistoryDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function formatPrice(cents: number | null | undefined): string {
  const dollars = (cents ?? 499) / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHistoryRequestIntro(suggestion: string): string {
  const trimmedSuggestion = suggestion.trimStart();
  if (!/^request\s*:/i.test(trimmedSuggestion)) return suggestion;

  const requestParagraph = trimmedSuggestion.match(/^request\s*:[\s\S]*?\r?\n\s*\r?\n/i);
  if (requestParagraph) {
    return trimmedSuggestion.slice(requestParagraph[0].length).trimStart();
  }

  return trimmedSuggestion.replace(/^request\s*:[^\r\n]*(\r?\n)?/i, '').trimStart();
}

interface MealPlanHistoryCardProps {
  item: MealPlanHistoryItem;
  renderSuggestion: (plan: MealPlanHistoryItem | MealPlanResult) => ReactNode[];
}

function MealPlanHistoryCard({ item, renderSuggestion }: MealPlanHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailId = `meal-planner-history-detail-${item.id}`;
  const historyItem = {
    ...item,
    suggestion: stripHistoryRequestIntro(item.suggestion),
  };

  return (
    <article className={`meal-planner-history-item ${isExpanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="meal-planner-history-toggle"
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <span className="meal-planner-history-summary">
          <span className="meal-planner-history-meta">
            <span>{formatHistoryDate(item.createdAt)}</span>
          </span>
          <span className="meal-planner-history-prompt">{item.prompt}</span>
        </span>
        <ChevronDown className="meal-planner-history-chevron" size={18} />
      </button>

      {isExpanded && (
        <div className="meal-planner-history-detail" id={detailId}>
          <div className="meal-planner-result-text">{renderSuggestion(historyItem)}</div>
        </div>
      )}
    </article>
  );
}

export function MealPlannerPage() {
  const client = useClient();
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const { createCookbook, refreshCookbooks } = useCookbooks();
  const [request, setRequest] = useState(SAMPLE_REQUESTS[0]);
  const [mealPlan, setMealPlan] = useState<MealPlanResult | null>(null);
  const [history, setHistory] = useState<MealPlanHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [usage, setUsage] = useState<MealPlanUsage | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isCreatingCookbook, setIsCreatingCookbook] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const isSubmittingRef = useRef(false);

  const charactersRemaining = MAX_REQUEST_LENGTH - request.length;
  const remainingRequests = usage?.remainingRequests ?? 0;
  const requestLabel = remainingRequests === 1 ? 'request' : 'requests';
  const isSubmitDisabled = isSubmitting || isUsageLoading || !request.trim();
  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_ITEMS_PER_PAGE));
  const paginatedHistory = useMemo(() => (
    history.slice(
      (historyPage - 1) * HISTORY_ITEMS_PER_PAGE,
      historyPage * HISTORY_ITEMS_PER_PAGE
    )
  ), [history, historyPage]);

  const quotaText = useMemo(() => {
    if (!usage) return 'Checking your weekly AI requests...';
    return `${usage.planName}: ${remainingRequests} ${requestLabel} remaining this week`;
  }, [remainingRequests, requestLabel, usage]);

  const recipeById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach(recipe => map.set(recipe.id, recipe));
    return map;
  }, [recipes]);

  const mentionedRecipeDetails = useMemo(() => (
    mealPlan?.mentionedRecipes
      .map(recipe => recipeById.get(recipe.id))
      .filter((recipe): recipe is Recipe => Boolean(recipe)) ?? []
  ), [mealPlan, recipeById]);

  const renderSuggestion = (plan: MealPlanHistoryItem | MealPlanResult): ReactNode[] => {
    if (!plan) return [];

    const linkableRecipes = plan.mentionedRecipes.filter(recipe => recipeById.has(recipe.id));
    if (linkableRecipes.length === 0) {
      return [plan.suggestion];
    }

    const sortedRecipes = [...linkableRecipes].sort((a, b) => b.title.length - a.title.length);
    const recipeLookup = new Map(sortedRecipes.map(recipe => [recipe.title.toLowerCase(), recipe]));
    const pattern = new RegExp(`(${sortedRecipes.map(recipe => escapeRegExp(recipe.title)).join('|')})`, 'gi');

    return plan.suggestion.split(pattern).map((part, index) => {
      const recipe = recipeLookup.get(part.toLowerCase());
      if (!recipe) return part;

      return (
        <button
          key={`${recipe.id}-${index}`}
          type="button"
          className="meal-planner-recipe-link"
          onClick={() => {
            const detail = recipeById.get(recipe.id);
            if (detail) setSelectedRecipe(detail);
          }}
        >
          {part}
        </button>
      );
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      setIsUsageLoading(true);
      setIsHistoryLoading(true);
      const [result, historyResult] = await Promise.all([
        client.ai.getMealPlanUsage(),
        client.ai.getMealPlanHistory(),
      ]);
      if (!isMounted) return;

      if (result.data?.usage) {
        setUsage(result.data.usage);
        setShowPaywall(result.data.usage.remainingRequests <= 0);
      } else if (result.error) {
        setError(result.error);
      }

      if (historyResult.data?.history) {
        setHistory(historyResult.data.history);
        setHistoryPage(1);
      } else if (historyResult.error) {
        setError(historyResult.error);
      }

      setIsUsageLoading(false);
      setIsHistoryLoading(false);
    }

    void loadUsage();

    return () => {
      isMounted = false;
    };
  }, [client]);

  useEffect(() => {
    setHistoryPage(prev => Math.min(prev, historyPageCount));
  }, [historyPageCount]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    const trimmedRequest = request.trim();

    if (!trimmedRequest) {
      setError('Tell Recipesaurus what kind of plan you want.');
      return;
    }

    if (usage && usage.remainingRequests <= 0) {
      setShowPaywall(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    setShowPaywall(false);

    try {
      const result = await client.ai.createMealPlan(trimmedRequest);

      if (result.data) {
        const createdMealPlan = result.data;
        setMealPlan(createdMealPlan);
        setUsage(createdMealPlan.usage);
        setHistory(previous => [
          createdMealPlan,
          ...previous.filter(item => item.id !== createdMealPlan.id),
        ]);
        setHistoryPage(1);
        setShowPaywall(createdMealPlan.usage.remainingRequests <= 0);
      } else if (result.status === 402 || result.code === 'AI_MEAL_PLAN_LIMIT') {
        setShowPaywall(true);
        const usageResult = await client.ai.getMealPlanUsage();
        if (usageResult.data?.usage) {
          setUsage(usageResult.data.usage);
        }
      } else {
        setError(result.error || 'Unable to create a meal plan right now.');
      }
    } catch {
      setError('Unable to create a meal plan right now.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCreateCookbook = async () => {
    if (!mealPlan || mentionedRecipeDetails.length === 0) return;

    setIsCreatingCookbook(true);
    setError('');

    const cookbookId = await createCookbook({
      name: mealPlan.cookbookName,
      description: `Created from meal planner request: ${request.trim().slice(0, 180)}`,
    });

    if (!cookbookId) {
      setError('Unable to create the cookbook right now.');
      setIsCreatingCookbook(false);
      return;
    }

    const addResults = await Promise.all(
      mentionedRecipeDetails.map(recipe => client.cookbooks.addRecipe(cookbookId, recipe.id))
    );
    const failedAdds = addResults.filter(result => result.error);

    await refreshCookbooks();
    setIsCreatingCookbook(false);

    if (failedAdds.length > 0) {
      setError('The cookbook was created, but some recipes could not be added.');
      return;
    }

    navigate(`/cookbooks/${cookbookId}`);
  };

  const handleUpgrade = async () => {
    setIsStartingCheckout(true);
    setError('');

    const result = await client.billing.createCheckoutSession();
    if (result.data?.url) {
      window.location.assign(result.data.url);
      return;
    }

    setError(result.error || 'Unable to start checkout right now.');
    setIsStartingCheckout(false);
  };

  const handleManageBilling = async () => {
    setError('');

    const result = await client.billing.createPortalSession();
    if (result.data?.url) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
      return;
    }

    setError(result.error || 'Unable to open billing right now.');
  };

  return (
    <div className="meal-planner-page">
      <section className="meal-planner-header">
        <div className="meal-planner-title">
          <Sparkles size={28} />
          <h1>AI Meal Planner</h1>
        </div>
        <p>Ask for a week, a dinner lineup, a meal prep pass, or ideas that pull from your saved recipes.</p>
      </section>

      <section className="meal-planner-toolbar" aria-label="Meal planner status">
        <div className="meal-planner-status-item">
          <Clock size={18} />
          <span>{isUsageLoading ? 'Checking quota...' : quotaText}</span>
        </div>
        {usage?.isPaid && (
          <button
            type="button"
            className="meal-planner-billing-link"
            onClick={handleManageBilling}
          >
            <CreditCard size={16} />
            Manage billing
          </button>
        )}
      </section>

      <form className="meal-planner-form" onSubmit={handleSubmit}>
        <label htmlFor="meal-planner-request">What should Recipesaurus plan?</label>
        <textarea
          id="meal-planner-request"
          value={request}
          onChange={event => setRequest(event.target.value.slice(0, MAX_REQUEST_LENGTH))}
          rows={7}
          maxLength={MAX_REQUEST_LENGTH}
          placeholder="Ask for dinners, lunches, prep plans, cuisine mixes, dietary goals, pantry constraints..."
        />
        <div className="meal-planner-form-footer">
          <span>{charactersRemaining} characters left</span>
          <button
            type="submit"
            className="btn-primary meal-planner-submit"
            disabled={isSubmitDisabled}
            aria-disabled={isSubmitDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Planning...
              </>
            ) : (
              <>
                <Send size={18} />
                Get Suggestions
              </>
            )}
          </button>
        </div>
      </form>

      <section className="meal-planner-samples" aria-label="Sample meal planning requests">
        {SAMPLE_REQUESTS.map(sample => (
          <button
            key={sample}
            type="button"
            className="meal-planner-sample"
            onClick={() => setRequest(sample)}
          >
            {sample}
          </button>
        ))}
      </section>

      {error && (
        <div className="meal-planner-message meal-planner-error" role="alert">
          {error}
        </div>
      )}

      {showPaywall && usage && usage.remainingRequests <= 0 && (
        <section className="meal-planner-paywall">
          <Lock size={24} />
          <div>
            <h2>{usage.isPaid ? 'Weekly paid plans used' : 'Weekly AI plans used'}</h2>
            <p>
              {usage.isPaid
                ? `${usage.planName} includes ${usage.weeklyLimit} AI meal planning requests each week. Come back ${formatResetDate(usage.nextResetAt)}.`
                : `Free accounts get ${usage.weeklyLimit} AI meal planning requests each week. Upgrade to ${formatPrice(usage.priceCents)}/month for ${PAID_WEEKLY_LIMIT} weekly requests, or come back ${formatResetDate(usage.nextResetAt)}.`}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary meal-planner-paywall-action"
            onClick={usage.isPaid ? handleManageBilling : handleUpgrade}
            disabled={!usage.isPaid && isStartingCheckout}
          >
            {!usage.isPaid && isStartingCheckout ? (
              <>
                <Loader2 size={18} className="spin" />
                Opening...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                {usage.isPaid ? 'Manage' : 'Upgrade'}
              </>
            )}
          </button>
        </section>
      )}

      {mealPlan && (
        <section className="meal-planner-result">
          <div className="meal-planner-result-header">
            <CalendarDays size={22} />
            <h2>Suggestions</h2>
          </div>
          <div className="meal-planner-result-text">{renderSuggestion(mealPlan)}</div>

          {mentionedRecipeDetails.length > 0 && (
            <div className="meal-planner-cookbook-action">
              <div>
                <h3>{mealPlan.cookbookName}</h3>
                <p>
                  Create a cookbook with {mentionedRecipeDetails.length} saved recipe{mentionedRecipeDetails.length !== 1 ? 's' : ''} from this plan.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCookbook}
                disabled={isCreatingCookbook}
              >
                {isCreatingCookbook ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <BookPlus size={18} />
                    Create Cookbook
                  </>
                )}
              </button>
            </div>
          )}

          {mentionedRecipeDetails.length > 0 && (
            <div className="meal-planner-mentioned">
              <CheckCircle size={16} />
              <span>
                Linked {mentionedRecipeDetails.length} recipe{mentionedRecipeDetails.length !== 1 ? 's' : ''} from your collection.
              </span>
            </div>
          )}
        </section>
      )}

      <section className="meal-planner-history" aria-label="Meal planning history">
        <div className="meal-planner-history-header">
          <div>
            <h2>History</h2>
            <p>Your previous meal planning questions and responses.</p>
          </div>
          <Clock size={20} />
        </div>

        {isHistoryLoading ? (
          <div className="meal-planner-history-empty">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="meal-planner-history-empty">No meal planning history yet.</div>
        ) : (
          <>
            <div className="meal-planner-history-list">
              {paginatedHistory.map(item => (
                <MealPlanHistoryCard
                  key={item.id}
                  item={item}
                  renderSuggestion={renderSuggestion}
                />
              ))}
            </div>

            {historyPageCount > 1 && (
              <nav className="recipe-pagination meal-planner-history-pagination" aria-label="Meal planning history pagination">
                <span className="pagination-status">Page {historyPage} of {historyPageCount}</span>
                <div className="pagination-buttons">
                  <button
                    className="pagination-btn"
                    onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                    disabled={historyPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: historyPageCount }, (_, index) => index + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-page ${page === historyPage ? 'active' : ''}`}
                      onClick={() => setHistoryPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={page === historyPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))}
                    disabled={historyPage === historyPageCount}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          readOnly
        />
      )}
    </div>
  );
}
