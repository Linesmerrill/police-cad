'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ArrowRightIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  GiftIcon,
  CalendarIcon,
  UserGroupIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
type CreatorStatus = 'active' | 'warned' | 'pending_removal' | 'removed';

interface ContentCreatorPlatform {
  type: string;
  url: string;
  handle: string;
  followerCount: number;
  verifiedByAdmin?: boolean;
}

interface Application {
  _id: string;
  displayName: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  feedback?: string;
  platforms: ContentCreatorPlatform[];
  primaryPlatform: string;
  description: string;
}

interface CreatorProfile {
  _id: string;
  displayName: string;
  slug: string;
  status: CreatorStatus;
  featured: boolean;
  joinedAt: string;
  warnedAt?: string;
  warningMessage?: string;
  profileImage?: string;
  bio: string;
  primaryPlatform: string;
  platforms: ContentCreatorPlatform[];
  entitlements: {
    personalPlan: boolean;
    personalPlanFallback?: boolean;
    currentUserPlan?: string;
    communityPlan: {
      active: boolean;
      communityName?: string;
      communityId?: string;
    };
  };
}

const statusConfig: Record<ApplicationStatus, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  submitted: {
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: <ClockIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Submitted'
  },
  under_review: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: <DocumentCheckIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Under Review'
  },
  approved: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: <CheckCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Approved'
  },
  rejected: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: <XCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Rejected'
  },
  withdrawn: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: <XCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Withdrawn'
  }
};

const creatorStatusConfig: Record<CreatorStatus, { color: string; bgColor: string; label: string }> = {
  active: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    label: 'Active'
  },
  warned: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: 'Warning'
  },
  pending_removal: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Pending Removal'
  },
  removed: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    label: 'Removed'
  }
};

