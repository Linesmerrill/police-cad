'use client';

import {
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Comprehensive Dashboards',
    description: 'Access powerful dashboards for civilians, police officers, dispatch, and EMS personnel.',
    icon: ChartBarIcon,
  },
  {
    name: 'Mobile Friendly',
    description: 'Fully responsive design that works seamlessly on all devices - desktop, tablet, and mobile.',
    icon: DevicePhoneMobileIcon,
  },
  {
    name: 'Real-time Updates',
    description: 'Stay connected with real-time notifications and updates across all platforms.',
    icon: ClockIcon,
  },
  {
    name: 'Community Focused',
    description: 'Built specifically for role-play communities with features tailored to your needs.',
    icon: UsersIcon,
  },
  {
    name: 'Secure & Reliable',
    description: 'Enterprise-grade security to keep your data safe and your operations running smoothly.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Free to Use',
    description: 'Completely free-to-use service with no hidden costs. Optional premium tiers available for those who want to donate or are power users.',
    icon: GlobeAltIcon,
  },
];

export default function Features() {
  return (
    <div 
      id="features" 
      className="py-24 sm:py-32"
      style={{
        backgroundColor: 'transparent',
        paddingTop: '6rem',
        paddingBottom: '6rem',
        background: 'linear-gradient(180deg, #16213e 0%, #0a0a0f 100%)',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="mx-auto max-w-7xl px-6 lg:px-8"
        style={{
          maxWidth: 'min(100%, 80rem)',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 1.5rem)',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        <div
          style={{
            maxWidth: '42rem',
            margin: '0 auto',
            textAlign: 'center',
            opacity: 1
          }}
        >
          <h2 
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3rem)',
              fontWeight: '700',
              letterSpacing: '0.05em',
              color: '#fbbf24',
              marginBottom: '1.5rem',
              textShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
              textTransform: 'uppercase',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Dashboards
          </h2>
          <p 
            className="mt-6 text-xl leading-8"
            style={{
              marginTop: '1.5rem',
              fontSize: '1.25rem',
              lineHeight: '2rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Access powerful dashboards designed for civilians, police officers, dispatch, and EMS personnel.
          </p>
        </div>
        <div 
          style={{
            marginTop: '4rem',
            maxWidth: '100%',
            width: '100%'
          }}
        >
          <dl 
            className="features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
              maxWidth: '100%',
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.name}
                style={{
                  opacity: 1,
                  padding: '2rem',
                  borderRadius: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  transform: 'scale(1)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'default',
                  minWidth: 0,
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.5rem',
                  position: 'relative',
                  zIndex: 1,
                  minWidth: 0,
                  width: '100%'
                }}>
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                    marginTop: 0,
                    paddingTop: 0
                  }}>
                    <feature.icon style={{ width: '1.75rem', height: '1.75rem', display: 'block' }} />
                  </div>
                  <div style={{ 
                    flex: '1 1 0%', 
                    marginTop: 0, 
                    paddingTop: 0, 
                    display: 'flex', 
                    flexDirection: 'column',
                    minWidth: 0,
                    overflow: 'hidden'
                  }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#fbbf24',
                      marginTop: 0,
                      marginBottom: '0.75rem',
                      lineHeight: '1.2',
                      paddingTop: 0,
                      paddingLeft: 0,
                      display: 'block',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {feature.name}
                    </h3>
                    <p style={{
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginTop: 0,
                      paddingLeft: 0,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      overflow: 'hidden'
                    }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

