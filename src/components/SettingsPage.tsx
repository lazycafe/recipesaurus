import { Calendar, CreditCard, Mail, Sparkles, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useClient } from '../client/ClientContext';
import type { BillingStatus } from '../client/types';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';

function formatBillingDate(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function formatPlanPrice(billing: BillingStatus | null): string {
  if (!billing || !billing.priceCents) return '';

  const price = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: billing.currency.toUpperCase(),
  }).format(billing.priceCents / 100);

  return `${price}/${billing.interval}`;
}

export function SettingsPage() {
  const { user } = useAuth();
  const client = useClient();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState('');
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [isReinstatingSubscription, setIsReinstatingSubscription] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setIsLoadingBilling(true);
    setBillingError('');

    client.billing.getStatus()
      .then(result => {
        if (!isMounted) return;

        if (result.data?.billing) {
          setBilling(result.data.billing);
          return;
        }

        setBillingError(result.error || 'Unable to load subscription details.');
      })
      .catch(() => {
        if (isMounted) {
          setBillingError('Unable to load subscription details.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBilling(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client, user]);

  const endDate = formatBillingDate(billing?.subscription?.currentPeriodEnd);
  const isPaid = Boolean(billing?.isPaid);
  const isScheduledToEnd = Boolean(billing?.subscription?.cancelAtPeriodEnd);
  const planName = billing?.planName || 'Free';
  const planPrice = formatPlanPrice(billing);

  const handleCancelSubscription = async () => {
    if (isCancelingSubscription) return;

    setIsCancelingSubscription(true);
    setBillingError('');

    const result = await client.billing.cancelSubscription();
    if (result.data?.billing) {
      setBilling(result.data.billing);
      setIsCancelModalOpen(false);
    } else {
      setBillingError(result.error || 'Unable to end subscription right now.');
    }

    setIsCancelingSubscription(false);
  };

  const handleReinstateSubscription = async () => {
    if (isReinstatingSubscription) return;

    setIsReinstatingSubscription(true);
    setBillingError('');

    const result = await client.billing.reinstateSubscription();
    if (result.data?.billing) {
      setBilling(result.data.billing);
    } else {
      setBillingError(result.error || 'Unable to reinstate subscription right now.');
    }

    setIsReinstatingSubscription(false);
  };

  if (!user) return null;

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Account</h2>

        <div className="settings-field">
          <label>
            <User size={16} />
            Name
          </label>
          <span className="settings-value">{user.name}</span>
        </div>

        <div className="settings-field">
          <label>
            <Mail size={16} />
            Email
          </label>
          <span className="settings-value">{user.email}</span>
        </div>
      </section>

      <section className="settings-section settings-subscription-section">
        <h2>Subscription</h2>

        {isLoadingBilling ? (
          <p className="settings-muted">Loading subscription...</p>
        ) : (
          <>
            <div className="settings-field">
              <label>
                <CreditCard size={16} />
                Plan
              </label>
              <span className="settings-value settings-plan-value">
                {planName}
                {isPaid && planPrice && <span>{planPrice}</span>}
              </span>
            </div>

            {isPaid && (
              <div className="settings-field">
                <label>
                  <Calendar size={16} />
                  {isScheduledToEnd ? 'Access until' : 'Renews on'}
                </label>
                <span className="settings-value">{endDate || 'End of current billing period'}</span>
              </div>
            )}

            {!isPaid && (
              <p className="settings-muted">
                Free includes {billing?.freeWeeklyLimit || 2} AI meal planning requests per week.
              </p>
            )}

            {isPaid && isScheduledToEnd && (
              <div className="settings-subscription-actions">
                <p className="settings-subscription-note">
                  Your Meal Planner Plus subscription will end on {endDate || 'the last day of your current billing period'}. You will keep access until then.
                </p>
                <button
                  type="button"
                  className="btn-primary settings-reinstate-subscription"
                  onClick={handleReinstateSubscription}
                  disabled={isReinstatingSubscription}
                >
                  <Sparkles size={16} />
                  {isReinstatingSubscription ? 'Reinstating...' : 'Reinstate paid subscription'}
                </button>
              </div>
            )}

            {isPaid && !isScheduledToEnd && (
              <div className="settings-subscription-actions">
                <p className="settings-subscription-note">
                  Meal Planner Plus includes {billing?.paidWeeklyLimit || 50} AI meal planning requests per week.
                </p>
                <button
                  type="button"
                  className="btn-danger-outline settings-cancel-subscription"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  <Sparkles size={16} />
                  End paid subscription
                </button>
              </div>
            )}
          </>
        )}

        {billingError && <div className="settings-error" role="alert">{billingError}</div>}
      </section>

      {isCancelModalOpen && (
        <ConfirmModal
          title="End Meal Planner Plus?"
          message={`Your subscription will stop renewing, and you will keep Meal Planner Plus access until ${endDate || 'the end of your current billing period'}.`}
          confirmText={isCancelingSubscription ? 'Ending...' : 'End subscription'}
          cancelText="Keep subscription"
          variant="warning"
          onConfirm={handleCancelSubscription}
          onCancel={() => {
            if (!isCancelingSubscription) {
              setIsCancelModalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
