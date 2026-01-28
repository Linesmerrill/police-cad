'use client';

import Link from 'next/link';
import {
  VideoCameraIcon,
  GiftIcon,
  StarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const benefits = [
  {
    title: 'Free Base Plan',
    description: 'Get a free Base Plan subscription for your personal account as long as you remain an active creator.',
    icon: GiftIcon,
  },
  {
    title: 'Community Benefits',
    description: 'Apply your free Base Plan to one of your communities to enhance your server\'s capabilities.',
    icon: UserGroupIcon,
  },
  {
    title: 'Featured Profile',
    description: 'Get your own featured profile page in our Content Creators directory for increased visibility.',
    icon: StarIcon,
  },
];

export default function ContentCreators() {
  return (
    <div
      style={{
        backgroundColor: 'transparent',
        paddingTop: '6rem',
        paddingBottom: '6rem',
        background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.03) 0%, rgba(10, 10, 15, 0.95) 100%)',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          maxWidth: 'min(100%, 80rem)',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 1.5rem)',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            maxWidth: '48rem',
            margin: '0 auto 3rem',
            textAlign: 'center'
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '9999px',
            padding: '0.5rem 1rem',
            marginBottom: '1.5rem'
          }}>
            <VideoCameraIcon style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24' }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#fbbf24',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              Content Creator Program
            </span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: '700',
              letterSpacing: '0.02em',
              color: '#ffffff',
              marginBottom: '1.25rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Are You a <span style={{ color: '#fbbf24' }}>Content Creator</span>?
          </h2>
          <p
            style={{
              fontSize: '1.125rem',
              lineHeight: '1.75',
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Join our Content Creator Program and unlock exclusive benefits. Stream, create videos,
            or share content featuring Lines Police CAD and get rewarded.
          </p>
        </div>

        {/* Benefits Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
            width: '100%'
          }}
        >
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              style={{
                padding: '1.75rem',
                borderRadius: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(251, 191, 36, 0.15)',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
              }}>
                <benefit.icon style={{ width: '1.5rem', height: '1.5rem', color: '#000' }} />
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '0.75rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {benefit.title}
              </h3>
              <p style={{
                fontSize: '0.9375rem',
                lineHeight: '1.6',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <Link
              href="/content-creators/apply"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                borderRadius: '0.75rem',
                color: '#000',
                fontSize: '1rem',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(251, 191, 36, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(251, 191, 36, 0.3)';
              }}
            >
              Apply Now
              <VideoCameraIcon style={{ width: '1.25rem', height: '1.25rem' }} />
            </Link>
            <Link
              href="/content-creators"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.75rem',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              View Creators
            </Link>
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Streamers, YouTubers, and content creators welcome
          </p>
        </div>
      </div>
    </div>
  );
}
