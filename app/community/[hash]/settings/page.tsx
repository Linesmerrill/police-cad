'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getAuthHeaders, fetchCurrentUser } from '@/lib/auth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

interface User {
  _id: string;
  id: string;
  user?: {
    email?: string;
    username?: string;
  };
}

interface Community {
  _id: string;
  name: string;
  imageLink?: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
  visibility?: string;
  roles?: any[];
  owner?: string;
}

function decodeCommunityHash(hash: string): string {
  let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Cloudinary upload function
async function uploadToCloudinary(file: File, folder: string, publicId: string): Promise<string> {
  try {
    const signatureResponse = await fetch('/api/cloudinary/generate-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!signatureResponse.ok) {
      throw new Error('Failed to get signature from server');
    }

    const { timestamp, signature } = await signatureResponse.json();
    const formData = new FormData();
    formData.append('file', file);
    
    const cloudinaryApiKey = (typeof window !== 'undefined' && (window as any).CLOUDINARY_API_KEY) || '';
    const cloudinaryUploadPreset = (typeof window !== 'undefined' && (window as any).CLOUDINARY_UPLOAD_PRESET) || '';
    const cloudinaryCloudName = (typeof window !== 'undefined' && (window as any).CLOUDINARY_CLOUD_NAME) || '';
    
    if (!cloudinaryApiKey || !cloudinaryUploadPreset || !cloudinaryCloudName) {
      throw new Error('Cloudinary configuration is missing');
    }
    
    formData.append('api_key', cloudinaryApiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('upload_preset', cloudinaryUploadPreset);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    const result = await cloudinaryResponse.json();
    if (result.error) {
      throw new Error(result.error.message || 'Upload failed');
    }

    // Apply transformation for optimized display
    const baseUrl = result.secure_url;
    const urlParts = baseUrl.split('/upload/');
    if (urlParts.length === 2) {
      const transformation = 'w_1280,h_720,c_fill,q_85,f_auto';
      return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
    }
    
    return baseUrl;
  } catch (error) {
    throw error;
  }
}

export default function CommunitySettingsPage({ params }: { params: Promise<{ hash: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageLink, setImageLink] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        const communityHash = resolvedParams.hash;
        setHash(communityHash);

        const communityId = decodeCommunityHash(communityHash);
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);

        // Fetch community details
        const communityResponse = await fetch(`/community/${communityHash}/data`, {
          credentials: 'include',
          cache: 'no-store',
          headers: getAuthHeaders()
        });

        if (!communityResponse.ok) {
          throw new Error('Community not found');
        }

        const communityData = await communityResponse.json();
        let comm = communityData.community;

        if (comm && comm.community) {
          comm = {
            ...comm.community,
            _id: comm._id
          };
        }

        setCommunity(comm);
        setName(comm.name || '');
        setDescription(comm.description || '');
        setImageLink(comm.imageLink || '');
        setTags(comm.tags || []);
        setVisibility((comm.visibility || comm.isPrivate ? 'private' : 'public') as 'public' | 'private');

        // Check permissions
        if (comm.roles && Array.isArray(comm.roles) && currentUser) {
          const userId = currentUser._id || currentUser.id;
          let hasPermission = false;

          comm.roles.forEach((role: any) => {
            const roleMembers = role.members || [];
            const isInRole = roleMembers.some((member: any) => {
              const memberId = typeof member === 'string' ? member : (member._id || member.id || member.userID);
              return memberId && (String(memberId) === String(userId));
            });
            
            if (isInRole && Array.isArray(role.permissions)) {
              role.permissions.forEach((perm: any) => {
                if (
                  (perm.name === 'administrator' && perm.enabled === true) ||
                  (perm.name === 'manage community settings' && perm.enabled === true)
                ) {
                  hasPermission = true;
                }
              });
            }
          });

          setCanManageSettings(hasPermission);
        }

      } catch (err: any) {
        console.error('Error loading community:', err);
        setError(err.message || 'Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalMessage('Please select a valid image file');
      setShowErrorModal(true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalMessage('Image must be less than 5MB');
      setShowErrorModal(true);
      return;
    }

    try {
      const uploadedUrl = await uploadToCloudinary(file, 'communities', `community_${Date.now()}`);
      setImageLink(uploadedUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      setModalMessage(error.message || 'Upload failed');
      setShowErrorModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community || !hash) return;

    setSaving(true);
    try {
      const communityId = decodeCommunityHash(hash);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        imageLink: imageLink || '/static/images/default-logo.png',
        tags: tags,
        visibility: visibility,
        isPrivate: visibility === 'private',
      };

      const response = await fetch(`${API_URL}/api/v1/community/${communityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update community');
      }

      setModalMessage('Community settings updated successfully!');
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push(`/community/${hash}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating community:', error);
      setModalMessage(error.message || 'Failed to update community');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white mt-4">Loading settings...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <i className="fa fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
            <p className="text-white text-xl">{error || 'Community not found'}</p>
            <Link href="/communities" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
              Back to Communities
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <i className="fa fa-lock text-6xl text-yellow-500 mb-4"></i>
            <p className="text-white text-xl mb-2">Access Denied</p>
            <p className="text-gray-400">You don't have permission to manage community settings.</p>
            <Link href={`/community/${hash}`} className="mt-4 inline-block text-blue-400 hover:text-blue-300">
              Back to Community
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/community/${hash}`}
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            <i className="fa fa-arrow-left mr-2"></i>
            Back to Community
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Community Settings</h1>
          <p className="text-gray-400">Manage your community's information and preferences</p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Banner */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <label className="block text-white text-base font-medium mb-4">Community Banner</label>
            <div className="relative">
              <div className="w-full h-48 bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                {imageLink ? (
                  <img 
                    src={imageLink} 
                    alt="Community Banner" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <i className="fa fa-image text-4xl mb-2"></i>
                    <p className="text-base">Community Banner</p>
                  </div>
                )}
              </div>
              <label className="absolute bottom-3 right-3 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <i className="fa fa-camera"></i>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Community Name */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <label className="block text-white text-base font-medium mb-2">
              Community Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter community name"
            />
          </div>

          {/* Description */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <label className="block text-white text-base font-medium mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe your community"
            />
          </div>

          {/* Tags */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <label className="block text-white text-base font-medium mb-2">
              Tags <span className="text-gray-500 text-sm">(Max 10)</span>
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={tags.length >= 10}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={tags.length >= 10 || !tagInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-300 rounded-lg text-sm border border-blue-600/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-300 hover:text-red-400 transition-colors"
                    >
                      <i className="fa fa-times text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <label className="block text-white text-base font-medium mb-4">Visibility</label>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${visibility === 'public' ? 'text-blue-400' : 'text-gray-400'}`}>Public</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility === 'private'}
                  onChange={(e) => setVisibility(e.target.checked ? 'private' : 'public')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-all peer-checked:translate-x-5"></div>
              </label>
              <span className={`text-sm font-medium ${visibility === 'private' ? 'text-blue-400' : 'text-gray-400'}`}>Private</span>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              {visibility === 'public' 
                ? 'Anyone can find and join your community' 
                : 'Only users with invite codes can join your community'}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/community/${hash}`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim() || !description.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa fa-check text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
              <p className="text-gray-300 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa fa-exclamation-triangle text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Error</h3>
              <p className="text-gray-300 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
