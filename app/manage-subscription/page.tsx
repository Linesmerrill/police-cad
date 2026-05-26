'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CreditCardIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            setUser(userData.user);
          } else {
            router.push('/login?redirect=/manage-subscription');
          }
        } else {
          router.push('/login?redirect=/manage-subscription');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login?redirect=/manage-subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleManageStripeSubscription = async () => {
    if (!user) return;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/user/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err: any) {
      console.error('Error opening portal:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'base': return 'Base';
      case 'premium': return 'Premium';
      case 'premium_plus': return 'Premium Plus';
      default: return 'Free';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'base': return '#3b82f6';
      case 'premium': return '#667eea';
      case 'premium_plus': return '#fbbf24';
      default: return '#718096';
    }
  };

  const getSourceDisplayName = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'stripe': return 'Web (Stripe)';
      default: return 'App Store'; // Default to App Store for legacy subscriptions
    }
  };

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}>
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0
        }} />
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
          zIndex: 1
        }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 200px)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Loading...
          </div>
        </div>
      </main>
    );
  }

  const subscription = user?.subscription;
  const isActive = subscription?.active === true;
  const plan = subscription?.plan || 'free';
  const source = subscription?.source || '';
  const planColor = getPlanColor(plan);

  // Kickback banner: show while the credit's banner window is still open.
  // expirationDate on the user reflects the post-kickback renewal date.
  const kickback = subscription?.kickbackBanner;
  const kickbackActive = (() => {
    if (!kickback || !kickback.months || !kickback.expiresAt) return false;
    const expiresAt = new Date(kickback.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  })();
  const newRenewalDisplay = (() => {
    const raw = subscription?.expirationDate || subscription?.currentPeriodEnd;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  })();

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      position: 'relative',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />

      {/* Dark Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />

        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '40px 20px',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '8px'
          }}>
            Manage Subscription
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '32px'
          }}>
            View and manage your subscription details
          </p>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              color: '#ef4444'
            }}>
              {error}
            </div>
          )}

          {/* Kickback Banner — visible while the price-drop credit is still recent */}
          {kickbackActive && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(56, 189, 248, 0.06))',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: '#fff'
            }}>
              <div style={{
                fontSize: '2rem',
                lineHeight: 1
              }} aria-hidden="true">🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  Thanks for your recent purchase — we&rsquo;ve added{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {kickback.months} {kickback.months === 1 ? 'month' : 'months'}
                  </strong>
                  {' '}of free time.
                </div>
                {newRenewalDisplay && (
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    Your new renewal date is <strong style={{ color: '#fff' }}>{newRenewalDisplay}</strong>.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Subscription Card */}
          <div style={{
            background: 'rgba(15, 15, 20, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: `1px solid ${isActive ? planColor + '40' : 'rgba(255, 255, 255, 0.1)'}`,
            padding: '32px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${planColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCardIcon style={{ width: '24px', height: '24px', color: planColor }} />
              </div>
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '4px'
                }}>
                  {getPlanDisplayName(plan)}
                </h2>
                <span style={{
                  fontSize: '0.875rem',
                  color: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.5)'
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {isActive && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginBottom: '4px' }}>
                      BILLING
                    </p>
                    <p style={{ color: '#fff', fontWeight: 500 }}>
                      {subscription?.isAnnual ? 'Annual' : 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginBottom: '4px' }}>
                      PURCHASED VIA
                    </p>
                    <p style={{ color: '#fff', fontWeight: 500 }}>
                      {getSourceDisplayName(source)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Management Options based on source */}
            {!isActive ? (
              // No active subscription
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '16px'
                }}>
                  You don&apos;t have an active subscription. Upgrade to unlock premium features!
                </p>
                <Link
                  href="/pricing"
                  style={{
                    display: 'inline-block',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#000',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  View Plans
                </Link>
              </div>
            ) : source === 'stripe' ? (
              // Stripe subscription - can manage via portal
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <button
                    onClick={handleManageStripeSubscription}
                    disabled={actionLoading}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: actionLoading ? 'wait' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{actionLoading ? 'Loading...' : 'Change Plan'}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>
                      Upgrade or downgrade
                    </span>
                  </button>
                  <button
                    onClick={handleManageStripeSubscription}
                    disabled={actionLoading}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: actionLoading ? 'wait' : 'pointer',
                      opacity: actionLoading ? 0.7 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{actionLoading ? 'Loading...' : 'Cancel Subscription'}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>
                      Cancel anytime
                    </span>
                  </button>
                </div>
                <button
                  onClick={handleManageStripeSubscription}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Loading...' : 'Update Payment Method'}
                </button>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  You&apos;ll be taken to our secure payment portal powered by Stripe
                </p>
              </div>
            ) : (
              // App Store subscription (or legacy without source - default to app store)
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <DevicePhoneMobileIcon style={{
                    width: '24px',
                    height: '24px',
                    color: '#fbbf24',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} />
                  <div>
                    <h3 style={{
                      color: '#fbbf24',
                      fontWeight: 600,
                      marginBottom: '8px'
                    }}>
                      App Store Subscription
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6
                    }}>
                      Your subscription was purchased through the App Store. To manage, update, or cancel your subscription:
                    </p>
                    <ul style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.85rem',
                      marginTop: '12px',
                      paddingLeft: '20px'
                    }}>
                      <li style={{ marginBottom: '8px' }}>
                        Open the <strong>Lines Police CAD</strong> app on your device
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        Go to <strong>Settings → Manage Subscription</strong>
                      </li>
                      <li>
                        Or manage directly in your device&apos;s <strong>App Store subscription settings</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upgrade prompt for free users */}
          {(!isActive || plan === 'free') && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.05)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <h3 style={{
                color: '#fbbf24',
                fontWeight: 600,
                marginBottom: '8px'
              }}>
                Unlock Premium Features
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '16px',
                fontSize: '0.9rem'
              }}>
                Get verified badges, create more communities, reduce ads, and more!
              </p>
              <Link
                href="/pricing"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                View All Plans
              </Link>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}
