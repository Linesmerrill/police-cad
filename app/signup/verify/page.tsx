'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ExclamationTriangleIcon, CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/solid';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [hasInvalidTokenError, setHasInvalidTokenError] = useState(false);
  const isUserAction = useRef(false);
  const hasAutoSent = useRef(false);

  // Email validation function
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Auto-send verification email function
  const autoSendVerificationEmail = async (emailAddress: string) => {
    if (!emailAddress || !isValidEmail(emailAddress)) {
      return;
    }

    try {
      const response = await fetch('/api/signup/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: emailAddress.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send verification email. Please try again.');
        setCooldown(0); // Allow immediate resend if auto-send failed
        return;
      }

      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setCooldown(0); // Allow immediate resend if auto-send failed
    }
  };

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const errorParam = searchParams.get('error');
    
    // Clear any previous error states when we have a valid email without an error
    if (emailParam && !errorParam) {
      setError('');
      setHasInvalidTokenError(false);
    }
    
    // Check for error query parameter first
    if (errorParam) {
      if (errorParam === 'invalid_token') {
        setHasInvalidTokenError(true);
        setCooldown(0);
      } else if (errorParam === 'verification_failed') {
        setError('An error occurred during verification. Please try again or request a new verification email.');
        setCooldown(0);
      } else {
        setError('Verification failed. Please try again.');
        setCooldown(0);
      }
    }
    
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      // Only auto-send and start cooldown if there's no error (email was just sent successfully)
      if (!errorParam && !hasAutoSent.current) {
        hasAutoSent.current = true;
        setCooldown(30);
        // Auto-send verification email
        autoSendVerificationEmail(decodedEmail);
      }
    }
    // Don't redirect if there's an error - let them enter their email
    else if (!errorParam) {
      // If no email param and no error, redirect back to signup
      router.push('/signup');
      return;
    }

    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            router.push('/communities');
            return;
          }
        }
      } catch {
        // User not logged in, continue
      }
    };
    checkAuth();
  }, [router, searchParams]);


  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleResend = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    // Only proceed if this was explicitly triggered by user action
    if (!e) {
      // If no event, this is an accidental call - don't proceed
      return;
    }

    // Double-check that this is a real user action (must be click or keydown with Enter)
    const isClick = e.type === 'click';
    const isEnterKey = e.type === 'keydown' && 'key' in e && e.key === 'Enter';
    
    if (!isUserAction.current && !isClick && !isEnterKey) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    isUserAction.current = false; // Reset flag

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (cooldown > 0) {
      return; // Prevent action during cooldown
    }

    if (loading) {
      return; // Already processing
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/signup/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to resend verification email. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('Verification email sent! Please check your inbox.');
      setLoading(false);
      setCooldown(30); // Start 30 second cooldown
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

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
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />
      
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
        {/* Verify Container */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(25, 30, 50, 0.98) 0%, rgba(30, 20, 40, 0.98) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(251, 191, 36, 0.1)',
            padding: '3rem',
            width: '100%',
            maxWidth: '450px',
            position: 'relative',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div style={{ marginBottom: '1.5rem' }}>
            <EnvelopeIcon style={{ width: '4rem', height: '4rem', color: '#fbbf24', margin: '0 auto' }} />
          </div>

          {/* Header */}
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '0.5rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            Verify Your Email
          </h2>
          {email ? (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '2rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              We&apos;ve sent a verification link to <strong style={{ color: '#fbbf24' }}>{email}</strong>. Please check your inbox and click the link to verify your account.
            </p>
          ) : (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '2rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Your verification link is invalid or has expired. Please{' '}
              <Link
                href="/login"
                style={{
                  color: '#fbbf24',
                  textDecoration: 'underline',
                  fontWeight: '600',
                }}
              >
                log in
              </Link>
              {' '}to receive a new verification email.
            </p>
          )}

          {/* Success Message */}
          {success && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#a7f3d0',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Error Message (only show if there's an error that's not the invalid token) */}
          {error && !hasInvalidTokenError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#fca5a5',
                fontSize: '0.875rem',
              }}
            >
              <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Invalid Token Error - redirect to login */}
          {hasInvalidTokenError && !email && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#fca5a5',
                fontSize: '0.875rem',
              }}
            >
              <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>Verification link is invalid or has expired.</span>
            </div>
          )}

          {/* Resend Button (only show if email is present) */}
          {email && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!loading && email && isValidEmail(email) && cooldown === 0) {
                  isUserAction.current = true; // Mark as user action
                  handleResend(e);
                }
              }}
              disabled={loading || !email || !isValidEmail(email) || cooldown > 0}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: (loading || !email || !isValidEmail(email) || cooldown > 0)
                ? 'rgba(251, 191, 36, 0.5)'
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || !email || !isValidEmail(email) || cooldown > 0) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              position: 'relative',
            }}
          >
            {loading ? (
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
                <span>Sending...</span>
              </>
            ) : cooldown > 0 ? (
              <>
                {/* Circular progress indicator */}
                <div
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    style={{
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.2)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - (30 - cooldown) / 30)}`}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 0.3s ease',
                      }}
                    />
                  </svg>
                </div>
                  <span>Resend in {cooldown}s</span>
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              )}

          {/* Back to Login Link */}
          <div>
            <Link
              href="/login"
              style={{
                color: 'rgba(251, 191, 36, 0.8)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fbbf24';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(251, 191, 36, 0.8)';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Back to Login
            </Link>
          </div>
        </div>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={
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
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          Loading...
        </div>
        <Footer />
      </main>
    }>
      <VerifyForm />
    </Suspense>
  );
}

