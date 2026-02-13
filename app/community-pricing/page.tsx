'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

interface CommunityTier {
  name: string;
  key: string;
  monthlyPrice: number;
  features: string[];
  color: string;
  popular?: boolean;
}

interface Community {
  _id: string;
  community: {
    name: string;
    hash?: string;
    subscription?: {
      active?: boolean;
      plan?: string;
      expirationDate?: string;
      purchaseDate?: string;
      durationMonths?: number;
    };
  };
}

const DURATION_OPTIONS = [
  { months: 1, label: '1 Month' },
  { months: 3, label: '3 Months' },
  { months: 6, label: '6 Months' },
];

// Discounted pricing per tier per duration (total price, not per-month)
const PRICING: Record<string, Record<number, number>> = {
  basic:    { 1: 3,  3: 7,   6: 12  },
  standard: { 1: 5,  3: 12,  6: 20  },
  premium:  { 1: 8,  3: 19,  6: 32  },
  elite:    { 1: 15, 3: 36,  6: 60  },
};

function getPrice(tierKey: string, months: number, monthlyPrice: number): number {
  return PRICING[tierKey]?.[months] ?? monthlyPrice * months;
}

function getFullPrice(monthlyPrice: number, months: number): number {
  return monthlyPrice * months;
}

function getSavingsPercent(tierKey: string, months: number, monthlyPrice: number): number {
  const full = getFullPrice(monthlyPrice, months);
  const discounted = getPrice(tierKey, months, monthlyPrice);
  if (full <= discounted) return 0;
  return Math.round(((full - discounted) / full) * 100);
}

const TIER_RANK: Record<string, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
  elite: 4,
};

