'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ExclamationTriangleIcon, CheckCircleIcon, UserIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [callSign, setCallSign] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);

  // Password requirements
  const isMinLength = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
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

    // Check for message query parameter
    const messageParam = searchParams.get('message');
    if (messageParam) {
      if (messageParam.includes('success') || messageParam.includes('email sent')) {
        setSuccess(decodeURIComponent(messageParam));
      } else {
        setError(decodeURIComponent(messageParam));
      }
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setSuccess('');
    setUsernameError(false);
    setEmailError(false);
    setPasswordError(false);
    setConfirmPasswordError(false);
    
    // Validate inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    
    if (!trimmedUsername) {
      setError('Please enter a username.');
      setUsernameError(true);
      return;
    }
    
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      setUsernameError(true);
      return;
    }
    
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      setEmailError(true);
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      setEmailError(true);
      return;
    }
    
    if (!trimmedPassword) {
      setError('Please enter a password.');
      setPasswordError(true);
      return;
    }
    
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setPasswordError(true);
      return;
    }
    
    if (!trimmedConfirmPassword) {
      setError('Please confirm your password.');
      setConfirmPasswordError(true);
      return;
    }
    
    if (trimmedPassword !== trimmedConfirmPassword) {
      setError('Passwords do not match.');
      setPasswordError(true);
      setConfirmPasswordError(true);
      return;
    }
    
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions to continue.');
      return;
    }
    
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
      
      // Create temp account and send verification email
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          callSign: callSign.trim() || '',
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create account. Please try again.');
        if (data.field) {
          if (data.field === 'username') setUsernameError(true);
          if (data.field === 'email') setEmailError(true);
        }
        setLoading(false);
        return;
      }

      // Success - redirect to verify page (or use redirectTo from response if provided)
      if (data.redirectTo) {
        setSuccess('A verification email has been resent. Please check your inbox.');
        setTimeout(() => {
          router.push(data.redirectTo);
        }, 1500);
      } else {
        setSuccess('Account created! Please check your email to verify your account.');
        setTimeout(() => {
          router.push(`/signup/verify?email=${encodeURIComponent(trimmedEmail)}&sent=true`);
        }, 1500);
      }
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
        {/* Large SIGNUP Title */}
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
            REGISTER
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
            REGISTER
          </span>
        </h1>

        {/* Signup Container */}
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
              Create an Account
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Join Lines Police CAD today
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
                color: '#a7f3d0',
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

          {/* Signup Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="username"
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
                <UserIcon style={{ width: '1rem', height: '1rem' }} />
                Desired Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameError(false);
                  setError('');
                }}
                placeholder="Enter your username"
                required
                autoComplete="username"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `2px solid ${usernameError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
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
                  if (!usernameError) {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.25rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}>
                You can always modify this later in your account settings.
              </p>
            </div>

            {/* Call Sign Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="callSign"
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
                <UserIcon style={{ width: '1rem', height: '1rem' }} />
                Call Sign
              </label>
              <input
                type="text"
                id="callSign"
                name="callSign"
                value={callSign}
                onChange={(e) => {
                  // Limit to 10 characters
                  const value = e.target.value.slice(0, 10);
                  setCallSign(value);
                  setError('');
                }}
                placeholder="Optional - Max 10 characters"
                autoComplete="off"
                disabled={loading}
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
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
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.25rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}>
                Optional - Max 10 characters
              </p>
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="email"
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
                <EnvelopeIcon style={{ width: '1rem', height: '1rem' }} />
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => {
                  // Remove spaces and convert to lowercase
                  const cleanedEmail = e.target.value.replace(/\s/g, '').toLowerCase();
                  setEmail(cleanedEmail);
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
                Password
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
                  placeholder="Enter your password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    border: `2px solid ${passwordError ? '#ef4444' : (isMinLength ? '#10b981' : 'rgba(255, 255, 255, 0.2)')}`,
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
                    if (!passwordError && !isMinLength) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    } else if (!passwordError && isMinLength) {
                      e.target.style.borderColor = '#10b981';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: isMinLength ? '#10b981' : 'rgba(255, 255, 255, 0.5)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}>
                {isMinLength ? (
                  <CheckCircleIcon style={{ width: '1rem', height: '1rem' }} />
                ) : (
                  <div style={{ width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>×</span>
                  </div>
                )}
                At least 6 characters
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
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError(false);
                    setError('');
                  }}
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    border: `2px solid ${confirmPasswordError ? '#ef4444' : (passwordsMatch ? '#10b981' : 'rgba(255, 255, 255, 0.2)')}`,
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
                    if (!confirmPasswordError && !passwordsMatch) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    } else if (!confirmPasswordError && passwordsMatch) {
                      e.target.style.borderColor = '#10b981';
                    }
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                </button>
              </div>
              {/* Confirm Password Match */}
              {confirmPassword.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: passwordsMatch ? '#10b981' : 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}>
                  {passwordsMatch ? (
                    <CheckCircleIcon style={{ width: '1rem', height: '1rem' }} />
                  ) : (
                    <div style={{ width: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>×</span>
                    </div>
                  )}
                  Passwords match
                </div>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    setError('');
                  }}
                  style={{
                    marginTop: '0.125rem',
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                    accentColor: '#fbbf24',
                  }}
                />
                <span>
                  I accept the{' '}
                  <Link
                    href="/terms-and-conditions"
                    target="_blank"
                    style={{
                      color: '#fbbf24',
                      textDecoration: 'underline',
                    }}
                  >
                    Terms and Conditions
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isMinLength || !passwordsMatch || !acceptedTerms}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: (loading || !isMinLength || !passwordsMatch || !acceptedTerms)
                  ? 'rgba(251, 191, 36, 0.5)'
                  : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (loading || !isMinLength || !passwordsMatch || !acceptedTerms) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
              onMouseEnter={(e) => {
                if (!(loading || !isMinLength || !passwordsMatch || !acceptedTerms)) {
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
                  <span>Creating Account...</span>
                </>
              ) : (
                'Register'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
              Already registered?{' '}
            </span>
            <Link
              href="/login"
              style={{
                color: 'rgba(251, 191, 36, 0.8)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
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
              Login here
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

export default function Signup() {
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
      <SignupForm />
    </Suspense>
  );
}

