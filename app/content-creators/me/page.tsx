'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VerificationPanel from './VerificationPanel';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ArrowRightIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  GiftIcon,
  CalendarIcon,
  UserGroupIcon,
  LinkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// Confetti component for celebration
function Confetti({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; color: string; size: number }>>([]);

  useEffect(() => {
    if (show) {
      const colors = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#fff'];
      const newPieces = Array.from({ length: 150 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4
      }));
      setPieces(newPieces);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confetti-fall 4s ease-out ${piece.delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
}

type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
type CreatorStatus = 'active' | 'warned' | 'pending_removal' | 'removed' | 'approved';

interface ContentCreatorPlatform {
  type: string;
  url: string;
  handle: string;
  followerCount: number;
  verifiedByAdmin?: boolean;
  // Channel ownership verification, written by the API.
  verificationStatus?: string;
  verificationCode?: string;
  verificationMethod?: string;
  reportedFollowerCount?: number;
}

interface Application {
  _id: string;
  displayName: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  feedback?: string;
  platforms: ContentCreatorPlatform[];
  primaryPlatform: string;
  description: string;
  // Automated screening: what the scheduled checks found, and whether the
  // application is now waiting on a human rather than on the applicant.
  checks?: {
    key: string;
    platform?: string;
    handle?: string;
    status: 'pending' | 'passed' | 'failed' | 'manual';
    reason?: string;
    checkedAt?: string;
  }[];
  checksPassed?: boolean;
}

interface CreatorProfile {
  _id: string;
  displayName: string;
  slug: string;
  status: CreatorStatus;
  featured: boolean;
  joinedAt: string;
  warnedAt?: string;
  warningMessage?: string;
  profileImage?: string;
  bio: string;
  themeColor: string;
  primaryPlatform: string;
  platforms: ContentCreatorPlatform[];
  entitlements: {
    personalPlan: boolean;
    personalPlanFallback?: boolean;
    currentUserPlan?: string;
    communityPlan: {
      active: boolean;
      communityName?: string;
      communityId?: string;
    };
  };
  // Grace period fields
  gracePeriodStartedAt?: string;
  gracePeriodEndsAt?: string;
  lastSyncedAt?: string;
}

const statusConfig: Record<ApplicationStatus, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  submitted: {
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: <ClockIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Submitted'
  },
  under_review: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: <DocumentCheckIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Under Review'
  },
  approved: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: <CheckCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Approved'
  },
  rejected: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: <XCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Rejected'
  },
  withdrawn: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: <XCircleIcon style={{ width: '20px', height: '20px' }} />,
    label: 'Withdrawn'
  }
};

const creatorStatusConfig: Record<CreatorStatus, { color: string; bgColor: string; label: string }> = {
  active: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    label: 'Active'
  },
  approved: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    label: 'Active'
  },
  warned: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: 'Warning'
  },
  pending_removal: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Pending Removal'
  },
  removed: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    label: 'Removed'
  }
};

