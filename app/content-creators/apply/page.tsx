'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  VideoCameraIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  DocumentCheckIcon,
  GiftIcon
} from '@heroicons/react/24/outline';

type PlatformType = 'twitch' | 'youtube' | 'tiktok' | 'other';

interface PlatformEntry {
  id: string;
  type: PlatformType;
  url: string;
  handle: string;
  followerCount: string;
}

const platformOptions: { value: PlatformType; label: string; color: string; placeholder: string }[] = [
  { value: 'twitch', label: 'Twitch', color: '#9146FF', placeholder: 'https://twitch.tv/yourhandle' },
  { value: 'youtube', label: 'YouTube', color: '#FF0000', placeholder: 'https://youtube.com/@yourhandle' },
  { value: 'tiktok', label: 'TikTok', color: '#00F2EA', placeholder: 'https://tiktok.com/@yourhandle' },
  { value: 'other', label: 'Other', color: '#6366f1', placeholder: 'https://...' }
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function ApplyPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [primaryPlatform, setPrimaryPlatform] = useState<PlatformType>('twitch');
  const [platforms, setPlatforms] = useState<PlatformEntry[]>([
    { id: generateId(), type: 'twitch', url: '', handle: '', followerCount: '' }
  ]);
  const [description, setDescription] = useState('');
  const [bio, setBio] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Slug availability checking
  const [slugCheckResult, setSlugCheckResult] = useState<{
    available: boolean;
    slug: string;
    message: string;
  } | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Honeypot field (anti-spam)
  const [honeypot, setHoneypot] = useState('');

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
    // Check if user is logged in and if they already have an application
    const checkUserAndApplication = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            setUser(userData.user);
            if (userData.user.username) {
              setDisplayName(userData.user.username);
            }

            // Check if user already has an active application or is a creator
            const creatorResponse = await fetch('/api/v1/content-creator-applications/me', {
              credentials: 'include'
            });
            if (creatorResponse.ok) {
              const data = await creatorResponse.json();
              if (data.success) {
                // If user is already an active creator or has a pending application, redirect to /me
                // Allow removed creators to apply again
                const isActiveCreator = data.creator && data.creator.status !== 'removed';
                const hasPendingApplication = data.application && ['submitted', 'under_review', 'approved'].includes(data.application.status);
                if (isActiveCreator || hasPendingApplication) {
                  setIsRedirecting(true);
                  router.push('/content-creators/me');
                  return;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUserAndApplication();
  }, [router]);

  // Debounced slug availability check
  useEffect(() => {
    // Clear result if display name is too short
    if (displayName.trim().length < 2) {
      setSlugCheckResult(null);
      return;
    }

    setCheckingSlug(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/content-creators/check-slug?displayName=${encodeURIComponent(displayName.trim())}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSlugCheckResult({
              available: data.available,
              slug: data.slug,
              message: data.message || ''
            });
          }
        }
      } catch (error) {
        console.error('Error checking slug availability:', error);
      } finally {
        setCheckingSlug(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [displayName]);

  const addPlatform = () => {
    if (platforms.length >= 5) return;
    setPlatforms([...platforms, {
      id: generateId(),
      type: 'youtube',
      url: '',
      handle: '',
      followerCount: ''
    }]);
  };

  const removePlatform = (id: string) => {
    if (platforms.length <= 1) return;
    setPlatforms(platforms.filter(p => p.id !== id));
  };

  const updatePlatform = (id: string, field: keyof PlatformEntry, value: string) => {
    setPlatforms(platforms.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const getMaxFollowers = (): number => {
    return Math.max(...platforms.map(p => parseInt(p.followerCount) || 0), 0);
  };

  const isFormValid = (): boolean => {
    if (!displayName.trim()) return false;
    if (!description.trim() || description.length < 50) return false;
    if (!bio.trim() || bio.length < 20 || bio.length > 500) return false;
    if (!agreedToTerms) return false;
    if (getMaxFollowers() < 500) return false;

    // Check at least one platform has valid data
    const hasValidPlatform = platforms.some(p =>
      p.url.trim() && p.handle.trim() && parseInt(p.followerCount) >= 500
    );
    return hasValidPlatform;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) {
      setSubmitError('Invalid submission');
      return;
    }

    if (!isFormValid()) {
      setSubmitError('Please fill in all required fields and ensure you meet the minimum requirements.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Format platforms for API - strip leading @ from handles before submission
      const formattedPlatforms = platforms
        .filter(p => p.url && p.handle)
        .map(p => ({
          type: p.type,
          url: p.url,
          handle: p.handle.replace(/^@+/, ''),
          followerCount: parseInt(p.followerCount) || 0
        }));

      const response = await fetch('/api/v1/content-creator-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName,
          primaryPlatform,
          platforms: formattedPlatforms,
          description,
          bio
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.message || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navbar />

        <section style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px clamp(1rem, 4vw, 2rem) 60px'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
              border: '2px solid rgba(34, 197, 94, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircleIcon style={{ width: '40px', height: '40px', color: '#22c55e' }} />
            </div>

            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px'
            }}>
              Application Submitted!
            </h1>

            <p style={{
              fontSize: '1rem',
              lineHeight: '1.7',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '32px'
            }}>
              Thank you for applying to the Content Creator Program. We&apos;ll review your
              application and get back to you within 5-7 business days. You can track
              your application status anytime.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <Link
                href="/content-creators/me"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <DocumentCheckIcon style={{ width: '18px', height: '18px' }} />
                View Application Status
              </Link>

              <Link
                href="/content-creators"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                Back to Creators
              </Link>
            </div>
          </div>
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

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <Navbar />

      {/* Header */}
      <section style={{
        position: 'relative',
        padding: '120px clamp(1rem, 4vw, 2rem) 60px',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
            top: '20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'pulse-glow 8s ease-in-out infinite 2s'
          }} />

          {/* Floating icons */}
          <VideoCameraIcon style={{
            position: 'absolute',
            top: '25%',
            left: '8%',
            width: '32px',
            height: '32px',
            color: 'rgba(251, 191, 36, 0.25)',
            animation: 'float 8s ease-in-out infinite'
          }} />
          <SparklesIcon style={{
            position: 'absolute',
            top: '35%',
            right: '12%',
            width: '28px',
            height: '28px',
            color: 'rgba(251, 191, 36, 0.2)',
            animation: 'float 6s ease-in-out infinite 1s'
          }} />
          <UserGroupIcon style={{
            position: 'absolute',
            bottom: '30%',
            left: '15%',
            width: '24px',
            height: '24px',
            color: 'rgba(251, 191, 36, 0.18)',
            animation: 'float 7s ease-in-out infinite 0.5s'
          }} />
          <GiftIcon style={{
            position: 'absolute',
            top: '45%',
            right: '20%',
            width: '26px',
            height: '26px',
            color: 'rgba(251, 191, 36, 0.22)',
            animation: 'float 9s ease-in-out infinite 1.5s'
          }} />
        </div>

        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
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
              marginBottom: '32px',
              transition: 'color 0.2s',
              animation: isLoaded ? 'fadeSlideUp 0.5s ease-out forwards' : 'none',
              opacity: isLoaded ? 1 : 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            Back to Program
          </Link>

          <h1 style={{
            fontSize: isMobile ? '2rem' : '2.5rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '16px',
            animation: isLoaded ? 'fadeSlideUp 0.5s ease-out 0.1s forwards' : 'none',
            opacity: isLoaded ? 1 : 0
          }}>
            Apply to Creator Program
          </h1>

          <p style={{
            fontSize: '1.1rem',
            lineHeight: '1.7',
            color: 'rgba(255, 255, 255, 0.7)',
            animation: isLoaded ? 'fadeSlideUp 0.5s ease-out 0.2s forwards' : 'none',
            opacity: isLoaded ? 1 : 0
          }}>
            Complete the form below to apply for the Lines Police CAD Content Creator Program.
            Applications are typically reviewed within 5-7 business days.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section style={{
        padding: '40px clamp(1rem, 4vw, 2rem) 80px',
        background: '#0a0a0f'
      }}>
        <div style={{
          maxWidth: '700px',
          margin: '0 auto'
        }}>
          {/* Loading auth state or redirecting */}
          {(checkingAuth || isRedirecting) && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '60px 32px',
              textAlign: 'center',
              marginBottom: '40px'
            }}>
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
                {isRedirecting ? 'Redirecting...' : 'Checking authentication...'}
              </p>
            </div>
          )}

          {/* Not logged in state */}
          {!checkingAuth && !isRedirecting && !user && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              padding: '32px',
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <ExclamationTriangleIcon style={{
                width: '48px',
                height: '48px',
                color: '#fbbf24',
                margin: '0 auto 16px'
              }} />
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Sign In Required
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '24px'
              }}>
                You need to be signed in to apply for the Content Creator Program.
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
                  textDecoration: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                Sign In
                <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
              </Link>
            </div>
          )}

          {/* Application Form */}
          {!checkingAuth && !isRedirecting && user && (
            <form onSubmit={handleSubmit}>
              {/* Requirements reminder */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '20px',
                marginBottom: '40px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '12px'
                }}>
                  Requirements
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {[
                    { text: '500+ followers on at least one platform', met: getMaxFollowers() >= 500 },
                    { text: 'Active LPC content (streams or videos)', met: true },
                    { text: 'Agree to program terms', met: agreedToTerms }
                  ].map((req, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: req.met ? '#22c55e' : 'rgba(255, 255, 255, 0.6)'
                      }}
                    >
                      <CheckCircleIcon style={{
                        width: '18px',
                        height: '18px',
                        color: req.met ? '#22c55e' : 'rgba(255, 255, 255, 0.3)'
                      }} />
                      {req.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Honeypot - hidden from users */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Display Name */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your creator name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(251, 191, 36, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                {/* Slug availability status */}
                {displayName.trim().length >= 2 && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px'
                  }}>
                    {checkingSlug ? (
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Checking availability...
                      </span>
                    ) : slugCheckResult ? (
                      <>
                        {slugCheckResult.available ? (
                          <>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              Your profile URL will be: <span style={{ color: '#fbbf24' }}>/content-creators/{slugCheckResult.slug}</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#f59e0b' }}>⚠</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {slugCheckResult.message || 'This name is taken. Your URL will have a unique suffix added.'}
                            </span>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Platforms */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff'
                  }}>
                    Platforms * <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '400' }}>(at least one with 500+ followers)</span>
                  </label>
                  {platforms.length < 5 && (
                    <button
                      type="button"
                      onClick={addPlatform}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'transparent',
                        border: 'none',
                        color: '#fbbf24',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      <PlusIcon style={{ width: '16px', height: '16px' }} />
                      Add Platform
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {platforms.map((platform, index) => {
                    const platformOption = platformOptions.find(p => p.value === platform.type);

                    return (
                      <div
                        key={platform.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          padding: '20px'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <select
                            value={platform.type}
                            onChange={(e) => updatePlatform(platform.id, 'type', e.target.value)}
                            style={{
                              padding: '10px 14px',
                              fontSize: '14px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: `1px solid ${platformOption?.color || '#6366f1'}40`,
                              borderRadius: '8px',
                              color: platformOption?.color || '#fff',
                              outline: 'none',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {platformOptions.map(opt => (
                              <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {platforms.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePlatform(platform.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                padding: '8px',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                            >
                              <XMarkIcon style={{ width: '18px', height: '18px' }} />
                            </button>
                          )}
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 120px',
                          gap: '12px'
                        }}>
                          <input
                            type="url"
                            value={platform.url}
                            onChange={(e) => updatePlatform(platform.id, 'url', e.target.value)}
                            placeholder={platformOption?.placeholder || 'Channel URL'}
                            style={{
                              padding: '12px 14px',
                              fontSize: '14px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              outline: 'none'
                            }}
                          />
                          <input
                            type="text"
                            value={platform.handle}
                            onChange={(e) => updatePlatform(platform.id, 'handle', e.target.value)}
                            placeholder="Handle (e.g. @yourname)"
                            style={{
                              padding: '12px 14px',
                              fontSize: '14px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              outline: 'none'
                            }}
                          />
                          <input
                            type="number"
                            value={platform.followerCount}
                            onChange={(e) => updatePlatform(platform.id, 'followerCount', e.target.value)}
                            placeholder="Followers"
                            min="0"
                            style={{
                              padding: '12px 14px',
                              fontSize: '14px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: parseInt(platform.followerCount) >= 500
                                ? '1px solid rgba(34, 197, 94, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: parseInt(platform.followerCount) >= 500 ? '#22c55e' : '#fff',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary Platform */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Primary Platform *
                </label>
                <select
                  value={primaryPlatform}
                  onChange={(e) => setPrimaryPlatform(e.target.value as PlatformType)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {platformOptions.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '6px'
                }}>
                  This is where most of your LPC content is published
                </p>
              </div>

              {/* Description - for admin evaluation */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  How do you use Lines Police CAD? * <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '400' }}>(min 50 characters)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how you use LPC in your content, what kind of streams/videos you create, and why you'd be a great fit for the Creator Program..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '120px',
                    fontFamily: 'inherit',
                    lineHeight: '1.6'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(251, 191, 36, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                <p style={{
                  fontSize: '13px',
                  color: description.length >= 50 ? '#22c55e' : 'rgba(255, 255, 255, 0.5)',
                  marginTop: '6px',
                  textAlign: 'right'
                }}>
                  {description.length}/50 characters minimum
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  This is for our review team only and won&apos;t be shown on your public profile.
                </p>
              </div>

              {/* Bio - for public profile */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Profile Bio * <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '400' }}>(20-500 characters)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setBio(e.target.value);
                    }
                  }}
                  placeholder="Write a short bio that will be displayed on your public creator profile. Tell viewers about yourself and your content..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '90px',
                    fontFamily: 'inherit',
                    lineHeight: '1.6'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(251, 191, 36, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                <p style={{
                  fontSize: '13px',
                  color: bio.length >= 20 && bio.length <= 500 ? '#22c55e' : 'rgba(255, 255, 255, 0.5)',
                  marginTop: '6px',
                  textAlign: 'right'
                }}>
                  {bio.length}/500 characters
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  This will be displayed on your public creator profile page.
                </p>
              </div>

              {/* Benefits Preview */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.03) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                padding: '20px',
                marginBottom: '28px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <GiftIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fbbf24' }}>
                    What you&apos;ll receive if approved
                  </h3>
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {[
                    'Free Base Plan for your account ($36/year value)',
                    'Free Base Plan for one community you manage ($36/year value)',
                    'Featured profile on our creators directory',
                    'Prestige of being an exclusive Creator Program member'
                  ].map((benefit, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}
                    >
                      <SparklesIcon style={{
                        width: '16px',
                        height: '16px',
                        color: '#fbbf24',
                        flexShrink: 0,
                        marginTop: '2px'
                      }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Terms Agreement */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: '#fbbf24',
                      marginTop: '2px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    I agree to the{' '}
                    <Link href="/terms-and-conditions" style={{ color: '#fbbf24', textDecoration: 'underline' }}>
                      Terms &amp; Conditions
                    </Link>{' '}
                    and grant Lines Police CAD permission to use my content for promotional purposes.
                    I understand that my follower count may be verified and that benefits can be
                    revoked if I fall below the minimum threshold.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {submitError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                  <span style={{ fontSize: '14px', color: '#ef4444' }}>{submitError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: isFormValid()
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: isFormValid() ? '#000' : 'rgba(255, 255, 255, 0.4)',
                  fontSize: '15px',
                  fontWeight: '700',
                  padding: '18px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isFormValid() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  boxShadow: isFormValid() ? '0 10px 30px rgba(251, 191, 36, 0.3)' : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(0, 0, 0, 0.3)',
                      borderTopColor: '#000',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <VideoCameraIcon style={{ width: '20px', height: '20px' }} />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
