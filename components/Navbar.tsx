'use client';

import { useState, useEffect, useRef } from 'react';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, BellIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DISCORD_COMMUNITY } from '@/constants/discord';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about-us' },
  { name: 'Contact Us', href: '/contact-us' },
  { name: 'Discord Bot', href: '/discord-bot' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasCheckedNotifications, setHasCheckedNotifications] = useState(false);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  
  // Hide main header on communities page
  const hideMainHeader = pathname === '/communities' || (pathname && pathname.startsWith('/communities/'));

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1023);
      setIsSmallScreen(window.innerWidth <= 768);
    };
    
    // Check immediately on mount
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    // Adjust main content padding when mobile menu opens/closes (no longer needed for fixed positioning)
    // Keeping this for any future adjustments if needed
  }, [isMobile, mobileMenuOpen, isSmallScreen]);

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
              setNotificationCount(0);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setNotificationCount(0);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
        // User not logged in or API not available
        if (isMounted) {
          setUser(null);
          setNotificationCount(0);
        }
      }
    };
    
    checkUser();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch notification count only when user clicks on their username
  const fetchNotificationCount = async () => {
    if (!user?.id) {
      setNotificationCount(0);
      return;
    }

    try {
      const response = await fetch(
        `/api/user/notifications/count?userId=${user.id}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const count = data.unseenCount || 0;
        setNotificationCount(count);
      } else {
        // If fetch fails, assume no notifications and hide badge
        setNotificationCount(0);
      }
    } catch (error) {
      // Silently handle error - assume no notifications and hide badge
      console.error('Error fetching notification count:', error);
      setNotificationCount(0);
    }
  };

  // Reset notification count when user logs out
  useEffect(() => {
    if (!user?.id) {
      setNotificationCount(0);
    } else {
      // When user logs in, show badge by default (will be updated when they open dropdown)
      setNotificationCount(1);
    }
  }, [user?.id]);

  useEffect(() => {
    // Close user menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);


  const toggleMenu = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMobileMenuOpen(prev => !prev);
  };

  return (
    <>
      {/* Top Bar - Discord Link and Login/User Menu */}
      <div
        ref={topBarRef}
      style={{
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isSmallScreen ? '0.75rem clamp(1rem, 4vw, 1.5rem)' : '0.5rem clamp(1rem, 4vw, 1.5rem)',
        display: 'flex',
        flexDirection: isSmallScreen ? 'column' : 'row',
        alignItems: isSmallScreen ? 'center' : 'center',
        justifyContent: isSmallScreen ? 'center' : 'space-between',
        gap: isSmallScreen ? '0.75rem' : '0',
        fontSize: '0.875rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        minHeight: isSmallScreen ? 'auto' : '32px',
        height: isSmallScreen ? 'auto' : '32px',
        width: '100%'
      }}
    >
      {/* Discord Community Link */}
      <a
        href={DISCORD_COMMUNITY}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'rgba(255, 255, 255, 0.8)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'color 0.2s',
          justifyContent: isSmallScreen ? 'center' : 'flex-start'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Join Discord Community
      </a>

      {/* Login/Register or User Menu */}
      {user && (user.username || user.email) ? (
        <div style={{ 
          position: 'relative',
          display: 'flex',
          justifyContent: isSmallScreen ? 'center' : 'flex-end'
        }} ref={userMenuRef}>
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              // Fetch notification count when user opens the dropdown
              if (!userMenuOpen) {
                fetchNotificationCount();
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <UserIcon style={{ width: '16px', height: '16px' }} />
              {notificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    width: '10px',
                    height: '10px',
                    border: '2px solid rgba(15, 15, 20, 0.95)',
                    display: 'block'
                  }}
                  title={`${notificationCount} unread notification${notificationCount === 1 ? '' : 's'}`}
                />
              )}
            </div>
            <span style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {user.username || user.email?.split('@')[0] || 'User'}
              {user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus') && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  flexShrink: 0
                }} title="Verified">
                  <i className="fa fa-check-circle" style={{ fontSize: '12px' }}></i>
                </span>
              )}
            </span>
            {userMenuOpen ? (
              <ChevronUpIcon style={{ width: '14px', height: '14px' }} />
            ) : (
              <ChevronDownIcon style={{ width: '14px', height: '14px' }} />
            )}
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: isSmallScreen ? 'auto' : 0,
                left: isSmallScreen ? '50%' : 'auto',
                transform: isSmallScreen ? 'translateX(-50%)' : 'none',
                marginTop: '0.5rem',
                backgroundColor: 'rgba(15, 15, 20, 0.98)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.5rem',
                minWidth: '200px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                zIndex: 10001
              }}
            >
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Cog6ToothIcon style={{ width: '18px', height: '18px' }} />
                Account Settings
              </Link>

              <Link
                href="/notifications"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BellIcon style={{ width: '18px', height: '18px' }} />
                  <span>Notifications</span>
                </div>
                {notificationCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '12px',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: notificationCount > 99 ? '0 7px' : '0 6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title={`${notificationCount} unread notification${notificationCount === 1 ? '' : 's'}`}
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Link>

              <a
                href="/logout"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  color: '#ef4444',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowRightOnRectangleIcon style={{ width: '18px', height: '18px' }} />
                Logout
              </a>
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          justifyContent: isSmallScreen ? 'center' : 'flex-end'
        }}>
          <Link
            href="/login-civ"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            Login
          </Link>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>or</span>
          <Link
            href="/signup-civ"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            Register
          </Link>
        </div>
      )}
      </div>

      {!hideMainHeader && (
        <header 
          ref={headerRef}
          style={{
            backgroundColor: 'rgba(15, 15, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            width: '100%',
            maxWidth: '100vw',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            minHeight: '60px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            margin: 0
          }}
          className="navbar-header"
          data-mobile-menu-open={isMobile && mobileMenuOpen ? 'true' : 'false'}
        >
          <nav 
            style={{
              maxWidth: 'min(100%, 80rem)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1rem',
              width: '100%',
              boxSizing: 'border-box',
              overflowX: 'hidden',
              position: 'relative',
              height: '60px',
              flexWrap: 'nowrap',
              minHeight: 0
            }}
          >
        {/* Logo */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%' }}>
            <img
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
              alt="Lines Police CAD"
              style={{
                height: '2.25rem',
                width: 'auto',
                display: 'block'
              }}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div 
            className="desktop-nav"
            style={{
              gap: '2.5rem',
              alignItems: 'center',
              flex: '1 1 auto',
              justifyContent: 'center',
              display: 'flex',
              height: '100%',
              flexShrink: 1,
              minWidth: 0,
              overflow: 'hidden'
            }}
          >
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.85)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop Get Started Button */}
        {!isMobile && (
          <div 
            className="desktop-cta"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Link
              href="/signup-civ"
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#ffffff',
                textDecoration: 'none',
                transition: 'all 0.2s',
                padding: '0.625rem 1.25rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                height: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile Hamburger Button */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              flexShrink: 0,
              marginLeft: 'auto'
            }}
          >
            {mobileMenuOpen ? (
              <XMarkIcon style={{ width: '24px', height: '24px' }} />
            ) : (
              <Bars3Icon style={{ width: '24px', height: '24px' }} />
            )}
          </button>
        )}

      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobile && mobileMenuOpen && (
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(15, 15, 20, 0.98)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}
        >
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {item.name}
            </Link>
          ))}
          <Link
            href="/signup-civ"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fbbf24',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              textAlign: 'center',
              marginTop: '0.5rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Get Started
          </Link>
        </div>
      )}
        </header>
      )}
    </>
  );
}
