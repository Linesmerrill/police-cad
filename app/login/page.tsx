'use client';

import { useState, FormEvent, Suspense, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { storeAuth, fetchCurrentUser } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [privateBrowsingDetected] = useState(false);
  const [checkingExistingLogin, setCheckingExistingLogin] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkExistingLogin = async () => {
      try {
        const user = await fetchCurrentUser();
        if (user && user.id) {
          // User is already logged in, redirect to communities
          const redirect = new URLSearchParams(window.location.search).get('redirect') || '/communities';
          window.location.href = redirect;
          return;
        }
      } catch (error) {
        console.error('Error checking existing login:', error);
      } finally {
        setCheckingExistingLogin(false);
      }
    };

    checkExistingLogin();
  }, [router]);

  // Private browsing detection disabled - session save fix should handle auth issues
  // Uncomment and implement if needed for specific browser compatibility issues

  // Don't render login form while checking existing login
  if (checkingExistingLogin) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Checking login status...</div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setEmailError(false);
    setPasswordError(false);

    // Get form data
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Validate inputs
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      setEmailError(true);
      return;
    }

    if (!trimmedPassword) {
      setError('Please enter your password.');
      setPasswordError(true);
      return;
    }

    // Show loading state
    setLoading(true);

    // FINAL FIX: Use HTMLFormElement.submit() which bypasses React and lets browser handle cookies
    try {
      // Get the API URL with fallback
      const apiUrl = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

      // Validate credentials with the API first
      const apiResponse = await fetch(`${apiUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(trimmedEmail + ':' + trimmedPassword)
        }
      });

      // Check if we got a valid token response
      const apiData = await apiResponse.json().catch(() => ({}));

      // Check for deactivated account in API response
      if (apiData.isDeactivated === true || apiData.deactivated === true) {
        // Account is deactivated - stop login and show error
        setError('deactivated');
        setLoading(false);
        return;
      }

      // Check for deactivated account error message
      if (apiData.error === 'account_deactivated' || 
          (apiData.message && typeof apiData.message === 'string' && apiData.message.toLowerCase().includes('deactivated'))) {
        setError('deactivated');
        setLoading(false);
        return;
      }

      if (apiResponse.ok && apiData.token) {
        // API validation successful
        // Store the token in localStorage for subsequent requests
        try {
          storeAuth(apiData.token, trimmedEmail);
        } catch (e) {
          console.error('Failed to store auth token:', e);
        }

        // Now authenticate with our backend to create session
        const formData = new URLSearchParams();
        formData.append('email', trimmedEmail);
        formData.append('password', trimmedPassword);

        const loginResponse = await fetch('/login-civ', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          credentials: 'include',
        });

        // Check if response indicates deactivated account (backup check)
        const loginUrl = loginResponse.url || '';
        if (loginUrl.includes('error=account_deactivated') || loginUrl.includes('deactivated')) {
          setError('deactivated');
          setLoading(false);
          return;
        }

        if (loginResponse.ok || loginResponse.redirected) {
          // Login successful - redirect to communities
          const redirect = new URLSearchParams(window.location.search).get('redirect') || '/communities';
          window.location.href = redirect;
        } else {
          setError('Login failed. Please try again.');
          setLoading(false);
        }
        return;
      } else {
        // API validation failed - show error and stop
        setError('Invalid email or password. Please check your credentials and try again.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />
      
      {/* Hero Section Background - Matching Home Page */}
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
          {/* Large LOGIN Title */}
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '2rem',
              marginTop: '1rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.1em',
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
              LOGIN
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
              LOGIN
            </span>
          </h1>

          {/* Login Container */}
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
            }}
          >
            {/* Welcome Back Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                Welcome Back
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                Sign in to your account
              </p>
            </div>

            {/* Private Browsing Warning */}
            {privateBrowsingDetected && (
              <div
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  color: '#fcd34d',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                  <strong style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#fbbf24' }}>Private Browsing Detected</strong>
                </div>
                <p style={{ margin: '0.5rem 0', lineHeight: '1.6', color: 'rgba(252, 211, 77, 0.9)' }}>
                  We detected that you're using private browsing mode. Our authentication system requires cookies to work properly, which are often restricted in private browsing.
                </p>
                <p style={{ margin: '0.5rem 0', lineHeight: '1.6', color: 'rgba(252, 211, 77, 0.9)' }}>
                  <strong>Please try logging in using a regular (non-private) browser window.</strong> This will ensure your session is properly maintained.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: error === 'deactivated' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: error === 'deactivated' ? '1rem' : '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                }}
              >
                {error === 'deactivated' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                      <strong style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Account Deactivated</strong>
                    </div>
                    <p style={{ margin: '0.5rem 0', lineHeight: '1.6', color: 'rgba(252, 165, 165, 0.9)' }}>
                      Your account has been deactivated and you cannot log in at this time.
                    </p>
                    <p style={{ margin: '0.5rem 0', lineHeight: '1.6', color: 'rgba(252, 165, 165, 0.9)' }}>
                      If you want to reactivate your account, you have <strong style={{ color: '#ffffff' }}>30 days</strong> and you can{' '}
                      <Link
                        href="/contact-us"
                        style={{
                          color: '#fbbf24',
                          textDecoration: 'underline',
                          fontWeight: '600',
                        }}
                      >
                        contact us via Discord
                      </Link>
                      {' '}to restore your account.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ExclamationTriangleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* No hidden form needed - we create it dynamically like login-civ.ejs */}

            {/* Login Form */}
            <form onSubmit={handleSubmit} action="/login-civ" method="POST">
              {/* Email Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.trim().toLowerCase());
                    setEmailError(false);
                    setError('');
                  }}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: `2px solid ${emailError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '10px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#fbbf24';
                    e.target.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                  }}
                  onBlur={(e) => {
                    if (!emailError) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: `2px solid ${passwordError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '10px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#fbbf24';
                    e.target.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                  }}
                  onBlur={(e) => {
                    if (!passwordError) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: loading
                    ? 'rgba(251, 191, 36, 0.5)'
                    : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(251, 191, 36, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                    <span>Signing In...</span>
                  </>
                ) : (
                  'Login'
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
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup-civ"
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
                  Register here
                </Link>
              </p>
              <Link
                href="/forgot-password"
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
                Forgot password?
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </main>
  );
}

export default function LoginCiv() {
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
      <LoginForm />
    </Suspense>
  );
}
