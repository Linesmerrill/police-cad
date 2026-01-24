'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ArrowLeftIcon,
  CalendarIcon,
  LinkIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  PlayIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface ContentCreatorPlatform {
  type: string;
  url: string;
  handle: string;
  followerCount: number;
  verifiedByAdmin?: boolean;
}

interface ContentCreator {
  _id: string;
  slug: string;
  displayName: string;
  profileImage?: string;
  bio: string;
  themeColor?: string;
  platforms: ContentCreatorPlatform[];
  primaryPlatform: string;
  featured: boolean;
  joinedAt: string;
  status?: string;
}

const platformConfig: Record<string, { name: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  twitch: {
    name: 'Twitch',
    color: '#9146FF',
    bgColor: 'rgba(145, 70, 255, 0.15)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    )
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  tiktok: {
    name: 'TikTok',
    color: '#00F2EA',
    bgColor: 'rgba(0, 242, 234, 0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    )
  },
  other: {
    name: 'Other',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  }
};

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [creator, setCreator] = useState<ContentCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    const fetchCreator = async () => {
      const slug = params.slug as string;
      if (!slug) {
        router.push('/content-creators');
        return;
      }

      try {
        const response = await fetch(`/api/v1/content-creators/${slug}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.creator) {
            setCreator(data.creator);
            setIsLoaded(true);
          } else {
            setError('Creator not found');
          }
        } else if (response.status === 404) {
          setError('Creator not found');
        } else {
          setError('Failed to load creator profile');
        }
      } catch (err) {
        console.error('Error fetching creator:', err);
        setError('Failed to load creator profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [params.slug, router]);

  // Check if this is the logged-in user's own profile
  useEffect(() => {
    const checkOwnProfile = async () => {
      if (!creator) return;

      try {
        const response = await fetch('/api/v1/content-creator-applications/me', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.creator && data.creator.slug === creator.slug) {
            setIsOwnProfile(true);
          }
        }
      } catch (err) {
        // Silently fail - user just isn't logged in or doesn't have a creator profile
      }
    };

    checkOwnProfile();
  }, [creator]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(251, 191, 36, 0.3)',
          borderTopColor: '#fbbf24',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px 60px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <ExclamationTriangleIcon style={{
              width: '48px',
              height: '48px',
              color: 'rgba(255, 255, 255, 0.3)',
              margin: '0 auto 16px'
            }} />
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '12px'
            }}>
              {error || 'Creator not found'}
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '24px'
            }}>
              The creator you&apos;re looking for doesn&apos;t exist or may have been removed.
            </p>
            <Link
              href="/content-creators"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000',
                fontWeight: '600',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
              Back to Creators
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const primaryPlatform = creator.platforms.find(p => p.type === creator.primaryPlatform) || creator.platforms[0];
  const totalFollowers = creator.platforms.reduce((sum, p) => sum + p.followerCount, 0);
  const platformConf = platformConfig[creator.primaryPlatform] || platformConfig.twitch;

  // Use creator's theme color if set, otherwise fall back to platform color
  const themeColor = creator.themeColor || platformConf.color;
  const themeBgColor = creator.themeColor
    ? `${creator.themeColor}15`
    : platformConf.bgColor;

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
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      <Navbar />

      {/* Hero Section with Profile */}
      <section
        style={{
          position: 'relative',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: `linear-gradient(180deg, #0a0a0f 0%, ${themeBgColor} 50%, #0a0a0f 100%)`
        }}
      >
        {/* Background Elements */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          {/* Large glow matching primary platform */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '500px',
            background: `radial-gradient(ellipse, ${themeColor}20 0%, transparent 60%)`,
            filter: 'blur(80px)',
            animation: 'pulse-glow 6s ease-in-out infinite'
          }} />

          {/* Grid pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(${themeColor}05 1px, transparent 1px),
              linear-gradient(90deg, ${themeColor}05 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            opacity: 0.5
          }} />
        </div>

        <div style={{
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '120px clamp(1rem, 4vw, 2rem) 60px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Back Link */}
          <Link
            href="/content-creators"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '40px',
              transition: 'color 0.2s',
              animation: isLoaded ? 'fadeSlideUp 0.6s ease-out forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            Back to Creators
          </Link>

          {/* Profile Header */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: '40px',
            animation: isLoaded ? 'fadeSlideUp 0.6s ease-out 0.1s forwards' : 'none',
            opacity: isLoaded ? 1 : 0
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              {/* Glow */}
              <div style={{
                position: 'absolute',
                inset: '-20px',
                background: `radial-gradient(circle, ${themeColor}40 0%, transparent 60%)`,
                filter: 'blur(30px)',
                animation: 'float 4s ease-in-out infinite'
              }} />

              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${themeColor}30 0%, ${themeColor}10 100%)`,
                  border: `3px solid ${themeColor}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 20px 60px ${themeColor}30`
                }}
              >
                {creator.profileImage ? (
                  <img
                    src={creator.profileImage}
                    alt={creator.displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{
                    fontSize: '56px',
                    fontWeight: '800',
                    color: themeColor,
                    textTransform: 'uppercase'
                  }}>
                    {creator.displayName.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Featured badge */}
              {creator.featured && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #0a0a0f',
                    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  <StarIcon style={{ width: '20px', height: '20px', color: '#000' }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{
              flex: 1,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: isMobile ? 'center' : 'flex-start',
                flexWrap: 'wrap',
                marginBottom: '8px'
              }}>
                <h1 style={{
                  fontSize: isMobile ? '2rem' : '2.5rem',
                  fontWeight: '800',
                  color: '#fff',
                  margin: 0
                }}>
                  {creator.displayName}
                </h1>
                {creator.featured && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '20px',
                    padding: '4px 12px'
                  }}>
                    <CheckBadgeIcon style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#fbbf24',
                      textTransform: 'uppercase'
                    }}>
                      Featured Creator
                    </span>
                  </div>
                )}
                {isOwnProfile && (
                  <Link
                    href="/content-creators/me"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                    }}
                  >
                    <PencilSquareIcon style={{ width: '14px', height: '14px' }} />
                    Edit Profile
                  </Link>
                )}
              </div>

              {/* Meta info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                justifyContent: isMobile ? 'center' : 'flex-start',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px'
                }}>
                  <UserGroupIcon style={{ width: '16px', height: '16px' }} />
                  {formatFollowerCount(totalFollowers)} total followers
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px'
                }}>
                  <CalendarIcon style={{ width: '16px', height: '16px' }} />
                  Joined {formatDate(creator.joinedAt)}
                </div>
              </div>

              {/* Bio */}
              {(() => {
                const bioLines = creator.bio.split('\n');
                const needsTruncation = bioLines.length > 6;
                const displayBio = bioExpanded || !needsTruncation
                  ? creator.bio
                  : bioLines.slice(0, 6).join('\n');

                return (
                  <div style={{ maxWidth: '600px', margin: isMobile ? '0 auto' : 0 }}>
                    <p style={{
                      fontSize: '1.1rem',
                      lineHeight: '1.7',
                      color: 'rgba(255, 255, 255, 0.8)',
                      whiteSpace: 'pre-wrap',
                      margin: 0
                    }}>
                      {displayBio}
                      {!bioExpanded && needsTruncation && '...'}
                    </p>
                    {needsTruncation && (
                      <button
                        onClick={() => setBioExpanded(!bioExpanded)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: themeColor,
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '8px 0',
                          marginTop: '4px',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        {bioExpanded ? 'See less' : 'See more'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section
        style={{
          padding: isMobile ? '60px 0' : '80px 0',
          background: '#0a0a0f'
        }}
      >
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <LinkIcon style={{ width: '24px', height: '24px', color: 'rgba(255, 255, 255, 0.5)' }} />
            Platforms
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {creator.platforms.map((platform) => {
              const config = platformConfig[platform.type];
              if (!config) return null;

              return (
                <a
                  key={platform.type}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    background: config.bgColor,
                    borderRadius: '16px',
                    border: `1px solid ${config.color}30`,
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(8px)';
                    e.currentTarget.style.borderColor = `${config.color}60`;
                    e.currentTarget.style.boxShadow = `0 10px 30px ${config.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = `${config.color}30`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `${config.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: config.color
                    }}>
                      {config.icon}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#fff',
                        marginBottom: '2px'
                      }}>
                        {config.name}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        @{platform.handle}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: config.color
                      }}>
                        {formatFollowerCount(platform.followerCount)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textTransform: 'uppercase'
                      }}>
                        followers
                      </div>
                    </div>
                    <ArrowTopRightOnSquareIcon style={{
                      width: '20px',
                      height: '20px',
                      color: 'rgba(255, 255, 255, 0.4)'
                    }} />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: isMobile ? '60px 0' : '80px 0',
          background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d18 100%)',
          textAlign: 'center'
        }}
      >
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '12px'
          }}>
            Want to become a creator?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '24px'
          }}>
            Join the Lines Police CAD Creator Program and get exclusive benefits.
          </p>
          <Link
            href="/content-creators/apply"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#000',
              fontSize: '14px',
              fontWeight: '700',
              padding: '14px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(251, 191, 36, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(251, 191, 36, 0.3)';
            }}
          >
            <PlayIcon style={{ width: '18px', height: '18px' }} />
            Apply Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
