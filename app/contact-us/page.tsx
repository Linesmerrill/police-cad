'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ChatBubbleLeftRightIcon, LightBulbIcon, BugAntIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { DISCORD_CONTACT } from '@/constants/discord';

const GITHUB_FEATURE_REQUEST = 'https://github.com/Linesmerrill/police-cad/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=';
const GITHUB_BUG_REPORT = 'https://github.com/Linesmerrill/police-cad/issues/new?assignees=&labels=&template=bug_report.md&title=';

export default function ContactUs() {
  const contactOptions = [
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Reach out to Us',
      description: 'Need direct support? Open an Assistance Ticket.',
      buttonText: 'Open Ticket',
      href: DISCORD_CONTACT,
      color: '#5865F2',
      gradient: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)'
    },
    {
      icon: LightBulbIcon,
      title: 'Request a New Feature',
      description: 'Have an idea for a new feature? Submit it on our Feature Requests board where others can vote and discuss. We prioritize popular requests.',
      note: 'Note: Before creating a new request, search for existing ones to avoid duplicates.',
      buttonText: 'Request Feature',
      href: '/feature-requests/new',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      icon: BugAntIcon,
      title: 'Report a Bug',
      description: 'Found a bug or issue? Help us improve by reporting it on GitHub. We appreciate your feedback and will work to fix it as soon as possible.',
      buttonText: 'Report Bug',
      href: GITHUB_BUG_REPORT,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    }
  ];

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
        boxSizing: 'border-box'
      }}
    >
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
          paddingTop: '2rem',
          paddingBottom: '4rem',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <div style={{
            maxWidth: 'min(100%, 80rem)',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 1.5rem)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '4rem',
              paddingTop: '2rem'
            }}>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                fontWeight: '700',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                position: 'relative',
                display: 'inline-block'
              }}>
                {/* Glow behind text */}
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  color: '#fbbf24',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)',
                  filter: 'blur(2px)',
                  zIndex: 0
                }}>
                  Contact Us
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
                  Contact Us
                </span>
              </h1>
              <p style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '600px',
                margin: '0 auto',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: '1.6'
              }}>
                Get in touch with us through any of the options below. We&apos;re here to help!
              </p>
            </div>

            {/* Contact Options */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              marginBottom: '4rem'
            }}>
              {contactOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'rgba(15, 15, 20, 0.6)',
                      border: `1px solid ${option.color}40`,
                      borderRadius: '1rem',
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${option.color}80`;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 12px rgba(0, 0, 0, 0.4), 0 0 20px ${option.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${option.color}40`;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    {/* Gradient accent */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: option.gradient,
                      zIndex: 1
                    }} />
                    
                    {/* Icon */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      borderRadius: '1rem',
                      background: option.gradient,
                      marginBottom: '1.5rem',
                      boxShadow: `0 0 20px ${option.color}40`,
                      position: 'relative',
                      zIndex: 2
                    }}>
                      <Icon style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                    </div>

                    {/* Content */}
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#fbbf24',
                      marginBottom: '1rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      {option.title}
                    </h2>
                    <p style={{
                      fontSize: '1rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: '1.6',
                      marginBottom: option.note ? '0.75rem' : '1.5rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      flex: 1,
                      position: 'relative',
                      zIndex: 2
                    }}>
                      {option.description}
                    </p>
                    {option.note && (
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgba(251, 191, 36, 0.7)',
                        lineHeight: '1.5',
                        marginBottom: '1.5rem',
                        fontStyle: 'italic',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        position: 'relative',
                        zIndex: 2
                      }}>
                        {option.note}
                      </p>
                    )}
                    <a
                      href={option.href}
                      target={option.href.startsWith('http') ? '_blank' : undefined}
                      rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: `${option.color}20`,
                        border: `1px solid ${option.color}60`,
                        borderRadius: '0.5rem',
                        color: option.color,
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        position: 'relative',
                        zIndex: 2,
                        marginTop: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${option.color}30`;
                        e.currentTarget.style.borderColor = `${option.color}80`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${option.color}20`;
                        e.currentTarget.style.borderColor = `${option.color}60`;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {option.buttonText}
                      <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Additional Info */}
            <div style={{
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#3b82f6',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Need More Help?
              </h3>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Check out our{' '}
                <a
                  href="/about-us"
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'underline',
                    fontWeight: '600'
                  }}
                >
                  About Us
                </a>
                {' '}page to learn more about Lines Police CAD, or visit our{' '}
                <a
                  href="https://github.com/linesmerrill/police-cad"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'underline',
                    fontWeight: '600'
                  }}
                >
                  GitHub
                </a>
                {' '}repository to explore the codebase and contribute.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}

