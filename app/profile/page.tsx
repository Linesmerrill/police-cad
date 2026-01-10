'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { UserIcon, EnvelopeIcon, CalendarIcon, CurrencyDollarIcon, LockClosedIcon, SpeakerWaveIcon, BellIcon, TrashIcon, EyeIcon, EyeSlashIcon, IdentificationIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { DISCORD_COMMUNITY } from '@/constants/discord';
import { getAuthHeaders, storeAuth, clearAuth } from '@/lib/auth';

export default function Profile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingCallSign, setEditingCallSign] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [callSignValue, setCallSignValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [emailVisible, setEmailVisible] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeactivateLoading, setShowDeactivateLoading] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState<'processing' | 'logging-out'>('processing');
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showDisconnectDiscordModal, setShowDisconnectDiscordModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);
  
  // User subscription tiers
  const userTiers = {
    free: {
      name: "Free",
      features: [
        {
          text: "Create 1 community",
          icon: "community",
          description: "Allows you to create and manage 1 community.",
        },
        {
          text: "Default departments",
          icon: "department",
          description: "Provides access to pre-set department categories.",
        },
        {
          text: "Full ads",
          icon: "ads",
          description: "Displays the full amount of advertisements.",
        },
      ],
    },
    base: {
      name: "Base",
      features: [
        {
          text: "Create up to 5 communities",
          icon: "community",
          description: "Allows you to create and manage up to 5 communities.",
        },
        {
          text: "Default departments",
          icon: "department",
          description: "Provides access to pre-set department categories.",
        },
        {
          text: "Full ads",
          icon: "ads",
          description: "Displays the full amount of advertisements.",
        },
      ],
    },
    premium: {
      name: "Premium",
      features: [
        {
          text: "Verified checkmark",
          icon: "checkmark",
          description: "Displays a verified checkmark next to your profile.",
        },
        {
          text: "Create up to 10 communities",
          icon: "community",
          description: "Allows you to create and manage up to 10 communities.",
        },
        {
          text: "Default departments",
          icon: "department",
          description: "Provides access to pre-set department categories.",
        },
        {
          text: "Limited ads (50% fewer)",
          icon: "ads",
          description:
            "Reduces the number of ads by 50% compared to the Base tier.",
        },
      ],
    },
    premium_plus: {
      name: "Premium +",
      features: [
        {
          text: "Verified checkmark",
          icon: "checkmark",
          description: "Displays a verified checkmark next to your profile.",
        },
        {
          text: "Unlimited communities",
          icon: "community",
          description:
            "Allows you to create and manage an unlimited number of communities.",
        },
        {
          text: "Custom departments",
          icon: "department",
          description:
            "Enables you to create and name your own department categories.",
        },
        {
          text: "No ads",
          icon: "ads",
          description: "Removes all advertisements for an ad-free experience.",
        },
      ],
    },
  };

  // Subscription formatting helpers
  const formatPlanName = (plan: string | undefined): string => {
    if (!plan) return 'Free';
    switch (plan) {
      case 'premium_plus':
        return 'Premium +';
      case 'premium':
        return 'Premium';
      case 'base':
        return 'Base';
      default:
        return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  };

  const getPlanBadgeStyle = (plan: string | undefined): string => {
    if (!plan || plan === 'free') {
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
    switch (plan) {
      case 'premium_plus':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900';
      case 'premium':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'base':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getFeatureIcon = (icon: string) => {
    switch (icon) {
      case 'community':
        return 'fa-users';
      case 'department':
        return 'fa-building';
      case 'ads':
        return 'fa-ad';
      case 'checkmark':
        return 'fa-check-circle';
      default:
        return 'fa-check';
    }
  };

  const calculateExpirationDate = (updatedAt: any, isAnnual: boolean): Date | null => {
    if (!updatedAt) return null;
    
    const updateDate = typeof updatedAt === 'object' && '$date' in updatedAt 
      ? new Date(updatedAt.$date) 
      : new Date(updatedAt);
    
    if (isNaN(updateDate.getTime())) return null;
    
    const expirationDate = new Date(updateDate);
    if (isAnnual) {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }
    
    return expirationDate;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            setUser(userData.user);
            setUsernameValue(userData.user.username || '');
            setCallSignValue(userData.user.callSign || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  // Check for error query parameter and show message
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error === 'discord_login_required') {
      showMessage('error', 'Please log in first before connecting your Discord account. The Discord connection link has expired. Please try connecting Discord again from your profile page.');
      // Remove error from URL
      router.replace('/profile');
    }
  }, [searchParams, router]);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Convert MongoDB ObjectId to date
  const getDateFromObjectId = (objectId: string) => {
    if (!objectId || typeof objectId !== 'string' || objectId.length !== 24) return null;
    try {
      // MongoDB ObjectId contains timestamp in first 4 bytes (8 hex characters)
      // The timestamp is in SECONDS since Unix epoch, so multiply by 1000 to get milliseconds
      const timestampSeconds = parseInt(objectId.substring(0, 8), 16);
      if (isNaN(timestampSeconds)) return null;
      const timestamp = timestampSeconds * 1000;
      const date = new Date(timestamp);
      // Validate the date
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (e) {
      console.error('Error converting ObjectId to date:', e);
      return null;
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return 'N/A';
    const [localPart, domain] = email.split('@');
    if (!domain) return '***@***';
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 1) + '***' + localPart.substring(localPart.length - 1)
      : '***';
    const maskedDomain = domain.length > 2
      ? domain.substring(0, 1) + '***' + domain.substring(domain.length - 1)
      : '***';
    return `${maskedLocal}@${maskedDomain}`;
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateUsername = async () => {
    if (!user || !usernameValue.trim()) {
      showMessage('error', 'Username cannot be empty');
      return;
    }
    if (usernameValue.length > 20) {
      showMessage('error', 'Username must be 20 characters or less');
      return;
    }

    setSaving('username');
    try {
      // Use URLSearchParams to match the format used by communities page (application/x-www-form-urlencoded)
      const params = new URLSearchParams();
      params.append('action', 'updateUsername');
      params.append('userID', user.id);
      params.append('accountEmail', user.email || '');
      params.append('accountUsername', usernameValue.trim());
      params.append('accountCallSign', user.callSign || '');
      params.append('page', '/profile');
      params.append('discordToken', '');

      const response = await fetch('/manageAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeaders()
        },
        body: params.toString(),
        credentials: 'include'
      });

      if (response.ok) {
        setUser({ ...user, username: usernameValue.trim() });
        setEditingUsername(false);
        showMessage('success', 'Username updated successfully');
      } else {
        showMessage('error', 'Failed to update username');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      showMessage('error', 'An error occurred while updating username');
    } finally {
      setSaving(null);
    }
  };

  const updateCallSign = async () => {
    if (!user) return;
    if (callSignValue.length > 10) {
      showMessage('error', 'Call sign must be 10 characters or less');
      return;
    }

    setSaving('callsign');
    try {
      // Use URLSearchParams to match the format used by communities page (application/x-www-form-urlencoded)
      const params = new URLSearchParams();
      params.append('action', 'updateCallSign');
      params.append('userID', user.id);
      params.append('accountEmail', user.email || '');
      params.append('accountUsername', user.username || '');
      params.append('accountCallSign', callSignValue.trim());
      params.append('page', '/profile');
      params.append('discordToken', '');

      const response = await fetch('/manageAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeaders()
        },
        body: params.toString(),
        credentials: 'include'
      });

      if (response.ok) {
        setUser({ ...user, callSign: callSignValue.trim() });
        setEditingCallSign(false);
        showMessage('success', 'Call sign updated successfully');
      } else {
        showMessage('error', 'Failed to update call sign');
      }
    } catch (error) {
      console.error('Error updating call sign:', error);
      showMessage('error', 'An error occurred while updating call sign');
    } finally {
      setSaving(null);
    }
  };

  const connectDiscord = async () => {
    if (!user) return;

    setSaving('discord');
    try {
      // Call the API endpoint to establish session and get Discord OAuth URL
      const response = await fetch('/api/auth/prepare-discord-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ state: '/profile' }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Discord OAuth
        window.location.href = data.redirectUrl;
      } else {
        showMessage('error', 'Failed to initiate Discord connection');
        setSaving(null);
      }
    } catch (error) {
      console.error('Error connecting Discord:', error);
      showMessage('error', 'An error occurred while connecting Discord');
      setSaving(null);
    }
  };

  const disconnectDiscord = async () => {
    if (!user) return;

    setSaving('discord');
    try {
      // Use URLSearchParams to match the format used by communities page (application/x-www-form-urlencoded)
      const params = new URLSearchParams();
      params.append('action', 'disconnectDiscord');
      params.append('userID', user.id);
      params.append('page', '/profile');

      const response = await fetch('/manageAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeaders()
        },
        body: params.toString(),
        credentials: 'include'
      });

      if (response.ok) {
        setUser({ ...user, discordConnected: false });
        setShowDisconnectDiscordModal(false);
        showMessage('success', 'Discord disconnected successfully');
      } else {
        showMessage('error', 'Failed to disconnect Discord');
      }
    } catch (error) {
      console.error('Error disconnecting Discord:', error);
      showMessage('error', 'An error occurred while disconnecting Discord');
    } finally {
      setSaving(null);
    }
  };

  const changeEmail = async () => {
    // Clear any previous errors
    setEmailModalError(null);
    
    if (!user || !newEmail.trim() || !currentPassword.trim()) {
      setEmailModalError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailModalError('Please enter a valid email address');
      return;
    }

    if (newEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
      setEmailModalError('New email must be different from your current email');
      return;
    }

    setSaving('email');
    try {
      // Step 1: Verify password first
      const passwordResponse = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: currentPassword }),
        credentials: 'include'
      });

      if (!passwordResponse.ok) {
        setEmailModalError('Unable to verify password. Please try again.');
        setSaving(null);
        return;
      }

      const passwordData = await passwordResponse.json();
      if (!passwordData.valid) {
        setEmailModalError('Current password is incorrect. Please try again.');
        setSaving(null);
        return;
      }

      // Step 2: Check if email is already in use
      const emailCheckResponse = await fetch('/api/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim() }),
        credentials: 'include'
      });

      if (!emailCheckResponse.ok) {
        setEmailModalError('Unable to check email availability. Please try again.');
        setSaving(null);
        return;
      }

      const emailCheckData = await emailCheckResponse.json();
      if (!emailCheckData.available || emailCheckData.inUse) {
        setEmailModalError('This email address is already in use by another account. Please use a different email address.');
        setSaving(null);
        return;
      }

      // Step 3: If password is correct and email is available, proceed with the update
      const params = new URLSearchParams();
      params.append('action', 'changeEmail');
      params.append('userID', user.id);
      params.append('accountEmail', user.email || ''); // Current email (like the curl shows)
      params.append('newEmail', newEmail.trim());
      params.append('currentPassword', currentPassword);
      params.append('page', '/profile');

      const response = await fetch('/manageAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        credentials: 'include',
        redirect: 'follow' // Follow redirects
      });

      // The backend redirects on both success and error, so we need to check if the email actually changed
      // by refreshing user data after a short delay to allow the backend to process
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for backend processing

      // Refresh user data to check if email was actually updated
      // Use session-based auth (no headers) since the old email in localStorage would cause issues
      const userResponse = await fetch('/api/user/current', {
        credentials: 'include',
        // Don't send auth headers - use session-based auth instead
        // This avoids the issue where localStorage still has the old email
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.user) {
          const emailWasUpdated = userData.user.email?.toLowerCase() === newEmail.trim().toLowerCase();
          
          if (emailWasUpdated) {
            // Success - email was updated
            // Update localStorage with the new email so future requests work correctly
            const token = localStorage.getItem('auth_token');
            if (token) {
              storeAuth(token, userData.user.email);
            }
            
            setUser(userData.user);
            setShowChangeEmailModal(false);
            setNewEmail('');
            setCurrentPassword('');
            setPasswordVisible(false);
            setEmailModalError(null);
            showMessage('success', 'Email address updated successfully');
          } else {
            // Email wasn't updated - this shouldn't happen since we validated above
            // But just in case, show a generic error
            setEmailModalError('Failed to update email address. Please try again.');
          }
        } else {
          setEmailModalError('Failed to verify email update. Please try again.');
        }
      } else {
        setEmailModalError('There was an error changing your email. Please try again.');
      }
    } catch (error) {
      console.error('Error changing email:', error);
      setEmailModalError('An error occurred while changing your email. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const deactivateAccount = async () => {
    if (!user) return;

    setSaving('deactivate');
    setShowDeactivateModal(false);
    setShowDeactivateLoading(true);
    setDeactivateStep('processing');
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      
      // Make API call and wait for it, but ensure minimum 2 seconds for processing animation
      const [response] = await Promise.all([
        fetch(`${API_URL}/api/v1/user/${user.id}/deactivate`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }),
        new Promise(resolve => setTimeout(resolve, 2000)) // Minimum 2 second processing animation
      ]);

      if (response.ok) {
        // Clear localStorage auth tokens
        clearAuth();
        
        // Switch to logging out step
        setDeactivateStep('logging-out');
        
        // Wait a bit before redirecting to logout
        setTimeout(() => {
          window.location.href = '/logout';
        }, 1500);
      } else {
        const data = await response.json().catch(() => ({}));
        setShowDeactivateLoading(false);
        showMessage('error', data.message || 'There was an error deactivating your account. Please try again later.');
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      setShowDeactivateLoading(false);
      showMessage('error', 'An error occurred while deactivating your account');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
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
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 'calc(100vh - 200px)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Loading...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
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
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 'calc(100vh - 200px)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Please log in to view your profile.
          </div>
        </div>
      </main>
    );
  }

  // Calculate player since date (using ObjectId timestamp or createdAt)
  // The user.id should already be a string from the API, but handle edge cases
  const userIdString = typeof user.id === 'string' ? user.id : (user.id?.toString ? user.id.toString() : String(user.id || ''));
  const objectIdDate = getDateFromObjectId(userIdString);
  const playerSince = objectIdDate || (user.createdAt ? new Date(user.createdAt) : new Date());

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
      
      {/* Message Banner */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '1rem 2rem',
          borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: '600',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {message.text}
        </div>
      )}
      
      {/* Account Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
        padding: '3rem clamp(1rem, 4vw, 2rem)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Back Button - Positioned on top of Account Banner */}
        <button
          onClick={() => {
            // Check if there's a valid previous page in history
            if (typeof window !== 'undefined') {
              const referrer = document.referrer;
              if (referrer && !referrer.includes('/profile')) {
                router.back();
              } else {
                router.push('/communities');
              }
            }
          }}
          style={{
            position: 'absolute',
            top: '1rem',
            left: 'clamp(1rem, 4vw, 2rem)',
            zIndex: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255, 255, 255, 0.9)',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            padding: '0.5rem 1rem',
            transition: 'all 0.2s',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
        >
          <i className="fa fa-arrow-left" style={{ fontSize: '0.875rem' }}></i>
          <span>Back</span>
        </button>
        
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          zIndex: 0
        }} />
        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #fbbf24 0%, #ffffff 50%, #fbbf24 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'relative',
          zIndex: 1,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Account
        </h1>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: 'min(100%, 80rem)',
        margin: '0 auto',
        padding: '2rem clamp(1rem, 4vw, 2rem)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Account Overview Card */}
        <div style={{
          backgroundColor: 'rgba(15, 15, 20, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '1.5rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Account Overview
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Username */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <UserIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '100%' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Username
                  </div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {user.username || 'N/A'}
                  {user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus') && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      flexShrink: 0
                    }} title="Verified">
                      <i className="fa fa-check-circle" style={{ fontSize: '16px' }}></i>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Player Since */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CalendarIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '0.25rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Player Since
                </div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  {formatDate(playerSince)}
                </div>
              </div>
            </div>

            {/* Subscription Tier */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CurrencyDollarIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '0.25rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Subscription Tier
                </div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPlanBadgeStyle(user?.subscription?.active ? user.subscription.plan : 'free')}`}>
                    {formatPlanName(user?.subscription?.active ? user.subscription.plan : 'free')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Card */}
        <div style={{
          backgroundColor: 'rgba(15, 15, 20, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '1.5rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Account Settings
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0
          }}>
            {/* Username Update */}
            <div style={{
              paddingBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Username
                  </div>
                  {editingUsername ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={usernameValue}
                        onChange={(e) => setUsernameValue(e.target.value)}
                        maxLength={20}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                        autoFocus
                      />
                      <button
                        onClick={updateUsername}
                        disabled={saving === 'username'}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.6)',
                          border: '1px solid rgba(59, 130, 246, 0.8)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: saving === 'username' ? 'not-allowed' : 'pointer',
                          opacity: saving === 'username' ? 0.6 : 1,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        {saving === 'username' ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUsername(false);
                          setUsernameValue(user.username || '');
                        }}
                        disabled={saving === 'username'}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: saving === 'username' ? 'not-allowed' : 'pointer',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      wordBreak: 'break-word',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {user.username || 'N/A'}
                      {user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus') && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          flexShrink: 0
                        }} title="Verified">
                          <i className="fa fa-check-circle" style={{ fontSize: '16px' }}></i>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!editingUsername && (
                  <button
                    onClick={() => setEditingUsername(true)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      flexShrink: 0,
                      flexBasis: '160px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    Update Username
                  </button>
                )}
              </div>
            </div>

            {/* Call Sign Update */}
            <div style={{
              paddingBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IdentificationIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '100%' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Call Sign
                  </div>
                  {editingCallSign ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={callSignValue}
                        onChange={(e) => setCallSignValue(e.target.value)}
                        maxLength={10}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                        autoFocus
                      />
                      <button
                        onClick={updateCallSign}
                        disabled={saving === 'callsign'}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.6)',
                          border: '1px solid rgba(59, 130, 246, 0.8)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: saving === 'callsign' ? 'not-allowed' : 'pointer',
                          opacity: saving === 'callsign' ? 0.6 : 1,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        {saving === 'callsign' ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCallSign(false);
                          setCallSignValue(user.callSign || '');
                        }}
                        disabled={saving === 'callsign'}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: saving === 'callsign' ? 'not-allowed' : 'pointer',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      wordBreak: 'break-word'
                    }}>
                      {user.callSign || 'Not set'}
                    </div>
                  )}
                </div>
                {!editingCallSign && (
                  <button
                    onClick={() => setEditingCallSign(true)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      flexShrink: 0,
                      flexBasis: '160px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    Update Call Sign
                  </button>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div style={{
              paddingBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <EnvelopeIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '100%' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Email Address
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      wordBreak: 'break-word'
                    }}>
                      {emailVisible ? (user.email || 'N/A') : maskEmail(user.email || '')}
                    </div>
                    <button
                      onClick={() => setEmailVisible(!emailVisible)}
                      style={{
                        padding: '0.25rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: emailVisible ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                        flexShrink: 0
                      }}
                      title={emailVisible ? 'Hide email' : 'Show email'}
                    >
                      {emailVisible ? (
                        <EyeSlashIcon style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <EyeIcon style={{ width: '20px', height: '20px' }} />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChangeEmailModal(true);
                    setNewEmail('');
                    setCurrentPassword('');
                    setPasswordVisible(false);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    flexShrink: 0,
                    flexBasis: '160px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  Change Email
                </button>
              </div>
            </div>

            {/* Password */}
            <div style={{
              paddingBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <LockClosedIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '100%' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Password
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Change your account password
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/forgot-password'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    flexShrink: 0,
                    flexBasis: '160px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Discord Connection */}
            <div style={{
              paddingBottom: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fbbf24' }}>
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '100%' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Discord
                  </div>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: user.discordConnected ? '#22c55e' : 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {user.discordConnected ? 'Connected' : 'Not Connected'}
                  </div>
                </div>
                {user.discordConnected ? (
                  <button
                    onClick={() => setShowDisconnectDiscordModal(true)}
                    disabled={saving === 'discord'}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '0.5rem',
                      color: '#ef4444',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: saving === 'discord' ? 'not-allowed' : 'pointer',
                      opacity: saving === 'discord' ? 0.6 : 1,
                      transition: 'all 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      flexShrink: 0,
                      flexBasis: '160px'
                    }}
                    onMouseEnter={(e) => {
                      if (saving !== 'discord') {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (saving !== 'discord') {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                      }
                    }}
                  >
                    {saving === 'discord' ? 'Disconnecting...' : 'Disconnect Discord'}
                  </button>
                ) : (
                  <button
                    onClick={connectDiscord}
                    disabled={saving === 'discord'}
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: saving === 'discord'
                        ? 'rgba(88, 101, 242, 0.4)'
                        : 'rgba(88, 101, 242, 0.6)',
                      border: '1px solid rgba(88, 101, 242, 0.8)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      flexShrink: 0,
                      flexBasis: '160px',
                      cursor: saving === 'discord' ? 'not-allowed' : 'pointer',
                      opacity: saving === 'discord' ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (saving !== 'discord') {
                        e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.8)';
                        e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (saving !== 'discord') {
                        e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.6)';
                        e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.8)';
                      }
                    }}
                  >
                    {saving === 'discord' ? 'Connecting...' : 'Connect Discord'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div style={{
          backgroundColor: 'rgba(15, 15, 20, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '1.5rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Subscription
          </h2>
          
          {user?.subscription?.active && user.subscription.plan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Plan Name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CurrencyDollarIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Current Plan
                  </div>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPlanBadgeStyle(user.subscription.plan)}`}>
                      {formatPlanName(user.subscription.plan)}
                    </span>
                    {user.subscription.isAnnual && (
                      <span style={{ marginLeft: '0.5rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                        (Annual)
                      </span>
                    )}
                    {!user.subscription.isAnnual && user.subscription.plan !== 'free' && (
                      <span style={{ marginLeft: '0.5rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                        (Monthly)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              {user.subscription.updatedAt && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.5rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Subscription Details
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Billing Cycle:</strong> {user.subscription.isAnnual ? 'Annual' : 'Monthly'}
                    </div>
                    {user.subscription.updatedAt && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Last Updated:</strong> {formatDate(typeof user.subscription.updatedAt === 'object' && '$date' in user.subscription.updatedAt ? user.subscription.updatedAt.$date : user.subscription.updatedAt)}
                      </div>
                    )}
                    {(() => {
                      const expirationDate = calculateExpirationDate(user.subscription.updatedAt, user.subscription.isAnnual);
                      return expirationDate && (
                        <div>
                          <strong>Expires:</strong> {formatDate(expirationDate)}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Subscription Features */}
              {user.subscription.plan && userTiers[user.subscription.plan as keyof typeof userTiers] && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '1rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Plan Features
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {userTiers[user.subscription.plan as keyof typeof userTiers].features.map((feature, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '0.5rem'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(251, 191, 36, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '0.125rem'
                        }}>
                          <i className={`fa ${getFeatureIcon(feature.icon)}`} style={{ fontSize: '12px', color: '#fbbf24' }}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginBottom: '0.25rem',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}>
                            {feature.text}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            lineHeight: '1.5'
                          }}>
                            {feature.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPlanBadgeStyle('free')}`}>
                  Free
                </span>
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: '1.6'
              }}>
                You are currently on the Free plan.
              </div>
            </div>
          )}

          {/* Management Notice */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.5rem'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: '#ffffff' }}>Note:</strong> Subscriptions are managed through the mobile app. To subscribe, upgrade, or manage your subscription, please use the{' '}
              <a
                href="https://apps.apple.com/us/app/lpc-app/id6503307483"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                iOS app
              </a>
              {' '}or{' '}
              <a
                href="https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                Android app
              </a>
              .
            </div>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ef4444',
            marginBottom: '1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <TrashIcon style={{ width: '24px', height: '24px' }} />
            Danger Zone
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: '1.6'
          }}>
            This will deactivate your account. You can restore your LPC account if it was accidentally or wrongfully deactivated for up to 30 days after deactivation by contacting us via Discord assistance ticket. Otherwise, after 30 days it will be deleted per our <a href="/terms-and-conditions" style={{ color: '#667eea', textDecoration: 'underline' }}>Terms of Service</a>.
          </p>
          <button
            onClick={() => setShowDeactivateModal(true)}
            disabled={saving === 'deactivate'}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '0.5rem',
              color: '#ef4444',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: saving === 'deactivate' ? 'not-allowed' : 'pointer',
              opacity: saving === 'deactivate' ? 0.6 : 1,
              transition: 'all 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
            onMouseEnter={(e) => {
              if (saving !== 'deactivate') {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (saving !== 'deactivate') {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }
            }}
          >
            Deactivate Account
          </button>
        </div>

        {/* Change Email Modal */}
        {showChangeEmailModal && (
          <div
            onClick={(e) => {
              // Only close if clicking directly on the overlay, not on child elements
              if (e.target === e.currentTarget) {
                setShowChangeEmailModal(false);
                setNewEmail('');
                setCurrentPassword('');
                setPasswordVisible(false);
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing when clicking inside the modal
              if (e.target !== e.currentTarget) {
                e.stopPropagation();
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onMouseDown={(e) => {
                // Only stop propagation for mouse events, not for input interactions
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                  e.stopPropagation();
                }
              }}
              onClick={(e) => {
                // Only stop propagation for click events on the modal container itself
                const target = e.target as HTMLElement;
                if (e.target === e.currentTarget || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON')) {
                  e.stopPropagation();
                }
              }}
              onKeyDown={(e) => {
                // Allow all keyboard events to work normally (including Ctrl+C, Ctrl+V)
                // Don't stop propagation for keyboard events
              }}
              style={{
                backgroundColor: 'rgba(15, 15, 20, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => {
                  setShowChangeEmailModal(false);
                  setNewEmail('');
                  setCurrentPassword('');
                  setPasswordVisible(false);
                }}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: '1',
                  padding: '0.25rem',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Change Email Address
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Enter your new email address and current password to make this change.
              </p>
              
              {/* Error Message */}
              {emailModalError && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.5rem',
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  {emailModalError}
                </div>
              )}
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Current Email
                </label>
                <input
                  type="email"
                  value={user.email || ''}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.875rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '3rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: passwordVisible ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    title={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    {passwordVisible ? (
                      <EyeSlashIcon style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <EyeIcon style={{ width: '20px', height: '20px' }} />
                    )}
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    setShowChangeEmailModal(false);
                    setNewEmail('');
                    setCurrentPassword('');
                    setPasswordVisible(false);
                    setEmailModalError(null);
                  }}
                  disabled={saving === 'email'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'email' ? 'not-allowed' : 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={changeEmail}
                  disabled={saving === 'email' || !newEmail.trim() || !currentPassword.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: saving === 'email' || !newEmail.trim() || !currentPassword.trim() 
                      ? 'rgba(34, 197, 94, 0.4)' 
                      : 'rgba(34, 197, 94, 0.6)',
                    border: `1px solid ${saving === 'email' || !newEmail.trim() || !currentPassword.trim() 
                      ? 'rgba(34, 197, 94, 0.4)' 
                      : 'rgba(34, 197, 94, 0.8)'}`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'email' || !newEmail.trim() || !currentPassword.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving === 'email' || !newEmail.trim() || !currentPassword.trim() ? 0.6 : 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {saving === 'email' && (
                    <ArrowPathIcon 
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        animation: 'spin 1s linear infinite'
                      }} 
                    />
                  )}
                  {saving === 'email' ? 'Changing...' : 'Change Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disconnect Discord Modal */}
        {showDisconnectDiscordModal && (
          <div
            onClick={(e) => {
              // Only close if clicking directly on the overlay, not on child elements
              if (e.target === e.currentTarget) {
                setShowDisconnectDiscordModal(false);
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing when clicking inside the modal
              if (e.target !== e.currentTarget) {
                e.stopPropagation();
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onMouseDown={(e) => {
                // Only stop propagation for mouse events, not for input interactions
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                  e.stopPropagation();
                }
              }}
              onClick={(e) => {
                // Only stop propagation for click events on the modal container itself
                const target = e.target as HTMLElement;
                if (e.target === e.currentTarget || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON')) {
                  e.stopPropagation();
                }
              }}
              style={{
                backgroundColor: 'rgba(15, 15, 20, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              <button
                onClick={() => {
                  setShowDisconnectDiscordModal(false);
                }}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: '1',
                  padding: '0.25rem',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Disconnect Discord
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Are you sure you want to disconnect your Discord account? You can reconnect it at any time.
              </p>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    setShowDisconnectDiscordModal(false);
                  }}
                  disabled={saving === 'discord'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'discord' ? 'not-allowed' : 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={disconnectDiscord}
                  disabled={saving === 'discord'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: saving === 'discord' 
                      ? 'rgba(239, 68, 68, 0.4)' 
                      : 'rgba(239, 68, 68, 0.6)',
                    border: `1px solid ${saving === 'discord' 
                      ? 'rgba(239, 68, 68, 0.4)' 
                      : 'rgba(239, 68, 68, 0.8)'}`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'discord' ? 'not-allowed' : 'pointer',
                    opacity: saving === 'discord' ? 0.6 : 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {saving === 'discord' && (
                    <ArrowPathIcon 
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        animation: 'spin 1s linear infinite'
                      }} 
                    />
                  )}
                  {saving === 'discord' ? 'Disconnecting...' : 'Disconnect Discord'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Account Modal */}
        {showDeactivateModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeactivateModal(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'rgba(15, 15, 20, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
              }}
            >
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Deactivate your account
              </h3>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                @{user.username}
                {user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus') && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    flexShrink: 0
                  }} title="Verified">
                    <i className="fa fa-check-circle" style={{ fontSize: '14px' }}></i>
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                This will deactivate your account
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                You&apos;re about to start the process of deactivating your account. Your display name, username, and public profile will no longer be viewable on linespolice-cad.com, LPC-APP for iOS, or LPC-APP for Android.
              </p>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '0.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                What else you should know
              </div>
              <ul style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1.5rem',
                paddingLeft: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.8',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  You can restore your LPC account if it was accidentally or wrongfully deactivated for up to 30 days after deactivation.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  If you have any active paid subscriptions (e.g., Premium) purchased through the LPC app, they will remain active. You can manage these subscriptions through the platform where you originally subscribed. Subscriptions purchased on linespolice-cad.com will automatically cancel after you deactivate your account. <a href="/terms-and-conditions" style={{ color: '#667eea', textDecoration: 'underline' }}>Learn more about subscriptions</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Upon deactivating your account, your data will be processed per our <a href="/privacy-policy" style={{ color: '#667eea', textDecoration: 'underline' }}>Privacy Policy</a>.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  If you just want to change your username, you don&apos;t need to deactivate your account — edit it in your settings on your <a href="/profile" style={{ color: '#667eea', textDecoration: 'underline' }}>Profile Page</a>.
                </li>
                <li>
                  To use your current email address with a different LPC account, <a href="/profile" style={{ color: '#667eea', textDecoration: 'underline' }}>change that</a> before you deactivate this account.
                </li>
              </ul>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={saving === 'deactivate'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'deactivate' ? 'not-allowed' : 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deactivateAccount}
                  disabled={saving === 'deactivate'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    border: '1px solid rgba(239, 68, 68, 0.8)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: saving === 'deactivate' ? 'not-allowed' : 'pointer',
                    opacity: saving === 'deactivate' ? 0.6 : 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {saving === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivation Loading Modal */}
        {showDeactivateLoading && (
          <>
            {/* Blur background overlay */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 9999,
              }}
            />
            {/* Loading modal */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(15, 15, 20, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '1rem',
                  padding: '3rem',
                  maxWidth: '500px',
                  width: '100%',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  textAlign: 'center'
                }}
              >
                {/* Spinner Animation */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 2rem',
                  position: 'relative'
                }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '6px solid rgba(255, 255, 255, 0.1)',
                      borderTop: '6px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }}
                  />
                </div>

                {/* Step text */}
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '1rem',
                  fontFamily: '-apple-system, BlinkSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  {deactivateStep === 'processing' ? 'Processing...' : 'Logging out...'}
                </h3>

                {/* Description */}
                {deactivateStep === 'processing' && (
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    fontFamily: '-apple-system, BlinkSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Your account is being deactivated. Please wait...
                  </p>
                )}

                {deactivateStep === 'logging-out' && (
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    fontFamily: '-apple-system, BlinkSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Redirecting to home...
                  </p>
                )}

                {/* Reactivation notice */}
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#ffffff' }}>Note:</strong> If you want to reactivate your account, you have <strong style={{ color: '#ffffff' }}>30 days</strong> and you can{' '}
                    <a
                      href="/contact-us"
                      style={{
                        color: '#667eea',
                        textDecoration: 'underline',
                        fontWeight: '600'
                      }}
                    >
                      contact us via Discord
                    </a>
                    {' '}to restore your account.
                  </p>
                </div>
              </div>
            </div>

            {/* CSS for spinner animation */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}} />
          </>
        )}
      </div>
      <Footer />
      </div>
    </main>
  );
}
