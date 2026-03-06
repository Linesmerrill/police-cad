'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    // Function to check and set error from URL
    const checkForError = () => {
      // Check both searchParams and window.location as fallback
      const errorParam = searchParams.get('error') || new URLSearchParams(window.location.search).get('error');
      
      if (errorParam) {
        if (errorParam === 'account_deactivated') {
          setError('deactivated');
        } else if (errorParam === 'authentication_failed' || errorParam === 'email address or password' || errorParam.includes('password') || errorParam.includes('email')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
        return true; // Error found
      }
      return false; // No error
    };
    
    // Check immediately
    checkForError();
    
    // Also check after a short delay to catch errors that might appear after redirect
    // This handles cases where the URL updates after the initial render
    const delayedCheck = setTimeout(() => {
      const currentError = new URLSearchParams(window.location.search).get('error');
      if (currentError && !error) {
        // Error param exists in URL but we haven't set it yet
        checkForError();
      }
    }, 200);
    
    // Server-side check in GET /login route should handle redirects
    // Skip client-side check to avoid extra API call and potential delay
    
    return () => clearTimeout(delayedCheck);
  }, [router, searchParams]);

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
    
    try {
      // Get the API URL with fallback
      const apiUrl = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
      
      // Function to submit login form with timeout protection
      const submitLoginForm = async () => {
        try {
          // Set redirect in session with timeout
          const controller = new AbortController();
          const redirectTimeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            await fetch('/set-redirect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ redirect: searchParams.get('redirect') || '/communities' }),
              credentials: 'include',
              signal: controller.signal
            });
            clearTimeout(redirectTimeout);
          } catch (err) {
            clearTimeout(redirectTimeout);
            // Continue even if set-redirect fails
          }
        } catch (err) {
          // Continue even if set-redirect fails
        }
        
        // Use form submission for proper Passport cookie handling
        // Set a flag to check for errors after redirect
        sessionStorage.setItem('loginAttempt', 'true');
        
        // Use the hidden form in the DOM
        const hiddenForm = document.getElementById('loginForm') as HTMLFormElement;
        const hiddenEmail = document.getElementById('hiddenEmail') as HTMLInputElement;
        const hiddenPassword = document.getElementById('hiddenPassword') as HTMLInputElement;
        
        if (hiddenForm && hiddenEmail && hiddenPassword) {
          hiddenEmail.value = trimmedEmail;
          hiddenPassword.value = trimmedPassword;
          const hiddenRedirect = document.getElementById('hiddenRedirect') as HTMLInputElement;
          if (hiddenRedirect) {
            hiddenRedirect.value = searchParams.get('redirect') || '/communities';
          }

          // Submit the form - this will trigger Passport authentication and set the session
          hiddenForm.submit();
        } else {
          // Fallback: create form if hidden form doesn't exist
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/login';
          form.style.display = 'none';
          
          const emailInput = document.createElement('input');
          emailInput.type = 'hidden';
          emailInput.name = 'email';
          emailInput.value = trimmedEmail;
          
          const passwordInput = document.createElement('input');
          passwordInput.type = 'hidden';
          passwordInput.name = 'password';
          passwordInput.value = trimmedPassword;

          const redirectInput = document.createElement('input');
          redirectInput.type = 'hidden';
          redirectInput.name = 'redirect';
          redirectInput.value = searchParams.get('redirect') || '/communities';

          form.appendChild(emailInput);
          form.appendChild(passwordInput);
          form.appendChild(redirectInput);
          document.body.appendChild(form);
          
          form.submit();
        }
      };
      
      // Skip API validation - it's redundant since Passport validates anyway
      // This removes an extra 10-second potential delay
      // Passport will handle authentication and deactivated account detection
      submitLoginForm();
      
    } catch (error) {
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
                    To reactivate your account, please contact us by creating an assistance ticket in our{' '}
                    <a
                      href="https://discord.gg/linespolice"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#fbbf24',
                        textDecoration: 'underline',
                        fontWeight: '600',
                      }}
                    >
                      Discord server
                    </a>
                    {' '}and we will help you restore access to your account.
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

          {/* Hidden form for actual submission to Express */}
          <form
            id="loginForm"
            method="POST"
            action="/login"
            style={{ display: 'none' }}
          >
            <input type="hidden" name="email" id="hiddenEmail" />
            <input type="hidden" name="password" id="hiddenPassword" />
            <input type="hidden" name="redirect" id="hiddenRedirect" />
          </form>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
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
      <LoginForm />
    </Suspense>
  );
}

