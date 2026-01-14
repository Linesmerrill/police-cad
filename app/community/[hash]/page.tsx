'use client';

import React, { useState, useEffect } from 'react';
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
  template?: string | { name?: string; components?: Array<{ name: string; enabled?: boolean }> };
  isPrivate?: boolean;
  approvalRequired?: boolean;
  imageLink?: string;
  image?: string;
  members?: Array<{ userID: string; status: string; tenCodeID?: string }>;
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
  departments?: Array<{
    departmentId: string;
    status: 'approved' | 'pending' | 'rejected';
    _id?: string;
  }>;
  user?: {
    communities?: Array<{
      communityId: string;
      status: 'approved' | 'pending' | 'rejected';
      _id?: string;
    }>;
    departments?: Array<{
      departmentId: string;
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
  const formattedLines: React.ReactElement[] = [];
  
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
function formatInlineText(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
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
function formatItalicText(text: string, startKey: number): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
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
  const [canManageDepartments, setCanManageDepartments] = useState(false);
  const [isMemberApproved, setIsMemberApproved] = useState(false);
  const [isMemberPending, setIsMemberPending] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string>('');
  const [inviteExpiry, setInviteExpiry] = useState<string>('7d');
  const [inviteMaxUses, setInviteMaxUses] = useState<string>('unlimited');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalType, setRequestModalType] = useState<'success' | 'error' | null>(null);
  const [requestModalMessage, setRequestModalMessage] = useState<string>('');
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [inviteCodesLoading, setInviteCodesLoading] = useState(false);
  const [inviteCodesPagination, setInviteCodesPagination] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteCodeToDelete, setInviteCodeToDelete] = useState<{ id: string; code: string } | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null); // Track which item was copied ('share' or invite code ID)
  const [newlyCreatedInviteCode, setNewlyCreatedInviteCode] = useState<string | null>(null); // Store newly created invite code
  const [showDeleteExpiredConfirm, setShowDeleteExpiredConfirm] = useState(false);
  const [deletingExpired, setDeletingExpired] = useState(false);
  // Helper function to get template name (handles both string and object)
  const getTemplateName = (template: string | { name?: string } | undefined): string => {
    if (!template) return '';
    if (typeof template === 'string') return template.toLowerCase();
    return (template.name || '').toLowerCase();
  };

  // Helper function to get component display info
  const getComponentDisplayInfo = (componentName: string): { label: string; icon: string; bgColor: string; iconColor: string } => {
    const displayMap: Record<string, { label: string; icon: string; bgColor: string; iconColor: string }> = {
      // Civilian components
      'createCivilians': { label: 'Create Civilians', icon: 'fa-id-card', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' },
      'createVehicles': { label: 'Create Vehicles', icon: 'fa-car', bgColor: 'bg-green-500/20', iconColor: 'text-green-400' },
      'createFirearms': { label: 'Create Firearms', icon: 'fa-crosshairs', bgColor: 'bg-red-500/20', iconColor: 'text-red-400' },
      'call911': { label: 'Call 911', icon: 'fa-phone', bgColor: 'bg-yellow-500/20', iconColor: 'text-yellow-400' },

      // Police components
      '10CodesInterface': { label: '10 Codes Interface', icon: 'fa-code', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' },
      'personSearch': { label: 'Person Search', icon: 'fa-search', bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400' },
      'vehicleSearch': { label: 'Vehicle Search', icon: 'fa-car', bgColor: 'bg-green-500/20', iconColor: 'text-green-400' },
      'firearmSearch': { label: 'Firearm Search', icon: 'fa-crosshairs', bgColor: 'bg-red-500/20', iconColor: 'text-red-400' },
      'createBolos': { label: 'Create BOLOs', icon: 'fa-exclamation-triangle', bgColor: 'bg-orange-500/20', iconColor: 'text-orange-400' },
      'viewBolosAndWarrants': { label: 'View BOLOs & Warrants', icon: 'fa-clipboard-list', bgColor: 'bg-yellow-500/20', iconColor: 'text-yellow-400' },
      'notepad': { label: 'Notepad', icon: 'fa-sticky-note', bgColor: 'bg-gray-500/20', iconColor: 'text-gray-400' },

      // Dispatch components
      'dispatchUnits': { label: 'Dispatch Units', icon: 'fa-broadcast-tower', bgColor: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
      'createAndManageCalls': { label: 'Create & Manage Calls', icon: 'fa-phone-volume', bgColor: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
      'manage911Calls': { label: 'Manage 911 Calls', icon: 'fa-phone-alt', bgColor: 'bg-red-500/20', iconColor: 'text-red-400' },
      'nameSearch': { label: 'Name Search', icon: 'fa-user', bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400' },

      // EMS/Fire components
      'medicalDatabase': { label: 'Medical Database', icon: 'fa-heartbeat', bgColor: 'bg-pink-500/20', iconColor: 'text-pink-400' },
    };

    return displayMap[componentName] || {
      label: componentName,
      icon: 'fa-puzzle-piece',
      bgColor: 'bg-gray-500/20',
      iconColor: 'text-gray-400'
    };
  };

  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departmentPage, setDepartmentPage] = useState(1);
  const departmentsPerPage = 6;
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDescription, setEditDeptDescription] = useState('');
  const [editDeptImage, setEditDeptImage] = useState('');
  const [editDeptApprovalRequired, setEditDeptApprovalRequired] = useState(false);
  const [editDeptComponents, setEditDeptComponents] = useState<Record<string, boolean>>({});
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [showDeleteDepartmentConfirm, setShowDeleteDepartmentConfirm] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(false);

  // Filter and paginate departments
  const filteredDepartments = departments.filter((dept) => {
    if (departmentFilter === 'all') return true;
    const templateName = getTemplateName(dept.template);
    return templateName === departmentFilter.toLowerCase();
  });

  const totalPages = Math.ceil(filteredDepartments.length / departmentsPerPage);
  const startIndex = (departmentPage - 1) * departmentsPerPage;
  const endIndex = startIndex + departmentsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setDepartmentPage(1);
  }, [departmentFilter]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (departmentPage > totalPages && totalPages > 0) {
      setDepartmentPage(1);
    }
  }, [departmentPage, totalPages]);

  // Prevent body scrolling when edit modal is open
  useEffect(() => {
    if (showEditDepartmentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup: restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEditDepartmentModal]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Unwrap params Promise
        const resolvedParams = await params;
        const communityHash = resolvedParams.hash;
        setHash(communityHash);

        // Decode community hash
        const communityId = decodeCommunityHash(communityHash);

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

        setCommunity(comm);

        // Set departments first - ensure isPrivate is set correctly
        if (communityData.departments && Array.isArray(communityData.departments)) {
          const processedDepartments = communityData.departments.map((dept: any) => ({
            ...dept,
            // Map approvalRequired to isPrivate if isPrivate is not set
            isPrivate: dept.isPrivate !== undefined ? dept.isPrivate : (dept.approvalRequired || false),
          }));
          setDepartments(processedDepartments);
        }

        // Check if user is a member and has permissions
        if (currentUser && comm) {
          const userId = currentUser.id || currentUser._id;
          const communityId = comm._id;

          // Check membership status from user.user.communities array
          let isApproved = false;
          let isPending = false;


          // Check both locations for communities array
          const communitiesArray = currentUser.communities || currentUser.user?.communities;

          if (Array.isArray(communitiesArray) && communityId) {
            communitiesArray.forEach((c) => {
              // Check multiple possible locations for community ID
              const cCommunityId = c.communityId || c.community?._id || c.community?._id || c._id || c.community?.communityId;
              const cStatus = c.status || c.community?.status;
              if (cCommunityId && String(cCommunityId) === String(communityId)) {
                const statusLower = String(cStatus || '').toLowerCase();
                if (statusLower === 'approved') {
                  isApproved = true;
                } else if (statusLower === 'pending') {
                  isPending = true;
                }
              }
            });
          }

          // Also fetch user's communities list from API to check for approved and pending status
          // This ensures we get the most up-to-date membership list
          if (userId && communityId) {
            try {
              // Fetch approved communities to check if user is a member
              if (!isApproved) {
                const approvedResponse = await fetch(
                  `/api/user/communities?userId=${userId}&page=1&filter=${encodeURIComponent('status:approved')}&limit=100`,
                  { credentials: 'include', headers: getAuthHeaders() }
                );
                
                if (approvedResponse.ok) {
                  const approvedData = await approvedResponse.json();
                  const approvedCommunities = approvedData.data || [];
                  
                  // Check if current community is in the approved list
                  // The API returns communities with _id field that matches the community ID
                  const isMember = approvedCommunities.some((item: any) => {
                    const itemCommunityId = item._id || item.communityId || item.community?._id;
                    if (itemCommunityId && String(itemCommunityId) === String(communityId)) {
                      return true;
                    }
                    return false;
                  });
                  
                  if (isMember) {
                    isApproved = true;
                  }
                }
              }

              // Fetch pending communities to check if user has a pending request
              if (!isPending && !isApproved) {
                const pendingResponse = await fetch(
                  `/api/user/communities?userId=${userId}&page=1&filter=${encodeURIComponent('status:pending')}&limit=100`,
                  { credentials: 'include', headers: getAuthHeaders() }
                );
                
                if (pendingResponse.ok) {
                  const pendingData = await pendingResponse.json();
                  const pendingCommunities = pendingData.data || [];
                  
                  // Check if current community is in the pending list
                  const hasPendingRequest = pendingCommunities.some((item: any) => {
                    const itemCommunityId = item._id || item.communityId || item.community?._id;
                    if (itemCommunityId && String(itemCommunityId) === String(communityId)) {
                      return true;
                    }
                    return false;
                  });
                  
                  if (hasPendingRequest) {
                    isPending = true;
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching user communities:', err);
              // Continue with existing logic if API call fails
            }
          }

          setIsMemberApproved(isApproved);
          setIsMemberPending(isPending);

          // Check permissions - only if user is approved member
          // Also check if user is the owner of the community
          if (isApproved && userId) {
            let hasPermission = false;
            
            // Check if user is the owner
            const ownerId = comm.owner || comm.community?.owner;
            if (ownerId && String(ownerId) === String(userId)) {
              hasPermission = true;
            }
            
            // Check roles for permissions
            if (!hasPermission && comm.roles && Array.isArray(comm.roles)) {
              
              comm.roles.forEach((role: any) => {
                // Check if user is in the role members array
                // Members can be array of user IDs (strings) or objects with _id
                const roleMembers = role.members || [];
                const isInRole = roleMembers.some((member: any) => {
                  const memberId = typeof member === 'string' ? member : (member._id || member.id || member.userID);
                  const matches = memberId && (String(memberId) === String(userId) || String(memberId) === String(currentUser._id) || String(memberId) === String(currentUser.id));
                  if (matches) {
                  }
                  return matches;
                });
                
                if (isInRole) {
                  if (Array.isArray(role.permissions)) {
                    role.permissions.forEach((perm: any) => {
                      if (
                        (perm.name === 'administrator' && perm.enabled === true) ||
                        (perm.name === 'manage community settings' && perm.enabled === true)
                      ) {
                        hasPermission = true;
                      }
                      if (
                        (perm.name === 'administrator' && perm.enabled === true) ||
                        (perm.name === 'manage departments' && perm.enabled === true)
                      ) {
                        setCanManageDepartments(true);
                      }
                    });
                  }
                }
              });
            }
            
            setCanManageSettings(hasPermission);
            
            // Check for manage departments permission
            let canManageDepts = false;
            if (comm.roles && Array.isArray(comm.roles)) {
              comm.roles.forEach((role: any) => {
                const roleMembers = role.members || [];
                const isInRole = roleMembers.some((member: any) => {
                  const memberId = typeof member === 'string' ? member : (member._id || member.id || member.userID);
                  return memberId && (String(memberId) === String(userId) || String(memberId) === String(currentUser._id) || String(memberId) === String(currentUser.id));
                });
                
                if (isInRole && Array.isArray(role.permissions)) {
                  role.permissions.forEach((perm: any) => {
                    if (
                      (perm.name === 'administrator' && perm.enabled === true) ||
                      (perm.name === 'manage departments' && perm.enabled === true)
                    ) {
                      canManageDepts = true;
                    }
                  });
                }
              });
            }
            setCanManageDepartments(canManageDepts);
          } else {
            setCanManageSettings(false);
            setCanManageDepartments(false);
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
    if (!user || !dept.members) return false;

    const userId = user.id || user._id;

    // Check if the user has a pending request in the department's members array
    return dept.members.some(
      member => String(member.userID) === String(userId) && member.status === 'pending'
    );
  };

  const checkIfApprovedMember = (dept: Department): boolean => {
    if (!user || !dept.members) return false;

    const userId = user.id || user._id;

    // Check if the user is an approved member of the department
    return dept.members.some(
      member => String(member.userID) === String(userId) && member.status === 'approved'
    );
  };

  const canAccessDepartment = (dept: Department): boolean => {
    // Admins and managers can always access
    if (canManageDepartments) return true;
    
    // Non-private departments are accessible to everyone
    if (!dept.isPrivate) return true;
    
    // Private departments require approval
    // Only approved members can access
    return checkIfApprovedMember(dept);
  };

  const navigateToDepartment = (dept: Department) => {
    // If private department, check if user is admin, has manage permissions, or is an approved member
    if (dept.isPrivate && !canManageDepartments) {
      // Check if user is an approved member - if so, allow access
      if (checkIfApprovedMember(dept)) {
        // Approved members can access the department
        // Continue to navigation logic below
      } else if (!checkIfRequestPending(dept)) {
        // Not approved and not pending - need to request to join
        handleRequestToJoinDepartment(dept);
        return;
      } else {
        // Request is pending - don't allow access yet
        return;
      }
    }

    if (!dept.template) return;

    const templateType = getTemplateName(dept.template);
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
      if (!userId) {
        setRequestModalType('error');
        setRequestModalMessage('User ID not found. Please try logging in again.');
        setShowRequestModal(true);
        return;
      }

      const response = await fetch(`/api/community/${community._id}/departments/${dept._id}/join-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId
        })
      });

      if (response.ok) {
        // Update the department's members array to add the pending request
        setDepartments(prevDepts =>
          prevDepts.map(d =>
            d._id === dept._id
              ? {
                  ...d,
                  members: [
                    ...(d.members || []),
                    {
                      userID: userId,
                      status: 'pending',
                      tenCodeID: ''
                    }
                  ]
                }
              : d
          )
        );

        setRequestModalType('success');
        setRequestModalMessage(`Join request sent for ${dept.name}! Community admins have been notified and will review your request.`);
        setShowRequestModal(true);
      } else {
        const error = await response.json();
        setRequestModalType('error');
        setRequestModalMessage(error.message || error.error || 'Failed to send join request');
        setShowRequestModal(true);
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      setRequestModalType('error');
      setRequestModalMessage('Failed to send join request. Please try again later.');
      setShowRequestModal(true);
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
    // Load invite codes when opening modal
    loadInviteCodes();
  };

  const loadInviteCodes = async (page = 1, limit = 10) => {
    if (!community || !user) return;
    
    setInviteCodesLoading(true);
    try {
      const response = await fetch(`/api/community/${community._id}/invite-codes?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data.inviteCodes || []);
        setInviteCodesPagination(data.pagination || null);
      } else {
        console.error('Failed to load invite codes');
        setInviteCodes([]);
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
      setInviteCodes([]);
    } finally {
      setInviteCodesLoading(false);
    }
  };

  const deleteInviteCode = async () => {
    if (!inviteCodeToDelete || !community) return;

    try {
      const response = await fetch(`/api/community/${community._id}/invite-codes/${inviteCodeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        // Reload invite codes list
        loadInviteCodes(inviteCodesPagination?.currentPage || 1);
        setShowDeleteConfirm(false);
        setInviteCodeToDelete(null);
      } else {
        const error = await response.json();
        alert(`Failed to delete invite code: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
      alert('Failed to delete invite code');
    }
  };

  const copyInviteLink = async (code: string, codeId: string) => {
    const link = `https://tinyurl.com/linescad/${code}`;
    await copyToClipboard(link, `invite-${codeId}`);
  };

  // Calculate expired codes count
  const expiredCodesCount = inviteCodes.filter((code: any) => {
    const expiresAt = code.expiresAt ? new Date(code.expiresAt) : null;
    return expiresAt && expiresAt < new Date();
  }).length;

  // Delete all expired invite codes
  const deleteExpiredCodes = async () => {
    if (!community) return;
    
    setDeletingExpired(true);
    const expiredCodes = inviteCodes.filter((code: any) => {
      const expiresAt = code.expiresAt ? new Date(code.expiresAt) : null;
      return expiresAt && expiresAt < new Date();
    });

    try {
      // Delete each expired code
      const deletePromises = expiredCodes.map((code: any) =>
        fetch(`/api/community/${community._id}/invite-codes/${code._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
      );

      await Promise.all(deletePromises);
      
      // Reload invite codes list
      await loadInviteCodes(inviteCodesPagination?.currentPage || 1);
      setShowDeleteExpiredConfirm(false);
    } catch (error) {
      console.error('Error deleting expired codes:', error);
      alert('Failed to delete some expired codes');
    } finally {
      setDeletingExpired(false);
    }
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
    if (!generatedInviteCode || !community || !user) return;

    try {
      const userId = user.id || user._id;
      
      // Convert expiresAfter to expiresAt if needed
      let expiresAt = null;
      if (inviteExpiry !== 'never') {
        const now = new Date();
        const [value, unit] = inviteExpiry.match(/(\d+)([mhd])/)?.slice(1) || [];
        if (value && unit) {
          const milliseconds = unit === 'm' ? parseInt(value) * 60 * 1000 :
                              unit === 'h' ? parseInt(value) * 60 * 60 * 1000 :
                              parseInt(value) * 24 * 60 * 60 * 1000;
          expiresAt = new Date(now.getTime() + milliseconds).toISOString();
        }
      }

      const maxUses = inviteMaxUses === 'unlimited' ? 0 : parseInt(inviteMaxUses);

      const response = await fetch(`/api/community/${community._id}/add-invite-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code: generatedInviteCode,
          maxUses: maxUses,
          expiresAt: expiresAt,
          createdBy: userId
        })
      });

      if (response.ok) {
        // Store the newly created code to show in success modal
        setNewlyCreatedInviteCode(generatedInviteCode);
        // Show success modal
        setRequestModalType('success');
        setRequestModalMessage(`Invite code "${generatedInviteCode}" created successfully!`);
        setShowRequestModal(true);
        // Reload invite codes list
        loadInviteCodes();
        // Reset form
        setGeneratedInviteCode('');
      } else {
        const error = await response.json();
        const errorMessage = error.error || error.message || 'Unknown error';
        
        // Show friendly message for duplicate code (409)
        if (response.status === 409) {
          setRequestModalType('error');
          setRequestModalMessage(`This invite code "${generatedInviteCode}" already exists. Please choose a different code.`);
          setShowRequestModal(true);
        } else {
          setRequestModalType('error');
          setRequestModalMessage(`Failed to create invite code: ${errorMessage}`);
          setShowRequestModal(true);
        }
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert('Failed to create invite code');
    }
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      // Reset after 2 seconds
      setTimeout(() => setCopiedItem(null), 2000);
      return true;
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
        setCopiedItem(itemId);
        setTimeout(() => setCopiedItem(null), 2000);
        return true;
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const openSettings = () => {
    if (hash) {
      router.push(`/community/${hash}/settings`);
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
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2 min-w-max pb-2">
              {[
                { id: 'overview', label: 'Overview', icon: 'fa-info-circle' },
                { id: 'departments', label: 'Departments', icon: 'fa-building' },
                { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
                { id: 'events', label: 'Events', icon: 'fa-calendar' },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <i className={`fa ${section.icon} mr-2`}></i>
                  {section.label}
                </button>
              ))}
            </div>
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
              <div className="mb-4 min-w-0">
                <h1 className="text-3xl sm:text-5xl font-bold text-white flex items-center gap-2 min-w-0">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">{community.name}</span>
                  {community.subscription &&
                   ['elite', 'premium', 'standard'].includes(community.subscription.plan || '') &&
                   community.subscription.active && (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 inline-block align-middle" aria-label="Verified Subscription Community">
                      <title>Verified Subscription Community</title>
                      <circle cx="12" cy="12" r="10" fill="#eab308" />
                      <path d="M8 12.5l3 3 5-5" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </h1>
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
                <div className="relative">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        copyToClipboard(window.location.href, 'share');
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105"
                  >
                    <i className={`fa ${copiedItem === 'share' ? 'fa-check' : 'fa-share-alt'} mr-2`}></i>
                    Share
                  </button>
                  {copiedItem === 'share' && (
                    <div className="absolute top-full left-0 mt-2 text-green-400 text-sm font-medium whitespace-nowrap">
                      Copied to clipboard
                    </div>
                  )}
                </div>
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
          <div className="grid grid-cols-3 gap-2 md:gap-6 mb-8">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-start justify-between md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xl md:text-3xl font-bold text-white">{community.membersCount || 0}</div>
                    <div className="w-6 h-6 md:w-12 md:h-12 bg-blue-500/20 rounded-lg md:rounded-xl flex items-center justify-center md:hidden flex-shrink-0">
                      <i className="fa fa-users text-blue-400 text-sm md:text-2xl"></i>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs md:text-sm break-words">Total Members</div>
                </div>
                <div className="hidden md:flex w-12 h-12 bg-blue-500/20 rounded-xl items-center justify-center flex-shrink-0 ml-3">
                  <i className="fa fa-users text-blue-400 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-start justify-between md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xl md:text-3xl font-bold text-white">{departments.length}</div>
                    <div className="w-6 h-6 md:w-12 md:h-12 bg-green-500/20 rounded-lg md:rounded-xl flex items-center justify-center md:hidden flex-shrink-0">
                      <i className="fa fa-building text-green-400 text-sm md:text-2xl"></i>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs md:text-sm break-words">Departments</div>
                </div>
                <div className="hidden md:flex w-12 h-12 bg-green-500/20 rounded-xl items-center justify-center flex-shrink-0 ml-3">
                  <i className="fa fa-building text-green-400 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 transform">
              <div className="flex items-start justify-between md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xl md:text-3xl font-bold text-white">{announcements.length}</div>
                    <div className="w-6 h-6 md:w-12 md:h-12 bg-orange-500/20 rounded-lg md:rounded-xl flex items-center justify-center md:hidden flex-shrink-0">
                      <i className="fa fa-bullhorn text-orange-400 text-sm md:text-2xl"></i>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs md:text-sm break-words">Announcements</div>
                </div>
                <div className="hidden md:flex w-12 h-12 bg-orange-500/20 rounded-xl items-center justify-center flex-shrink-0 ml-3">
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

            {/* Filter Tabs - Horizontally scrollable on mobile */}
            {departments.length > 0 && (
              <div className="mb-6 overflow-x-auto -mx-2 px-2">
                <div className="flex gap-2 min-w-max pb-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'civilian', label: 'Civilian' },
                    { value: 'ems', label: 'EMS' },
                    { value: 'police', label: 'Police' },
                    { value: 'dispatch', label: 'Dispatch' },
                    { value: 'fire', label: 'Fire' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDepartmentFilter(option.value);
                        setDepartmentPage(1); // Reset to first page when filter changes
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        departmentFilter === option.value
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paginatedDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDepartments.map((dept) => {
                const canAccess = canAccessDepartment(dept);
                const isPending = checkIfRequestPending(dept);
                // Card is clickable only if not pending AND (can access OR can request to join)
                const isClickable = !isPending && (canAccess || (dept.isPrivate && !canManageDepartments));
                
                return (
                <div
                  key={dept._id}
                  onClick={() => {
                    if (isClickable) {
                      navigateToDepartment(dept);
                    }
                  }}
                  className={`group backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 flex flex-col relative ${
                    isClickable 
                      ? 'hover:border-blue-500/50 cursor-pointer transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20' 
                      : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  {/* Edit Department Button - Only show if user can manage departments */}
                  {canManageDepartments && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDepartment(dept);
                        setEditDeptName(dept.name);
                        setEditDeptDescription(dept.description || '');
                        setEditDeptImage(dept.imageLink || dept.image || '');
                        setEditDeptApprovalRequired(dept.isPrivate || false);

                        // Extract components from the department's template (already loaded from community data)
                        const components = typeof dept.template === 'object' ? dept.template.components || [] : [];

                        // Initialize components state
                        const componentMap: Record<string, boolean> = {};
                        components.forEach((comp: { name: string; enabled?: boolean }) => {
                          componentMap[comp.name] = comp.enabled !== false; // Default to true if not specified
                        });
                        setEditDeptComponents(componentMap);

                        setShowEditDepartmentModal(true);
                      }}
                      className="absolute top-3 right-3 z-20 bg-gray-900/80 hover:bg-gray-800/90 text-gray-300 hover:text-blue-400 rounded-full w-10 h-10 flex items-center justify-center transition-all"
                      title="Edit Department"
                    >
                      <i className="fa fa-pencil-alt text-sm"></i>
                    </button>
                  )}
                  
                  {/* Department Image - 16:9 aspect ratio */}
                  {(dept.imageLink || dept.image) ? (
                    <div className="aspect-video overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/80 z-10"></div>
                      <img
                        src={dept.imageLink || dept.image}
                        alt={dept.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                      <i className="fa fa-building text-6xl text-white/20"></i>
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors flex-1">
                        {dept.name}
                      </h3>
                      {dept.isPrivate && (
                        <i className="fa fa-lock text-yellow-500 ml-2" title="Private - Request to Join"></i>
                      )}
                    </div>
                    {dept.description ? (
                      <div className="mb-4 min-h-[60px] max-h-32 overflow-y-auto resize-y scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 bg-white/5 border border-white/10 rounded-lg p-3">
                        <p className="text-gray-400 text-sm whitespace-pre-wrap">{dept.description}</p>
                      </div>
                    ) : (
                      <div className="mb-4 min-h-[60px]"></div>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      {checkIfRequestPending(dept) ? (
                        <div className="flex items-center text-yellow-400 text-sm font-medium">
                          <i className="fa fa-clock mr-2"></i>
                          <span>Awaiting Approval</span>
                        </div>
                      ) : checkIfApprovedMember(dept) ? (
                        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                          <span>View Dashboard</span>
                          <i className="fa fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
                        </div>
                      ) : (
                        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                          <span>{dept.isPrivate && !canManageDepartments ? 'Request to Join' : 'View Dashboard'}</span>
                          <i className={`fa ${dept.isPrivate && !canManageDepartments ? 'fa-user-plus' : 'fa-arrow-right'} ml-2 transform group-hover:translate-x-1 transition-transform`}></i>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            ) : filteredDepartments.length === 0 && departments.length > 0 ? (
              <div className="text-center py-12">
                <i className="fa fa-filter text-6xl text-gray-600 mb-4"></i>
                <p className="text-gray-400 text-lg">No departments found for this filter</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fa fa-building text-6xl text-gray-600 mb-4"></i>
                <p className="text-gray-400 text-lg">No departments available yet</p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredDepartments.length > departmentsPerPage && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setDepartmentPage(Math.max(1, departmentPage - 1))}
                  disabled={departmentPage === 1}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    departmentPage === 1
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <i className="fa fa-chevron-left mr-2"></i>
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (departmentPage <= 3) {
                      pageNum = i + 1;
                    } else if (departmentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = departmentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setDepartmentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          departmentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setDepartmentPage(Math.min(totalPages, departmentPage + 1))}
                  disabled={departmentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    departmentPage === totalPages
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  Next
                  <i className="fa fa-chevron-right ml-2"></i>
                </button>
              </div>
            )}

            {/* Page Info */}
            {filteredDepartments.length > 0 && (
              <div className="mt-4 text-center text-gray-400 text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredDepartments.length)} of {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''}
                {departmentFilter !== 'all' && ` (${departments.length} total)`}
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

            {/* Delete Expired Codes Section */}
            {!inviteCodesLoading && expiredCodesCount > 0 && (
              <div className="bg-gray-800/50 rounded-2xl p-6 mb-6 border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Expired Invite Codes</h3>
                    <p className="text-gray-400 text-sm">
                      You have {expiredCodesCount} expired invite code{expiredCodesCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteExpiredConfirm(true)}
                    disabled={deletingExpired}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      deletingExpired
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400'
                    }`}
                  >
                    <i className={`fa ${deletingExpired ? 'fa-spinner fa-spin' : 'fa-trash'} mr-2`}></i>
                    Delete Expired
                  </button>
                </div>
              </div>
            )}

            {/* Existing Invite Codes Section */}
            <div className="bg-gray-800/50 rounded-2xl p-6 mb-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Existing Invite Codes</h3>
              
              {inviteCodesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : inviteCodes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fa fa-inbox text-4xl mb-2"></i>
                  <p>No invite codes yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {inviteCodes.map((inviteCode: any) => {
                      const expiresAt = inviteCode.expiresAt ? new Date(inviteCode.expiresAt) : null;
                      const isExpired = expiresAt && expiresAt < new Date();
                      const isUnlimited = inviteCode.maxUses === 0;
                      const remainingUses = isUnlimited ? '∞' : (inviteCode.remainingUses || 0);
                      
                      return (
                        <div key={inviteCode._id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <code className="bg-black/50 text-green-400 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold border border-gray-700">
                                  {inviteCode.code}
                                </code>
                                {isExpired && (
                                  <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded text-xs font-medium border border-red-600/30">
                                    EXPIRED
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
                                <div>
                                  <span className="text-gray-300 font-medium block mb-1">Uses:</span>
                                  <span className="text-white">{remainingUses}{isUnlimited ? '' : ` / ${inviteCode.maxUses}`}</span>
                                </div>
                                <div>
                                  <span className="text-gray-300 font-medium block mb-1">Expires:</span>
                                  <span className="text-white">{expiresAt ? expiresAt.toLocaleString() : 'Never'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-300 font-medium block mb-1">Created:</span>
                                  <span className="text-white">{new Date(inviteCode.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div>
                                  <span className="text-gray-300 font-medium block mb-1">By:</span>
                                  <span className="text-white">{inviteCode.createdByUser?.username || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyInviteLink(inviteCode.code, inviteCode._id)}
                                  className={`px-3 py-2 rounded-lg transition-colors ${
                                    copiedItem === `invite-${inviteCode._id}`
                                      ? 'bg-green-600/20 border border-green-600/30'
                                      : 'bg-gray-700 hover:bg-gray-600'
                                  }`}
                                  title="Copy Link"
                                >
                                  <i className={`fa ${copiedItem === `invite-${inviteCode._id}` ? 'fa-check text-green-400' : 'fa-copy text-white'}`}></i>
                                </button>
                                <button
                                  onClick={() => {
                                    setInviteCodeToDelete({ id: inviteCode._id, code: inviteCode.code });
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg transition-colors"
                                  title="Delete Code"
                                >
                                  <i className="fa fa-trash text-red-400"></i>
                                </button>
                              </div>
                              {copiedItem === `invite-${inviteCode._id}` && (
                                <span className="text-green-400 text-xs font-medium">Copied to clipboard</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination */}
                  {inviteCodesPagination && inviteCodesPagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-700/50">
                      <button
                        onClick={() => loadInviteCodes(inviteCodesPagination.currentPage - 1)}
                        disabled={!inviteCodesPagination.hasPrevPage}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          inviteCodesPagination.hasPrevPage
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <i className="fa fa-chevron-left mr-1"></i>
                        Previous
                      </button>
                      <span className="text-gray-400 px-4">
                        Page {inviteCodesPagination.currentPage} of {inviteCodesPagination.totalPages}
                      </span>
                      <button
                        onClick={() => loadInviteCodes(inviteCodesPagination.currentPage + 1)}
                        disabled={!inviteCodesPagination.hasNextPage}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          inviteCodesPagination.hasNextPage
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Next
                        <i className="fa fa-chevron-right ml-1"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Share Community Link */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Share Community Link</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-blue-400 border border-white/10 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '', 'share-modal')}
                    className={`px-4 py-3 rounded-xl transition-colors ${
                      copiedItem === 'share-modal'
                        ? 'bg-green-600/20 border border-green-600/30'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title="Copy link"
                  >
                    <i className={`fa ${copiedItem === 'share-modal' ? 'fa-check text-green-400' : 'fa-copy text-white'}`}></i>
                  </button>
                </div>
                {copiedItem === 'share-modal' && (
                  <p className="text-green-400 text-sm font-medium">Copied to clipboard</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invite Code Confirmation Modal */}
      {showDeleteConfirm && inviteCodeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="relative max-w-md w-full backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl p-8 border border-red-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/50">
                <i className="fa fa-exclamation-triangle text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Delete Invite Code?</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete invite code:
              </p>
              <code className="block bg-black/50 text-green-400 px-4 py-2 rounded-lg font-mono text-lg font-semibold mb-6 border border-gray-700">
                {inviteCodeToDelete.code}
              </code>
              <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setInviteCodeToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteInviteCode}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors text-white font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expired Codes Confirmation Modal */}
      {showDeleteExpiredConfirm && expiredCodesCount > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeleteExpiredConfirm(false)}
        >
          <div
            className="relative max-w-md w-full backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl p-8 border border-red-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/50">
                <i className="fa fa-exclamation-triangle text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Delete Expired Codes?</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete all {expiredCodesCount} expired invite code{expiredCodesCount !== 1 ? 's' : ''}?
              </p>
              <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteExpiredConfirm(false)}
                  disabled={deletingExpired}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteExpiredCodes}
                  disabled={deletingExpired}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {deletingExpired ? (
                    <>
                      <i className="fa fa-spinner fa-spin mr-2"></i>
                      Deleting...
                    </>
                  ) : (
                    'Delete All'
                  )}
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
          onClick={() => {
            setShowRequestModal(false);
            setNewlyCreatedInviteCode(null);
          }}
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
              <p className="text-gray-300 mb-6 text-lg">
                {requestModalMessage}
              </p>
              
              {/* Show invite code link for newly created codes */}
              {requestModalType === 'success' && newlyCreatedInviteCode && (
                <div className="mb-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-gray-400 text-sm mb-2">Invite Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black/50 text-green-400 rounded-lg font-mono text-sm border border-gray-700 break-all">
                      https://tinyurl.com/linescad/{newlyCreatedInviteCode}
                    </code>
                    <button
                      onClick={() => {
                        const link = `https://tinyurl.com/linescad/${newlyCreatedInviteCode}`;
                        copyToClipboard(link, 'invite-success');
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        copiedItem === 'invite-success'
                          ? 'bg-green-600/20 border border-green-600/30'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      title="Copy Link"
                    >
                      <i className={`fa ${copiedItem === 'invite-success' ? 'fa-check text-green-400' : 'fa-copy text-white'}`}></i>
                    </button>
                  </div>
                  {copiedItem === 'invite-success' && (
                    <p className="text-green-400 text-xs font-medium mt-2">Copied to clipboard</p>
                  )}
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setNewlyCreatedInviteCode(null);
                }}
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

      {/* Edit Department Modal */}
      {showEditDepartmentModal && editingDepartment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowEditDepartmentModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-lg w-full my-8 border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <i className="fa fa-pencil-alt text-2xl text-blue-400"></i>
                <h3 className="text-2xl font-bold text-white">Edit Department</h3>
              </div>
              <button
                onClick={() => setShowEditDepartmentModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="fa fa-times text-xl"></i>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingDepartment || !hash) return;

                setSavingDepartment(true);
                try {
                  const communityId = decodeCommunityHash(hash);
                  
                  // Convert components map to array format
                  const components = Object.entries(editDeptComponents).map(([name, enabled]) => ({
                    name,
                    enabled
                  }));
                  
                  const payload = {
                    name: editDeptName.trim(),
                    description: editDeptDescription.trim(),
                    image: editDeptImage || editingDepartment.imageLink || editingDepartment.image,
                    approvalRequired: editDeptApprovalRequired,
                    isPrivate: editDeptApprovalRequired, // Also send as isPrivate for backend compatibility
                    template: {
                      ...(typeof editingDepartment.template === 'object' ? editingDepartment.template : {}),
                      components: components
                    }
                  };

                  const response = await fetch(`/api/community/${communityId}/departments/${editingDepartment._id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                  });

                  if (!response.ok) {
                    let errorMessage = 'Failed to update department';
                    try {
                      const errorText = await response.text();
                      try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                      } catch {
                        errorMessage = errorText || errorMessage;
                      }
                    } catch {
                      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                  }

                  // Update the department in local state to reflect changes immediately
                  setDepartments(prevDepartments => 
                    prevDepartments.map(dept => 
                      dept._id === editingDepartment._id 
                        ? { 
                            ...dept, 
                            name: editDeptName.trim(),
                            description: editDeptDescription.trim(),
                            image: editDeptImage || editingDepartment.imageLink || editingDepartment.image,
                            imageLink: editDeptImage || editingDepartment.imageLink || editingDepartment.image,
                            isPrivate: editDeptApprovalRequired,
                            approvalRequired: editDeptApprovalRequired,
                            template: {
                              ...(typeof dept.template === 'object' ? dept.template : { name: typeof dept.template === 'string' ? dept.template : '' }),
                              components: components
                            }
                          }
                        : dept
                    )
                  );

                  setShowEditDepartmentModal(false);
                  setRequestModalType('success');
                  setRequestModalMessage('Department updated successfully!');
                  setShowRequestModal(true);
                } catch (error: any) {
                  console.error('Error updating department:', error);
                  setRequestModalType('error');
                  setRequestModalMessage(error.message || 'Failed to update department');
                  setShowRequestModal(true);
                } finally {
                  setSavingDepartment(false);
                }
              }}
              className="space-y-4"
            >
              {/* Department Image */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Department Photo</label>
                <div className="relative w-full border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50 hover:border-blue-500 transition cursor-pointer overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {editDeptImage ? (
                    <img src={editDeptImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <i className="fa fa-camera text-4xl text-gray-400 mb-2"></i>
                      <p className="text-gray-400 text-sm">Click to upload photo (16:9)</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!file.type.startsWith('image/')) {
                        setRequestModalType('error');
                        setRequestModalMessage('Please select a valid image file');
                        setShowRequestModal(true);
                        return;
                      }

                      if (file.size > 5 * 1024 * 1024) {
                        setRequestModalType('error');
                        setRequestModalMessage('Image must be less than 5MB');
                        setShowRequestModal(true);
                        return;
                      }

                      try {
                        // Upload to Cloudinary
                        const signatureResponse = await fetch('/api/cloudinary/generate-signature', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                        });

                        if (!signatureResponse.ok) {
                          throw new Error('Failed to get signature');
                        }

                        const { timestamp, signature } = await signatureResponse.json();
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const cloudinaryApiKey = (window as any).CLOUDINARY_API_KEY || '';
                        const cloudinaryUploadPreset = (window as any).CLOUDINARY_UPLOAD_PRESET || '';
                        const cloudinaryCloudName = (window as any).CLOUDINARY_CLOUD_NAME || '';
                        
                        formData.append('api_key', cloudinaryApiKey);
                        formData.append('timestamp', timestamp);
                        formData.append('signature', signature);
                        formData.append('upload_preset', cloudinaryUploadPreset);

                        const cloudinaryResponse = await fetch(
                          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
                          { method: 'POST', body: formData }
                        );

                        const result = await cloudinaryResponse.json();
                        if (result.error) throw new Error(result.error.message);
                        
                        setEditDeptImage(result.secure_url);
                      } catch (error: any) {
                        console.error('Upload error:', error);
                        setRequestModalType('error');
                        setRequestModalMessage(error.message || 'Upload failed');
                        setShowRequestModal(true);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Template Name (Read-only) */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Department Template</label>
                <div className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 flex items-center gap-2">
                  <i className="fa fa-tag"></i>
                  <span>{editingDepartment?.template && typeof editingDepartment.template === 'object' ? editingDepartment.template.name : typeof editingDepartment?.template === 'string' ? editingDepartment.template : 'Unknown'}</span>
                  <span className="ml-auto text-xs text-gray-500">Read-only</span>
                </div>
              </div>

              {/* Department Name */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Department Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Description</label>
                <textarea
                  value={editDeptDescription}
                  onChange={(e) => setEditDeptDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter department description"
                />
              </div>

              {/* Visibility Toggle */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Visibility</label>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${!editDeptApprovalRequired ? 'text-blue-400' : 'text-gray-400'}`}>Public</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDeptApprovalRequired}
                      onChange={(e) => setEditDeptApprovalRequired(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-all peer-checked:translate-x-5"></div>
                  </label>
                  <span className={`text-sm font-medium ${editDeptApprovalRequired ? 'text-blue-400' : 'text-gray-400'}`}>Private</span>
                </div>
              </div>

              {/* Components */}
              <div>
                <label className="block text-gray-300 mb-3 text-sm font-medium">Components</label>
                <div className="space-y-3">
                  {Object.keys(editDeptComponents).length === 0 ? (
                    <div className="text-gray-400 text-sm italic p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      No components available for this department template
                    </div>
                  ) : (
                    Object.keys(editDeptComponents).map((componentName) => {
                      const displayInfo = getComponentDisplayInfo(componentName);
                      return (
                        <div key={componentName} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${displayInfo.bgColor} rounded-lg flex items-center justify-center`}>
                              <i className={`fa ${displayInfo.icon} ${displayInfo.iconColor}`}></i>
                            </div>
                            <span className="text-white font-medium">{displayInfo.label}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDeptComponents[componentName] ?? false}
                              onChange={(e) => {
                                setEditDeptComponents(prev => ({
                                  ...prev,
                                  [componentName]: e.target.checked
                                }));
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-all peer-checked:translate-x-5"></div>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteDepartmentConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditDepartmentModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDepartment || !editDeptName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {savingDepartment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation Modal */}
      {showDeleteDepartmentConfirm && editingDepartment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deletingDepartment && setShowDeleteDepartmentConfirm(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full border border-red-700/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                <i className="fa fa-exclamation-triangle text-2xl text-red-500"></i>
              </div>
              <h3 className="text-2xl font-bold text-white">Delete Department</h3>
            </div>

            <p className="text-gray-300 mb-2">
              Are you sure you want to delete <span className="font-semibold text-white">{editingDepartment.name}</span>?
            </p>

            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm font-medium flex items-start gap-2">
                <i className="fa fa-info-circle mt-0.5"></i>
                <span>This action is irreversible. All department data, members, and settings will be permanently deleted.</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteDepartmentConfirm(false)}
                disabled={deletingDepartment}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingDepartment || !hash) return;

                  setDeletingDepartment(true);
                  try {
                    const communityId = decodeCommunityHash(hash);
                    const response = await fetch(`/api/community/${communityId}/departments/${editingDepartment._id}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                    });

                    if (!response.ok) {
                      let errorMessage = 'Failed to delete department';
                      try {
                        const errorText = await response.text();
                        try {
                          const errorData = JSON.parse(errorText);
                          errorMessage = errorData.error || errorData.message || errorMessage;
                        } catch {
                          errorMessage = errorText || errorMessage;
                        }
                      } catch {
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                      }
                      throw new Error(errorMessage);
                    }

                    // Update local state to remove the department
                    setDepartments(prevDepartments =>
                      prevDepartments.filter(dept => dept._id !== editingDepartment._id)
                    );

                    setShowDeleteDepartmentConfirm(false);
                    setShowEditDepartmentModal(false);
                    setRequestModalType('success');
                    setRequestModalMessage('Department deleted successfully!');
                    setShowRequestModal(true);
                  } catch (error: any) {
                    console.error('Error deleting department:', error);
                    setRequestModalType('error');
                    setRequestModalMessage(error.message || 'Failed to delete department');
                    setShowRequestModal(true);
                  } finally {
                    setDeletingDepartment(false);
                  }
                }}
                disabled={deletingDepartment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {deletingDepartment ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa fa-trash"></i>
                    Delete Department
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