const platformColors: Record<string, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  tiktok: '#00F2EA',
  other: '#6366f1'
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function CreatorStatusPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [ownedCommunities, setOwnedCommunities] = useState<Array<{
    _id: string;
    name: string;
    hasPromotion: boolean;
    currentPlan?: string;
    isPromotionApplied: boolean;
  }>>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [applyingPromotion, setApplyingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      setIsLoaded(true);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in and fetch creator data
    const fetchUserAndCreatorData = async () => {
      try {
        // First check if user is logged in
        const userResponse = await fetch('/api/user/current', {
          credentials: 'include'
        });

        if (!userResponse.ok) {
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        setUser(userData.user);

        // Fetch creator/application data from the me endpoint
        const creatorResponse = await fetch('/api/v1/content-creator-applications/me', {
          credentials: 'include'
        });

        if (creatorResponse.ok) {
          const data = await creatorResponse.json();
          if (data.success) {
            if (data.creator) {
              setCreatorProfile(data.creator);
            }
            if (data.application) {
              setApplication(data.application);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndCreatorData();
  }, []);

  const handleRemovalRequest = async () => {
    if (!creatorProfile) return;

    setRemovalSubmitting(true);
    setRemovalError(null);

    try {
      const response = await fetch(`/api/v1/content-creators/${creatorProfile._id}/request-removal`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowRemovalModal(false);
        // Update the creator profile to show pending_removal status
        setCreatorProfile({
          ...creatorProfile,
          status: 'pending_removal'
        });
      } else {
        setRemovalError(data.message || 'Failed to request removal. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting removal:', error);
      setRemovalError('Failed to request removal. Please try again.');
    } finally {
      setRemovalSubmitting(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!application) return;

    setWithdrawSubmitting(true);
    setWithdrawError(null);

    try {
      const response = await fetch('/api/v1/content-creator-applications/me', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowWithdrawModal(false);
        // Clear the application state to show "no application" view
        setApplication(null);
      } else {
        setWithdrawError(data.message || 'Failed to withdraw application. Please try again.');
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      setWithdrawError('Failed to withdraw application. Please try again.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const fetchOwnedCommunities = async () => {
    setLoadingCommunities(true);
    setPromotionError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/owned-communities', {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOwnedCommunities(data.communities || []);
      } else {
        setPromotionError(data.message || 'Failed to load communities');
      }
    } catch (error) {
      console.error('Error fetching owned communities:', error);
      setPromotionError('Failed to load communities');
    } finally {
      setLoadingCommunities(false);
    }
  };

  const handleClaimCommunityBenefit = () => {
    setShowCommunityModal(true);
    fetchOwnedCommunities();
  };

  const handleApplyPromotion = async (communityId: string) => {
    setApplyingPromotion(true);
    setPromotionError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/community-promotion', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ communityId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowCommunityModal(false);
        // Update the creator profile with the new community plan info
        if (creatorProfile) {
          setCreatorProfile({
            ...creatorProfile,
            entitlements: {
              ...creatorProfile.entitlements,
              communityPlan: {
                active: true,
                communityName: data.communityName,
                communityId: communityId
              }
            }
          });
        }
      } else {
        setPromotionError(data.message || 'Failed to apply promotion');
      }
    } catch (error) {
      console.error('Error applying promotion:', error);
      setPromotionError('Failed to apply promotion');
    } finally {
      setApplyingPromotion(false);
    }
  };

  // Loading state or not logged in - show page shell with appropriate content
  if (loading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <Navbar />

        <section style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px clamp(1rem, 4vw, 2rem) 60px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(251, 191, 36, 0.2)',
                borderTopColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                Loading...
              </p>
            </div>
          ) : (
            <div style={{
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <ExclamationTriangleIcon style={{
                width: '48px',
                height: '48px',
                color: '#fbbf24',
                margin: '0 auto 16px'
              }} />
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Sign In Required
              </h1>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '24px'
              }}>
                Please sign in to view your creator status.
              </p>
              <Link
                href="/login-civ"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  textDecoration: 'none'
                }}
              >
                Sign In
                <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
              </Link>
            </div>
          )}
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>

      <Navbar />

      {/* Header */}
      <section style={{
        padding: '120px clamp(1rem, 4vw, 2rem) 60px',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}>
          {/* Glowing orbs */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'pulse-glow 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            right: '-15%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'pulse-glow 10s ease-in-out infinite',
            animationDelay: '2s'
          }} />

          {/* Floating icons */}
          <UserGroupIcon
            style={{
              position: 'absolute',
              top: '20%',
              left: '8%',
              width: '50px',
              height: '50px',
              color: 'rgba(251, 191, 36, 0.12)',
              animation: 'float 8s ease-in-out infinite'
            }}
          />
          <StarIcon
            style={{
              position: 'absolute',
              top: '35%',
              right: '10%',
              width: '40px',
              height: '40px',
              color: 'rgba(139, 92, 246, 0.1)',
              animation: 'float 6s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />
          <CheckCircleIcon
            style={{
              position: 'absolute',
              bottom: '25%',
              left: '12%',
              width: '35px',
              height: '35px',
              color: 'rgba(34, 197, 94, 0.1)',
              animation: 'float 7s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />
        </div>

        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          <Link
            href="/content-creators"
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
            Back to Program
          </Link>

          <h1 style={{
            fontSize: isMobile ? '1.75rem' : '2.25rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '12px'
          }}>
            Creator Status
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '500px'
          }}>
            Manage your creator profile and benefits
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{
        padding: '40px clamp(1rem, 4vw, 2rem) 80px',
        background: '#0a0a0f',
        flex: 1
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* If user is an approved creator */}
          {creatorProfile && creatorProfile.status !== 'removed' && (
            <>
              {/* Creator Status Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.1) 100%)',
                      border: '2px solid rgba(251, 191, 36, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#fbbf24'
                      }}>
                        {creatorProfile.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <h2 style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {creatorProfile.displayName}
                        </h2>
                        {creatorProfile.featured && (
                          <StarIcon style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                        )}
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        Member since {formatDate(creatorProfile.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: creatorStatusConfig[creatorProfile.status].bgColor,
                    border: `1px solid ${creatorStatusConfig[creatorProfile.status].color}40`
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: creatorStatusConfig[creatorProfile.status].color
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: creatorStatusConfig[creatorProfile.status].color
                    }}>
                      {creatorStatusConfig[creatorProfile.status].label}
                    </span>
                  </div>
                </div>

                {/* Warning message if warned */}
                {creatorProfile.status === 'warned' && creatorProfile.warningMessage && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px'
                    }}>
                      <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>Warning Notice</span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      {creatorProfile.warningMessage}
                    </p>
                  </div>
                )}

                {/* Public Profile Link */}
                <Link
                  href={`/content-creators/${creatorProfile.slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#fbbf24',
                    textDecoration: 'none'
                  }}
                >
                  <LinkIcon style={{ width: '16px', height: '16px' }} />
                  View Public Profile
                  <ArrowRightIcon style={{ width: '14px', height: '14px' }} />
                </Link>
              </div>

              {/* Benefits Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.03) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <GiftIcon style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Your Benefits
                  </h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px'
                }}>
                  {/* Personal Plan */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        Personal Account
                      </span>
                      {creatorProfile.entitlements.personalPlan ? (
                        creatorProfile.entitlements.personalPlanFallback ? (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#60a5fa'
                          }}>
                            Fallback
                          </span>
                        ) : (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#22c55e'
                          }}>
                            <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
                            Active
                          </span>
                        )
                      ) : (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.4)'
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#fff'
                    }}>
                      {creatorProfile.entitlements.personalPlanFallback
                        ? `${creatorProfile.entitlements.currentUserPlan?.charAt(0).toUpperCase()}${creatorProfile.entitlements.currentUserPlan?.slice(1).replace('_', ' ')} Plan`
                        : 'Base Plan'}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '4px'
                    }}>
                      {creatorProfile.entitlements.personalPlanFallback
                        ? 'Base Plan activates if you cancel'
                        : '$36/year value'}
                    </div>
                  </div>

                  {/* Community Plan */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        Community
                      </span>
                      {creatorProfile.entitlements.communityPlan.active ? (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#22c55e'
                        }}>
                          <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#fbbf24'
                        }}>
                          Not assigned
                        </span>
                      )}
                    </div>
                    {creatorProfile.entitlements.communityPlan.active ? (
                      <>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {creatorProfile.entitlements.communityPlan.communityName || 'Base Plan'}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: '4px'
                        }}>
                          $36/year value
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '12px'
                        }}>
                          Base Plan Available
                        </div>
                        <button
                          onClick={handleClaimCommunityBenefit}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            color: '#000',
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <GiftIcon style={{ width: '16px', height: '16px' }} />
                          Claim Your Benefit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      Total Annual Value
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '800',
                      color: '#fbbf24'
                    }}>
                      $72/year
                    </div>
                  </div>
                  <SparklesIcon style={{ width: '32px', height: '32px', color: 'rgba(251, 191, 36, 0.3)' }} />
                </div>
              </div>

              {/* Platforms */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '16px'
                }}>
                  Connected Platforms
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {creatorProfile.platforms.map((platform, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: `${platformColors[platform.type] || platformColors.other}10`,
                        borderRadius: '10px',
                        border: `1px solid ${platformColors[platform.type] || platformColors.other}30`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: platformColors[platform.type] || platformColors.other,
                          textTransform: 'capitalize'
                        }}>
                          {platform.type}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          color: 'rgba(255, 255, 255, 0.6)'
                        }}>
                          @{platform.handle}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#fff'
                      }}>
                        {formatFollowerCount(platform.followerCount)} followers
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowRemovalModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <TrashIcon style={{ width: '18px', height: '18px' }} />
                  Request Removal
                </button>
              </div>
            </>
          )}

          {/* If user has a pending/rejected application */}
          {application && !creatorProfile && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff'
                }}>
                  Application Status
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: statusConfig[application.status].bgColor,
                  border: `1px solid ${statusConfig[application.status].color}40`,
                  color: statusConfig[application.status].color
                }}>
                  {statusConfig[application.status].icon}
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>
                    {statusConfig[application.status].label}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    Display Name
                  </span>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#fff',
                    marginTop: '4px'
                  }}>
                    {application.displayName}
                  </p>
                </div>
                <div>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    Submitted
                  </span>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#fff',
                    marginTop: '4px'
                  }}>
                    {formatDate(application.createdAt)}
                  </p>
                </div>
              </div>

              {/* Rejection feedback */}
              {application.status === 'rejected' && application.feedback && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <XCircleIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                      Application Declined
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    {application.feedback}
                  </p>
                </div>
              )}

              {/* Re-apply option for rejected */}
              {application.status === 'rejected' && (
                <Link
                  href="/content-creators/apply"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '700',
                    padding: '14px 24px',
                    borderRadius: '10px',
                    textDecoration: 'none'
                  }}
                >
                  <PencilSquareIcon style={{ width: '18px', height: '18px' }} />
                  Apply Again
                </Link>
              )}

              {/* Withdraw option for pending applications */}
              {(application.status === 'submitted' || application.status === 'under_review') && (
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <XCircleIcon style={{ width: '18px', height: '18px' }} />
                  Withdraw Application
                </button>
              )}
            </div>
          )}

          {/* No application or creator profile */}
          {!application && !creatorProfile && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <UserGroupIcon style={{ width: '40px', height: '40px', color: 'rgba(255, 255, 255, 0.3)' }} />
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                No Application Found
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '32px',
                maxWidth: '400px',
                margin: '0 auto 32px'
              }}>
                You haven&apos;t applied to the Content Creator Program yet.
                Apply now to unlock exclusive benefits!
              </p>
              <Link
                href="/content-creators/apply"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: '700',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)'
                }}
              >
                Apply Now
                <ArrowRightIcon style={{ width: '18px', height: '18px' }} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Removal Modal */}
      {showRemovalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <ExclamationTriangleIcon style={{ width: '30px', height: '30px', color: '#ef4444' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Request Removal?
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              This will remove you from the Creator Program and revoke your Base Plan benefits
              for both your personal account and community. This action cannot be easily undone.
            </p>

            {removalError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {removalError}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowRemovalModal(false);
                  setRemovalError(null);
                }}
                disabled={removalSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: removalSubmitting ? 'not-allowed' : 'pointer',
                  opacity: removalSubmitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemovalRequest}
                disabled={removalSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: removalSubmitting ? 'not-allowed' : 'pointer',
                  opacity: removalSubmitting ? 0.5 : 1
                }}
              >
                {removalSubmitting ? 'Submitting...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Application Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <XCircleIcon style={{ width: '30px', height: '30px', color: '#fbbf24' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Withdraw Application?
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              Are you sure you want to withdraw your application? You can always apply again later.
            </p>

            {withdrawError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {withdrawError}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawError(null);
                }}
                disabled={withdrawSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: withdrawSubmitting ? 'not-allowed' : 'pointer',
                  opacity: withdrawSubmitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawApplication}
                disabled={withdrawSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  color: '#fbbf24',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: withdrawSubmitting ? 'not-allowed' : 'pointer',
                  opacity: withdrawSubmitting ? 0.5 : 1
                }}
              >
                {withdrawSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Selection Modal */}
      {showCommunityModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <GiftIcon style={{ width: '30px', height: '30px', color: '#fbbf24' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Claim Community Benefit
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              Select a community you own to apply your free Base Plan benefit.
              You can only apply this to one community.
            </p>

            {promotionError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {promotionError}
              </div>
            )}

            {loadingCommunities ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(251, 191, 36, 0.2)',
                  borderTopColor: '#fbbf24',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }} />
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  Loading your communities...
                </p>
              </div>
            ) : ownedCommunities.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <UserGroupIcon style={{
                  width: '40px',
                  height: '40px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  margin: '0 auto 12px'
                }} />
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  You don&apos;t own any communities yet.
                </p>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '8px'
                }}>
                  Create a community in Lines Police CAD to claim this benefit.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {ownedCommunities.map((community) => (
                  <button
                    key={community._id}
                    onClick={() => !community.isPromotionApplied && !applyingPromotion && handleApplyPromotion(community._id)}
                    disabled={community.isPromotionApplied || applyingPromotion}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: community.isPromotionApplied
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: community.isPromotionApplied
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      cursor: community.isPromotionApplied || applyingPromotion ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: applyingPromotion && !community.isPromotionApplied ? 0.5 : 1
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#fff'
                      }}>
                        {community.name}
                      </div>
                      {community.currentPlan && (
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: '4px'
                        }}>
                          Current: {community.currentPlan}
                        </div>
                      )}
                    </div>
                    {community.isPromotionApplied ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#22c55e'
                      }}>
                        <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                        Applied
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#fbbf24',
                        padding: '6px 12px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '6px'
                      }}>
                        Select
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setShowCommunityModal(false);
                setPromotionError(null);
              }}
              disabled={applyingPromotion}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: applyingPromotion ? 'not-allowed' : 'pointer',
                opacity: applyingPromotion ? 0.5 : 1
              }}
            >
              {applyingPromotion ? 'Applying...' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
