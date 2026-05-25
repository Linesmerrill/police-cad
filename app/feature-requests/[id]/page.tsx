'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Linkify from 'linkify-react';
import {
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/solid';
import { useFeatureRequestSocket } from '@/app/hooks/useFeatureRequestSocket';
import { useRefetchOnFocus } from '@/app/hooks/useRefetchOnFocus';

// ── Types ──────────────────────────────────────────────────────────
interface UserSummary {
  _id: string;
  username: string;
  profilePicture?: string | null;
  adminRole?: string | null;
}

interface FeatureComment {
  _id: string;
  user: UserSummary;
  content: string;
  imageUrls: string[];
  edited: boolean;
  editedAt?: string;
  createdAt: string;
}

interface MergedRequestSummary {
  _id: string;
  title: string;
}

interface FeatureRequest {
  _id: string;
  title: string;
  description: string;
  author: UserSummary;
  status: string;
  imageUrls: string[];
  upvoteCount: number;
  commentCount: number;
  hasVoted: boolean;
  mergedInto?: MergedRequestSummary | null;
  mergedFrom?: MergedRequestSummary[];
  comments: FeatureComment[];
  createdAt: string;
  updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',            color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  planned:      { label: 'Planned',         color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  beta_testing: { label: 'In Beta Testing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  released:     { label: 'Released',        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  declined:     { label: 'Declined',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  merged:       { label: 'Merged',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

// ── Helpers ────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const LINKIFY_OPTIONS = {
  target: '_blank',
  rel: 'noopener noreferrer',
  className: 'linkified',
  defaultProtocol: 'https',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Status Badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      fontFamily: FONT,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: cfg.color,
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      borderRadius: '999px',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────
function Avatar({ user, size = 32 }: { user: UserSummary; size?: number }) {
  if (user.profilePicture) {
    return (
      <img
        src={user.profilePicture}
        alt=""
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: 'rgba(59,130,246,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${size * 0.4}px`,
      fontWeight: 700,
      color: '#3b82f6',
      fontFamily: FONT,
      flexShrink: 0,
    }}>
      {user.username?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

// ── Upvote Button (larger for detail) ──────────────────────────────
function UpvoteButton({ count, voted, onClick, disabled }: {
  count: number; voted: boolean; onClick: () => void; disabled?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.1rem',
        border: voted
          ? '1px solid rgba(251,191,36,0.5)'
          : hovering
            ? '1px solid rgba(255,255,255,0.25)'
            : '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0.6rem',
        backgroundColor: voted
          ? 'rgba(251,191,36,0.12)'
          : hovering
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <ChevronUpIcon style={{
        width: '20px',
        height: '20px',
        color: voted ? '#fbbf24' : hovering ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
        transition: 'color 0.2s, transform 0.2s',
        transform: hovering && !voted ? 'translateY(-1px)' : 'none',
      }} />
      <span style={{
        fontSize: '0.95rem',
        fontWeight: 700,
        fontFamily: FONT,
        color: voted ? '#fbbf24' : 'rgba(255,255,255,0.7)',
        transition: 'color 0.2s',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 500,
        fontFamily: FONT,
        color: voted ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.35)',
      }}>
        {voted ? 'Upvoted' : 'Upvote'}
      </span>
    </button>
  );
}

// ── Image Upload Helper ───────────────────────────────────────────
async function uploadImageToCloudinary(file: File): Promise<string> {
  // 1. Get signature
  const sigRes = await fetch('/api/v1/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });
  if (!sigRes.ok) throw new Error('Failed to get upload signature');
  const { timestamp, signature, cloudName, apiKey } = await sigRes.json();

  // 2. Get config
  const cfgRes = await fetch('/api/v1/cloudinary-config', { credentials: 'include' });
  if (!cfgRes.ok) throw new Error('Failed to get cloudinary config');
  const cloudCfg = await cfgRes.json();

  // 3. Upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey || cloudCfg.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('upload_preset', cloudCfg.uploadPreset);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName || cloudCfg.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  const result = await uploadRes.json();
  if (result.error) throw new Error(result.error.message || 'Upload failed');
  return result.secure_url;
}

// ── Comment Component ─────────────────────────────────────────────
function Comment({ comment, currentUserId, isAdmin, onEdit, onDelete, onImageClick }: {
  comment: FeatureComment;
  currentUserId: string | null;
  isAdmin: boolean;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onImageClick: (images: string[], index: number) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === comment.user._id;
  const canModify = isOwner || isAdmin;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment._id, editContent.trim());
    }
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: 'rgba(15,15,20,0.4)',
        borderRadius: '0.6rem',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Avatar user={comment.user} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.35rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {comment.user.username || 'Unknown'}
            </span>
            {comment.user.adminRole && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.1rem 0.4rem',
                fontSize: '0.6rem',
                fontWeight: 700,
                fontFamily: FONT,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                borderRadius: '999px',
                ...(comment.user.adminRole === 'owner'
                  ? {
                      color: '#fbbf24',
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.25)',
                    }
                  : {
                      color: '#60a5fa',
                      background: 'rgba(96,165,250,0.12)',
                      border: '1px solid rgba(96,165,250,0.25)',
                    }),
              }}>
                {comment.user.adminRole === 'owner' ? 'Admin' : 'Staff'}
              </span>
            )}
            <span style={{
              fontSize: '0.72rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.3)',
            }}>
              {timeAgo(comment.createdAt)}
            </span>
            {comment.edited && (
              <span style={{
                fontSize: '0.68rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.25)',
                fontStyle: 'italic',
              }}>
                (edited)
              </span>
            )}
          </div>

          {canModify && !editing && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  borderRadius: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EllipsisVerticalIcon style={{
                  width: '16px', height: '16px',
                  color: 'rgba(255,255,255,0.3)',
                }} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 0.25rem)',
                      backgroundColor: 'rgba(12,12,18,0.97)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '0.5rem',
                      padding: '0.25rem',
                      minWidth: '120px',
                      zIndex: 50,
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    {isOwner && (
                      <button
                        onClick={() => { setEditing(true); setEditContent(comment.content); setShowMenu(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          width: '100%',
                          padding: '0.45rem 0.6rem',
                          fontSize: '0.8rem',
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.7)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '0.3rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <PencilIcon style={{ width: '13px', height: '13px' }} />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => { onDelete(comment._id); setShowMenu(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.8rem',
                        fontFamily: FONT,
                        color: '#ef4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '0.3rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <TrashIcon style={{ width: '13px', height: '13px' }} />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '0.6rem',
                fontSize: '0.85rem',
                fontFamily: FONT,
                backgroundColor: 'rgba(15,15,20,0.6)',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '0.5rem',
                color: '#ffffff',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.78rem',
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.78rem',
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: '#0a0a0f',
                  backgroundColor: '#fbbf24',
                  border: 'none',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              <Linkify options={LINKIFY_OPTIONS}>{comment.content}</Linkify>
            </p>
            {comment.imageUrls && comment.imageUrls.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {comment.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    onClick={() => onImageClick(comment.imageUrls, i)}
                    style={{
                      maxWidth: '200px',
                      maxHeight: '150px',
                      borderRadius: '0.4rem',
                      border: '1px solid rgba(255,255,255,0.1)',
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function FeatureRequestDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [currentUser, setCurrentUser] = useState<{ _id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [request, setRequest] = useState<FeatureRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voting, setVoting] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state for the request itself
  const [editingRequest, setEditingRequest] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm. When an admin (non-author) deletes, a reason is required
  // and forwarded to the API which stores an audit record.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonError, setDeleteReasonError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Admin status change
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Merge state (admin only)
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearchQuery, setMergeSearchQuery] = useState('');
  const [mergeSearchResults, setMergeSearchResults] = useState<FeatureRequest[]>([]);
  const [mergeSearching, setMergeSearching] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<FeatureRequest | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [merging, setMerging] = useState(false);
  const mergeSearchTimerRef = useRef<NodeJS.Timeout>();

  // Real-time updates via Socket.IO
  useFeatureRequestSocket({
    room: 'detail',
    featureRequestId: id,
    events: {
      feature_request_voted: (data: { featureRequestId: string; upvoteCount: number }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => prev ? { ...prev, upvoteCount: data.upvoteCount } : prev);
        }
      },
      feature_request_comment_added: (data: { featureRequestId: string; comment: FeatureComment }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => {
            if (!prev) return prev;
            if (prev.comments.some(c => c._id === data.comment._id)) return prev;
            return {
              ...prev,
              comments: [...prev.comments, data.comment],
              commentCount: prev.commentCount + 1,
            };
          });
        }
      },
      feature_request_comment_edited: (data: { featureRequestId: string; commentId: string; content: string }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => prev ? {
            ...prev,
            comments: prev.comments.map(c =>
              c._id === data.commentId ? { ...c, content: data.content, edited: true } : c
            ),
          } : prev);
        }
      },
      feature_request_comment_deleted: (data: { featureRequestId: string; commentId: string }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => prev ? {
            ...prev,
            comments: prev.comments.filter(c => c._id !== data.commentId),
            commentCount: Math.max(0, prev.commentCount - 1),
          } : prev);
        }
      },
      feature_request_status_changed: (data: { featureRequestId: string; status: string }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => prev ? { ...prev, status: data.status } : prev);
        }
      },
      feature_request_updated: (data: { featureRequestId: string; title?: string; description?: string }) => {
        if (data.featureRequestId === id) {
          setRequest(prev => prev ? {
            ...prev,
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
          } : prev);
        }
      },
      feature_request_deleted: (data: { featureRequestId: string }) => {
        if (data.featureRequestId === id) {
          setNotFound(true);
          setRequest(null);
        }
      },
      feature_request_merged_source: (data: { sourceId: string; targetId: string; targetTitle: string }) => {
        if (data.sourceId === id) {
          setRequest(prev => prev ? {
            ...prev,
            status: 'merged',
            mergedInto: { _id: data.targetId, title: data.targetTitle },
          } : prev);
        }
      },
      feature_request_merged_target: (data: { sourceId: string; targetId: string; sourceTitle: string; targetUpvoteCount: number }) => {
        if (data.targetId === id) {
          setRequest(prev => prev ? {
            ...prev,
            upvoteCount: data.targetUpvoteCount,
            mergedFrom: [
              ...(prev.mergedFrom || []),
              { _id: data.sourceId, title: data.sourceTitle },
            ],
          } : prev);
        }
      },
    },
  });

  // Check auth — must complete before fetch
  useEffect(() => {
    fetch('/api/user/current', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const user = data?.user || data;
        if (user && (user._id || user.id)) {
          setCurrentUser({ _id: user._id || user.id });
          if (user.isAdmin) setIsAdmin(true);
        }
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  // Fetch feature request — only after auth resolves.
  // Stale-while-revalidate: only show the skeleton on the first fetch. Subsequent
  // refetches (auth resolving with a userId, focus refetch, socket-driven refresh)
  // keep the existing content visible so we don't get a content -> skeleton -> content
  // flash on Next.js' client-side route transitions.
  const requestRef = useRef<FeatureRequest | null>(null);
  requestRef.current = request;

  const fetchRequest = useCallback(async () => {
    if (!id || !authReady) return;
    if (!requestRef.current) setLoading(true);
    try {
      const userParam = currentUser ? `?userId=${currentUser._id}` : '';
      const res = await fetch(`/api/v1/feature-requests/${id}${userParam}`, { credentials: 'include' });
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data: FeatureRequest = await res.json();
      setRequest(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, authReady, currentUser]);

  // When the route id changes (navigating between detail pages), drop stale
  // data so the new id shows a skeleton instead of the previous request.
  useEffect(() => {
    setRequest(null);
    setNotFound(false);
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);
  useRefetchOnFocus(fetchRequest, authReady && !!id);

  // Vote handler
  const handleVote = async () => {
    if (!currentUser) { router.push(`/login?redirect=/feature-requests/${id}`); return; }
    if (voting || !request) return;
    setVoting(true);

    // Optimistic
    setRequest(prev => prev ? {
      ...prev,
      hasVoted: !prev.hasVoted,
      upvoteCount: prev.hasVoted ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
    } : prev);

    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/vote`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequest(prev => prev ? { ...prev, hasVoted: data.hasVoted, upvoteCount: data.upvoteCount } : prev);
    } catch {
      setRequest(prev => prev ? {
        ...prev,
        hasVoted: !prev.hasVoted,
        upvoteCount: prev.hasVoted ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
      } : prev);
    } finally {
      setVoting(false);
    }
  };

  // Comment image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (commentImages.length >= 3) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setCommentImages(prev => [...prev, url]);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit comment
  const handleSubmitComment = async () => {
    if (!currentUser) { router.push(`/login?redirect=/feature-requests/${id}`); return; }
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim(), imageUrls: commentImages }),
      });
      if (!res.ok) throw new Error();
      // Comment will be added via Socket.IO event (feature_request_comment_added)
      setCommentText('');
      setCommentImages([]);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/comments/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      setRequest(prev => prev ? {
        ...prev,
        comments: prev.comments.map(c =>
          c._id === commentId ? { ...c, content, edited: true } : c
        ),
      } : prev);
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      setRequest(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c._id !== commentId),
        commentCount: prev.commentCount - 1,
      } : prev);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Edit request
  const handleSaveRequestEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() }),
      });
      if (!res.ok) throw new Error();
      setRequest(prev => prev ? { ...prev, title: editTitle.trim(), description: editDescription.trim() } : prev);
      setEditingRequest(false);
    } catch (err) {
      console.error('Failed to update request:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete request. Admins (non-author) must supply a reason; the API rejects
  // the call without one and writes an audit record on success.
  const handleDeleteRequest = async () => {
    const adminDelete = isAdmin && !isAuthor;
    const trimmedReason = deleteReason.trim();
    if (adminDelete && trimmedReason.length < 3) {
      setDeleteReasonError('Please provide a reason of at least 3 characters.');
      return;
    }
    setDeleting(true);
    setDeleteReasonError('');
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: adminDelete ? { 'Content-Type': 'application/json' } : undefined,
        body: adminDelete ? JSON.stringify({ reason: trimmedReason }) : undefined,
      });
      if (!res.ok) throw new Error();
      router.push('/feature-requests');
    } catch (err) {
      console.error('Failed to delete request:', err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Admin status change handler
  const handleStatusChange = async (newStatus: string) => {
    if (!request || updatingStatus) return;
    setUpdatingStatus(true);
    setShowStatusDropdown(false);
    const oldStatus = request.status;
    setRequest(prev => prev ? { ...prev, status: newStatus } : prev);
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRequest(prev => prev ? { ...prev, status: oldStatus } : prev);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAuthor = currentUser && request && currentUser._id === request.author._id;
  const isMerged = request?.status === 'merged';
  const isLocked = ['merged', 'released', 'declined'].includes(request?.status ?? '');

  // Merge search handler (debounced)
  const handleMergeSearch = (query: string) => {
    setMergeSearchQuery(query);
    clearTimeout(mergeSearchTimerRef.current);
    if (!query.trim()) {
      setMergeSearchResults([]);
      return;
    }
    mergeSearchTimerRef.current = setTimeout(async () => {
      setMergeSearching(true);
      try {
        const params = new URLSearchParams({ page: '1', limit: '10', q: query.trim() });
        const res = await fetch(`/api/v2/feature-requests?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMergeSearchResults((data.data || []).filter(
          (r: FeatureRequest) => r._id !== id && r.status !== 'merged'
        ));
      } catch {
        setMergeSearchResults([]);
      } finally {
        setMergeSearching(false);
      }
    }, 350);
  };

  // Execute merge
  const handleMerge = async () => {
    if (!mergeTarget || merging) return;
    setMerging(true);
    try {
      const res = await fetch(`/api/v1/feature-requests/${mergeTarget._id}/merge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id }),
      });
      if (!res.ok) throw new Error();
      setRequest(prev => prev ? {
        ...prev,
        status: 'merged',
        mergedInto: { _id: mergeTarget._id, title: mergeTarget.title },
      } : prev);
      setShowMergeConfirm(false);
      setShowMergeModal(false);
      setMergeTarget(null);
      setMergeSearchQuery('');
      setMergeSearchResults([]);
    } catch (err) {
      console.error('Failed to merge:', err);
    } finally {
      setMerging(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      backgroundColor: '#0a0a0f',
      position: 'relative',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(180deg, rgba(10,10,15,0.88) 0%, rgba(26,26,46,0.82) 50%, rgba(22,33,62,0.88) 100%)',
        zIndex: 1,
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />

        <div style={{
          paddingTop: '2rem',
          paddingBottom: '4rem',
          minHeight: 'calc(100vh - 80px)',
        }}>
          <div style={{
            maxWidth: 'min(100%, 52rem)',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 1.5rem)',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {/* Back link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingTop: '2rem' }}>
              <Link
                href="/feature-requests"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fbbf24'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <ArrowLeftIcon style={{ width: '14px', height: '14px' }} />
                Back to Feature Requests
              </Link>
            </div>

            {loading ? (
              <div style={{
                backgroundColor: 'rgba(15,15,20,0.5)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: '0.75rem',
                padding: '2rem',
              }}>
                <div style={{
                  width: '60%', height: '24px', borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                  marginBottom: '1rem',
                }} />
                <div style={{
                  width: '90%', height: '14px', borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                  marginBottom: '0.6rem',
                }} />
                <div style={{
                  width: '75%', height: '14px', borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                }} />
              </div>
            ) : notFound || !request ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'rgba(15,15,20,0.5)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: '1rem',
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0 0 0.5rem 0',
                }}>
                  Feature Request Not Found
                </h2>
                <p style={{
                  fontSize: '0.9rem',
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.45)',
                  margin: '0 0 1.5rem 0',
                }}>
                  This feature request may have been deleted or does not exist.
                </p>
                <Link
                  href="/feature-requests"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: '#0a0a0f',
                    backgroundColor: '#fbbf24',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeftIcon style={{ width: '14px', height: '14px' }} />
                  Back to Board
                </Link>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* ── Main Card ──────────────────────────────── */}
                <div style={{
                  position: 'relative',
                  backgroundColor: request.status === 'released'
                    ? 'rgba(16,185,129,0.04)'
                    : request.status === 'declined'
                      ? 'rgba(239,68,68,0.04)'
                      : 'rgba(15,15,20,0.5)',
                  border: request.status === 'released'
                    ? '1px solid rgba(16,185,129,0.2)'
                    : request.status === 'declined'
                      ? '1px solid rgba(239,68,68,0.2)'
                      : '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  overflow: 'hidden',
                }}>
                  {/* Released sparkles */}
                  {request.status === 'released' && (
                    <>
                      {[
                        { top: '5%', left: '80%', delay: '0s', size: 11 },
                        { top: '25%', left: '92%', delay: '1.4s', size: 9 },
                        { top: '60%', left: '85%', delay: '0.7s', size: 13 },
                        { top: '45%', left: '75%', delay: '2.1s', size: 8 },
                        { top: '80%', left: '90%', delay: '0.3s', size: 10 },
                        { top: '10%', left: '95%', delay: '1.8s', size: 7 },
                        { top: '70%', left: '78%', delay: '2.6s', size: 9 },
                        { top: '35%', left: '88%', delay: '1.0s', size: 6 },
                        { top: '90%', left: '82%', delay: '2.3s', size: 8 },
                      ].map((s, i) => (
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            top: s.top,
                            left: s.left,
                            fontSize: `${s.size}px`,
                            color: '#10b981',
                            opacity: 0,
                            pointerEvents: 'none',
                            animation: `sparkle 3s ease-in-out ${s.delay} infinite, drift 4s ease-in-out ${s.delay} infinite`,
                            textShadow: '0 0 6px rgba(16,185,129,0.6)',
                            zIndex: 1,
                          }}
                        >
                          {i % 3 === 0 ? '✦' : '·'}
                        </span>
                      ))}
                    </>
                  )}
                  {/* Merged Banner */}
                  {isMerged && request.mergedInto && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      borderRadius: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}>
                      <svg style={{ width: '16px', height: '16px', color: '#8b5cf6', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      <span style={{
                        fontSize: '0.85rem',
                        fontFamily: FONT,
                        color: 'rgba(255,255,255,0.7)',
                      }}>
                        This request has been merged into
                      </span>
                      <Link
                        href={`/feature-requests/${request.mergedInto._id}`}
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          fontFamily: FONT,
                          color: '#8b5cf6',
                          textDecoration: 'none',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#a78bfa'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
                      >
                        {request.mergedInto.title}
                      </Link>
                    </div>
                  )}

                  {/* Status + Actions Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}>
                    {isAdmin && !isMerged ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowStatusDropdown(prev => !prev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            opacity: updatingStatus ? 0.6 : 1,
                          }}
                          disabled={updatingStatus}
                          title="Change status"
                        >
                          <StatusBadge status={request.status} />
                        </button>
                        {showStatusDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.35rem)',
                            left: 0,
                            zIndex: 50,
                            backgroundColor: 'rgba(15,15,25,0.97)',
                            border: '1px solid rgba(59,130,246,0.2)',
                            borderRadius: '0.5rem',
                            padding: '0.3rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.15rem',
                            minWidth: '160px',
                            maxHeight: 'min(60vh, 320px)',
                            overflowY: 'auto',
                            overscrollBehavior: 'contain',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          }}>
                            {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'merged').map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.4rem 0.6rem',
                                  fontSize: '0.78rem',
                                  fontFamily: FONT,
                                  fontWeight: request.status === key ? 700 : 500,
                                  color: cfg.color,
                                  backgroundColor: request.status === key ? cfg.bg : 'transparent',
                                  border: 'none',
                                  borderRadius: '0.3rem',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                  if (request.status !== key) (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                  if (request.status !== key) (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                              >
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: cfg.color,
                                  flexShrink: 0,
                                }} />
                                {cfg.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowMergeModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontFamily: FONT,
                          fontWeight: 600,
                          color: '#8b5cf6',
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(139,92,246,0.3)',
                          borderRadius: '0.4rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)';
                          e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg style={{ width: '13px', height: '13px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Merge
                      </button>
                    </div>) : (
                      <StatusBadge status={request.status} />
                    )}
                    {(isAuthor || isAdmin) && !editingRequest && !isLocked && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {isAuthor && (
                        <button
                          onClick={() => {
                            setEditTitle(request.title);
                            setEditDescription(request.description);
                            setEditingRequest(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.7rem',
                            fontSize: '0.78rem',
                            fontFamily: FONT,
                            color: 'rgba(255,255,255,0.5)',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                          }}
                        >
                          <PencilIcon style={{ width: '12px', height: '12px' }} />
                          Edit
                        </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteReason('');
                            setDeleteReasonError('');
                            setShowDeleteConfirm(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.7rem',
                            fontSize: '0.78rem',
                            fontFamily: FONT,
                            color: 'rgba(239,68,68,0.7)',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '0.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <TrashIcon style={{ width: '12px', height: '12px' }} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title + Description */}
                  {editingRequest ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          fontFamily: FONT,
                          backgroundColor: 'rgba(15,15,20,0.6)',
                          border: '1px solid rgba(251,191,36,0.3)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          outline: 'none',
                          marginBottom: '0.75rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '0.7rem',
                          fontSize: '0.9rem',
                          fontFamily: FONT,
                          backgroundColor: 'rgba(15,15,20,0.6)',
                          border: '1px solid rgba(251,191,36,0.3)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingRequest(false)}
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.85rem',
                            fontFamily: FONT,
                            color: 'rgba(255,255,255,0.5)',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveRequestEdit}
                          disabled={savingEdit}
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.85rem',
                            fontFamily: FONT,
                            fontWeight: 600,
                            color: '#0a0a0f',
                            backgroundColor: '#fbbf24',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: savingEdit ? 'default' : 'pointer',
                            opacity: savingEdit ? 0.7 : 1,
                          }}
                        >
                          {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 style={{
                        margin: '0 0 0.75rem 0',
                        fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
                        fontWeight: 700,
                        fontFamily: FONT,
                        color: 'rgba(255,255,255,0.95)',
                        lineHeight: 1.3,
                      }}>
                        {request.title}
                      </h1>

                      <p style={{
                        margin: '0 0 1.25rem 0',
                        fontSize: '0.95rem',
                        fontFamily: FONT,
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        <Linkify options={LINKIFY_OPTIONS}>{request.description}</Linkify>
                      </p>
                    </>
                  )}

                  {/* Images */}
                  {request.imageUrls && request.imageUrls.length > 0 && !editingRequest && (
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '1.25rem',
                      flexWrap: 'wrap',
                    }}>
                      {request.imageUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={() => openLightbox(request.imageUrls, i)}
                          style={{
                            maxWidth: '280px',
                            maxHeight: '200px',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                          }}
                          onMouseEnter={(e) => { (e.target as HTMLImageElement).style.borderColor = 'rgba(251,191,36,0.4)'; }}
                          onMouseLeave={(e) => { (e.target as HTMLImageElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Merged Requests section (on target ticket) */}
                  {request.mergedFrom && request.mergedFrom.length > 0 && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      marginBottom: '0.5rem',
                      backgroundColor: 'rgba(139,92,246,0.05)',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: '0.5rem',
                    }}>
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        fontFamily: FONT,
                        color: 'rgba(139,92,246,0.8)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}>
                        <svg style={{ width: '13px', height: '13px' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Merged Requests ({request.mergedFrom.length})
                      </div>
                      {request.mergedFrom.map((merged) => (
                        <Link
                          key={merged._id}
                          href={`/feature-requests/${merged._id}`}
                          style={{
                            display: 'block',
                            fontSize: '0.82rem',
                            fontFamily: FONT,
                            color: 'rgba(255,255,255,0.6)',
                            textDecoration: 'none',
                            padding: '0.2rem 0',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >
                          {merged.title}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Vote + Meta Row */}
                  {!isMerged && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <UpvoteButton
                      count={request.upvoteCount}
                      voted={request.hasVoted}
                      onClick={handleVote}
                      disabled={voting || isLocked}
                    />

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}>
                      {/* Author */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Avatar user={request.author} size={24} />
                        <span style={{
                          fontSize: '0.82rem',
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.6)',
                        }}>
                          {request.author.username || 'Unknown'}
                        </span>
                        {request.author.adminRole && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.1rem 0.4rem',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            fontFamily: FONT,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase' as const,
                            borderRadius: '999px',
                            ...(request.author.adminRole === 'owner'
                              ? {
                                  color: '#fbbf24',
                                  background: 'rgba(251,191,36,0.12)',
                                  border: '1px solid rgba(251,191,36,0.25)',
                                }
                              : {
                                  color: '#60a5fa',
                                  background: 'rgba(96,165,250,0.12)',
                                  border: '1px solid rgba(96,165,250,0.25)',
                                }),
                          }}>
                            {request.author.adminRole === 'owner' ? 'Admin' : 'Staff'}
                          </span>
                        )}
                      </div>

                      <span style={{
                        fontSize: '0.78rem',
                        fontFamily: FONT,
                        color: 'rgba(255,255,255,0.3)',
                      }}>
                        {formatDate(request.createdAt)}
                      </span>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}>
                        <ChatBubbleLeftIcon style={{
                          width: '14px', height: '14px',
                          color: 'rgba(255,255,255,0.3)',
                        }} />
                        <span style={{
                          fontSize: '0.78rem',
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.35)',
                        }}>
                          {request.commentCount} comment{request.commentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* ── Delete Confirm Modal ──────────────────── */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1rem',
                      }}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: 'rgba(15,15,22,0.98)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '0.75rem',
                          padding: '1.5rem',
                          maxWidth: '400px',
                          width: '100%',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                        }}
                      >
                        <h3 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.9)',
                        }}>
                          {isAdmin && !isAuthor ? 'Delete as Admin?' : 'Delete Feature Request?'}
                        </h3>
                        <p style={{
                          margin: '0 0 1rem 0',
                          fontSize: '0.85rem',
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.5)',
                          lineHeight: 1.5,
                        }}>
                          {isAdmin && !isAuthor
                            ? 'This will permanently remove the post, its votes and comments. The action is audited — please provide a reason.'
                            : 'This action cannot be undone. All votes and comments will also be deleted.'}
                        </p>
                        {isAdmin && !isAuthor && (
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              fontFamily: FONT,
                              color: 'rgba(255,255,255,0.6)',
                              marginBottom: '0.35rem',
                              fontWeight: 600,
                            }}>
                              Reason <span style={{ color: 'rgba(239,68,68,0.8)' }}>*</span>
                            </label>
                            <textarea
                              value={deleteReason}
                              onChange={(e) => {
                                setDeleteReason(e.target.value);
                                if (deleteReasonError) setDeleteReasonError('');
                              }}
                              maxLength={1000}
                              rows={3}
                              placeholder="e.g. Abusive language in post body"
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.65rem',
                                fontSize: '0.85rem',
                                fontFamily: FONT,
                                color: 'rgba(255,255,255,0.85)',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                border: `1px solid ${deleteReasonError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '0.4rem',
                                resize: 'vertical',
                                outline: 'none',
                              }}
                            />
                            {deleteReasonError && (
                              <div style={{
                                marginTop: '0.35rem',
                                fontSize: '0.75rem',
                                color: 'rgba(239,68,68,0.85)',
                                fontFamily: FONT,
                              }}>
                                {deleteReasonError}
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.85rem',
                              fontFamily: FONT,
                              color: 'rgba(255,255,255,0.6)',
                              backgroundColor: 'transparent',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteRequest}
                            disabled={deleting}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.85rem',
                              fontFamily: FONT,
                              fontWeight: 600,
                              color: '#ffffff',
                              backgroundColor: '#ef4444',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: deleting ? 'default' : 'pointer',
                              opacity: deleting ? 0.7 : 1,
                            }}
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Merge Modal ──────────────────────────────── */}
                <AnimatePresence>
                  {showMergeModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1rem',
                      }}
                      onClick={() => {
                        if (!showMergeConfirm) {
                          setShowMergeModal(false);
                          setMergeSearchQuery('');
                          setMergeSearchResults([]);
                          setMergeTarget(null);
                        }
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: 'rgba(15,15,22,0.98)',
                          border: '1px solid rgba(139,92,246,0.25)',
                          borderRadius: '0.75rem',
                          padding: '1.5rem',
                          maxWidth: '500px',
                          width: '100%',
                          maxHeight: '80vh',
                          overflow: 'auto',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                        }}
                      >
                        {showMergeConfirm && mergeTarget ? (
                          <>
                            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 700, fontFamily: FONT, color: 'rgba(255,255,255,0.9)' }}>
                              Confirm Merge
                            </h3>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontFamily: FONT, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                              Merge <strong style={{ color: 'rgba(255,255,255,0.85)' }}>&ldquo;{request?.title}&rdquo;</strong> into
                            </p>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontFamily: FONT, color: '#8b5cf6', fontWeight: 600 }}>
                              &ldquo;{mergeTarget.title}&rdquo;
                            </p>
                            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.78rem', fontFamily: FONT, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                              Unique votes will be transferred to the target. This request will be marked as merged and become read-only.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setShowMergeConfirm(false)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                  fontFamily: FONT,
                                  color: 'rgba(255,255,255,0.6)',
                                  backgroundColor: 'transparent',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Back
                              </button>
                              <button
                                onClick={handleMerge}
                                disabled={merging}
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  fontFamily: FONT,
                                  color: '#fff',
                                  backgroundColor: '#8b5cf6',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  cursor: merging ? 'default' : 'pointer',
                                  opacity: merging ? 0.6 : 1,
                                }}
                              >
                                {merging ? 'Merging...' : 'Merge'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, fontFamily: FONT, color: 'rgba(255,255,255,0.9)' }}>
                              Merge into...
                            </h3>
                            <input
                              type="text"
                              placeholder="Search feature requests..."
                              value={mergeSearchQuery}
                              onChange={(e) => handleMergeSearch(e.target.value)}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.88rem',
                                fontFamily: FONT,
                                color: 'rgba(255,255,255,0.9)',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(139,92,246,0.2)',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; }}
                            />
                            <div style={{ marginTop: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                              {mergeSearching ? (
                                <p style={{ fontSize: '0.82rem', fontFamily: FONT, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem 0' }}>
                                  Searching...
                                </p>
                              ) : mergeSearchResults.length === 0 && mergeSearchQuery ? (
                                <p style={{ fontSize: '0.82rem', fontFamily: FONT, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem 0' }}>
                                  No matching requests found
                                </p>
                              ) : (
                                mergeSearchResults.map((result) => (
                                  <button
                                    key={result._id}
                                    onClick={() => {
                                      setMergeTarget(result);
                                      setShowMergeConfirm(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      width: '100%',
                                      padding: '0.65rem 0.75rem',
                                      marginBottom: '0.35rem',
                                      backgroundColor: 'transparent',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      borderRadius: '0.5rem',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.06)';
                                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                    }}
                                  >
                                    <span style={{ fontSize: '0.85rem', fontFamily: FONT, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                                      {result.title}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem', alignItems: 'center' }}>
                                      <StatusBadge status={result.status} />
                                      <span style={{ fontSize: '0.72rem', fontFamily: FONT, color: 'rgba(255,255,255,0.35)' }}>
                                        {result.upvoteCount} vote{result.upvoteCount !== 1 ? 's' : ''}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', fontFamily: FONT, color: 'rgba(255,255,255,0.35)' }}>
                                        {result.commentCount} comment{result.commentCount !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Comments Section ──────────────────────── */}
                <div style={{
                  backgroundColor: 'rgba(15,15,20,0.5)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    margin: '0 0 1.25rem 0',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <ChatBubbleLeftIcon style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                    Comments ({request.comments?.length || 0})
                  </h2>

                  {/* Add Comment */}
                  {isLocked ? (
                    <p style={{
                      fontSize: '0.82rem',
                      fontFamily: FONT,
                      color: 'rgba(255,255,255,0.35)',
                      fontStyle: 'italic',
                      margin: '0 0 1rem 0',
                    }}>
                      Commenting is disabled on {request.status} requests.
                    </p>
                  ) : currentUser ? (
                    <div style={{
                      marginBottom: request.comments?.length ? '1.25rem' : 0,
                      padding: '1rem',
                      backgroundColor: 'rgba(15,15,20,0.4)',
                      borderRadius: '0.6rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '0.65rem',
                          fontSize: '0.875rem',
                          fontFamily: FONT,
                          backgroundColor: 'rgba(15,15,20,0.5)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                      />

                      {/* Image previews */}
                      {commentImages.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          {commentImages.map((url, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img
                                src={url}
                                alt=""
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  borderRadius: '0.4rem',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                }}
                              />
                              <button
                                onClick={() => setCommentImages(prev => prev.filter((_, idx) => idx !== i))}
                                style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <XMarkIcon style={{ width: '12px', height: '12px', color: '#fff' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.6rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage || commentImages.length >= 3}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.78rem',
                              fontFamily: FONT,
                              color: uploadingImage ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
                              backgroundColor: 'transparent',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '0.4rem',
                              cursor: uploadingImage || commentImages.length >= 3 ? 'default' : 'pointer',
                            }}
                          >
                            <PhotoIcon style={{ width: '14px', height: '14px' }} />
                            {uploadingImage ? 'Uploading...' : 'Image'}
                          </button>
                          {commentImages.length > 0 && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontFamily: FONT,
                              color: 'rgba(255,255,255,0.3)',
                            }}>
                              {commentImages.length}/3
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || submittingComment}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            fontFamily: FONT,
                            color: !commentText.trim() ? 'rgba(255,255,255,0.3)' : '#0a0a0f',
                            backgroundColor: !commentText.trim() ? 'rgba(255,255,255,0.05)' : '#fbbf24',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: !commentText.trim() || submittingComment ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />
                          {submittingComment ? 'Posting...' : 'Comment'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(15,15,20,0.4)',
                      borderRadius: '0.6rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      marginBottom: request.comments?.length ? '1.25rem' : 0,
                    }}>
                      <p style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.85rem',
                        fontFamily: FONT,
                        color: 'rgba(255,255,255,0.5)',
                      }}>
                        Sign in to leave a comment
                      </p>
                      <Link
                        href={`/login?redirect=/feature-requests/${id}`}
                        style={{
                          fontSize: '0.85rem',
                          fontFamily: FONT,
                          fontWeight: 600,
                          color: '#fbbf24',
                          textDecoration: 'none',
                        }}
                      >
                        Log in
                      </Link>
                    </div>
                  )}

                  {/* Comments List */}
                  {request.comments && request.comments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {request.comments.map((comment) => (
                        <Comment
                          key={comment._id}
                          comment={comment}
                          currentUserId={currentUser?._id || null}
                          isAdmin={isAdmin}
                          onEdit={handleEditComment}
                          onDelete={handleDeleteComment}
                          onImageClick={openLightbox}
                        />
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      margin: '1rem 0 0 0',
                      fontSize: '0.85rem',
                      fontFamily: FONT,
                      color: 'rgba(255,255,255,0.3)',
                      textAlign: 'center',
                    }}>
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <Footer />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes drift {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* ── Image Lightbox Modal ── */}
      <AnimatePresence>
        {lightboxOpen && lightboxImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeLightbox();
              if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
              if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) setLightboxIndex(lightboxIndex + 1);
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              outline: 'none',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '50%',
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                zIndex: 10000,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <XMarkIcon style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>

            {/* Image counter */}
            {lightboxImages.length > 1 && (
              <div style={{
                position: 'absolute',
                top: '1.25rem',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.8rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.5)',
                zIndex: 10000,
              }}>
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}

            {/* Previous button */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '2.75rem',
                  height: '2.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  zIndex: 10000,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronLeftIcon style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            )}

            {/* Next button */}
            {lightboxIndex < lightboxImages.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '2.75rem',
                  height: '2.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  zIndex: 10000,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            )}

            {/* Main image */}
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              src={lightboxImages[lightboxIndex]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: '0.75rem',
                objectFit: 'contain',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