function encodeId(id: string): string {
  return btoa(id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeId(encoded: string): string {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return atob(base64);
}

function calculateProrationCredit(
  subscription: NonNullable<Community['community']['subscription']>,
  newTierKey: string,
  newDurationMonths: number
): { creditDollars: number; proratedPrice: number; remainingDays: number; totalDays: number } | null {
  const { purchaseDate, expirationDate, plan, durationMonths, active } = subscription;
  if (!active || !purchaseDate || !expirationDate || !plan || !durationMonths) return null;

  const currentPlan = plan.toLowerCase();
  if ((TIER_RANK[newTierKey] || 0) <= (TIER_RANK[currentPlan] || 0)) return null;

  const purchaseTime = new Date(purchaseDate).getTime();
  const expirationTime = new Date(expirationDate).getTime();
  const now = Date.now();
  if (isNaN(purchaseTime) || isNaN(expirationTime) || now >= expirationTime || now < purchaseTime) return null;

  const totalDuration = expirationTime - purchaseTime;
  if (totalDuration <= 0) return null;

  const remainingDuration = expirationTime - now;
  const unusedFraction = remainingDuration / totalDuration;

  const originalPrice = PRICING[currentPlan]?.[durationMonths];
  if (!originalPrice || originalPrice <= 0) return null;

  const rawCredit = Math.floor(originalPrice * unusedFraction * 100) / 100;
  const newPrice = PRICING[newTierKey]?.[newDurationMonths];
  if (!newPrice || newPrice <= 0) return null;

  const maxCredit = Math.max(0, newPrice - 0.50);
  const creditDollars = Math.min(rawCredit, maxCredit);
  const proratedPrice = Math.round((newPrice - creditDollars) * 100) / 100;

  return {
    creditDollars,
    proratedPrice,
    remainingDays: Math.round(remainingDuration / (1000 * 60 * 60 * 24)),
    totalDays: Math.round(totalDuration / (1000 * 60 * 60 * 24)),
  };
}

function CommunityPricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get('c') || '';
  const preselectedCommunityId = rawParam ? decodeId(rawParam) : '';
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<CommunityTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<CommunityTier | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>(preselectedCommunityId);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            fetchCommunities(userData.user.id);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTiers = async () => {
      try {
        const response = await fetch('/api/v1/subscription/community-tiers');
        if (response.ok) {
          const data = await response.json();
          setTiers(data.tiers || []);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
        setTiers([
          {
            name: 'Basic',
            key: 'basic',
            monthlyPrice: 3,
            features: ['Boosted in search results'],
            color: '#3b82f6',
          },
          {
            name: 'Standard',
            key: 'standard',
            monthlyPrice: 5,
            features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge'],
            color: '#10b981',
          },
          {
            name: 'Premium',
            key: 'premium',
            monthlyPrice: 8,
            features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge', 'Boost on Discover page'],
            color: '#667eea',
          },
          {
            name: 'Elite',
            key: 'elite',
            monthlyPrice: 15,
            features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge', 'Boost on Discover page', 'Featured on Home Page', 'Promotional description (200 chars)'],
            color: '#fbbf24',
            popular: true,
          },
        ]);
      }
    };

    fetchUser();
    fetchTiers();
  }, []);

  const fetchCommunities = useCallback(async (userId: string, search?: string) => {
    try {
      if (search !== undefined) setSearchLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '20');
      const qs = params.toString();
      const response = await fetch(`/api/v2/user/${userId}/boost-communities${qs ? '?' + qs : ''}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCommunities(data || []);
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleCommunitySearch = useCallback((value: string) => {
    setCommunitySearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (user) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchCommunities(user.id, value);
      }, 300);
    }
  }, [user, fetchCommunities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCommunityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedCommunityData = (): Community | undefined => {
    return communities.find(c => c._id === selectedCommunity);
  };

  const handleSelectBoost = (tier: CommunityTier) => {
    if (!user) {
      const redirect = rawParam ? `/community-pricing?c=${rawParam}` : '/community-pricing';
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setSelectedTier(tier);
    setShowCheckoutModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedTier || !selectedCommunity || !user) return;

    setSubscribing(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/community/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          communityId: selectedCommunity,
          tier: selectedTier.key,
          durationMonths: selectedMonths
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.Response?.Error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.checkoutSession?.url) {
        window.location.href = data.checkoutSession.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const selectedCommunityData = getSelectedCommunityData();
  const hasActiveBoost = selectedCommunityData?.community?.subscription?.active === true;
  const currentPlan = hasActiveBoost ? (selectedCommunityData?.community?.subscription?.plan || '').toLowerCase() : '';
  const currentTierRank = TIER_RANK[currentPlan] || 0;
  const selectedTierRank = selectedTier ? (TIER_RANK[selectedTier.key] || 0) : 0;
  const boostAction: 'new' | 'upgrade' | 'extend' | 'downgrade' = !hasActiveBoost
    ? 'new'
    : selectedTierRank > currentTierRank
      ? 'upgrade'
      : selectedTierRank === currentTierRank
        ? 'extend'
        : 'downgrade';
  const isDowngrade = boostAction === 'downgrade';
  const totalPrice = selectedTier ? getPrice(selectedTier.key, selectedMonths, selectedTier.monthlyPrice) : 0;
  const prorationInfo = (boostAction === 'upgrade' && selectedCommunityData?.community?.subscription && selectedTier)
    ? calculateProrationCredit(selectedCommunityData.community.subscription, selectedTier.key, selectedMonths)
    : null;
  const displayPrice = prorationInfo ? prorationInfo.proratedPrice : totalPrice;

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
          {/* Back Link */}
          <Link
            href={preselectedCommunityId ? `/community/${encodeId(preselectedCommunityId)}` : '/'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '24px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            {preselectedCommunityId ? 'Back to Community' : 'Back'}
          </Link>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '16px'
            }}>
              Boost a Community
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Give any community you&apos;re a part of a visibility boost and help it attract more members
            </p>
          </div>

          {/* Duration Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}>
            <div style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {DURATION_OPTIONS.map((opt) => {
                const isActive = selectedMonths === opt.months;
                const savingsForElite = opt.months > 1 ? getSavingsPercent('elite', opt.months, 15) : 0;
                return (
                  <button
                    key={opt.months}
                    onClick={() => setSelectedMonths(opt.months)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {savingsForElite > 0 && (
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 400
                      }}>
                        Save up to <strong>{savingsForElite}%</strong>
                      </span>
                    )}
                    {opt.label}
                  </button>
                );
              })}
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

          {/* Tier Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto'
          }}>
            {tiers.map((tier) => {
              const isPopular = tier.popular;
              const price = getPrice(tier.key, selectedMonths, tier.monthlyPrice);
              const fullPrice = getFullPrice(tier.monthlyPrice, selectedMonths);
              const savings = getSavingsPercent(tier.key, selectedMonths, tier.monthlyPrice);

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
                    boxShadow: isPopular ? `0 0 40px ${tier.color}33` : 'none'
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
                    marginBottom: '20px'
                  }}>
                    {tier.name} Boost
                  </h3>

                  {/* Price */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        color: '#fff'
                      }}>
                        ${price}
                      </span>
                      {savings > 0 && (
                        <span style={{
                          fontSize: '1rem',
                          color: 'rgba(255, 255, 255, 0.35)',
                          textDecoration: 'line-through'
                        }}>
                          ${fullPrice}
                        </span>
                      )}
                    </div>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.85rem',
                      marginTop: '4px'
                    }}>
                      {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'} of {tier.name} features
                    </p>
                    {savings > 0 && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        fontSize: '0.75rem',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontWeight: 600
                      }}>
                        Save {savings}%
                      </span>
                    )}
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

                  {/* Boost Button */}
                  <button
                    onClick={() => handleSelectBoost(tier)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isPopular
                        ? `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}cc 100%)`
                        : `${tier.color}20`,
                      color: isPopular ? '#000' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      transition: 'opacity 0.2s',
                      borderWidth: isPopular ? 0 : 1,
                      borderStyle: 'solid',
                      borderColor: `${tier.color}40`
                    }}
                  >
                    Boost for ${price}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div style={{
            textAlign: 'center',
            marginTop: '48px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.875rem'
          }}>
            <p>Community boosts are one-time purchases. All prices shown are for the full selected duration.</p>
          </div>
        </div>

        <Footer />
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && selectedTier && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'rgba(15, 15, 20, 0.98)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '24px'
            }}>
              Select a Community
            </h3>

            {/* Selected Boost Summary */}
            <div style={{
              background: `${selectedTier.color}15`,
              border: `1px solid ${selectedTier.color}40`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ color: selectedTier.color, fontWeight: 600 }}>
                    {selectedTier.name} Boost
                  </span>
                  <span style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '2px'
                  }}>
                    {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'} of {selectedTier.name} features
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {prorationInfo && prorationInfo.creditDollars > 0 && (
                    <span style={{
                      color: 'rgba(255, 255, 255, 0.4)',
                      textDecoration: 'line-through',
                      fontSize: '0.9rem',
                      marginRight: '8px'
                    }}>
                      ${totalPrice.toFixed(2)}
                    </span>
                  )}
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
                    ${displayPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Community Select */}
            <div style={{ marginBottom: '20px' }} ref={dropdownRef}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                Community to Boost
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={selectedCommunity ? (communities.find(c => c._id === selectedCommunity)?.community?.name || 'Search communities...') : 'Search communities...'}
                  value={communitySearch}
                  onChange={(e) => {
                    handleCommunitySearch(e.target.value);
                    setShowCommunityDropdown(true);
                  }}
                  onFocus={() => setShowCommunityDropdown(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {selectedCommunity && !communitySearch && (
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    pointerEvents: 'none'
                  }}>
                    {communities.find(c => c._id === selectedCommunity)?.community?.name || ''}
                  </div>
                )}
                {searchLoading && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.75rem'
                  }}>
                    ...
                  </div>
                )}
                {showCommunityDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'rgba(20, 20, 30, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    zIndex: 10
                  }}>
                    {communities.length > 0 ? (
                      communities.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setSelectedCommunity(c._id);
                            setCommunitySearch('');
                            setShowCommunityDropdown(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            color: c._id === selectedCommunity ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                            background: c._id === selectedCommunity ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            fontSize: '0.9rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = c._id === selectedCommunity ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                        >
                          {c.community?.name || 'Unnamed Community'}
                          {c.community?.subscription?.active && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '0.75rem',
                              color: 'rgba(251, 191, 36, 0.8)',
                              textTransform: 'capitalize'
                            }}>
                              {c.community.subscription.plan} boost
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 12px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
                        {communitySearch ? 'No communities found' : 'No communities available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active Boost Info */}
            {selectedCommunity && hasActiveBoost && boostAction === 'downgrade' && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>
                  This community currently has a <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> boost
                  {selectedCommunityData?.community?.subscription?.expirationDate && (
                    <> (expires {new Date(selectedCommunityData.community.subscription.expirationDate).toLocaleDateString()})</>
                  )}
                  . You cannot downgrade to a lower tier. Choose {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} or higher.
                </p>
              </div>
            )}
            {selectedCommunity && hasActiveBoost && boostAction === 'extend' && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#10b981', fontSize: '0.85rem', margin: 0 }}>
                  This will extend your <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> boost by {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'}
                  {selectedCommunityData?.community?.subscription?.expirationDate && (
                    <> from the current expiration date ({new Date(selectedCommunityData.community.subscription.expirationDate).toLocaleDateString()})</>
                  )}
                  .
                </p>
              </div>
            )}
            {selectedCommunity && hasActiveBoost && boostAction === 'upgrade' && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#fbbf24', fontSize: '0.85rem', margin: 0 }}>
                  Upgrading from <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> to <strong>{selectedTier.name}</strong> for {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'}.
                </p>
                {prorationInfo && prorationInfo.creditDollars > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                      <span>{selectedTier.name} Boost ({selectedMonths}mo)</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981', marginBottom: '4px' }}>
                      <span>Credit ({prorationInfo.remainingDays} of {prorationInfo.totalDays} days unused)</span>
                      <span>-${prorationInfo.creditDollars.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#fff', fontWeight: 600, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span>You pay</span>
                      <span>${prorationInfo.proratedPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setSelectedTier(null);
                  if (!preselectedCommunityId) {
                    setSelectedCommunity('');
                  }
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={subscribing || !selectedCommunity || isDowngrade}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isDowngrade
                    ? 'rgba(255, 255, 255, 0.05)'
                    : selectedCommunity
                      ? `linear-gradient(135deg, ${selectedTier.color} 0%, ${selectedTier.color}cc 100%)`
                      : 'rgba(255, 255, 255, 0.1)',
                  color: isDowngrade
                    ? 'rgba(255, 255, 255, 0.3)'
                    : selectedCommunity ? (selectedTier.color === '#fbbf24' ? '#000' : '#fff') : 'rgba(255, 255, 255, 0.5)',
                  cursor: subscribing || !selectedCommunity || isDowngrade ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: subscribing ? 0.7 : 1
                }}
              >
                {subscribing
                  ? 'Processing...'
                  : isDowngrade
                    ? 'Cannot Downgrade'
                    : boostAction === 'extend'
                      ? `Extend for $${totalPrice.toFixed(2)}`
                      : boostAction === 'upgrade'
                        ? `Upgrade for $${displayPrice.toFixed(2)}`
                        : `Boost for $${totalPrice.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CommunityPricingPage() {
  return (
    <Suspense fallback={<div />}>
      <CommunityPricingContent />
    </Suspense>
  );
}
