'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { XCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function CommunityPromotionCancelPage() {
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
            <XCircleIcon style={{
              width: '64px',
              height: '64px',
              color: 'rgba(255, 255, 255, 0.3)',
              margin: '0 auto 24px'
            }} />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '8px'
            }}>
              Purchase Cancelled
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '32px'
            }}>
              Your community promotion purchase was cancelled. No charges have been made.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/community-pricing"
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
                View Promotion Plans
              </Link>
              <Link
                href="/"
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
                Go Home
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
