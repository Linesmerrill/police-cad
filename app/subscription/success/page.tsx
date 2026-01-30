'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      const verifySubscription = async () => {
        try {
          const response = await fetch('/api/v1/user/verify-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            credentials: 'include'
          });

          const data = await response.json();

          if (data.success) {
            setResult(data.subscription);
          } else {
            setError(data.error || 'Failed to verify subscription');
          }
        } catch (err) {
          console.error('Error verifying subscription:', err);
          setError('An error occurred while verifying your subscription');
        } finally {
          setVerifying(false);
        }
      };

      verifySubscription();
    } else {
      setVerifying(false);
      setError('No session ID provided');
    }
  }, [sessionId]);

  const getPlanDisplayName = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'base': return 'Base';
      case 'premium': return 'Premium';
      case 'premium_plus': return 'Premium Plus';
      default: return plan || 'Unknown';
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      position: 'relative',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />

      {/* Dark Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />

        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '80px 20px',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(15, 15, 20, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '48px 32px',
            textAlign: 'center',
            width: '100%'
          }}>
            {verifying ? (
              <>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '3px solid rgba(251, 191, 36, 0.3)',
                  borderTopColor: '#fbbf24',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 24px'
                }} />
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Verifying your subscription...
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Please wait while we confirm your payment.
                </p>
              </>
            ) : error ? (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <span style={{ fontSize: '32px' }}>⚠️</span>
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Verification Issue
                </h2>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '24px'
                }}>
                  {error}
                </p>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem',
                  marginBottom: '24px'
                }}>
                  Don&apos;t worry - if your payment was successful, your subscription will be activated shortly.
                </p>
                <Link
                  href="/profile"
                  style={{
                    display: 'inline-block',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    color: '#fbbf24',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  Go to Profile
                </Link>
              </>
            ) : (
              <>
                <CheckCircleIcon style={{
                  width: '64px',
                  height: '64px',
                  color: '#10b981',
                  margin: '0 auto 24px'
                }} />
                <h2 style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Welcome to {getPlanDisplayName(result?.plan)}!
                </h2>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '32px'
                }}>
                  Your subscription has been activated successfully.
                </p>

                {result && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '32px',
                    textAlign: 'left'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Plan</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>
                        {getPlanDisplayName(result.plan)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Billing</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>
                        {result.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Status</span>
                      <span style={{ color: '#10b981', fontWeight: 500 }}>
                        Active
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href="/communities"
                    style={{
                      display: 'inline-block',
                      padding: '12px 32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      color: '#000',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/manage-subscription"
                    style={{
                      display: 'inline-block',
                      padding: '12px 32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Manage Subscription
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <Footer />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Loading...</p>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
