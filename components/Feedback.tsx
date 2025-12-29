'use client';

import Link from 'next/link';
import { ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { DISCORD_CONTACT, DISCORD_BOT } from '@/constants/discord';

const feedbackOptions = [
  {
    name: 'Contact Us',
    href: '/contact-us',
    icon: EnvelopeIcon,
    description: 'Send us a message directly',
    external: false,
  },
  {
    name: 'Assistance Ticket',
    href: DISCORD_BOT,
    icon: ChatBubbleLeftRightIcon,
    description: 'Create an assistance ticket 24/7',
    external: true,
  },
];

export default function Feedback() {
  return (
    <div 
      className="py-24 sm:py-32"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)',
        paddingTop: '6rem',
        paddingBottom: '6rem',
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
            Get in Touch
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
            We love feedback. Click on any of the options below to get the conversation started.
          </p>
        </div>
        <div 
          style={{
            marginTop: '4rem',
            maxWidth: '56rem',
            margin: '4rem auto 0',
            width: '100%'
          }}
        >
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
              width: '100%'
            }}
          >
            {feedbackOptions.map((option, index) => {
              const Component = option.external ? 'a' : Link;
              const props = option.external
                ? { href: option.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: option.href };

              return (
                <div
                  key={option.name}
                  style={{ opacity: 1 }}
                >
                  <Component
                    {...props}
                    className="group relative rounded-2xl p-8 transition-all duration-300"
                    style={{
                      borderRadius: '1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '2rem',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(10px)',
                      transform: 'scale(1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.2), 0 0 100px rgba(99, 102, 241, 0.1)';
                      const halo = e.currentTarget.querySelector('.halo-effect') as HTMLElement;
                      if (halo) halo.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      const halo = e.currentTarget.querySelector('.halo-effect') as HTMLElement;
                      if (halo) halo.style.opacity = '0';
                    }}
                  >
                    {/* Halo effect background */}
                    <div 
                      className="halo-effect"
                      style={{
                        position: 'absolute',
                        inset: '-50%',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}
                    />
                    <div 
                      className="flex items-start gap-x-4"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <div 
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-white transition-colors"
                        style={{
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
                        }}
                      >
                        <option.icon className="h-7 w-7" aria-hidden="true" style={{ width: '1.75rem', height: '1.75rem', display: 'block' }} />
                      </div>
                      <div className="flex-1" style={{ flex: '1 1 0%', marginTop: 0, paddingTop: 0, display: 'flex', flexDirection: 'column' }}>
                        <h3 
                          className="text-xl font-semibold leading-7 transition-colors"
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            lineHeight: '1.2',
                            color: '#fbbf24',
                            marginTop: 0,
                            marginBottom: '0.5rem',
                            paddingTop: 0,
                            paddingLeft: 0,
                            display: 'block',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}
                        >
                          {option.name}
                        </h3>
                        <p 
                          className="mt-2 text-base leading-6"
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '1rem',
                            lineHeight: '1.5rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            paddingLeft: 0,
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}
                        >
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </Component>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

