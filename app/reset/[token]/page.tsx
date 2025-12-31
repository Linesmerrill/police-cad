'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ExclamationTriangleIcon, CheckCircleIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  
  // Password requirements validation
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    matches: false
  });
  
  // Check password requirements in real-time
  useEffect(() => {
    setPasswordRequirements({
      minLength: password.length >= 6,
      matches: password === confirmPassword && password.length > 0
    });
  }, [password, confirmPassword]);

  useEffect(() => {
    // Check for message query parameter (from flash messages)
    const messageParam = searchParams.get('message');
    if (messageParam) {
      setError(decodeURIComponent(messageParam));
    }

    // Check if token is valid when component mounts
    const checkToken = async () => {
      if (!token || token === 'encryptedToken') {
        // If no token or encryptedToken, we need to check via session
        // The Express route should have stored it in session
        try {
          const response = await fetch('/api/reset-token/validate', {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setTokenValid(true);
            } else {
              setTokenValid(false);
              setError(data.message || 'Password reset token is invalid or has expired.');
              // Redirect to forgot-password after 3 seconds
              setTimeout(() => {
                router.push('/forgot-password?message=' + encodeURIComponent('Password reset token is invalid or has expired.'));
              }, 3000);
            }
          } else {
            setTokenValid(false);
            setError('Unable to validate reset token. Please try again.');
          }
        } catch {
          setTokenValid(false);
          setError('Unable to validate reset token. Please try again.');
        }
      } else {
        // Token in URL - need to store it in session first via Express route
        // The Express route will handle this and redirect
        window.location.href = `/reset/${token}`;
      }
    };

    checkToken();
  }, [token, router, searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setSuccess('');
    setPasswordError(false);
    setConfirmPasswordError(false);
    
    // Validate inputs
    if (!password) {
      setError('Please enter a new password.');
      setPasswordError(true);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setPasswordError(true);
      return;
    }
    
    if (!confirmPassword) {
      setError('Please confirm your password.');
      setConfirmPasswordError(true);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setPasswordError(true);
      setConfirmPasswordError(true);
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      // Submit the form to the Express route
      // The route uses the token from session
      // Use a hidden form to ensure cookies are sent properly
      const form = document.getElementById('resetPasswordForm') as HTMLFormElement;
      if (form) {
        // Create hidden form for submission to Express
        const submitForm = document.createElement('form');
        submitForm.method = 'POST';
        submitForm.action = '/reset/encryptedToken'; // Use encryptedToken since token is in session
        submitForm.style.display = 'none';
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'hidden';
        passwordInput.name = 'password';
        passwordInput.value = password;
        
        submitForm.appendChild(passwordInput);
        document.body.appendChild(submitForm);
        submitForm.submit();
        // Form will redirect, so we don't need to handle response
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Show loading state while validating token
  if (tokenValid === null) {
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
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem'
          }}>
            Validating reset token...
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
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
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(25, 30, 50, 0.98) 0%, rgba(30, 20, 40, 0.98) 100%)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <ExclamationTriangleIcon style={{ width: '3rem', height: '3rem', color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>Invalid Token</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
              {error || 'Password reset token is invalid or has expired.'}
            </p>
            <Link
              href="/forgot-password"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000000',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600'
              }}
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

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
        {/* Large RESET PASSWORD Title */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
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
            RESET PASSWORD
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
            RESET PASSWORD
          </span>
        </h1>

        {/* Reset Password Container */}
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
          {/* Header */}
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
              Create New Password
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Enter your new password below.
            </p>
          </div>

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
                color: '#6ee7b7',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>{success}</span>
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

          {/* Reset Password Form */}
          <form id="resetPasswordForm" onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#ffffff',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                <LockClosedIcon style={{ width: '1rem', height: '1rem' }} />
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                    setError('');
                  }}
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    border: `2px solid ${
                      passwordError 
                        ? '#ef4444' 
                        : passwordRequirements.minLength 
                          ? '#10b981' 
                          : 'rgba(255, 255, 255, 0.2)'
                    }`,
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
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  {showPassword ? (
                    <EyeSlashIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                </button>
              </div>
              {/* Password Requirements */}
              <div style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}>
                {passwordRequirements.minLength ? (
                  <CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#10b981', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>×</span>
                  </div>
                )}
                <span style={{
                  color: passwordRequirements.minLength ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.2s ease'
                }}>
                  At least 6 characters
                </span>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="confirmPassword"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#ffffff',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                <LockClosedIcon style={{ width: '1rem', height: '1rem' }} />
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirm"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError(false);
                    setError('');
                  }}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    border: `2px solid ${
                      confirmPasswordError 
                        ? '#ef4444' 
                        : passwordRequirements.matches && confirmPassword.length > 0
                          ? '#10b981' 
                          : 'rgba(255, 255, 255, 0.2)'
                    }`,
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
                    if (!confirmPasswordError) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                </button>
              </div>
              {/* Password Match Requirement */}
              {confirmPassword.length > 0 && (
                <div style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}>
                  {passwordRequirements.matches ? (
                    <CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#10b981', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>×</span>
                    </div>
                  )}
                  <span style={{
                    color: passwordRequirements.matches ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
                    transition: 'color 0.2s ease'
                  }}>
                    Passwords match
                  </span>
                </div>
              )}
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
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <LockClosedIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span>Update Password</span>
                </>
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
            <Link
              href="/login"
              style={{
                color: '#fbbf24',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
              Back to Login
            </Link>
            <Link
              href="/"
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
              Back to Home
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

export default function ResetPassword() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}

