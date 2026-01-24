'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  VideoCameraIcon,
  SparklesIcon,
  UserGroupIcon,
  GiftIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckBadgeIcon
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
  platforms: ContentCreatorPlatform[];
  primaryPlatform: string;
  featured: boolean;
  joinedAt: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
};

const platformColors: Record<string, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  tiktok: '#00F2EA'
};

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function CreatorCard({ creator, index }: { creator: ContentCreator; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const primaryPlatform = creator.platforms.find(p => p.type === creator.primaryPlatform) || creator.platforms[0];
  const totalFollowers = creator.platforms.reduce((sum, p) => sum + p.followerCount, 0);

  return (
    <Link
      href={`/content-creators/${creator.slug}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'fadeSlideUp 0.6s ease-out forwards',
        opacity: 0
      }}
    >
      <div
        style={{
          position: 'relative',
          background: isHovered
            ? 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 30, 50, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(15, 15, 22, 0.9) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: creator.featured
            ? '1px solid rgba(251, 191, 36, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered
            ? creator.featured
              ? '0 25px 50px rgba(251, 191, 36, 0.15), 0 0 30px rgba(251, 191, 36, 0.1)'
              : '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)'
            : '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Featured Badge */}
        {creator.featured && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              borderRadius: '20px',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 10
            }}
          >
            <StarIcon style={{ width: '12px', height: '12px', color: '#000' }} />
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Featured
            </span>
          </div>
        )}

        {/* Avatar Section */}
        <div style={{
          padding: '24px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Glow behind avatar */}
          <div style={{
            position: 'absolute',
            top: '20px',
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle, ${platformColors[creator.primaryPlatform] || '#6366f1'}40 0%, transparent 70%)`,
            filter: 'blur(20px)',
            opacity: isHovered ? 0.8 : 0.4,
            transition: 'opacity 0.4s ease'
          }} />

          {/* Avatar */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${platformColors[creator.primaryPlatform] || '#6366f1'}30 0%, ${platformColors[creator.primaryPlatform] || '#6366f1'}10 100%)`,
              border: `2px solid ${platformColors[creator.primaryPlatform] || '#6366f1'}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
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
                fontSize: '28px',
                fontWeight: '700',
                color: platformColors[creator.primaryPlatform] || '#6366f1',
                textTransform: 'uppercase'
              }}>
                {creator.displayName.slice(0, 2)}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 style={{
            marginTop: '16px',
            fontSize: '18px',
            fontWeight: '700',
            color: '#fff',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {creator.displayName}
            {creator.featured && (
              <CheckBadgeIcon style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
            )}
          </h3>

          {/* Total Followers */}
          <p style={{
            marginTop: '4px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '500'
          }}>
            {formatFollowerCount(totalFollowers)} total followers
          </p>
        </div>

        {/* Bio */}
        <div style={{ padding: '0 24px 16px' }}>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {creator.bio}
          </p>
        </div>

        {/* Platforms */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          {creator.platforms.map((platform) => (
            <div
              key={platform.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: `${platformColors[platform.type]}15`,
                border: `1px solid ${platformColors[platform.type]}30`
              }}
            >
              <span style={{ color: platformColors[platform.type] }}>
                {platformIcons[platform.type]}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: platformColors[platform.type]
              }}>
                {formatFollowerCount(platform.followerCount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function ContentCreatorsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [creators, setCreators] = useState<ContentCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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
    const fetchCreators = async () => {
      try {
        const response = await fetch('/api/v1/content-creators?limit=50', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.creators) {
            setCreators(data.creators);
          } else {
            // API returned success: false or no creators array - treat as empty
            setCreators([]);
          }
        } else if (response.status === 404) {
          // Endpoint not found or no data - treat as empty, not error
          setCreators([]);
        } else {
          setError('Failed to load creators');
        }
      } catch (err) {
        console.error('Error fetching creators:', err);
        setError('Failed to load creators');
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  const featuredCreators = creators.filter(c => c.featured);
  const allCreators = creators;

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

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <Navbar />

      {/* Hero Section - Broadcast Studio Aesthetic */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d18 50%, #12121f 100%)'
        }}
      >
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          {/* Large glowing orbs */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'pulse-glow 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'pulse-glow 10s ease-in-out infinite',
            animationDelay: '2s'
          }} />
          <div style={{
            position: 'absolute',
            top: '30%',
            right: '20%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 60%)',
            filter: 'blur(50px)',
            animation: 'pulse-glow 6s ease-in-out infinite',
            animationDelay: '4s'
          }} />

          {/* Diagonal lines pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 80px,
              rgba(251, 191, 36, 0.02) 80px,
              rgba(251, 191, 36, 0.02) 81px
            )`,
            opacity: 0.5
          }} />

          {/* Scanline effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.03) 50%)',
            backgroundSize: '100% 4px',
            opacity: 0.3
          }} />

          {/* Floating camera icons */}
          <VideoCameraIcon
            style={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: '60px',
              height: '60px',
              color: 'rgba(251, 191, 36, 0.15)',
              animation: 'float 8s ease-in-out infinite'
            }}
          />
          <PlayIcon
            style={{
              position: 'absolute',
              bottom: '20%',
              left: '15%',
              width: '40px',
              height: '40px',
              color: 'rgba(139, 92, 246, 0.12)',
              animation: 'float 6s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />
          <SparklesIcon
            style={{
              position: 'absolute',
              top: '25%',
              right: '12%',
              width: '50px',
              height: '50px',
              color: 'rgba(236, 72, 153, 0.12)',
              animation: 'float 7s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />
        </div>

        {/* Main Content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)',
          textAlign: 'center'
        }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '30px',
              padding: '8px 20px',
              marginBottom: '32px',
              animation: isLoaded ? 'fadeSlideUp 0.8s ease-out forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
          >
            <SparklesIcon style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#fbbf24',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              Content Creator Program
            </span>
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: isMobile ? 'clamp(2rem, 8vw, 3rem)' : 'clamp(3rem, 6vw, 4.5rem)',
              fontWeight: '800',
              lineHeight: '1.1',
              marginBottom: '24px',
              animation: isLoaded ? 'fadeSlideUp 0.8s ease-out 0.1s forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
          >
            <span style={{
              display: 'block',
              color: '#fff',
              textShadow: '0 0 60px rgba(255, 255, 255, 0.1)'
            }}>
              Create. Stream.
            </span>
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ec4899 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 6s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Get Rewarded.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              lineHeight: '1.7',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '650px',
              margin: '0 auto 40px',
              animation: isLoaded ? 'fadeSlideUp 0.8s ease-out 0.2s forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
          >
            Join the Lines Police CAD Creator Program and unlock exclusive benefits
            while showcasing your roleplay content to thousands of players.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              animation: isLoaded ? 'fadeSlideUp 0.8s ease-out 0.3s forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
          >
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
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 40px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 50px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
            >
              <VideoCameraIcon style={{ width: '20px', height: '20px' }} />
              Apply Now
              <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
            </Link>

            <a
              href="#creators"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                padding: '16px 32px',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <UserGroupIcon style={{ width: '20px', height: '20px' }} />
              View Creators
            </a>
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: isMobile ? '24px' : '48px',
              marginTop: '64px',
              padding: '32px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              animation: isLoaded ? 'fadeSlideUp 0.8s ease-out 0.4s forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
          >
            {[
              { value: '25+', label: 'Active Creators' },
              { value: '500K+', label: 'Combined Reach' },
              { value: '$72', label: 'Yearly Value' }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: '120px' }}>
                <div style={{
                  fontSize: isMobile ? '2rem' : '2.5rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: '1.2'
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: '500',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section
        style={{
          padding: isMobile ? '60px 0' : '100px 0',
          background: 'linear-gradient(180deg, #12121f 0%, #0a0a0f 100%)',
          position: 'relative'
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px'
            }}>
              Program Requirements
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              Meet these criteria to join our creator community
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            {[
              {
                icon: <UserGroupIcon style={{ width: '32px', height: '32px' }} />,
                title: '500+ Followers',
                description: 'Have at least 500 followers on any supported platform (Twitch, YouTube, TikTok)',
                color: '#8b5cf6'
              },
              {
                icon: <VideoCameraIcon style={{ width: '32px', height: '32px' }} />,
                title: 'Active LPC Content',
                description: 'Create streams or videos featuring Lines Police CAD gameplay regularly',
                color: '#ec4899'
              },
              {
                icon: <SparklesIcon style={{ width: '32px', height: '32px' }} />,
                title: 'Quality Content',
                description: 'Maintain community standards and create engaging, positive content',
                color: '#fbbf24'
              }
            ].map((req, i) => (
              <div
                key={i}
                style={{
                  padding: '32px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = `${req.color}40`;
                  e.currentTarget.style.boxShadow = `0 20px 40px ${req.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: `${req.color}15`,
                  border: `1px solid ${req.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: req.color,
                  marginBottom: '20px'
                }}>
                  {req.icon}
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '12px'
                }}>
                  {req.title}
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  {req.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        style={{
          padding: isMobile ? '60px 0' : '100px 0',
          background: '#0a0a0f',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.05) 0%, transparent 60%)',
          filter: 'blur(100px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '20px',
              padding: '6px 16px',
              marginBottom: '20px'
            }}>
              <GiftIcon style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fbbf24' }}>Creator Benefits</span>
            </div>
            <h2 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px'
            }}>
              What You Get
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              Exclusive perks for approved content creators
            </p>
          </div>

          {/* Benefits Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              padding: isMobile ? '32px 24px' : '48px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decorative corner */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 60%)',
              filter: 'blur(40px)'
            }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '40px',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Left - Free Base Plan */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <SparklesIcon style={{ width: '24px', height: '24px', color: '#000' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                      Free Base Plan
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                      For you + one community
                    </p>
                  </div>
                </div>

                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {[
                    'Base Plan for your personal account',
                    'Base Plan for ONE community you manage',
                    'Featured profile on our creators directory',
                    'Prestige of being an exclusive Creator Program member'
                  ].map((benefit, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}
                    >
                      <CheckBadgeIcon style={{
                        width: '20px',
                        height: '20px',
                        color: '#fbbf24',
                        flexShrink: 0,
                        marginTop: '2px'
                      }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right - Value */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px'
                }}>
                  Total Value
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '24px'
                }}>
                  <span style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    color: '#fbbf24'
                  }}>
                    $72
                  </span>
                  <span style={{
                    fontSize: '1.25rem',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    /year
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                      Personal Base Plan
                    </span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>
                      $36/yr
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                      Community Base Plan
                    </span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>
                      $36/yr
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creators Directory */}
      <section
        id="creators"
        style={{
          padding: isMobile ? '60px 0' : '100px 0',
          background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d18 100%)'
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px'
            }}>
              Our Creators
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              Meet the talented content creators in our program
            </p>
          </div>

          {/* Creator Grid */}
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(251, 191, 36, 0.2)',
                borderTopColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          ) : allCreators.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 32px',
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative glow */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 60%)',
                filter: 'blur(40px)',
                pointerEvents: 'none'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <SparklesIcon style={{ width: '36px', height: '36px', color: '#fbbf24' }} />
                </div>

                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '12px'
                }}>
                  Be a Pioneer!
                </h3>

                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '8px',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  maxWidth: '400px',
                  margin: '0 auto 24px'
                }}>
                  Our Creator Program is brand new and waiting for talented content creators like you.
                  Be among the first to join and get featured!
                </p>

                <Link
                  href="/content-creators/apply"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#000',
                    fontWeight: '700',
                    padding: '14px 28px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '14px'
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
                  <VideoCameraIcon style={{ width: '18px', height: '18px' }} />
                  Apply Now
                  <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {allCreators.map((creator, i) => (
                <CreatorCard key={creator._id} creator={creator} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          padding: isMobile ? '60px 0' : '100px 0',
          background: 'linear-gradient(180deg, #0d0d18 0%, #0a0a0f 100%)',
          textAlign: 'center'
        }}
      >
        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '16px'
          }}>
            Ready to Join?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '32px',
            lineHeight: '1.7'
          }}>
            Apply today and start enjoying exclusive benefits while growing your audience
            with the Lines Police CAD community.
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
              padding: '18px 40px',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 40px rgba(251, 191, 36, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(251, 191, 36, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(251, 191, 36, 0.3)';
            }}
          >
            Start Your Application
            <ArrowRightIcon style={{ width: '18px', height: '18px' }} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
