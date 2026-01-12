'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getAuthHeaders, fetchCurrentUser } from '@/lib/auth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

interface Community {
  _id: string;
  name: string;
  imageLink?: string;
  description?: string;
  membersCount?: number;
  tags?: string[];
  isPrivate?: boolean;
  roles?: any[];
  owner?: string;
  inviteCode?: string;
  links?: Array<{ url: string; label: string }>;
  subscription?: {
    plan?: string;
    active?: boolean;
    name?: string;
    type?: string;
  };
}

interface Department {
  _id: string;
  name: string;
  description?: string;
  template?: string;
  isPrivate?: boolean;
  imageLink?: string;
  joinRequests?: Array<{ userId: string; status: string }>;
}

interface User {
  id: string;
  _id?: string;
  username?: string;
  email?: string;
  name?: string;
  callSign?: string;
  communities?: Array<{
    communityId: string;
    status: 'approved' | 'pending' | 'rejected';
    _id?: string;
  }>;
  user?: {
    communities?: Array<{
      communityId: string;
      status: 'approved' | 'pending' | 'rejected';
      _id?: string;
    }>;
  };
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'general' | 'important' | 'event';
  createdAt: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
}

function decodeCommunityHash(hash: string): string {
  // Reverse the encoding: replace - with +, _ with /, add padding
  let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function encodeDepartmentId(departmentId: string): string {
  const base64 = btoa(departmentId);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Component to format description with newlines, bullets, checkmarks, etc.
function FormattedDescription({ description }: { description: string }) {
  // Split by newlines and process each line
  const lines = description.split('\n');
  const formattedLines: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines but preserve spacing
    if (trimmedLine === '') {
      formattedLines.push(<br key={`br-${index}`} />);
      return;
    }
    
    // Check for bullet points (starting with -, *, •, or numbered lists)
    if (/^[-*•]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '');
      formattedLines.push(
        <div key={`bullet-${index}`} className="flex items-start mb-1">
          <span className="text-blue-400 mr-2">•</span>
          <span className="text-gray-300 text-lg leading-relaxed flex-1">{formatInlineText(content)}</span>
        </div>
      );
      return;
    }
    
    // Check for checkmarks (✓, ✅, ☑, or - [x])
    if (/^[✓✅☑]\s/.test(trimmedLine) || /^-\s\[[xX]\]\s/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^[✓✅☑]\s/, '').replace(/^-\s\[[xX]\]\s/, '');
      formattedLines.push(
        <div key={`check-${index}`} className="flex items-start mb-1">
          <span className="text-green-400 mr-2">✓</span>
          <span className="text-gray-300 text-lg leading-relaxed flex-1">{formatInlineText(content)}</span>
        </div>
      );
      return;
    }
    
    // Check for unchecked items (- [ ])
    if (/^-\s\[\s\]\s/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^-\s\[\s\]\s/, '');
      formattedLines.push(
        <div key={`uncheck-${index}`} className="flex items-start mb-1">
          <span className="text-gray-500 mr-2">☐</span>
          <span className="text-gray-300 text-lg leading-relaxed flex-1">{formatInlineText(content)}</span>
        </div>
      );
      return;
    }
    
    // Regular paragraph
    formattedLines.push(
      <p key={`para-${index}`} className="text-gray-300 text-lg leading-relaxed mb-2">
        {formatInlineText(trimmedLine)}
      </p>
    );
  });
  
  return <div>{formattedLines}</div>;
}

