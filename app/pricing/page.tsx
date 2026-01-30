'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckIcon, StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

interface SubscriptionTier {
  name: string;
  key: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  color: string;
  popular?: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAppStoreModal, setShowAppStoreModal] = useState(false);

  useEffect(() => {
    // Fetch user
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            setUser(userData.user);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch tiers
    const fetchTiers = async () => {
      try {
        const response = await fetch('/api/v1/subscription/tiers');
        if (response.ok) {
          const data = await response.json();
          // Filter out the free tier since we display it as text instead
          const paidTiers = (data.tiers || []).filter((t: SubscriptionTier) => t.key !== 'free');
          setTiers(paidTiers);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
        // Fallback tiers if API fails (excluding free tier)
        setTiers([
          {
            name: 'Base',
            key: 'base',
            monthlyPrice: 3,
            annualPrice: 32,
            features: ['5 communities', 'Default departments', 'Full ads'],
            color: '#3b82f6',
          },
          {
            name: 'Premium',
            key: 'premium',
            monthlyPrice: 8,
            annualPrice: 85,
            features: ['10 communities', 'Verified badge', '50% fewer ads'],
            color: '#667eea',
            popular: true,
          },
          {
            name: 'Premium Plus',
            key: 'premium_plus',
            monthlyPrice: 19.99,
            annualPrice: 209,
            features: ['Unlimited communities', 'No ads', 'Verified badge'],
            color: '#fbbf24',
          },
        ]);
      }
    };

    fetchUser();
    fetchTiers();
  }, []);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/pricing`);
      return;
    }

    setSubscribing(tier.key);
    setError(null);

    try {
      // First check if user has app store subscription
      const checkResponse = await fetch('/api/v1/user/check-subscription-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include'
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (!checkData.canPurchaseWeb) {
          setShowAppStoreModal(true);
          setSubscribing(null);
          return;
        }
      }

      // Create checkout session
      const response = await fetch('/api/v1/user/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tier: tier.key,
          isAnnual: isAnnual
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      if (data.checkoutSession?.url) {
        window.location.href = data.checkoutSession.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Error subscribing:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setSubscribing(null);
    }
  };

  const getCurrentPlan = () => {
    if (!user?.subscription?.active) return 'free';
    return user.subscription.plan || 'free';
  };

  // Check if user has an app store subscription (source is not 'stripe' means it's app store or legacy)
  const hasAppStoreSubscription = () => {
    if (!user?.subscription?.active) return false;
    const source = user.subscription.source;
    // If source is 'stripe', they subscribed via web - otherwise it's app store (including legacy with no source)
    return source !== 'stripe';
  };

  const currentPlan = getCurrentPlan();
  const isAppStoreSubscriber = hasAppStoreSubscription();

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
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '16px'
            }}>
              Upgrade Your Experience
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '700px',
              margin: '0 auto 24px'
            }}>
              Lines Police CAD is <span style={{ color: '#10b981', fontWeight: 600 }}>100% free</span> to use.
              Create an account and get full access to the CAD — create up to 1 community, join unlimited communities, and enjoy unlimited usage.
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.5)',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}>
              Subscriptions are completely optional — upgrade only if you want additional communities or an ad-free experience.
            </p>

            {/* Billing Toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => setIsAnnual(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: !isAnnual ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  color: !isAnnual ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: isAnnual ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  color: isAnnual ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Annual
                <span style={{
                  marginLeft: '8px',
                  fontSize: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  Save 12%
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* App Store Subscriber Notice */}
          {isAppStoreSubscriber && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              maxWidth: '700px',
              margin: '0 auto 24px'
            }}>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              <div>
                <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>
                  You have an App Store subscription
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                  To change or cancel your plan, please manage your subscription through the{' '}
                  <Link href="/manage-subscription" style={{ color: '#fbbf24', textDecoration: 'underline' }}>
                    Lines Police CAD app
                  </Link>
                  {' '}or your device&apos;s App Store settings.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto'
          }}>
            {tiers.map((tier) => {
              const isCurrentPlan = currentPlan === tier.key;
              const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
              const isPopular = tier.popular;

              return (
                <div
                  key={tier.key}
                  style={{
                    position: 'relative',
                    background: 'rgba(15, 15, 20, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    border: isPopular
                      ? `2px solid ${tier.color}`
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '32px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: isPopular
                      ? `0 0 40px ${tier.color}33`
                      : 'none'
                  }}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: tier.color,
                      color: '#000',
                      padding: '4px 16px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <StarIcon style={{ width: '12px', height: '12px' }} />
                      Most Popular
                    </div>
                  )}

                  {/* Tier Name */}
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: tier.color,
                    marginBottom: '8px'
                  }}>
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: '#fff'
                    }}>
                      ${price}
                    </span>
                    <span style={{
                      fontSize: '1rem',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>

                  {/* Features */}
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    marginBottom: '24px',
                    flex: 1
                  }}>
                    {tier.features.map((feature, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '12px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.9rem'
                        }}
                      >
                        <CheckIcon style={{
                          width: '18px',
                          height: '18px',
                          color: tier.color,
                          flexShrink: 0
                        }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <div style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: `${tier.color}33`,
                      color: tier.color,
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      Current Plan
                    </div>
                  ) : isAppStoreSubscriber ? (
                    // User has app store subscription - they can't subscribe via web
                    <Link
                      href="/manage-subscription"
                      style={{
                        display: 'block',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        textDecoration: 'none'
                      }}
                    >
                      Manage in App
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(tier)}
                      disabled={subscribing === tier.key}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isPopular
                          ? `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}cc 100%)`
                          : 'rgba(255, 255, 255, 0.1)',
                        color: isPopular ? '#000' : '#fff',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: subscribing === tier.key ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: subscribing === tier.key ? 0.7 : 1
                      }}
                    >
                      {subscribing === tier.key ? 'Processing...' : 'Subscribe'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Free Tier Info Box */}
          <div style={{
            maxWidth: '600px',
            margin: '48px auto 0',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#10b981',
              marginBottom: '12px'
            }}>
              Free Forever
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '0'
            }}>
              Every account lets you <strong>create up to 1 community</strong>, <strong>join unlimited communities</strong>, and enjoy <strong>unlimited usage</strong> of the CAD — completely free, forever. No credit card required, no trial period. Upgrade only when you need more.
            </p>
          </div>

          {/* Additional Info */}
          <div style={{
            textAlign: 'center',
            marginTop: '32px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.875rem'
          }}>
            <p>All subscriptions can be cancelled at any time. Prices shown are in USD.</p>
            <p style={{ marginTop: '8px' }}>
              Already have a subscription?{' '}
              <Link href="/manage-subscription" style={{ color: '#fbbf24', textDecoration: 'underline' }}>
                Manage it here
              </Link>
            </p>
          </div>
        </div>

        <Footer />
      </div>

      {/* App Store Modal */}
      {showAppStoreModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 15, 20, 0.98)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '16px'
            }}>
              Subscription Managed via App Store
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              You have an active subscription through the App Store. To manage or change your subscription, please use the Lines Police CAD mobile app or your device&apos;s subscription settings.
            </p>
            <button
              onClick={() => setShowAppStoreModal(false)}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(251, 191, 36, 0.2)',
                color: '#fbbf24',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
