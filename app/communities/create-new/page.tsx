'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

interface User {
  id: string;
  username?: string;
  email?: string;
  subscription?: {
    plan?: string;
  };
}

// Cloudinary upload function
async function uploadToCloudinary(file: File, folder: string, publicId: string): Promise<string> {
  try {
    // Step 1: Get signature from server via proxy
    const signatureResponse = await fetch('/api/cloudinary/generate-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!signatureResponse.ok) {
      throw new Error('Failed to get signature from server');
    }

    const { timestamp, signature } = await signatureResponse.json();

    // Step 2: Upload to Cloudinary with signed parameters
    const formData = new FormData();
    formData.append('file', file);
    
    // Get Cloudinary config from window (set in layout.tsx)
    const cloudinaryApiKey = (typeof window !== 'undefined' && (window as any).CLOUDINARY_API_KEY) || '';
    const cloudinaryUploadPreset = (typeof window !== 'undefined' && (window as any).CLOUDINARY_UPLOAD_PRESET) || '';
    const cloudinaryCloudName = (typeof window !== 'undefined' && (window as any).CLOUDINARY_CLOUD_NAME) || '';
    
    if (!cloudinaryApiKey || !cloudinaryUploadPreset || !cloudinaryCloudName) {
      throw new Error('Cloudinary configuration is missing. Please ensure environment variables are set.');
    }
    
    formData.append('api_key', cloudinaryApiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('upload_preset', cloudinaryUploadPreset);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await cloudinaryResponse.json();

    if (result.error) {
      throw new Error(result.error.message || 'Upload failed');
    }

    return result.secure_url;
  } catch (error) {
    throw error;
  }
}

function CreateCommunityContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    tags: [] as string[],
    imageLink: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [error, setError] = useState('');
  const [ownedCommunityCount, setOwnedCommunityCount] = useState(0);
  const [userPlan, setUserPlan] = useState('free');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Plan limits and features mapping - matches old logic
  const getCommunityLimit = (plan: string): number => {
    if (plan === 'free') {
      return 1;
    } else if (plan === 'base') {
      return 5;
    } else if (plan === 'premium') {
      return 10;
    } else {
      return Infinity;
    }
  };

  const PLAN_FEATURES: Record<string, string> = {
    free: 'Create up to 1 community',
    base: 'Create up to 5 communities',
    premium: 'Create up to 10 communities',
    premium_plus: 'Unlimited communities',
  };

  const getPlanFeature = (plan: string): string => PLAN_FEATURES[plan] ?? 'Unlimited communities';

  const formatPlanName = (plan: string): string => {
    switch (plan) {
      case 'premium_plus':
        return 'Premium Plus';
      case 'premium':
        return 'Premium';
      case 'base':
        return 'Base';
      default:
        return plan;
    }
  };

  const getPlanBadgeStyle = (plan: string): string => {
    switch (plan) {
      case 'premium_plus':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900 font-bold';
      case 'premium':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold';
      case 'base':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold';
    }
  };

  // Check user and fetch owned communities
  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.id) {
            setUser(data.user);
            // Check if subscription is active before using the plan
            const subscription = data.user.subscription;
            const plan = subscription?.active && subscription?.plan ? subscription.plan : 'free';
            setUserPlan(plan);
            await fetchOwnedCommunities(data.user.id);
          } else {
            // Not logged in, redirect to login
            router.push('/login-civ?redirect=/communities/create-new');
          }
        } else {
          router.push('/login-civ?redirect=/communities/create-new');
        }
      } catch (error) {
        router.push('/login-civ?redirect=/communities/create-new');
      } finally {
        setIsCheckingUser(false);
      }
    };

    checkUser();
  }, [router]);

  const fetchOwnedCommunities = async (userId: string) => {
    try {
      // Fetch with a high limit to get all owned communities for counting
      const response = await fetch(`/api/user/owned-communities?userId=${userId}&page=1&limit=1000`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Use totalCount if available, otherwise use data length
        const count = data.totalCount !== undefined ? data.totalCount : (data.data || []).length;
        setOwnedCommunityCount(count);
      }
    } catch (error) {
      console.error('Error fetching owned communities:', error);
      // Set default on error
      setOwnedCommunityCount(0);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setFormData((prev) => ({ ...prev, imageLink: 'uploading...' }));

        const imageUrl = await uploadToCloudinary(file, 'communities', `community_${Date.now()}`);

        setFormData((prev) => ({ ...prev, imageLink: imageUrl }));
      } catch (error) {
        setFormData((prev) => ({ ...prev, imageLink: '' }));
        setToast({
          isVisible: true,
          message: 'Failed to upload image. Please try again.',
          type: 'error',
        });
        setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 5000);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Community name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Community description is required');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to create a community');
      return;
    }

    const communityLimit = getCommunityLimit(userPlan);

    if (communityLimit !== Infinity && ownedCommunityCount >= communityLimit) {
      setError(
        `Your current subscription (${userPlan}) allows you to create up to ${communityLimit} communit${communityLimit === 1 ? 'y' : 'ies'}. Upgrade your subscription to create more.`
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const communityData = {
        ownerID: user.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageLink: formData.imageLink || '/static/images/default-logo.png',
        visibility: formData.visibility,
        tags: formData.tags,
        promotionalText: '',
        promotionalDescription: '',
      };

      const response = await fetch('/api/communities/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ community: communityData }),
      });

      if (!response.ok) {
        throw new Error('Failed to create community');
      }

      const result = await response.json();
      
      // Log the full response for debugging
      console.log('Community creation response:', JSON.stringify(result, null, 2));

      // Get the community ID from the response
      // The response structure may vary, so we check multiple possible paths
      // Based on the API, it might return: { community: { _id: ... } } or { _id: ... }
      let communityId = result?.community?._id || result?.community?.communityId || result?._id || result?.data?._id;
      
      // If the ID is nested in a community object, try to extract it
      if (!communityId && result?.community) {
        communityId = result.community._id || result.community.communityId;
      }
      
      console.log('Extracted community ID:', communityId);
      console.log('ID type:', typeof communityId);
      console.log('ID length:', communityId?.length);
      
      if (!communityId) {
        // If we can't get the ID, fall back to communities page
        console.error('Could not extract community ID from response:', result);
        setToast({
          message: `Community "${formData.name}" created successfully!`,
          type: 'success',
          isVisible: true,
        });
        setTimeout(() => {
          router.push('/communities?page=your-communities#owned-by-you');
        }, 1500);
        return;
      }

      // Ensure the ID is a string and valid MongoDB ObjectId format
      const idString = String(communityId).trim();
      if (!/^[a-fA-F0-9]{24}$/.test(idString)) {
        console.error('Invalid community ID format:', idString);
        setToast({
          message: `Community "${formData.name}" created successfully!`,
          type: 'success',
          isVisible: true,
        });
        setTimeout(() => {
          router.push('/communities?page=your-communities#owned-by-you');
        }, 1500);
        return;
      }

      // Encode the community ID for the URL (same function used elsewhere)
      const encodeCommunityId = (id: string): string => {
        const base64 = btoa(id);
        const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        console.log('Encoded community ID:', encoded);
        console.log('Original ID for encoding:', id);
        return encoded;
      };

      const encodedId = encodeCommunityId(idString);
      
      // Verify encoding by decoding it back
      try {
        let base64 = encodedId.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const decoded = atob(base64);
        console.log('Verification - decoded back:', decoded);
        console.log('Matches original?', decoded === idString);
      } catch (e) {
        console.error('Error verifying encoding:', e);
      }

      // Show success toast with loading message
      setToast({
        message: `Community "${formData.name}" created successfully!`,
        type: 'success',
        isVisible: true,
      });

      // Invalidate cache before redirecting so the new community shows up
      if (typeof window !== 'undefined' && (window as any).invalidateCommunitiesCache) {
        (window as any).invalidateCommunitiesCache();
      }
      
      // Redirect to communities page with the owned filter
      // The community might not be immediately available, so we'll go to the communities page
      // where they can see their new community in the "Owned by You" section
      setTimeout(() => {
        router.push('/communities?page=your-communities#owned-by-you');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating community:', error);
      
      // Check if it's a rate limit error
      let errorMessage = 'Failed to create community. Please try again.';
      if (error.message?.includes('Too many requests') || error.message?.includes('429')) {
        errorMessage = 'Too many requests. Please wait a few minutes and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a few minutes and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      setToast({
        message: errorMessage,
        type: 'error',
        isVisible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
          <div className="text-center">
            <i className="fa fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const communityLimit = getCommunityLimit(userPlan);
  const canCreateMore = ownedCommunityCount < communityLimit;
  const hasExceededLimit = ownedCommunityCount >= communityLimit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      {/* Header Bar with Back Button */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <i className="fa fa-arrow-left"></i>
            <span className="font-medium">Back to Communities</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm rounded-2xl z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto mb-4"></div>
                <p className="text-white text-lg font-medium">Creating your community...</p>
                <p className="text-gray-400 text-sm mt-2">Please wait</p>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Create A Community</h2>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 relative">
            {/* Blur overlay when limit is reached */}
            {hasExceededLimit && (
              <div 
                className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-10 rounded-lg"
                style={{ pointerEvents: 'none' }}
              />
            )}
            
            {/* Limit Reached Alert - Show at Top */}
            {hasExceededLimit && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 relative z-20">
                <p className="text-red-400 text-base mb-3">
                  {error ||
                    `You've reached your community limit. You have created ${ownedCommunityCount} ${ownedCommunityCount === 1 ? 'community' : 'communities'}, but your ${formatPlanName(userPlan)} plan only allows ${communityLimit === Infinity ? 'unlimited' : communityLimit} ${communityLimit === 1 ? 'community' : 'communities'}.`}
                </p>
                <ul className="text-red-400 text-base list-disc list-inside space-y-2 mb-4">
                  <li>
                    <Link
                      href="/profile"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View your subscription details
                    </Link>
                    {' to upgrade and create more communities'}
                  </li>
                  <li>
                  <Link
                    href="/communities?page=your-communities#owned-by-you"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Remove one of your existing communities
                  </Link>
                    {' to make room for a new one'}
                  </li>
                </ul>
                <div className="flex flex-col space-y-2 mt-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        window.open('https://apps.apple.com/us/app/lpc-app/id6503307483', '_blank');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors flex items-center justify-center flex-1"
                    >
                      <i className="fa-brands fa-apple mr-2"></i>
                      App Store
                    </button>
                    <button
                      onClick={() => {
                        window.open('https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp', '_blank');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors flex items-center justify-center flex-1"
                    >
                      <i className="fa-brands fa-google-play mr-2"></i>
                      Google Play
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm text-center mt-2">Download the mobile app to upgrade</p>
                </div>
              </div>
            )}

            {/* Community Banner */}
            <div className={`relative ${hasExceededLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="w-full h-48 bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                {formData.imageLink && formData.imageLink !== 'uploading...' ? (
                  <img
                    src={formData.imageLink}
                    alt="Community Banner"
                    className="w-full h-full object-cover"
                  />
                ) : formData.imageLink === 'uploading...' ? (
                  <div className="text-center text-gray-400">
                    <i className="fa fa-spinner fa-spin text-4xl mb-2"></i>
                    <p className="text-base">Uploading...</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <i className="fa fa-image text-4xl mb-2"></i>
                    <p className="text-base">Community Banner</p>
                  </div>
                )}
              </div>
              <label className={`absolute bottom-3 right-3 bg-blue-600 text-white p-2 rounded-full ${hasExceededLimit ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-blue-700'}`}>
                <i className="fa fa-camera"></i>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={hasExceededLimit}
                  className="hidden"
                />
              </label>
            </div>

            {/* Community Name */}
            <div className={hasExceededLimit ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-white text-base font-medium mb-2">
                Community Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={hasExceededLimit}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter community name"
              />
            </div>

            {/* Description */}
            <div className={hasExceededLimit ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-white text-base font-medium mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={hasExceededLimit}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Describe your community"
              />
            </div>

            {/* Community Privacy */}
            <div className={hasExceededLimit ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex items-center mb-3">
                <label className="block text-white text-base font-medium">Community Privacy</label>
                <div className="relative ml-2 inline-block">
                  <div className="group relative">
                    <i className="fa fa-info-circle text-gray-400 text-sm cursor-help"></i>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-gray-700 pointer-events-none">
                      <div className="mb-1">
                        <strong>Public:</strong> Anyone can search and find your community
                      </div>
                      <div>
                        <strong>Private:</strong> People can only join via an invite link
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('visibility', 'public')}
                  disabled={hasExceededLimit}
                  className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
                    formData.visibility === 'public'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('visibility', 'private')}
                  disabled={hasExceededLimit}
                  className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
                    formData.visibility === 'private'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Private
                </button>
              </div>
            </div>

            {/* Platform Tags */}
            <div className={hasExceededLimit ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex items-center mb-3">
                <label className="block text-white text-base font-medium">Platform Tags</label>
                <div className="relative ml-2 inline-block">
                  <div className="group relative">
                    <i className="fa fa-info-circle text-gray-400 text-sm cursor-help"></i>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 border border-gray-700 pointer-events-none max-w-[280px] sm:max-w-xs md:max-w-sm">
                      <div className="whitespace-normal">
                        You can optionally select one or many tags - these help people find platform specific communities
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-3">optional</p>
              <div className="flex flex-wrap gap-2">
                {['Xbox', 'PlayStation', 'PC'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    disabled={hasExceededLimit}
                    className={`px-4 py-2 rounded-full text-base font-medium transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message - Only show if not related to limit */}
            {error && canCreateMore && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-red-400 text-base">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={isLoading || hasExceededLimit}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                isLoading || hasExceededLimit
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="fa fa-spinner fa-spin mr-2"></i>
                  Creating...
                </span>
              ) : (
                'Create Community'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.isVisible && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          <div className="flex items-center gap-3">
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, isVisible: false }))}
              className="ml-4 hover:opacity-75"
            >
              <i className="fa fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateCommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
            <div className="text-center">
              <i className="fa fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <CreateCommunityContent />
    </Suspense>
  );
}

