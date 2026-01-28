'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckIcon, StarIcon, BuildingOffice2Icon } from '@heroicons/react/24/solid';
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
  };
}

export default function CommunityPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<CommunityTier[]>([]);
  const [durations] = useState([1, 3, 6]);
  const [selectedTier, setSelectedTier] = useState<CommunityTier | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [promotionalText, setPromotionalText] = useState('');
  const [promotionalDescription, setPromotionalDescription] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

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
            // Fetch user's communities
            fetchCommunities(userData.user.id);
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
        const response = await fetch('/api/v1/subscription/community-tiers');
        if (response.ok) {
          const data = await response.json();
          setTiers(data.tiers || []);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
        // Fallback tiers
        setTiers([
          {
            name: 'Basic',
            key: 'basic',
            monthlyPrice: 5,
            features: ['Promotional text in search'],
            color: '#3b82f6',
          },
          {
            name: 'Standard',
            key: 'standard',
            monthlyPrice: 10,
            features: ['Promotional text in search', 'Verified community badge', 'Short description (100 chars)'],
            color: '#10b981',
          },
          {
            name: 'Premium',
            key: 'premium',
            monthlyPrice: 20,
            features: ['Promotional text in search', 'Verified community badge', 'Boost on Discover page'],
            color: '#667eea',
          },
          {
            name: 'Elite',
            key: 'elite',
            monthlyPrice: 50,
            features: ['Promotional text in search', 'Verified community badge', 'Boost on Discover page', 'Featured on Home Page', 'Long description (200 chars)'],
            color: '#fbbf24',
            popular: true,
          },
        ]);
      }
    };

    fetchUser();
    fetchTiers();
  }, []);

  const fetchCommunities = async (userId: string) => {
    try {
      // Fetch communities owned by user
      const response = await fetch(`/api/v1/communities/${userId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCommunities(data.communities || data || []);
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const getTotalPrice = () => {
    if (!selectedTier) return 0;
    return selectedTier.monthlyPrice * selectedDuration;
  };

  const handleSelectTier = (tier: CommunityTier) => {
    if (!user) {
      router.push('/login?redirect=/community-pricing');
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
          durationMonths: selectedDuration,
          promotionalText: promotionalText,
          promotionalDescription: promotionalDescription
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
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

  const getMaxDescriptionLength = () => {
    if (!selectedTier) return 0;
    return selectedTier.key === 'elite' ? 200 : selectedTier.key === 'standard' ? 100 : 0;
  };

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
              Promote Your Community
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Boost your community&apos;s visibility and attract more members with our promotional packages
            </p>
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

          {/* Pricing Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto'
          }}>
            {tiers.map((tier) => {
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
                      Best Value
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
                      ${tier.monthlyPrice}
                    </span>
                    <span style={{
                      fontSize: '1rem',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      /month
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
                  <button
                    onClick={() => handleSelectTier(tier)}
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
                      cursor: 'pointer'
                    }}
                  >
                    Select Plan
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
            <p>Community promotions are one-time purchases for 1, 3, or 6 months. Prices shown are per month.</p>
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
            maxWidth: '500px',
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
              Complete Your Purchase
            </h3>

            {/* Selected Plan */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: selectedTier.color, fontWeight: 600 }}>
                  {selectedTier.name} Promotion
                </span>
                <span style={{ color: '#fff', fontWeight: 700 }}>
                  ${selectedTier.monthlyPrice}/mo
                </span>
              </div>
            </div>

            {/* Duration Select */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                Duration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedDuration === d
                        ? `2px solid ${selectedTier.color}`
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      background: selectedDuration === d
                        ? `${selectedTier.color}20`
                        : 'transparent',
                      color: selectedDuration === d ? selectedTier.color : 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {d} {d === 1 ? 'Month' : 'Months'}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Select */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                Select Community
              </label>
              {communities.length > 0 ? (
                <select
                  value={selectedCommunity}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">Choose a community...</option>
                  {communities.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.community?.name || 'Unnamed Community'}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
                  You don&apos;t have any communities. Create one first!
                </p>
              )}
            </div>

            {/* Promotional Text */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                Promotional Text (shown in search)
              </label>
              <input
                type="text"
                value={promotionalText}
                onChange={(e) => setPromotionalText(e.target.value)}
                maxLength={50}
                placeholder="e.g., Join our active community!"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Description (for Standard/Elite) */}
            {getMaxDescriptionLength() > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '8px',
                  fontSize: '0.9rem'
                }}>
                  Description ({getMaxDescriptionLength()} chars max)
                </label>
                <textarea
                  value={promotionalDescription}
                  onChange={(e) => setPromotionalDescription(e.target.value)}
                  maxLength={getMaxDescriptionLength()}
                  placeholder="Describe your community..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>
            )}

            {/* Total */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Total ({selectedDuration} {selectedDuration === 1 ? 'month' : 'months'})
                </span>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.25rem' }}>
                  ${getTotalPrice()}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setSelectedTier(null);
                  setSelectedCommunity('');
                  setPromotionalText('');
                  setPromotionalDescription('');
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
                disabled={subscribing || !selectedCommunity}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedCommunity
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: selectedCommunity ? '#000' : 'rgba(255, 255, 255, 0.5)',
                  cursor: subscribing || !selectedCommunity ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: subscribing ? 0.7 : 1
                }}
              >
                {subscribing ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
