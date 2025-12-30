'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { GlobeAltIcon, UserGroupIcon, DevicePhoneMobileIcon, CodeBracketIcon, HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

export default function AboutUs() {
  const features = [
    {
      icon: GlobeAltIcon,
      title: 'Free to Use',
      description: "This is the world's leading free to use Civilian, Police, EMS, Dispatch management CAD (Computer Aided Dispatch) tool."
    },
    {
      icon: UserGroupIcon,
      title: 'Developed with Users in Mind',
      description: 'Built to help facilitate role-play communities across the globe. Always looking to keep the users at the forefront for new features and use cases.'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Web, Mobile & Tablet Friendly',
      description: 'Our service can support however you access the internet. We want to make each experience great.'
    }
  ];

  const contributions = [
    {
      icon: HeartIcon,
      title: 'Use & Provide Feedback',
      description: 'Just by using this site and providing feedback is a great way to share that you like what you are using. Thank you!'
    },
    {
      icon: CodeBracketIcon,
      title: 'Contribute Code',
      description: (
        <>
          For any coders out there, check out our{' '}
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
          {' '}to help develop and work on the latest features, or even suggest your own.
        </>
      )
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Support on Patreon',
      description: (
        <>
          Feel free to follow us on Patreon, or join the cause and become one of our Patreon supporters. You can find us here:{' '}
          <a
            href="https://www.patreon.com/linespolicecad"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
              fontWeight: '600'
            }}
          >
            Lines Police CAD Patreon
          </a>
        </>
      )
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
                  About Us
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
                  About Us
                </span>
              </h1>
              <p style={{
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: '600'
              }}>
                LPC - Lines Police CAD
              </p>
            </div>

            {/* Features Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
              marginBottom: '4rem'
            }}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'rgba(15, 15, 20, 0.6)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '1rem',
                      padding: '2rem',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      borderRadius: '1rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      marginBottom: '1.5rem',
                      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
                    }}>
                      <Icon style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                    </div>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#fbbf24',
                      marginBottom: '1rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}>
                      {feature.title}
                    </h2>
                    <p style={{
                      fontSize: '1rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: '1.6',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}>
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Contributions Section */}
            <div style={{
              marginBottom: '4rem'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '3rem'
              }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                  fontWeight: '700',
                  color: '#fbbf24',
                  marginBottom: '1rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Contributions
                </h2>
                <p style={{
                  fontSize: '1.125rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  lineHeight: '1.6'
                }}>
                  There are a few ways you can help contribute, if you are interested
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem'
              }}>
                {contributions.map((contribution, index) => {
                  const Icon = contribution.icon;
                  return (
                    <div
                      key={index}
                      style={{
                        backgroundColor: 'rgba(15, 15, 20, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        transition: 'all 0.3s',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '48px',
                          height: '48px',
                          borderRadius: '0.75rem',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          flexShrink: 0,
                          boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
                        }}>
                          <Icon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#fbbf24',
                            marginBottom: '0.75rem',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}>
                            {contribution.title}
                          </h3>
                          <p style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.6',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}>
                            {contribution.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Us CTA */}
            <div style={{
              textAlign: 'center',
              marginTop: '4rem'
            }}>
              <Link
                href="/contact-us"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 2rem',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  borderRadius: '0.5rem',
                  color: '#fbbf24',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}