const platformColors: Record<string, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  tiktok: '#00F2EA',
  other: '#6366f1'
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function CreatorStatusPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [ownedCommunities, setOwnedCommunities] = useState<Array<{
    _id: string;
    name: string;
    hasPromotion: boolean;
    currentPlan?: string;
    isPromotionApplied: boolean;
  }>>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [applyingPromotion, setApplyingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<{ _id: string; name: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editProfileImageUploading, setEditProfileImageUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Sync followers modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPlatforms, setSyncPlatforms] = useState<Array<{ type: string; followerCount: string }>>([]);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      setIsLoaded(true);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Check if this is first visit after approval and show confetti
  useEffect(() => {
    if (creatorProfile && (creatorProfile.status === 'active' || creatorProfile.status === 'approved')) {
      const confettiKey = `cc_confetti_shown_${creatorProfile._id}`;
      const hasSeenConfetti = localStorage.getItem(confettiKey);

      if (!hasSeenConfetti) {
        setShowConfetti(true);
        localStorage.setItem(confettiKey, 'true');

        // Hide confetti after animation completes
        setTimeout(() => {
          setShowConfetti(false);
        }, 7000);
      }
    }
  }, [creatorProfile]);

  useEffect(() => {
    // Check if user is logged in and fetch creator data
    const fetchUserAndCreatorData = async () => {
      try {
        // First check if user is logged in
        const userResponse = await fetch('/api/user/current', {
          credentials: 'include'
        });

        if (!userResponse.ok) {
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        setUser(userData.user);

        // Fetch creator/application data from the me endpoint
        const creatorResponse = await fetch('/api/v1/content-creator-applications/me', {
          credentials: 'include'
        });

        if (creatorResponse.ok) {
          const data = await creatorResponse.json();
          if (data.success) {
            if (data.creator) {
              setCreatorProfile(data.creator);
            }
            if (data.application) {
              setApplication(data.application);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndCreatorData();
  }, []);

  // Re-pull the application after a verification succeeds, so the panel shows
  // the new status without a page reload.
  const refreshApplication = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/content-creator-applications/me', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.application) {
        setApplication(data.application);
      }
    } catch {
      // Leave what is on screen; the next load corrects it.
    }
  }, []);

  const handleRemovalRequest = async () => {
    if (!creatorProfile) return;

    setRemovalSubmitting(true);
    setRemovalError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/removal-request', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowRemovalModal(false);
        // Update the creator profile to show removed status
        setCreatorProfile({
          ...creatorProfile,
          status: 'removed'
        });
      } else {
        setRemovalError(data.message || 'Failed to request removal. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting removal:', error);
      setRemovalError('Failed to request removal. Please try again.');
    } finally {
      setRemovalSubmitting(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!application) return;

    setWithdrawSubmitting(true);
    setWithdrawError(null);

    try {
      const response = await fetch('/api/v1/content-creator-applications/me', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowWithdrawModal(false);
        // Clear the application state to show "no application" view
        setApplication(null);
      } else {
        setWithdrawError(data.message || 'Failed to withdraw application. Please try again.');
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      setWithdrawError('Failed to withdraw application. Please try again.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const fetchOwnedCommunities = async () => {
    setLoadingCommunities(true);
    setPromotionError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/owned-communities', {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOwnedCommunities(data.communities || []);
      } else {
        setPromotionError(data.message || 'Failed to load communities');
      }
    } catch (error) {
      console.error('Error fetching owned communities:', error);
      setPromotionError('Failed to load communities');
    } finally {
      setLoadingCommunities(false);
    }
  };

  const handleClaimCommunityBenefit = () => {
    setShowCommunityModal(true);
    fetchOwnedCommunities();
  };

  const handleSelectCommunity = (community: { _id: string; name: string }) => {
    setSelectedCommunity(community);
    setShowConfirmModal(true);
  };

  const handleConfirmPromotion = async () => {
    if (!selectedCommunity) return;

    setApplyingPromotion(true);
    setPromotionError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/community-promotion', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ communityId: selectedCommunity._id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowConfirmModal(false);
        setShowCommunityModal(false);
        setSelectedCommunity(null);
        // Update the creator profile with the new community plan info
        if (creatorProfile) {
          setCreatorProfile({
            ...creatorProfile,
            entitlements: {
              ...creatorProfile.entitlements,
              communityPlan: {
                active: true,
                communityName: data.communityName,
                communityId: selectedCommunity._id
              }
            }
          });
        }
      } else {
        setPromotionError(data.message || 'Failed to apply promotion');
      }
    } catch (error) {
      console.error('Error applying promotion:', error);
      setPromotionError('Failed to apply promotion');
    } finally {
      setApplyingPromotion(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setSelectedCommunity(null);
  };

  const handleOpenEditModal = () => {
    if (creatorProfile) {
      setEditBio(creatorProfile.bio);
      setEditThemeColor(creatorProfile.themeColor || '#fbbf24');
      setEditProfileImage(creatorProfile.profileImage || '');
      setEditError(null);
      setShowEditModal(true);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setEditError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Image must be less than 5MB');
      return;
    }

    setEditProfileImageUploading(true);
    setEditError(null);

    try {
      // Get Cloudinary config from server
      const configResponse = await fetch('/api/v1/cloudinary-config');
      const { cloudName, apiKey, uploadPreset } = await configResponse.json();

      // Get signature from server
      const signatureResponse = await fetch('/api/v1/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { timestamp, signature } = await signatureResponse.json();

      // Upload to Cloudinary with signed parameters (matching cloudinary-upload.js)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('upload_preset', uploadPreset);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const result = await cloudinaryResponse.json();

      if (result.error) {
        throw new Error(result.error.message || 'Upload failed');
      }

      setEditProfileImage(result.secure_url);
    } catch (error) {
      console.error('Upload error:', error);
      setEditError('Failed to upload image. Please try again.');
    } finally {
      setEditProfileImageUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!creatorProfile) return;

    // Validate bio
    if (editBio.length < 20) {
      setEditError('Bio must be at least 20 characters');
      return;
    }
    if (editBio.length > 500) {
      setEditError('Bio must be at most 500 characters');
      return;
    }

    // Validate theme color
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(editThemeColor)) {
      setEditError('Please enter a valid hex color (e.g. #fbbf24)');
      return;
    }

    // Check luminance to prevent too dark or too light colors
    const r = parseInt(editThemeColor.slice(1, 3), 16);
    const g = parseInt(editThemeColor.slice(3, 5), 16);
    const b = parseInt(editThemeColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.15) {
      setEditError('Color is too dark - please choose a brighter color');
      return;
    }
    if (luminance > 0.85) {
      setEditError('Color is too light - please choose a darker color');
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const response = await fetch('/api/v1/content-creators/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio: editBio,
          themeColor: editThemeColor.toLowerCase(),
          profileImage: editProfileImage || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCreatorProfile({
          ...creatorProfile,
          bio: editBio,
          themeColor: editThemeColor.toLowerCase(),
          profileImage: editProfileImage || creatorProfile.profileImage
        });
        setShowEditModal(false);
      } else {
        setEditError(data.message || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenSyncModal = () => {
    if (creatorProfile) {
      // Initialize with current follower counts
      setSyncPlatforms(
        creatorProfile.platforms.map(p => ({
          type: p.type,
          followerCount: p.followerCount.toString()
        }))
      );
      setSyncError(null);
      setSyncSuccess(null);
      setShowSyncModal(true);
    }
  };

  const handleSyncFollowers = async () => {
    if (!creatorProfile) return;

    // Validate all platforms have valid numbers
    const platforms = syncPlatforms.map(p => ({
      type: p.type,
      followerCount: parseInt(p.followerCount) || 0
    }));

    if (platforms.some(p => p.followerCount < 0)) {
      setSyncError('Follower counts cannot be negative');
      return;
    }

    setSyncSaving(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const response = await fetch('/api/v1/content-creators/me/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platforms })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the profile with new data
        setCreatorProfile({
          ...creatorProfile,
          platforms: data.platforms,
          lastSyncedAt: data.lastSyncedAt,
          // If status changed, it will be reflected in the next fetch
          status: data.statusChanged ? (data.maxFollowers >= 500 ? 'active' : 'warned') : creatorProfile.status
        });
        setSyncSuccess(data.message);
        // Close modal after a delay to show success message
        setTimeout(() => {
          setShowSyncModal(false);
          // Refresh the page to get updated data
          window.location.reload();
        }, 2000);
      } else {
        setSyncError(data.message || 'Failed to sync followers');
      }
    } catch (error) {
      console.error('Error syncing followers:', error);
      setSyncError('Failed to sync followers. Please try again.');
    } finally {
      setSyncSaving(false);
    }
  };

  const canSync = (): boolean => {
    if (!creatorProfile?.lastSyncedAt) return true;
    const lastSync = new Date(creatorProfile.lastSyncedAt);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= 24;
  };

  const getNextSyncTime = (): string => {
    if (!creatorProfile?.lastSyncedAt) return '';
    const lastSync = new Date(creatorProfile.lastSyncedAt);
    const nextSync = new Date(lastSync.getTime() + 24 * 60 * 60 * 1000);
    return nextSync.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getGracePeriodDaysRemaining = (): number => {
    if (!creatorProfile?.gracePeriodEndsAt) return 0;
    const endDate = new Date(creatorProfile.gracePeriodEndsAt);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Loading state or not logged in - show page shell with appropriate content
  if (loading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <Navbar />

        <section style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px clamp(1rem, 4vw, 2rem) 60px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(251, 191, 36, 0.2)',
                borderTopColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                Loading...
              </p>
            </div>
          ) : (
            <div style={{
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <ExclamationTriangleIcon style={{
                width: '48px',
                height: '48px',
                color: '#fbbf24',
                margin: '0 auto 16px'
              }} />
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Sign In Required
              </h1>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '24px'
              }}>
                Please sign in to view your creator status.
              </p>
              <Link
                href="/login-civ"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  textDecoration: 'none'
                }}
              >
                Sign In
                <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
              </Link>
            </div>
          )}
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) rotate(180deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) rotate(360deg) scale(0.9);
            opacity: 0.9;
          }
          75% {
            transform: translateY(75vh) rotate(540deg) scale(0.7);
            opacity: 0.6;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>

      {/* Confetti celebration for new creators */}
      <Confetti show={showConfetti} />

      <Navbar />

      {/* Header */}
      <section style={{
        padding: '120px clamp(1rem, 4vw, 2rem) 60px',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}>
          {/* Glowing orbs */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'pulse-glow 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            right: '-15%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'pulse-glow 10s ease-in-out infinite',
            animationDelay: '2s'
          }} />

          {/* Floating icons */}
          <UserGroupIcon
            style={{
              position: 'absolute',
              top: '20%',
              left: '8%',
              width: '50px',
              height: '50px',
              color: 'rgba(251, 191, 36, 0.12)',
              animation: 'float 8s ease-in-out infinite'
            }}
          />
          <StarIcon
            style={{
              position: 'absolute',
              top: '35%',
              right: '10%',
              width: '40px',
              height: '40px',
              color: 'rgba(139, 92, 246, 0.1)',
              animation: 'float 6s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />
          <CheckCircleIcon
            style={{
              position: 'absolute',
              bottom: '25%',
              left: '12%',
              width: '35px',
              height: '35px',
              color: 'rgba(34, 197, 94, 0.1)',
              animation: 'float 7s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />
        </div>

        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          <Link
            href="/content-creators"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '24px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            Back to Program
          </Link>

          <h1 style={{
            fontSize: isMobile ? '1.75rem' : '2.25rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '12px'
          }}>
            Creator Status
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '500px'
          }}>
            Manage your creator profile and benefits
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{
        padding: '40px clamp(1rem, 4vw, 2rem) 80px',
        background: '#0a0a0f',
        flex: 1
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* If user is an approved creator */}
          {creatorProfile && creatorProfile.status !== 'removed' && (
            <>
              {/* Creator Status Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: creatorProfile.profileImage
                        ? 'transparent'
                        : 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.1) 100%)',
                      border: '2px solid rgba(251, 191, 36, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {creatorProfile.profileImage ? (
                        <img
                          src={creatorProfile.profileImage}
                          alt={creatorProfile.displayName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: '#fbbf24'
                        }}>
                          {creatorProfile.displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <h2 style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {creatorProfile.displayName}
                        </h2>
                        {creatorProfile.featured && (
                          <StarIcon style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                        )}
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        Member since {formatDate(creatorProfile.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: creatorStatusConfig[creatorProfile.status].bgColor,
                    border: `1px solid ${creatorStatusConfig[creatorProfile.status].color}40`
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: creatorStatusConfig[creatorProfile.status].color
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: creatorStatusConfig[creatorProfile.status].color
                    }}>
                      {creatorStatusConfig[creatorProfile.status].label}
                    </span>
                  </div>
                </div>

                {/* Warning message if warned */}
                {creatorProfile.status === 'warned' && creatorProfile.warningMessage && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px'
                    }}>
                      <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>Warning Notice</span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      {creatorProfile.warningMessage}
                    </p>
                  </div>
                )}

                {/* Profile Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <Link
                    href={`/content-creators/${creatorProfile.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: '#fbbf24',
                      textDecoration: 'none'
                    }}
                  >
                    <LinkIcon style={{ width: '16px', height: '16px' }} />
                    View Public Profile
                    <ArrowRightIcon style={{ width: '14px', height: '14px' }} />
                  </Link>
                  <button
                    onClick={handleOpenEditModal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
                    Edit Profile
                  </button>
                  <button
                    onClick={handleOpenSyncModal}
                    disabled={!canSync()}
                    title={canSync() ? 'Update your follower counts' : `Next sync available ${getNextSyncTime()}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: canSync() ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: canSync() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: canSync() ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      if (canSync()) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = canSync() ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)';
                    }}
                  >
                    <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
                    Sync Followers
                  </button>
                </div>
                {creatorProfile.lastSyncedAt && (
                  <p style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginTop: '8px'
                  }}>
                    Last synced: {formatDate(creatorProfile.lastSyncedAt)}
                    {!canSync() && ` • Next sync available ${getNextSyncTime()}`}
                  </p>
                )}
              </div>

              {/* Grace Period Warning Banner */}
              {creatorProfile.gracePeriodStartedAt && creatorProfile.gracePeriodEndsAt && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ClockIcon style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#f59e0b',
                        margin: '0 0 8px 0'
                      }}>
                        Low Follower Warning - {getGracePeriodDaysRemaining()} Days Remaining
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: '1.6',
                        margin: '0 0 12px 0'
                      }}>
                        Your follower count is below our minimum requirement of 500.
                        You have until {formatDate(creatorProfile.gracePeriodEndsAt)} to increase your followers
                        or your creator account will be removed.
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: 0
                      }}>
                        Once you&apos;ve gained more followers, click &quot;Sync Followers&quot; above to update your counts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Benefits Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.03) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <GiftIcon style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Your Benefits
                  </h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px'
                }}>
                  {/* Personal Plan */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        Personal Account
                      </span>
                      {creatorProfile.entitlements.personalPlan ? (
                        creatorProfile.entitlements.personalPlanFallback ? (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#60a5fa'
                          }}>
                            Fallback
                          </span>
                        ) : (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#22c55e'
                          }}>
                            <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
                            Active
                          </span>
                        )
                      ) : (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.4)'
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#fff'
                    }}>
                      {creatorProfile.entitlements.personalPlanFallback
                        ? `${creatorProfile.entitlements.currentUserPlan?.charAt(0).toUpperCase()}${creatorProfile.entitlements.currentUserPlan?.slice(1).replace('_', ' ')} Plan`
                        : 'Premium Plus'}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '4px'
                    }}>
                      {creatorProfile.entitlements.personalPlanFallback
                        ? 'Premium Plus activates if you cancel'
                        : '$99/year value'}
                    </div>
                  </div>

                  {/* Community Plan */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        Community
                      </span>
                      {creatorProfile.entitlements.communityPlan.active ? (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#22c55e'
                        }}>
                          <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#fbbf24'
                        }}>
                          Not assigned
                        </span>
                      )}
                    </div>
                    {creatorProfile.entitlements.communityPlan.active ? (
                      <>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {creatorProfile.entitlements.communityPlan.communityName || 'Premium boost'}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: '4px'
                        }}>
                          $96/year value
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '12px'
                        }}>
                          Premium Boost Available
                        </div>
                        <button
                          onClick={handleClaimCommunityBenefit}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            color: '#000',
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <GiftIcon style={{ width: '16px', height: '16px' }} />
                          Claim Your Benefit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      Total Annual Value
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '800',
                      color: '#fbbf24'
                    }}>
                      $195/year
                    </div>
                  </div>
                  <SparklesIcon style={{ width: '32px', height: '32px', color: 'rgba(251, 191, 36, 0.3)' }} />
                </div>
              </div>

              {/* Platforms */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '28px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '16px'
                }}>
                  Connected Platforms
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {creatorProfile.platforms.map((platform, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: `${platformColors[platform.type] || platformColors.other}10`,
                        borderRadius: '10px',
                        border: `1px solid ${platformColors[platform.type] || platformColors.other}30`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: platformColors[platform.type] || platformColors.other,
                          textTransform: 'capitalize'
                        }}>
                          {platform.type}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          color: 'rgba(255, 255, 255, 0.6)'
                        }}>
                          @{platform.handle}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#fff'
                      }}>
                        {formatFollowerCount(platform.followerCount)} followers
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowRemovalModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <TrashIcon style={{ width: '18px', height: '18px' }} />
                  Request Removal
                </button>
              </div>
            </>
          )}

          {/* If creator has been removed */}
          {creatorProfile && creatorProfile.status === 'removed' && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(107, 114, 128, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <XCircleIcon style={{ width: '40px', height: '40px', color: 'rgba(255, 255, 255, 0.4)' }} />
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Creator Profile Removed
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '16px',
                maxWidth: '450px',
                margin: '0 auto 16px'
              }}>
                You have been removed from the Content Creator Program. Your Premium Plus and community boost benefits have been revoked.
              </p>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '32px',
                maxWidth: '450px',
                margin: '0 auto 32px'
              }}>
                If you&apos;d like to rejoin the program, you can submit a new application.
              </p>
              <Link
                href="/content-creators/apply"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: '700',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)'
                }}
              >
                Apply Again
                <ArrowRightIcon style={{ width: '18px', height: '18px' }} />
              </Link>
            </div>
          )}

          {/* If user has a pending/rejected application */}
          {application && !creatorProfile && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff'
                }}>
                  Application Status
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: statusConfig[application.status].bgColor,
                  border: `1px solid ${statusConfig[application.status].color}40`,
                  color: statusConfig[application.status].color
                }}>
                  {statusConfig[application.status].icon}
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>
                    {statusConfig[application.status].label}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    Display Name
                  </span>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#fff',
                    marginTop: '4px'
                  }}>
                    {application.displayName}
                  </p>
                </div>
                <div>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    Submitted
                  </span>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#fff',
                    marginTop: '4px'
                  }}>
                    {formatDate(application.createdAt)}
                  </p>
                </div>
              </div>

              {/* Rejection feedback */}
              {application.status === 'rejected' && application.feedback && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <XCircleIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                      Application Declined
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    {application.feedback}
                  </p>
                </div>
              )}

              {/* Re-apply option for rejected */}
              {application.status === 'rejected' && (
                <Link
                  href="/content-creators/apply"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '700',
                    padding: '14px 24px',
                    borderRadius: '10px',
                    textDecoration: 'none'
                  }}
                >
                  <PencilSquareIcon style={{ width: '18px', height: '18px' }} />
                  Apply Again
                </Link>
              )}

              {/* Channel ownership verification. Only while the application is
                  still open — once it is decided there is nothing to act on. */}
              {(application.status === 'submitted' || application.status === 'under_review') &&
                application.platforms?.length > 0 && (
                  <VerificationPanel
                    platforms={application.platforms}
                    checks={application.checks}
                    onRefresh={refreshApplication}
                  />
                )}

              {/* Withdraw option for pending applications */}
              {(application.status === 'submitted' || application.status === 'under_review') && (
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <XCircleIcon style={{ width: '18px', height: '18px' }} />
                  Withdraw Application
                </button>
              )}
            </div>
          )}

          {/* No application or creator profile */}
          {!application && !creatorProfile && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <UserGroupIcon style={{ width: '40px', height: '40px', color: 'rgba(255, 255, 255, 0.3)' }} />
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                No Application Found
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '32px',
                maxWidth: '400px',
                margin: '0 auto 32px'
              }}>
                You haven&apos;t applied to the Content Creator Program yet.
                Apply now to unlock exclusive benefits!
              </p>
              <Link
                href="/content-creators/apply"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: '700',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)'
                }}
              >
                Apply Now
                <ArrowRightIcon style={{ width: '18px', height: '18px' }} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Removal Modal */}
      {showRemovalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <ExclamationTriangleIcon style={{ width: '30px', height: '30px', color: '#ef4444' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Request Removal?
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              This will remove you from the Creator Program and revoke your Premium Plus and community boost benefits
              for both your personal account and community. This action cannot be easily undone.
            </p>

            {removalError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {removalError}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowRemovalModal(false);
                  setRemovalError(null);
                }}
                disabled={removalSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: removalSubmitting ? 'not-allowed' : 'pointer',
                  opacity: removalSubmitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemovalRequest}
                disabled={removalSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: removalSubmitting ? 'not-allowed' : 'pointer',
                  opacity: removalSubmitting ? 0.5 : 1
                }}
              >
                {removalSubmitting ? 'Submitting...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Application Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <XCircleIcon style={{ width: '30px', height: '30px', color: '#fbbf24' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Withdraw Application?
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              Are you sure you want to withdraw your application? You can always apply again later.
            </p>

            {withdrawError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {withdrawError}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawError(null);
                }}
                disabled={withdrawSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: withdrawSubmitting ? 'not-allowed' : 'pointer',
                  opacity: withdrawSubmitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawApplication}
                disabled={withdrawSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  color: '#fbbf24',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: withdrawSubmitting ? 'not-allowed' : 'pointer',
                  opacity: withdrawSubmitting ? 0.5 : 1
                }}
              >
                {withdrawSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Selection Modal */}
      {showCommunityModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <GiftIcon style={{ width: '30px', height: '30px', color: '#fbbf24' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Claim Community Benefit
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              Select a community you own to apply your free Premium boost.
              You can only apply this to one community.
            </p>

            {promotionError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {promotionError}
              </div>
            )}

            {loadingCommunities ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(251, 191, 36, 0.2)',
                  borderTopColor: '#fbbf24',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }} />
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  Loading your communities...
                </p>
              </div>
            ) : ownedCommunities.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <UserGroupIcon style={{
                  width: '40px',
                  height: '40px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  margin: '0 auto 12px'
                }} />
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  You don&apos;t own any communities yet.
                </p>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '8px'
                }}>
                  Create a community in Lines Police CAD to claim this benefit.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {ownedCommunities.map((community) => {
                  // Check if community has an existing paid boost we must not overwrite
                  const hasExistingSubscription = community.currentPlan &&
                    ['basic', 'elite', 'base'].includes(community.currentPlan.toLowerCase());
                  const isDisabled = community.isPromotionApplied || hasExistingSubscription || applyingPromotion;

                  return (
                    <div key={community._id}>
                      <button
                        onClick={() => !isDisabled && handleSelectCommunity({ _id: community._id, name: community.name })}
                        disabled={isDisabled}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: community.isPromotionApplied
                            ? 'rgba(34, 197, 94, 0.1)'
                            : hasExistingSubscription
                              ? 'rgba(107, 114, 128, 0.1)'
                              : 'rgba(255, 255, 255, 0.03)',
                          border: community.isPromotionApplied
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : hasExistingSubscription
                              ? '1px solid rgba(107, 114, 128, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: hasExistingSubscription && !community.isPromotionApplied ? '12px 12px 0 0' : '12px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: (applyingPromotion && !community.isPromotionApplied && !hasExistingSubscription) ? 0.5 : 1
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: hasExistingSubscription && !community.isPromotionApplied ? 'rgba(255, 255, 255, 0.5)' : '#fff'
                          }}>
                            {community.name}
                          </div>
                          {community.currentPlan && (
                            <div style={{
                              fontSize: '12px',
                              color: 'rgba(255, 255, 255, 0.5)',
                              marginTop: '4px'
                            }}>
                              Current: {community.currentPlan.charAt(0).toUpperCase() + community.currentPlan.slice(1)} Plan
                            </div>
                          )}
                        </div>
                        {community.isPromotionApplied ? (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#22c55e'
                          }}>
                            <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                            Applied
                          </span>
                        ) : hasExistingSubscription ? (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.4)',
                            padding: '6px 12px',
                            background: 'rgba(107, 114, 128, 0.2)',
                            borderRadius: '6px'
                          }}>
                            Unavailable
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#fbbf24',
                            padding: '6px 12px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            borderRadius: '6px'
                          }}>
                            Select
                          </span>
                        )}
                      </button>
                      {hasExistingSubscription && !community.isPromotionApplied && (
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderTop: 'none',
                          borderRadius: '0 0 12px 12px',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          <ExclamationTriangleIcon style={{
                            width: '14px',
                            height: '14px',
                            color: '#f59e0b',
                            display: 'inline',
                            verticalAlign: 'middle',
                            marginRight: '6px'
                          }} />
                          It looks like you already have a subscription plan active. You can cancel your current subscription and then apply this benefit once it has completed.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setShowCommunityModal(false);
                setPromotionError(null);
              }}
              disabled={applyingPromotion}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: applyingPromotion ? 'not-allowed' : 'pointer',
                opacity: applyingPromotion ? 0.5 : 1
              }}
            >
              {applyingPromotion ? 'Applying...' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && creatorProfile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PencilSquareIcon style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff',
                  margin: 0
                }}>
                  Edit Profile
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0
                }}>
                  Customize your creator profile
                </p>
              </div>
            </div>

            {editError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#ef4444'
              }}>
                {editError}
              </div>
            )}

            {/* Profile Image Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '8px'
              }}>
                Profile Picture
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Preview */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: editProfileImage
                    ? 'transparent'
                    : `linear-gradient(135deg, ${editThemeColor}30 0%, ${editThemeColor}10 100%)`,
                  border: `2px solid ${editThemeColor}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {editProfileImage ? (
                    <img
                      src={editProfileImage}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: editThemeColor
                    }}>
                      {creatorProfile?.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Upload button */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: editProfileImageUploading ? 'not-allowed' : 'pointer',
                      opacity: editProfileImageUploading ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {editProfileImageUploading ? (
                      <>
                        <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {editProfileImage ? 'Change Image' : 'Upload Image'}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      disabled={editProfileImageUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {editProfileImage && (
                    <button
                      onClick={() => setEditProfileImage('')}
                      style={{
                        marginLeft: '8px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <p style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Bio Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '8px'
              }}>
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell viewers about yourself..."
                maxLength={500}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '6px'
              }}>
                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)'
                }}>
                  Min 20 characters
                </span>
                <span style={{
                  fontSize: '12px',
                  color: editBio.length > 500 ? '#ef4444' : 'rgba(255, 255, 255, 0.4)'
                }}>
                  {editBio.length}/500
                </span>
              </div>
            </div>

            {/* Theme Color Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '8px'
              }}>
                Theme Color
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  position: 'relative',
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <input
                    type="color"
                    value={editThemeColor}
                    onChange={(e) => setEditThemeColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      inset: '-10px',
                      width: 'calc(100% + 20px)',
                      height: 'calc(100% + 20px)',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={editThemeColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '#' || /^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setEditThemeColor(val);
                    }
                  }}
                  placeholder="#fbbf24"
                  maxLength={7}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: '8px'
              }}>
                Choose a color for your profile accent. Avoid very dark or very light colors.
              </p>

              {/* Color Presets */}
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '12px'
              }}>
                {['#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#22c55e', '#84cc16'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditThemeColor(color)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: color,
                      border: editThemeColor.toLowerCase() === color ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      transform: editThemeColor.toLowerCase() === color ? 'scale(1.1)' : 'scale(1)'
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <span style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                display: 'block',
                marginBottom: '8px'
              }}>
                Preview
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${editThemeColor}50 0%, ${editThemeColor}20 100%)`,
                  border: `2px solid ${editThemeColor}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: editThemeColor
                  }}>
                    {creatorProfile.displayName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff'
                  }}>
                    {creatorProfile.displayName}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: editThemeColor
                  }}>
                    @{creatorProfile.slug}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditError(null);
                }}
                disabled={editSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  opacity: editSaving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  opacity: editSaving ? 0.7 : 1
                }}
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Followers Modal */}
      {showSyncModal && creatorProfile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowPathIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff',
                  margin: 0
                }}>
                  Sync Follower Counts
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0
                }}>
                  Update your platform statistics
                </p>
              </div>
            </div>

            {syncError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#ef4444'
              }}>
                {syncError}
              </div>
            )}

            {syncSuccess && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#22c55e'
              }}>
                {syncSuccess}
              </div>
            )}

            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Enter your current follower counts for each platform. You can sync once every 24 hours.
            </p>

            {/* Platform Inputs */}
            <div style={{ marginBottom: '24px' }}>
              {syncPlatforms.map((platform, index) => (
                <div key={platform.type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '100px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: platformColors[platform.type] || '#6366f1',
                    textTransform: 'capitalize'
                  }}>
                    {platform.type}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={platform.followerCount}
                    onChange={(e) => {
                      const newPlatforms = [...syncPlatforms];
                      newPlatforms[index].followerCount = e.target.value;
                      setSyncPlatforms(newPlatforms);
                    }}
                    placeholder="Follower count"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Note about 500 minimum */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#fbbf24',
                margin: 0
              }}>
                <strong>Note:</strong> The Content Creator Program requires at least 500 followers on one platform.
                If your counts drop below this, you&apos;ll enter a 30-day grace period.
              </p>
            </div>

            {/* Verification warning */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: 0
              }}>
                Follower counts are subject to periodic verification by our system.
                Knowingly entering false information may result in suspension from the Creator Program.
              </p>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncError(null);
                  setSyncSuccess(null);
                }}
                disabled={syncSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: syncSaving ? 'not-allowed' : 'pointer',
                  opacity: syncSaving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSyncFollowers}
                disabled={syncSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: syncSaving ? 'not-allowed' : 'pointer',
                  opacity: syncSaving ? 0.7 : 1
                }}
              >
                {syncSaving ? 'Syncing...' : 'Sync Followers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCommunity && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121f',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '450px',
            width: '100%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <GiftIcon style={{ width: '30px', height: '30px', color: '#fbbf24' }} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Confirm Your Selection
            </h3>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              You are about to apply your free Premium boost to:
            </p>

            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#fbbf24'
              }}>
                {selectedCommunity.name}
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <ExclamationTriangleIcon style={{
                  width: '18px',
                  height: '18px',
                  color: '#ef4444',
                  flexShrink: 0,
                  marginTop: '2px'
                }} />
                <p style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'rgba(255, 255, 255, 0.8)',
                  margin: 0
                }}>
                  <strong>This action cannot be undone.</strong> You can only apply this benefit to one community, and you will not be able to change it later.
                </p>
              </div>
            </div>

            {promotionError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#ef4444',
                textAlign: 'center'
              }}>
                {promotionError}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleCancelConfirm}
                disabled={applyingPromotion}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: applyingPromotion ? 'not-allowed' : 'pointer',
                  opacity: applyingPromotion ? 0.5 : 1
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmPromotion}
                disabled={applyingPromotion}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: applyingPromotion ? 'not-allowed' : 'pointer',
                  opacity: applyingPromotion ? 0.7 : 1
                }}
              >
                {applyingPromotion ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
