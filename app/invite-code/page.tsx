'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { TicketIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

function InviteCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [codeError, setCodeError] = useState(false);

  // Pre-populate invite code from URL params
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setSuccess('');
    setCodeError(false);

    const trimmedCode = inviteCode.trim();

    if (!trimmedCode) {
      setError('Please enter an invite code.');
      setCodeError(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/community/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          inviteCode: trimmedCode,
        }),
      });

      if (response.redirected) {
        // Success - redirect to the new location
        window.location.href = response.url;
        return;
      }

      // Check if response is HTML (user not logged in - server returned login page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Server returned HTML, likely a login page redirect
        window.location.href = `/login-civ?redirect=${encodeURIComponent('/invite-code')}`;
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Successfully joined the community!');
        setRedirecting(true);
        // Redirect to community page
        if (data.communityId) {
          setTimeout(() => {
            window.location.href = `/community/${data.communityId}`;
          }, 1500);
        } else {
          setTimeout(() => {
            window.location.href = '/communities?success=true';
          }, 1500);
        }
      } else {
        // Error - show error message
        let errorMessage = 'Failed to join community. Please try again.';

        if (response.status === 400) {
          errorMessage = 'Invalid or expired invite code. Please check and try again.';
        } else if (response.status === 401) {
          // User not logged in - redirect to login
          window.location.href = `/login-civ?redirect=${encodeURIComponent('/invite-code')}`;
          return;
        } else if (response.status === 403) {
          errorMessage = data.message || 'You are banned from this community.';
        } else if (response.status === 404) {
          errorMessage = 'Invalid or expired invite code. Please check and try again.';
        } else if (response.status === 409) {
          errorMessage = data.message || 'You are already a member of this community.';
        } else if (response.status === 422) {
          errorMessage = 'Invalid or expired invite code. Please check and try again.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }

        setError(errorMessage);
        setCodeError(true);
      }
    } catch (err) {
      // Check if JSON parsing failed (likely HTML response from auth redirect)
      if (err instanceof SyntaxError) {
        window.location.href = `/login-civ?redirect=${encodeURIComponent('/invite-code')}`;
        return;
      }

      // Check if user is not logged in (redirected to login page)
      if (err instanceof Error && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError('Network error. Please try again.');
      }
      setCodeError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hero Section Background */}
      <div
        className="relative isolate overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          paddingTop: 'clamp(80px, 15vw, 120px)',
          paddingBottom: '80px',
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          marginBottom: 0,
          flex: 1,
        }}
      >
        {/* Background Image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0
        }} />

        {/* Dark Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
          zIndex: 1
        }} />

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {/* Back Button */}
          <div style={{ width: '100%', maxWidth: '500px', marginBottom: '1rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'rgba(255, 255, 255, 0.7)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
              Back
            </button>
          </div>

          {/* Large Title */}
          <h1
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '2rem',
              marginTop: '1rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.05em',
              position: 'relative',
              display: 'inline-block',
            }}
          >
            {/* Glow behind text */}
            <span style={{
              position: 'absolute',
              inset: 0,
              color: '#fbbf24',
              textShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)',
              filter: 'blur(2px)',
              zIndex: 0
            }}>
              JOIN COMMUNITY
            </span>
            {/* Shimmer text */}
            <span style={{
              position: 'relative',
              zIndex: 1,
              background: 'linear-gradient(90deg, #fbbf24 0%, #ffffff 30%, #ffffff 70%, #fbbf24 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 12s linear infinite',
              display: 'inline-block'
            }}>
              JOIN COMMUNITY
            </span>
          </h1>

          {/* Form Container */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(25, 30, 50, 0.98) 0%, rgba(30, 20, 40, 0.98) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(251, 191, 36, 0.1)',
              padding: '3rem',
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
              border: '1px solid rgba(251, 191, 36, 0.2)',
            }}
          >
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
                borderRadius: '50%',
                padding: '1rem',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}>
                <TicketIcon style={{ width: '3rem', height: '3rem', color: '#fbbf24' }} />
              </div>
            </div>

            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                Enter Invite Code
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  lineHeight: '1.5',
                }}
              >
                Have an invite code? Enter it below to join a community.
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  color: '#6ee7b7',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                  <span>{success}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Invite Code Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="inviteCode"
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  Invite Code
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  name="inviteCode"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setCodeError(false);
                    setError('');
                  }}
                  placeholder="Enter your invite code"
                  required
                  autoComplete="off"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: `2px solid ${codeError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '10px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    letterSpacing: '0.05em',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#fbbf24';
                    e.target.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                  }}
                  onBlur={(e) => {
                    if (!codeError) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || redirecting}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: loading || redirecting
                    ? redirecting
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'rgba(251, 191, 36, 0.5)'
                    : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: redirecting ? '#ffffff' : '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading || redirecting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
                onMouseEnter={(e) => {
                  if (!loading && !redirecting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(251, 191, 36, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {redirecting ? (
                  <>
                    <div
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        border: '2px solid transparent',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <span>Redirecting...</span>
                  </>
                ) : loading ? (
                  <>
                    <div
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        border: '2px solid transparent',
                        borderTop: '2px solid #000000',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <span>Joining...</span>
                  </>
                ) : (
                  'Join Community'
                )}
              </button>
            </form>

            {/* Links */}
            <div
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                Looking for communities to join?{' '}
                <Link
                  href="/communities"
                  style={{
                    color: '#fbbf24',
                    textDecoration: 'none',
                    fontWeight: '500',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f59e0b';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#fbbf24';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Browse Communities
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Loading fallback for Suspense
function InviteCodeLoading() {
  return (
    <div
      className="relative isolate overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
      }}
    >
      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem' }}>Loading...</div>
    </div>
  );
}

export default function InviteCodePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      <Suspense fallback={<InviteCodeLoading />}>
        <InviteCodeContent />
      </Suspense>

      <Footer />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  );
}
