'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { CheckCircleIcon, ArrowRightIcon, LinkIcon } from '@heroicons/react/24/solid';

const DISCORD_BOT_INVITE_URL = 'https://discord.com/api/oauth2/authorize?client_id=1005557484271976569&permissions=8&scope=bot%20applications.commands';

export default function DiscordBot() {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(DISCORD_BOT_INVITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = DISCORD_BOT_INVITE_URL;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Copy failed
      }
      document.body.removeChild(textArea);
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Add the Bot to Your Server',
      description: 'Click the button below to add the Lines Police CAD Discord Bot to your Discord server. You must have "Manage Server" permissions to add bots.',
      action: (
        <a
          href={DISCORD_BOT_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#5865F2',
            color: '#ffffff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4752C4';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#5865F2';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Add Bot to Server
        </a>
      )
    },
    {
      number: 2,
      title: 'Authorize the Bot',
      description: 'Select the server where you want to add the bot, then click "Authorize". The bot will be added to your server with the necessary permissions.',
      action: null
    },
    {
      number: 3,
      title: 'Connect Your Account',
      description: 'After adding the bot to your server, go to your profile page and click "Connect Discord" to link your Lines Police CAD account with Discord. This allows you to use bot commands.',
      action: (
        <Link
          href="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '0.5rem',
            color: '#fbbf24',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem',
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
          Go to Profile
          <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
        </Link>
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
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                marginBottom: '1.5rem',
                boxShadow: '0 0 30px rgba(88, 101, 242, 0.4)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ffffff' }}>
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: '700',
                color: '#fbbf24',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
              }}>
                Discord Bot Setup
              </h1>
              <p style={{
                fontSize: '1.125rem',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '600px',
                margin: '0 auto',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: '1.6'
              }}>
                Follow these simple steps to add the Lines Police CAD Discord Bot to your server and connect your account.
              </p>
            </div>

            {/* Steps */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  style={{
                    backgroundColor: 'rgba(15, 15, 20, 0.6)',
                    border: '1px solid rgba(88, 101, 242, 0.2)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    position: 'relative',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start'
                  }}>
                    {/* Step Number */}
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: '700',
                      fontSize: '1.25rem',
                      color: '#ffffff',
                      boxShadow: '0 0 20px rgba(88, 101, 242, 0.4)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}>
                      {step.number}
                    </div>

                    {/* Step Content */}
                    <div style={{ flex: 1 }}>
                      <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#fbbf24',
                        marginBottom: '0.75rem',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        {step.title}
                      </h2>
                      <p style={{
                        fontSize: '1rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: step.action ? '1.5rem' : 0,
                        lineHeight: '1.6',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        {step.description}
                      </p>
                      {step.action && (
                        <div>
                          {step.action}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Info Card */}
            <div style={{
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#3b82f6',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircleIcon style={{ width: '24px', height: '24px' }} />
                Important Notes
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  <span style={{ color: '#3b82f6', marginTop: '0.25rem' }}>•</span>
                  <span>You must have "Manage Server" permissions on the Discord server to add the bot.</span>
                </li>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  <span style={{ color: '#3b82f6', marginTop: '0.25rem' }}>•</span>
                  <span>After adding the bot, you need to connect your account on your profile page to use bot commands.</span>
                </li>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  <span style={{ color: '#3b82f6', marginTop: '0.25rem' }}>•</span>
                  <span>The bot requires administrator permissions to function properly in your server.</span>
                </li>
              </ul>
            </div>

            {/* Invite Link Section */}
            <div style={{
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(88, 101, 242, 0.2)',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Need the invite link?
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <code style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  wordBreak: 'break-all',
                  maxWidth: '100%'
                }}>
                  {DISCORD_BOT_INVITE_URL}
                </code>
                <button
                  onClick={copyInviteLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(88, 101, 242, 0.2)',
                    border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(88, 101, 242, 0.4)'}`,
                    borderRadius: '0.5rem',
                    color: copied ? '#10b981' : '#5865F2',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';
                    }
                  }}
                >
                  {copied ? (
                    <>
                      <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <LinkIcon style={{ width: '16px', height: '16px' }} />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}

