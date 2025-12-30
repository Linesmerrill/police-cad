'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

const footerLinks = {
  information: [
    { name: 'Release Log', href: 'https://github.com/Linesmerrill/police-cad/releases', external: true },
    { name: 'Developers', href: 'https://linesmerrill.github.io/MerrillLines/', external: true },
  ],
  about: [
    { name: 'Contact Us', href: '/about#contact-us' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms & Conditions', href: '/terms-and-conditions' },
  ],
  contribute: [
    { name: 'Patreon', href: 'https://www.patreon.com/linespolicecad', external: true },
    { name: 'Police-CAD on Github', href: 'https://github.com/linesmerrill/police-cad', external: true },
  ],
  social: [
    { name: 'X (Twitter)', href: 'https://twitter.com/LinesPoliceCAD', icon: 'fa-brands fa-x-twitter' },
    { name: 'Facebook', href: 'https://www.facebook.com/linespoliceserver/', icon: 'fa-brands fa-facebook' },
    { name: 'Patreon', href: 'https://www.patreon.com/linespolicecad', icon: 'fa-brands fa-patreon' },
  ],
};

export default function Footer() {
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasFetchedRef = useRef(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Prevent duplicate calls (React StrictMode causes double renders in dev)
    if (hasFetchedRef.current) return;
    
    const fetchBuildVersion = async () => {
      if (hasFetchedRef.current) return; // Double check
      hasFetchedRef.current = true;
      
      try {
        const response = await fetch('/api/build-version');
        if (response.ok) {
          const data = await response.json();
          setBuildVersion(data.buildVersion);
        }
      } catch (error) {
        // Silently fail if build version can't be fetched
      }
    };
    
    // Lazy load: Only fetch when footer is visible or after a delay
    let observer: IntersectionObserver | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    
    // Wait a bit for the ref to be available, then set up observer
    const setupObserver = () => {
      if (typeof IntersectionObserver !== 'undefined' && footerRef.current) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !hasFetchedRef.current) {
                fetchBuildVersion();
                if (observer) observer.disconnect();
                if (fallbackTimeout) clearTimeout(fallbackTimeout);
              }
            });
          },
          {
            rootMargin: '100px', // Start loading 100px before footer is visible
            threshold: 0.1
          }
        );
        
        observer.observe(footerRef.current);
        
        // Fallback: If footer doesn't become visible within 3 seconds, fetch anyway
        fallbackTimeout = setTimeout(() => {
          if (!hasFetchedRef.current) {
            fetchBuildVersion();
          }
          if (observer) observer.disconnect();
        }, 3000);
      } else {
        // Fallback: Defer fetch by 1 second to not block initial render
        fallbackTimeout = setTimeout(() => {
          if (!hasFetchedRef.current) {
            fetchBuildVersion();
          }
        }, 1000);
      }
    };
    
    // Try immediately, or wait a tick for ref to be available
    if (footerRef.current) {
      setupObserver();
    } else {
      // Wait for next frame for ref to be available
      requestAnimationFrame(() => {
        setupObserver();
      });
    }
    
    // Cleanup
    return () => {
      if (observer) observer.disconnect();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, []);

  const copyBuildVersion = async () => {
    if (!buildVersion) return;
    
    try {
      await navigator.clipboard.writeText(buildVersion);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000); // Reset after 2 seconds
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = buildVersion;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        // Copy failed
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <footer 
      ref={footerRef}
      aria-labelledby="footer-heading" 
      style={{ 
        backgroundColor: '#0a0a0f', 
        borderTop: '1px solid rgba(59, 130, 246, 0.2)',
        width: '100%',
        maxWidth: '100vw',
        display: 'block',
        paddingTop: '4rem',
        paddingBottom: '2rem',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <h2 id="footer-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        Footer
      </h2>
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
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem'
          }}
        >
          {/* Logo and Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <img
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
              alt="Lines Police CAD"
              style={{
                height: '6rem',
                width: 'auto',
                maxWidth: '400px',
                display: 'block',
                marginBottom: '0.5rem',
                objectFit: 'contain',
                objectPosition: 'left'
              }}
            />
            <p style={{ 
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              World&apos;s Leading Free-to-use role-play facilitator
            </p>
          </div>

          {/* Information */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#fbbf24',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              Information
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {footerLinks.information.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#fbbf24',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              About
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {footerLinks.about.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contribute */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#fbbf24',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              Contribute
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {footerLinks.contribute.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#fbbf24',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              Follow
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {footerLinks.social.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '1.5rem',
                      transition: 'color 0.2s',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                  >
                    <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>{item.name}</span>
                    <i className={item.icon} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.75rem',
            lineHeight: '1.5',
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            margin: 0
          }}>
            &copy; 2020-{new Date().getFullYear()} Lines Police CAD. All rights reserved.
          </p>
          {buildVersion && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '0.5rem 0 0 0'
            }}>
              <p style={{
                fontSize: '0.75rem',
                lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                margin: 0
              }}>
                Build: {buildVersion}
              </p>
              <button
                onClick={copyBuildVersion}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: copied ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                  transition: 'color 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copied) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                  }
                }}
                aria-label="Copy build number"
                title="Copy build number"
              >
                {copied ? (
                  <CheckIcon style={{ width: '14px', height: '14px' }} />
                ) : (
                  <ClipboardDocumentIcon style={{ width: '14px', height: '14px' }} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