// Helper function to format inline text (bold, italic, etc.)
function formatInlineText(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let keyCounter = 0;
  
  // Handle bold text (**text**)
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      parts.push(...formatItalicText(beforeText, keyCounter));
      keyCounter += beforeText.length;
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${keyCounter++}`} className="font-semibold text-white">
        {match[1]}
      </strong>
    );
    keyCounter += match[1].length;
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    parts.push(...formatItalicText(remainingText, keyCounter));
  }
  
  // If no bold text was found, format the whole text for italic
  if (parts.length === 0) {
    return formatItalicText(text, 0);
  }
  
  return parts;
}

// Helper function for italic formatting
function formatItalicText(text: string, startKey: number): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let keyCounter = startKey;
  
  // Handle italic text (*text* but not **text**)
  // Use a simpler regex that doesn't use lookbehind (better browser support)
  const italicRegex = /(?:^|[^*])\*([^*]+?)\*(?:[^*]|$)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = italicRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add italic text
    parts.push(
      <em key={`italic-${keyCounter++}`} className="italic">
        {match[1]}
      </em>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // If no italic text was found, return the whole text
  if (parts.length === 0) {
    return [text];
  }
  
  return parts;
}

export default function CommunityPage({ params }: { params: Promise<{ hash: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [isMemberApproved, setIsMemberApproved] = useState(false);
  const [isMemberPending, setIsMemberPending] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string>('');
  const [inviteExpiry, setInviteExpiry] = useState<string>('7d');
  const [inviteMaxUses, setInviteMaxUses] = useState<string>('unlimited');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalType, setRequestModalType] = useState<'success' | 'error' | null>(null);
  const [requestModalMessage, setRequestModalMessage] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Unwrap params Promise
        const resolvedParams = await params;
        const communityHash = resolvedParams.hash;
        setHash(communityHash);

        // Decode community hash
        const communityId = decodeCommunityHash(communityHash);
        console.log('Decoded community ID:', communityId);

        // Fetch current user
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);

        // Fetch community details from the Express backend route
        const communityResponse = await fetch(`/community/${communityHash}/data`, {
          credentials: 'include',
          cache: 'no-store',
          headers: getAuthHeaders()
        });

        if (!communityResponse.ok) {
          const errorText = await communityResponse.text();
          console.error('Community fetch failed:', communityResponse.status, errorText);
          throw new Error('Community not found');
        }

        const communityData = await communityResponse.json();
        console.log('Raw community data:', communityData);
        console.log('Community object:', communityData.community);

        // The backend returns { community: {...}, departments: [...] }
        // The community object has structure: { _id, community: {...}, __v }
        let comm = communityData.community;

        // Extract the nested community object and merge with _id
        if (comm && comm.community) {
          // Merge _id from parent with nested community data
          comm = {
            ...comm.community,
            _id: comm._id  // Use the parent _id
          };
        }

        console.log('Final processed community:', comm);
        console.log('Community name:', comm?.name);
        console.log('Community imageLink:', comm?.imageLink);
        console.log('Community description:', comm?.description);
        console.log('Community tags:', comm?.tags);
        console.log('Community membersCount:', comm?.membersCount);
        console.log('Community subscription:', comm?.subscription);
        console.log('Community links:', comm?.links);

        setCommunity(comm);

        // Set departments first
        if (communityData.departments && Array.isArray(communityData.departments)) {
          setDepartments(communityData.departments);
        }

        // Check if user is a member and has permissions
        if (currentUser && comm) {
          const userId = currentUser.id || currentUser._id;
          const communityId = comm._id;

          // Check membership status from user.user.communities array
          let isApproved = false;
          let isPending = false;

          console.log('Checking membership for user:', currentUser);
          console.log('Community ID:', communityId);
          console.log('User.communities:', currentUser.communities);
          console.log('User.user?.communities:', currentUser.user?.communities);

          // Check both locations for communities array
          const communitiesArray = currentUser.communities || currentUser.user?.communities;

          if (Array.isArray(communitiesArray) && communityId) {
            communitiesArray.forEach((c) => {
              const cCommunityId = c.communityId || c.community?._id || c._id;
              const cStatus = c.status || c.community?.status;
              console.log('Checking community:', cCommunityId, 'against', communityId, 'status:', cStatus);
              if (cCommunityId && String(cCommunityId) === String(communityId)) {
                const statusLower = String(cStatus || '').toLowerCase();
                if (statusLower === 'approved') {
                  isApproved = true;
                  console.log('User is APPROVED member');
                } else if (statusLower === 'pending') {
                  isPending = true;
                  console.log('User has PENDING request');
                }
              }
            });
          }

          // Also fetch user's communities list from API to check for pending status
          // This ensures we get the most up-to-date pending list
          if (userId && communityId && !isApproved) {
            try {
              // Fetch pending communities to check if user has a pending request for this community
              const pendingResponse = await fetch(
                `/api/user/communities?userId=${userId}&page=1&filter=${encodeURIComponent('status:pending')}&limit=100`,
                { credentials: 'include', headers: getAuthHeaders() }
              );
              
              if (pendingResponse.ok) {
                const pendingData = await pendingResponse.json();
                const pendingCommunities = pendingData.data || [];
                
                // Check if current community is in the pending list
                // The API returns communities with _id field that matches the community ID
                const hasPendingRequest = pendingCommunities.some((item: any) => {
                  const itemCommunityId = item._id || item.communityId || item.community?._id;
                  if (itemCommunityId && String(itemCommunityId) === String(communityId)) {
                    console.log('Found pending request for community:', communityId);
                    return true;
                  }
                  return false;
                });
                
                if (hasPendingRequest) {
                  isPending = true;
                  console.log('User has pending request for this community');
                }
              }
            } catch (err) {
              console.error('Error fetching pending communities:', err);
              // Continue with existing logic if API call fails
            }
          }

          console.log('Final membership state - Approved:', isApproved, 'Pending:', isPending);
          setIsMemberApproved(isApproved);
          setIsMemberPending(isPending);

          // Check permissions
          if (userId && comm.roles && Array.isArray(comm.roles)) {
            let hasPermission = false;
            comm.roles.forEach((role: any) => {
              if (Array.isArray(role.members) && role.members.includes(userId)) {
                if (Array.isArray(role.permissions)) {
                  role.permissions.forEach((perm: any) => {
                    if (
                      (perm.name === 'administrator' && perm.enabled === true) ||
                      (perm.name === 'manage community settings' && perm.enabled === true)
                    ) {
                      hasPermission = true;
                    }
                  });
                }
              }
            });
            setCanManageSettings(hasPermission);
          }
        }

        // TODO: Fetch announcements and events
        // For now, using empty arrays
        setAnnouncements([]);
        setEvents([]);

      } catch (err) {
        console.error('Error loading community:', err);
        setError(err instanceof Error ? err.message : 'Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  const checkIfRequestPending = (dept: Department): boolean => {
    if (!user || !dept.joinRequests) return false;
    const userId = user.id || user._id;
    return dept.joinRequests.some(req => req.userId === userId && req.status === 'pending');
  };

  const navigateToDepartment = (dept: Department) => {
    // If private department, show request to join instead (unless already requested)
    if (dept.isPrivate) {
      if (!checkIfRequestPending(dept)) {
        handleRequestToJoinDepartment(dept);
      }
      return;
    }

    if (!dept.template) return;

    const templateType = dept.template.toLowerCase();
    let dashboardUrl = '';

    if (templateType.includes('civilian')) {
      dashboardUrl = `/civ-dashboard?dept=${encodeURIComponent(dept.name)}&d=${encodeDepartmentId(dept._id)}`;
    } else if (templateType.includes('police')) {
      dashboardUrl = `/police-dashboard?dept=${encodeURIComponent(dept.name)}&d=${encodeDepartmentId(dept._id)}`;
    } else if (templateType.includes('fire') || templateType.includes('ems')) {
      dashboardUrl = `/ems-dashboard?dept=${encodeURIComponent(dept.name)}&d=${encodeDepartmentId(dept._id)}`;
    } else if (templateType.includes('dispatch')) {
      dashboardUrl = `/dispatch-dashboard?dept=${encodeURIComponent(dept.name)}&d=${encodeDepartmentId(dept._id)}`;
    }

    if (dashboardUrl && community) {
      // Set last accessed community
      const userId = user?.id;
      if (community._id && userId) {
        fetch(`${API_URL}/api/v1/user/last-accessed-community`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            userId: userId,
            communityId: community._id,
            createdAt: new Date().toISOString()
          })
        }).then(() => {
          window.location.href = dashboardUrl;
        }).catch(() => {
          window.location.href = dashboardUrl;
        });
      } else {
        window.location.href = dashboardUrl;
      }
    }
  };

  const handleRequestToJoinDepartment = async (dept: Department) => {
    if (!user || !community) return;

    try {
      const userId = user.id || user._id;
      const response = await fetch(`${API_URL}/api/v1/community/${community._id}/departments/${dept._id}/join-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          userId: userId
        })
      });

      if (response.ok) {
        alert(`Join request sent for ${dept.name}!`);
      } else {
        const error = await response.json();
        alert(`Failed to send join request: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request');
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRequestToJoin = async () => {
    if (!user || !community) return;

    // Prevent duplicate requests if already pending
    if (isMemberPending) {
      setRequestModalType('error');
      setRequestModalMessage('You already have a pending request for this community.');
      setShowRequestModal(true);
      return;
    }

    try {
      const userId = user.id || user._id;
      if (!userId) {
        setRequestModalType('error');
        setRequestModalMessage('User ID not found. Please try logging in again.');
        setShowRequestModal(true);
        return;
      }

      const response = await fetch('/api/user/pending-community-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId: userId,
          communityId: community._id 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse error message from various response formats
        let errorMessage = 'Failed to send join request.';
        
        if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.Response) {
          // Handle nested Response object
          if (data.Response.Message) {
            errorMessage = data.Response.Message;
          } else if (data.Response.Error) {
            errorMessage = data.Response.Error;
          }
        }
        
        // Check for specific error messages and provide user-friendly alternatives
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('already requested')) {
          errorMessage = 'You have already requested to join this community.';
        }
        
        throw new Error(errorMessage);
      }

      // Handle the response format
      if (data.status === 'joined') {
        // User was automatically approved and joined
        // Update local state to show approved status
        setIsMemberApproved(true);
        setIsMemberPending(false);
        setRequestModalType('success');
        setRequestModalMessage('Successfully joined community!');
        setShowRequestModal(true);
        return;
      }

      // Request was sent and is pending
      // Update local state immediately for instant feedback
      setIsMemberPending(true);
      setIsMemberApproved(false);
      setRequestModalType('success');
      setRequestModalMessage('Request sent! Your request to join is pending approval.');
      setShowRequestModal(true);

    } catch (error: any) {
      console.error('Error sending join request:', error);
      setRequestModalType('error');
      setRequestModalMessage(error.message || 'Failed to send join request. Please try again.');
      setShowRequestModal(true);
    }
  };

  const handleInvite = () => {
    if (!isMemberApproved) return;
    setShowInviteModal(true);
    // Reset generated code when opening modal
    setGeneratedInviteCode('');
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedInviteCode(code);
  };

  const createInviteCode = async () => {
    if (!generatedInviteCode || !community) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/community/${community._id}/invite-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          code: generatedInviteCode,
          expiresAfter: inviteExpiry,
          maxUses: inviteMaxUses === 'unlimited' ? null : parseInt(inviteMaxUses)
        })
      });

      if (response.ok) {
        alert('Invite code created successfully!');
        copyToClipboard(
          `${window.location.origin}/invite/${generatedInviteCode}`,
          'Invite link copied to clipboard!'
        );
      } else {
        const error = await response.json();
        alert(`Failed to create invite code: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert('Failed to create invite code');
    }
  };

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert(message);
      } catch (err) {
        alert('Failed to copy to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  const openSettings = () => {
    // TODO: Navigate to settings page or open settings modal
    if (hash) {
      window.location.href = `/community/${hash}/settings`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white mt-4">Loading community...</p>
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
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Community Not Found</h1>
            <p className="text-gray-400 mb-8">{error || 'The community you are looking for does not exist.'}</p>
            <Link href="/communities" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Back to Communities
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
      
      {/* Top Bar with Logo */}
      <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 shadow-lg sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img 
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png" 
              alt="LPC Logo" 
              className="h-8 w-8" 
            />
            <span className="text-xl font-bold text-white">Lines Police CAD</span>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Link
          href="/communities"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors group"
        >
          <i className="fa fa-arrow-left mr-2 transform group-hover:-translate-x-1 transition-transform"></i>
          Back to Communities
        </Link>

        {/* Page Navigation */}
        <div className="mb-8 backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-2xl">
          <span className="text-sm text-gray-400 block mb-3">Jump to section</span>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'overview', label: 'Overview', icon: 'fa-info-circle' },
              { id: 'departments', label: 'Departments', icon: 'fa-building' },
              { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
              { id: 'events', label: 'Events', icon: 'fa-calendar' },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <i className={`fa ${section.icon} mr-2`}></i>
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Community Header - Overview Section */}
        <div id="overview" className="mb-8 backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:border-white/30 transition-all duration-500">
          {community.imageLink && (
            <div className="relative overflow-hidden max-h-80 bg-gray-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/90 z-10"></div>
              <img
                src={community.imageLink}
                alt={community.name}
                className="w-5/6 max-w-96 h-96 object-cover transform hover:scale-105 transition-transform duration-700 mx-auto"
              />
            </div>
          )}
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-5xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {community.name}
                </h1>
                {community.subscription &&
                 ['elite', 'premium', 'standard'].includes(community.subscription.plan || '') &&
                 community.subscription.active && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 inline-block align-middle" title="Verified Subscription Community">
                    <circle cx="12" cy="12" r="10" fill="#eab308" />
                    <path d="M8 12.5l3 3 5-5" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {community.description && (
                <div className="mb-4 max-h-48 overflow-y-auto resize-y scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 bg-white/5 border border-white/10 rounded-xl p-4">
                  <FormattedDescription description={community.description} />
                </div>
              )}
              <div className="flex flex-wrap gap-3 mb-4">
                {community.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Member Count - Show for everyone */}
              {community.membersCount !== undefined && (
                <p className="text-gray-400 mb-4 text-xl font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                  {community.membersCount === 1 ? '1 Member' : `${community.membersCount} Members`}
                </p>
              )}

              {/* Community Links */}
              {community.links && community.links.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {community.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-lg"
                    >
                      <i className="fa fa-link"></i>
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Login to Join Button - For non-logged-in users */}
            {!user && hash && (
              <div className="mb-6">
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/community/${hash}`)}`}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                >
                  <i className="fa fa-sign-in-alt mr-2"></i>
                  Login to Join
                </Link>
              </div>
            )}

            {/* Community Actions */}
            {user && isMemberApproved && (
              <div className="flex flex-wrap gap-4">
                {/* Settings Button - Only for admins */}
                {canManageSettings && (
                  <button
                    onClick={openSettings}
                    className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105"
                  >
                    <i className="fa fa-cog mr-2"></i>
                    Settings
                  </button>
                )}

                {/* Invite Button */}
                <button
                  onClick={handleInvite}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
                >
                  <i className="fa fa-user-plus mr-2"></i>
                  Invite
                </button>

                {/* Share Button */}
                <button
                  onClick={() => copyToClipboard(window.location.href, 'Community link copied to clipboard!')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105"
                >
                  <i className="fa fa-share-alt mr-2"></i>
                  Share
                </button>
              </div>
            )}

            {/* Request to Join Button - For non-members */}
            {!isMemberApproved && user && (
              <>
                {/* Pending Button - Disabled when request is pending */}
                {isMemberPending ? (
                  <button
                    disabled
                    className="mt-4 w-full px-8 py-4 bg-gradient-to-r from-yellow-600/50 to-orange-600/50 border border-yellow-500/30 text-yellow-300 font-bold text-xl rounded-2xl cursor-not-allowed opacity-75"
                  >
                    <i className="fa fa-clock mr-2"></i>
                    Request Pending - Awaiting Approval
                  </button>
                ) : (
                  /* Request to Join Button - For non-members who haven't requested */
                  <button
                    onClick={handleRequestToJoin}
                    className="mt-4 w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl rounded-2xl shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                  >
                    <i className="fa fa-user-plus mr-2"></i>
                    Request to Join
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats Section - Only for approved members */}
        {user && isMemberApproved && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{community.membersCount || 0}</div>
                  <div className="text-gray-400 text-sm mt-1">Total Members</div>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <i className="fa fa-users text-blue-400 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{departments.length}</div>
                  <div className="text-gray-400 text-sm mt-1">Departments</div>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <i className="fa fa-building text-green-400 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{announcements.length}</div>
                  <div className="text-gray-400 text-sm mt-1">Announcements</div>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <i className="fa fa-bullhorn text-orange-400 text-2xl"></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Departments Section - Only show for approved members */}
        {user && isMemberApproved && (
          <div id="departments" className="mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <i className="fa fa-building text-white text-lg"></i>
              </div>
              Departments
            </h2>

            {departments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <div
                  key={dept._id}
                  onClick={() => navigateToDepartment(dept)}
                  className="group backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  {/* Department Image */}
                  {dept.imageLink ? (
                    <div className="h-40 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/80 z-10"></div>
                      <img
                        src={dept.imageLink}
                        alt={dept.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                      <i className="fa fa-building text-6xl text-white/20"></i>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors flex-1">
                        {dept.name}
                      </h3>
                      {dept.isPrivate && (
                        <i className="fa fa-lock text-yellow-500 ml-2" title="Private - Request to Join"></i>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{dept.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {checkIfRequestPending(dept) ? (
                        <div className="flex items-center text-yellow-400 text-sm font-medium">
                          <i className="fa fa-clock mr-2"></i>
                          <span>Request Pending</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                          <span>{dept.isPrivate ? 'Request to Join' : 'View Dashboard'}</span>
                          <i className={`fa ${dept.isPrivate ? 'fa-user-plus' : 'fa-arrow-right'} ml-2 transform group-hover:translate-x-1 transition-transform`}></i>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-12">
                <i className="fa fa-building text-6xl text-gray-600 mb-4"></i>
                <p className="text-gray-400 text-lg">No departments available yet</p>
              </div>
            )}
          </div>
        )}

        {/* Announcements Section */}
        <div id="announcements" className="mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <i className="fa fa-bullhorn text-white text-lg"></i>
            </div>
            Announcements
          </h2>

          {user && isMemberApproved ? (
            announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement._id}
                    className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">{announcement.title}</h3>
                    <p className="text-gray-400 mb-3">{announcement.content}</p>
                    <div className="text-sm text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fa fa-bullhorn text-6xl text-gray-600 mb-4"></i>
                <p className="text-gray-400 text-lg">No announcements yet</p>
              </div>
            )
          ) : (
            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-8 text-center border border-orange-500/20">
              <i className="fa fa-lock text-6xl text-orange-400 mb-4"></i>
              <h3 className="text-2xl font-bold text-white mb-2">Members Only</h3>
              <p className="text-gray-400">
                {user ? 'Request to join to view announcements' : 'Login to view announcements'}
              </p>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div id="events" className="mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <i className="fa fa-calendar text-white text-lg"></i>
            </div>
            Events
          </h2>

          {user && isMemberApproved ? (
            events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event._id}
                    className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                    <p className="text-gray-400 mb-3">{event.description}</p>
                    <div className="text-sm text-gray-500">
                      <i className="fa fa-clock mr-2"></i>
                      {new Date(event.startDate).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fa fa-calendar text-6xl text-gray-600 mb-4"></i>
                <p className="text-gray-400 text-lg">No upcoming events</p>
              </div>
            )
          ) : (
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-8 text-center border border-purple-500/20">
              <i className="fa fa-lock text-6xl text-purple-400 mb-4"></i>
              <h3 className="text-2xl font-bold text-white mb-2">Members Only</h3>
              <p className="text-gray-400">
                {user ? 'Request to join to view events' : 'Login to view events'}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="relative max-w-2xl w-full backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl p-8 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <i className="fa fa-times text-white"></i>
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Invite to {community.name}</h2>
              <p className="text-gray-400">Create and share invite codes with others</p>
            </div>

            {/* Create New Invite Code Section */}
            <div className="bg-gray-800/50 rounded-2xl p-6 mb-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Create New Invite Code</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Invite Code Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Invite Code</label>
                  <input
                    type="text"
                    value={generatedInviteCode}
                    onChange={(e) => setGeneratedInviteCode(e.target.value.toUpperCase())}
                    placeholder="Auto-generated code"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-black/30 rounded-xl text-white border border-white/10 focus:outline-none focus:border-blue-500/50 font-mono text-lg"
                  />
                </div>

                {/* Generate Button */}
                <div className="flex items-end">
                  <button
                    onClick={generateRandomCode}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all"
                  >
                    <i className="fa fa-random mr-2"></i>
                    Generate Random
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Expire After */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Expire After</label>
                  <select
                    value={inviteExpiry}
                    onChange={(e) => setInviteExpiry(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 rounded-xl text-white border border-white/10 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="6h">6 hours</option>
                    <option value="12h">12 hours</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                {/* Max Uses */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Uses</label>
                  <select
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 rounded-xl text-white border border-white/10 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="1">1 use</option>
                    <option value="5">5 uses</option>
                    <option value="10">10 uses</option>
                    <option value="25">25 uses</option>
                    <option value="50">50 uses</option>
                    <option value="100">100 uses</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={createInviteCode}
                disabled={!generatedInviteCode}
                className={`w-full px-6 py-3 rounded-xl font-semibold transition-all ${
                  generatedInviteCode
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <i className="fa fa-plus mr-2"></i>
                Create Invite Code
              </button>
            </div>

            {/* Share Community Link */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Share Community Link</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-blue-400 border border-white/10 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(window.location.href, 'Community link copied to clipboard!')}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                  title="Copy link"
                >
                  <i className="fa fa-copy text-white"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request to Join Success/Error Modal */}
      {showRequestModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowRequestModal(false)}
        >
          <div 
            className={`relative max-w-md w-full mx-4 backdrop-blur-xl rounded-3xl p-8 border shadow-2xl ${
              requestModalType === 'success'
                ? 'bg-gradient-to-br from-blue-900/95 to-blue-800/95 border-blue-500/30'
                : 'bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-gray-700/30'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              {requestModalType === 'success' ? (
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/50">
                  <i className="fa fa-check text-white text-2xl"></i>
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/50">
                  <i className="fa fa-exclamation-triangle text-white text-2xl"></i>
                </div>
              )}
              <h3 className={`text-3xl font-bold mb-4 ${
                requestModalType === 'success' ? 'text-blue-300' : 'text-red-400'
              }`}>
                {requestModalType === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-gray-300 mb-8 text-lg">
                {requestModalMessage}
              </p>
              <button
                onClick={() => setShowRequestModal(false)}
                className={`w-full px-6 py-4 rounded-xl transition-all font-semibold text-lg shadow-lg ${
                  requestModalType === 'success'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transform hover:scale-105'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transform hover:scale-105'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
