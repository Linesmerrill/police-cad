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
  GiftIcon,
  StarIcon
} from '@heroicons/react/24/outline';

type PlatformType = 'twitch' | 'youtube' | 'tiktok' | 'other';

interface PlatformEntry {
  id: string;
  type: PlatformType;
  url: string;
  handle: string;
  followerCount: string;
}

// icon is a Font Awesome brand class. FA is loaded globally in app/layout.tsx,
// and this is the same icon set the admin console labels these platforms with.
const platformOptions: { value: PlatformType; label: string; color: string; icon: string; baseUrl: string; placeholder: string; handlePlaceholder: string }[] = [
  { value: 'twitch', label: 'Twitch', color: '#9146FF', icon: 'fab fa-twitch', baseUrl: 'https://twitch.tv/', placeholder: 'https://twitch.tv/', handlePlaceholder: 'e.g. yourname' },
  { value: 'youtube', label: 'YouTube', color: '#FF0000', icon: 'fab fa-youtube', baseUrl: 'https://youtube.com/@', placeholder: 'https://youtube.com/@', handlePlaceholder: 'e.g. yourname' },
  { value: 'tiktok', label: 'TikTok', color: '#00F2EA', icon: 'fab fa-tiktok', baseUrl: 'https://tiktok.com/@', placeholder: 'https://tiktok.com/@', handlePlaceholder: 'e.g. yourname' },
  { value: 'other', label: 'Other', color: '#6366f1', icon: 'fas fa-globe', baseUrl: '', placeholder: 'https://yourplatform.com/profile', handlePlaceholder: '' }
];

// Platforms we read through an official API during screening. Asking for a
// follower count we are about to measure ourselves is a field that can only be
// wrong: the applicant guesses, we overwrite it, and a low guess scares people
// off a program they qualify for. TikTok and "other" have no public API, so
// their number is the only one we have.
const SCANNED_PLATFORMS: PlatformType[] = ['youtube', 'twitch'];

function isScanned(type: PlatformType): boolean {
  return SCANNED_PLATFORMS.includes(type);
}

