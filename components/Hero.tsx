'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import { DISCORD_COMMUNITY } from '@/constants/discord';

export default function Hero() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Check if user is logged in
    const checkUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          if (isMounted) {
            if (userData.user) {
              setUser(userData.user);
            } else {
              setUser(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        // User not logged in or API not available
        if (isMounted) {
          setUser(null);
        }
      }
    };
    
    checkUser();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div 
      className="relative isolate overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingTop: '120px',
        paddingBottom: '80px',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        marginBottom: 0
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
      
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
        `,
        animation: 'pulse 8s ease-in-out infinite',
        zIndex: 2
      }} />
      
      {/* Glowing grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.5,
        zIndex: 2
      }} />
      <div 
        className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10"
        style={{
          maxWidth: 'min(100%, 80rem)',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 1.5rem)',
          width: '100%',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
      >
        <div
          className="mx-auto max-w-4xl text-center"
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            textAlign: 'center',
            display: 'block',
            position: 'relative',
            zIndex: 10,
            opacity: 1
          }}
        >
          {/* Animated Glowing Logo */}
          <div
            style={{
              marginBottom: '2rem',
              position: 'relative',
              display: 'inline-block',
              opacity: 1
            }}
          >
            {/* Purple breathing glow effect behind logo */}
            <div style={{
              position: 'absolute',
              top: '-20%',
              right: '-20%',
              bottom: '-20%',
              left: '-20%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.3) 40%, rgba(79, 70, 229, 0.1) 70%, transparent 100%)',
              filter: 'blur(30px)',
              animation: 'breathe 5s ease-in-out infinite',
              zIndex: -1,
              borderRadius: '50%'
            }} />
            
            <img
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
              alt="Lines Police CAD"
              style={{
                maxWidth: 'clamp(200px, 50vw, 400px)',
                width: '100%',
                height: 'auto',
                margin: '0 auto',
                display: 'block',
                filter: 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 60px rgba(99, 102, 241, 0.4))',
                position: 'relative',
                zIndex: 1
              }}
            />
          </div>

          {/* Main Headline with Scroll Light Effect */}
          <h1
            style={{
              opacity: 1,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: '700',
              letterSpacing: '0.08em',
              marginTop: '2rem',
              marginBottom: '1.5rem',
              lineHeight: '1.2',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              textTransform: 'uppercase',
              position: 'relative',
              display: 'inline-block'
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
              Your journey begins here
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
              Your journey begins here
            </span>
          </h1>

          {/* Tagline */}
          <p
            style={{
              opacity: 1,
              marginTop: '1rem',
              fontSize: '1.25rem',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.95)',
              maxWidth: '700px',
              margin: '1rem auto 0',
              fontWeight: '500',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              textShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
            }}
          >
            World&apos;s Leading Free-to-use service for Role-play communities
          </p>

          {/* Subtext */}
          <p
            style={{
              opacity: 1,
              marginTop: '1.5rem',
              fontSize: '1.125rem',
              lineHeight: '1.7',
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: '600px',
              margin: '1.5rem auto 0',
              fontWeight: '400',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Join for free, dive into the roleplay communities with your friends, and connect with fellow explorers on Discord.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              opacity: 1,
              marginTop: '2.5rem',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.25rem',
              flexWrap: 'wrap'
            }}
          >
            <Link
              href={user ? "/communities" : "/signup-civ"}
              style={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#000000',
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2)';
              }}
            >
              {/* Light effect behind button */}
              <div style={{
                position: 'absolute',
                inset: '-20px',
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, transparent 70%)',
                filter: 'blur(20px)',
                animation: 'pulse 2s ease-in-out infinite',
                zIndex: -1,
                borderRadius: '8px'
              }} />
              <PlayIcon style={{ position: 'relative', zIndex: 1, width: '20px', height: '20px' }} />
              <span style={{ position: 'relative', zIndex: 1 }}>PLAY NOW</span>
            </Link>
            <a
              href={DISCORD_COMMUNITY}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ffffff',
                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)';
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>JOIN DISCORD</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