// Strips the decoration people paste: full URLs, @, query strings, trailing
// paths. Mirrors NormalizeHandle in the API's platforms package, which is what
// makes one input enough — someone who pastes their whole channel URL into the
// handle box gets the same answer as someone who types their name.
function normalizeHandle(raw: string): string {
  let h = (raw || '').trim();
  if (!h) return '';
  const scheme = h.indexOf('://');
  if (scheme >= 0) h = h.slice(scheme + 3);
  const q = h.search(/[?#]/);
  if (q >= 0) h = h.slice(0, q);
  h = h.replace(/^\/+|\/+$/g, '');
  const slash = h.indexOf('/');
  if (slash > 0 && h.slice(0, slash).includes('.')) h = h.slice(slash + 1);
  for (const prefix of ['channel/', 'c/', 'user/', '@']) {
    if (h.toLowerCase().startsWith(prefix)) {
      h = h.slice(prefix.length);
      break;
    }
  }
  const trailing = h.indexOf('/');
  if (trailing >= 0) h = h.slice(0, trailing);
  return h.replace(/^@/, '').trim();
}

// The canonical URL for a handle. These are fixed patterns, which is why asking
// for the URL and the handle separately was two questions with one answer — and
// let the two disagree.
function buildPlatformUrl(type: PlatformType, rawHandle: string): string {
  const h = normalizeHandle(rawHandle);
  if (!h) return '';
  switch (type) {
    case 'youtube':
      // A raw channel id is not an @handle and does not resolve as one.
      return /^UC[\w-]{22}$/.test(h)
        ? `https://www.youtube.com/channel/${h}`
        : `https://www.youtube.com/@${h}`;
    case 'twitch':
      return `https://twitch.tv/${h}`;
    case 'tiktok':
      return `https://tiktok.com/@${h}`;
    default:
      return '';
  }
}

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
    { id: generateId(), type: 'twitch', url: 'https://twitch.tv/', handle: '', followerCount: '' }
  ]);
  const [description, setDescription] = useState('');
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

  // Setting a primary changes one word on one card, which is easy to miss. The
  // toast is the acknowledgement that something happened.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const choosePrimary = (type: PlatformType) => {
    if (type === primaryPlatform) return;
    setPrimaryPlatform(type);
    const label = platformOptions.find(o => o.value === type)?.label || type;
    setToast(`Primary set to ${label}`);
  };

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

  // Primary follows the platforms actually entered. Most people list one, and
  // there is nothing to ask them about in that case — it is their primary by
  // arithmetic. This also repairs the choice when the platform it pointed at is
  // removed or switched to a different type.
  useEffect(() => {
    if (platforms.length === 0) return;
    const types = platforms.map(p => p.type);
    if (!types.includes(primaryPlatform)) {
      setPrimaryPlatform(types[0]);
    }
  }, [platforms, primaryPlatform]);

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

  // Get platform types that are already used
  const getUsedPlatformTypes = (): Set<PlatformType> => {
    return new Set(platforms.map(p => p.type));
  };

  // Get available platform types (not already used, except 'other' which can only be used once)
  const getAvailablePlatformTypes = (): PlatformType[] => {
    const used = getUsedPlatformTypes();
    return platformOptions
      .filter(opt => !used.has(opt.value))
      .map(opt => opt.value);
  };

  const addPlatform = () => {
    // Max 4 platforms (one for each type)
    if (platforms.length >= 4) return;

    const availableTypes = getAvailablePlatformTypes();
    if (availableTypes.length === 0) return;

    // Pick the first available type
    const newType = availableTypes[0];
    const platformOption = platformOptions.find(p => p.value === newType);

    setPlatforms([...platforms, {
      id: generateId(),
      type: newType,
      url: platformOption?.baseUrl || '',
      handle: '',
      followerCount: ''
    }]);
  };

  const removePlatform = (id: string) => {
    if (platforms.length <= 1) return;
    setPlatforms(platforms.filter(p => p.id !== id));
  };

  const updatePlatform = (id: string, field: keyof PlatformEntry, value: string) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== id) return p;

      // If changing platform type, auto-populate the base URL
      if (field === 'type') {
        const newType = value as PlatformType;
        const platformOption = platformOptions.find(opt => opt.value === newType);
        return {
          ...p,
          type: newType,
          url: platformOption?.baseUrl || ''
        };
      }

      return { ...p, [field]: value };
    }));
  };

  // One filled-in platform that could carry the application. A YouTube or Twitch
  // entry counts on the strength of the channel we are going to read; anywhere
  // we cannot read, the applicant's own number has to clear the bar.
  const qualifyingPlatform = (p: PlatformEntry): boolean => {
    // The handle is the whole answer now; the URL is derived from it.
    const identified = p.type === 'other' ? !!p.url.trim() : !!normalizeHandle(p.handle);
    if (!identified) return false;
    return isScanned(p.type) || parseInt(p.followerCount) >= 500;
  };

  const isFormValid = (): boolean => {
    if (!displayName.trim()) return false;
    if (!description.trim() || description.length < 50) return false;
    if (!agreedToTerms) return false;

    return platforms.some(qualifyingPlatform);
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
        // "Other" is identified by its URL; everything else by its handle, from
        // which the URL is derived. Requiring both dropped "other" entries
        // silently, since that type has no handle field at all.
        .filter(p => (p.type === 'other' ? p.url.trim() : normalizeHandle(p.handle)))
        .map(p => ({
          type: p.type,
          // Built from the handle rather than stored separately, so the link and
          // the handle cannot disagree about which channel this is.
          url: p.type === 'other' ? p.url.trim() : buildPlatformUrl(p.type, p.handle),
          handle: p.type === 'other' ? '' : normalizeHandle(p.handle),
          // Zero for the platforms we scan: screening fills in the real number,
          // and a stale guess would only sit in the record contradicting it.
          followerCount: isScanned(p.type) ? 0 : parseInt(p.followerCount) || 0
        }));

      const response = await fetch('/api/v1/content-creator-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName,
          primaryPlatform,
          platforms: formattedPlatforms,
          description
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
              application and get back to you within 3-5 business days. You can track
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
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes toastIn { from { opacity: 0; } to { opacity: 1; } }
        }

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

      {/* Clear of the fixed navbar, and pointer-events:none so it can never
          swallow a click on whatever it floats over. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '86px',
            right: '20px',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(20, 20, 32, 0.97)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#fbbf24',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            animation: 'toastIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
            maxWidth: 'calc(100vw - 40px)'
          }}
        >
          <StarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {toast}
        </div>
      )}

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
            Applications are typically reviewed within 3-5 business days.
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
                    { text: '500+ followers on at least one platform', met: platforms.some(qualifyingPlatform) },
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
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Platforms * <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '400' }}>(at least one with 500+ followers)</span>
                </label>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <p style={{ margin: '0 0 10px 0' }}>
                    Link to your platforms where you create LPC content. Our team will review these to verify active content featuring Lines Police CAD.
                  </p>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#22c55e', fontWeight: '500', fontSize: '12px' }}>✓ What we want to see:</p>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                        <li>Content of you actively using LPC</li>
                        <li>Videos showcasing the CAD in action</li>
                      </ul>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#ef4444', fontWeight: '500', fontSize: '12px' }}>✗ What to avoid:</p>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                        <li>Platforms with no LPC content</li>
                        <li>Videos where LPC isn&apos;t shown</li>
                      </ul>
                    </div>
                  </div>
                  <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', fontSize: '12px' }}>
                    Tip: Include relevant links to help us quickly review your application.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {platforms.map((platform, index) => {
                    const platformOption = platformOptions.find(p => p.value === platform.type);

                    // One source of truth: the URL is derived from the handle,
                    // except on 'other' where there is no pattern to derive from.
                    const previewUrl = platform.type === 'other'
                      ? platform.url.trim()
                      : buildPlatformUrl(platform.type, platform.handle);

                    const isPrimary = platform.type === primaryPlatform;
                    // With one platform there is nothing to choose between, so
                    // the button states the fact instead of offering a choice.
                    const canChoosePrimary = platforms.length > 1;

                    return (
                      <div
                        key={platform.id}
                        style={{
                          background: isPrimary ? 'rgba(251, 191, 36, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          border: isPrimary ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                          padding: '20px',
                          boxShadow: isPrimary ? '0 0 20px rgba(251, 191, 36, 0.15)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* A select cannot hold an icon, so the mark sits
                                beside it — the platform is recognisable before
                                anyone reads the word. */}
                            <span
                              aria-hidden="true"
                              style={{
                                width: '34px',
                                height: '34px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                fontSize: '16px',
                                color: platformOption?.color || '#6366f1',
                                background: `${platformOption?.color || '#6366f1'}1f`,
                                border: `1px solid ${platformOption?.color || '#6366f1'}40`
                              }}
                            >
                              <i className={platformOption?.icon || 'fas fa-globe'} />
                            </span>
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
                              {platformOptions
                                .filter(opt => opt.value === platform.type || !getUsedPlatformTypes().has(opt.value))
                                .map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                                    {opt.label}
                                  </option>
                                ))}
                            </select>
                            {/* Primary is picked here, on the card it applies to.
                                A separate dropdown listing platform names made
                                you hold two lists in your head and let you pick
                                a primary you had not even entered. */}
                            <button
                              type="button"
                              onClick={() => canChoosePrimary && choosePrimary(platform.type)}
                              disabled={!canChoosePrimary}
                              title={
                                canChoosePrimary
                                  ? (isPrimary
                                      ? 'This is where most of your LPC content is published'
                                      : `Make ${platformOption?.label || 'this'} your primary platform`)
                                  : 'Your only platform, so this is your primary'
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: isPrimary ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: isPrimary
                                  ? '1px solid rgba(251, 191, 36, 0.3)'
                                  : '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: 'inherit',
                                color: isPrimary ? '#fbbf24' : 'rgba(255, 255, 255, 0.45)',
                                cursor: canChoosePrimary && !isPrimary ? 'pointer' : 'default',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!canChoosePrimary || isPrimary) return;
                                e.currentTarget.style.color = '#fbbf24';
                                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                if (!canChoosePrimary || isPrimary) return;
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              }}
                            >
                              <StarIcon style={{ width: '14px', height: '14px' }} />
                              {isPrimary ? 'Primary' : 'Set as primary'}
                            </button>
                          </div>

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
                          // 'other' has no URL pattern to derive, so it is the
                          // one place we still ask for the link itself.
                          gridTemplateColumns: isMobile || isScanned(platform.type) || platform.type === 'tiktok'
                            ? '1fr'
                            : '1fr 120px',
                          gap: '12px'
                        }}>
                          {platform.type === 'other' ? (
                            <input
                              type="url"
                              value={platform.url}
                              onChange={(e) => updatePlatform(platform.id, 'url', e.target.value)}
                              placeholder={platformOption?.placeholder || 'Link to your profile'}
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
                          ) : (
                            <input
                              type="text"
                              value={platform.handle}
                              onChange={(e) => updatePlatform(platform.id, 'handle', e.target.value)}
                              placeholder={platformOption?.handlePlaceholder || 'Your username'}
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
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
                          )}
                          {!isScanned(platform.type) && (
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
                          )}
                        </div>

                        {isScanned(platform.type) && (
                          <p style={{
                            margin: '8px 0 0',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.45)',
                            lineHeight: 1.6
                          }}>
                            We read your follower count straight from {platformOption?.label} during
                            verification, so there is no need to type it in.
                          </p>
                        )}

                        {/* Preview Link */}
                        {previewUrl && (
                          <div style={{ marginTop: '10px' }}>
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                color: platformOption?.color || '#fbbf24',
                                textDecoration: 'none',
                                opacity: 0.8,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                            >
                              <ArrowRightIcon style={{ width: '14px', height: '14px' }} />
                              Test link: {previewUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Platform Button - inside the platforms section */}
                  {platforms.length < 4 && getAvailablePlatformTypes().length > 0 && (
                    <button
                      type="button"
                      onClick={addPlatform}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(251, 191, 36, 0.06)',
                        border: '1px dashed rgba(251, 191, 36, 0.4)',
                        borderRadius: '12px',
                        color: '#fbbf24',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '16px 20px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                      }}
                    >
                      <PlusIcon style={{ width: '18px', height: '18px' }} />
                      Add Another Platform
                    </button>
                  )}
                </div>
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

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    💡 This is your chance to highlight your best LPC content. Include links to specific videos, timestamps, or VODs where we can see you using the CAD.
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                    The more you help us find your content, the faster we can review your application.
                  </p>
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    This is for our review team only and won&apos;t be shown on your public profile.
                  </p>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your content and how you use LPC. Feel free to include direct links to specific videos or VODs that showcase your LPC content..."
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
                    'Free Premium Plus on your account, our highest tier ($99/year value)',
                    'Free Premium boost for one community you manage ($96/year value)',
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
                    and give Lines Police CAD permission to name me as a Content Creator for the
                    platform and to link to my channels when promoting the program.
                    <br /><br />
                    I understand that Lines Police CAD will check that the channels I listed are
                    mine, that at least one of them meets the follower minimum, and that what I
                    publish is a fit for the program. I understand that benefits can be revoked if
                    my channels later fall below the minimum.
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
                    Submit and verify my channels
                  </>
                )}
              </button>

              {/* "Submit Application" read like the end of the job. It is not:
                  nothing moves until they put our code in their channel, and
                  someone who thinks they are done waits for an email that is
                  waiting on them. */}
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: 1.6,
                textAlign: 'center',
                margin: '14px 0 0'
              }}>
                One short step after this: add a code to your channel so we can confirm it is yours.
                We will walk you through it on the next page.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
