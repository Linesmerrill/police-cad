'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import {
  FireIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useFeatureRequestSocket } from '@/app/hooks/useFeatureRequestSocket';

// ── Types ──────────────────────────────────────────────────────────
interface UserSummary {
  _id: string;
  username: string;
  profilePicture?: string | null;
  adminRole?: string | null;
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
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: FeatureRequest[];
  totalCount: number;
  page: number;
  limit: number;
}

// ── Constants ──────────────────────────────────────────────────────
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LIMIT = 15;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',        color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  under_review: { label: 'Under Review',color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  planned:      { label: 'Planned',     color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  in_progress:  { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  released:     { label: 'Released',    color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  declined:     { label: 'Declined',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  merged:       { label: 'Merged',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const SORT_OPTIONS = [
  { key: 'trending', label: 'Trending', icon: FireIcon },
  { key: 'top',      label: 'Top',      icon: ArrowTrendingUpIcon },
  { key: 'newest',   label: 'Newest',   icon: ClockIcon },
];

const STATUS_FILTERS = [
  { key: '',             label: 'All Statuses' },
  { key: 'open',         label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'planned',      label: 'Planned' },
  { key: 'in_progress',  label: 'In Progress' },
  { key: 'released',     label: 'Released' },
  { key: 'declined',     label: 'Declined' },
];

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

// ── Status Badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      fontSize: '0.7rem',
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

// ── Upvote Button ──────────────────────────────────────────────────
function UpvoteButton({ count, voted, onClick, disabled }: {
  count: number; voted: boolean; onClick: () => void; disabled?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      disabled={disabled}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.15rem',
        width: '52px',
        minHeight: '60px',
        padding: '0.5rem 0',
        border: voted
          ? '1px solid rgba(251,191,36,0.5)'
          : hovering
            ? '1px solid rgba(255,255,255,0.25)'
            : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.6rem',
        backgroundColor: voted
          ? 'rgba(251,191,36,0.12)'
          : hovering
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <ChevronUpIcon style={{
        width: '18px',
        height: '18px',
        color: voted ? '#fbbf24' : hovering ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
        transition: 'color 0.2s, transform 0.2s',
        transform: hovering && !voted ? 'translateY(-1px)' : 'none',
      }} />
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 700,
        fontFamily: FONT,
        color: voted ? '#fbbf24' : 'rgba(255,255,255,0.7)',
        transition: 'color 0.2s',
        lineHeight: 1,
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Feature Request Card ───────────────────────────────────────────
function FeatureCard({ item, onVote, animate }: {
  item: FeatureRequest; onVote: (id: string) => void; animate?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      opacity: 1,
      transition: animate ? 'opacity 0.3s ease' : 'none',
    }}>
      <Link
        href={`/feature-requests/${item._id}`}
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          padding: '1.25rem',
          backgroundColor: hovered ? 'rgba(15,15,20,0.75)' : 'rgba(15,15,20,0.5)',
          border: hovered
            ? '1px solid rgba(251,191,36,0.25)'
            : '1px solid rgba(59,130,246,0.15)',
          borderRadius: '0.75rem',
          transition: 'all 0.25s ease',
          cursor: 'pointer',
        }}>
          {/* Vote column */}
          <UpvoteButton
            count={item.upvoteCount}
            voted={item.hasVoted}
            onClick={() => onVote(item._id)}
            disabled={['released', 'declined', 'merged'].includes(item.status)}
          />

          {/* Content column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top row: title + status */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '0.4rem',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: FONT,
                color: hovered ? '#fbbf24' : 'rgba(255,255,255,0.92)',
                transition: 'color 0.2s',
                lineHeight: 1.35,
                flex: 1,
                minWidth: 0,
              }}>
                {item.title}
              </h3>
              <div style={{ flexShrink: 0, paddingTop: '0.1rem' }}>
                <StatusBadge status={item.status} />
              </div>
            </div>

            {/* Description */}
            <p style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {item.description}
            </p>

            {/* Meta row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              {/* Author */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                {item.author.profilePicture ? (
                  <img
                    src={item.author.profilePicture}
                    alt=""
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59,130,246,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: '#3b82f6',
                    fontFamily: FONT,
                  }}>
                    {item.author.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span style={{
                  fontSize: '0.78rem',
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.45)',
                }}>
                  {item.author.username || 'Unknown'}
                </span>
                {item.author.adminRole && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.08rem 0.35rem',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    fontFamily: FONT,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    borderRadius: '999px',
                    ...(item.author.adminRole === 'owner'
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
                    {item.author.adminRole === 'owner' ? 'Admin' : 'Staff'}
                  </span>
                )}
              </div>

              {/* Time */}
              <span style={{
                fontSize: '0.75rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.3)',
              }}>
                {timeAgo(item.createdAt)}
              </span>

              {/* Comments */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginLeft: 'auto',
              }}>
                <ChatBubbleLeftIcon style={{
                  width: '14px',
                  height: '14px',
                  color: 'rgba(255,255,255,0.3)',
                }} />
                <span style={{
                  fontSize: '0.78rem',
                  fontFamily: FONT,
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  {item.commentCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function FeatureRequests() {
  const router = useRouter();

  // State
  const [currentUser, setCurrentUser] = useState<{ _id: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('trending');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time updates via Socket.IO
  useFeatureRequestSocket({
    room: 'listing',
    events: {
      feature_request_created: (data: { featureRequest: FeatureRequest }) => {
        if (!statusFilter && !debouncedQuery) {
          setTotalCount(prev => prev + 1);
          if (page === 1) {
            setRequests(prev => [data.featureRequest, ...prev].slice(0, LIMIT));
          }
        }
      },
      feature_request_voted: (data: { featureRequestId: string; upvoteCount: number }) => {
        setRequests(prev => prev.map(r =>
          r._id === data.featureRequestId ? { ...r, upvoteCount: data.upvoteCount } : r
        ));
      },
      feature_request_comment_added_summary: (data: { featureRequestId: string }) => {
        setRequests(prev => prev.map(r =>
          r._id === data.featureRequestId ? { ...r, commentCount: r.commentCount + 1 } : r
        ));
      },
      feature_request_comment_deleted_summary: (data: { featureRequestId: string }) => {
        setRequests(prev => prev.map(r =>
          r._id === data.featureRequestId ? { ...r, commentCount: Math.max(0, r.commentCount - 1) } : r
        ));
      },
      feature_request_status_changed: (data: { featureRequestId: string; status: string }) => {
        setRequests(prev => prev.map(r =>
          r._id === data.featureRequestId ? { ...r, status: data.status } : r
        ));
      },
      feature_request_updated: (data: { featureRequestId: string; title?: string; description?: string }) => {
        setRequests(prev => prev.map(r =>
          r._id === data.featureRequestId
            ? { ...r, ...(data.title !== undefined && { title: data.title }), ...(data.description !== undefined && { description: data.description }) }
            : r
        ));
      },
      feature_request_deleted: (data: { featureRequestId: string }) => {
        setRequests(prev => prev.filter(r => r._id !== data.featureRequestId));
        setTotalCount(prev => Math.max(0, prev - 1));
      },
      feature_request_merged: (data: { sourceId: string; targetId: string; targetUpvoteCount: number }) => {
        setRequests(prev => prev.filter(r => r._id !== data.sourceId));
        setTotalCount(prev => Math.max(0, prev - 1));
        setRequests(prev => prev.map(r =>
          r._id === data.targetId ? { ...r, upvoteCount: data.targetUpvoteCount } : r
        ));
      },
    },
  });

  // Check auth — must complete before first fetch
  useEffect(() => {
    fetch('/api/user/current', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const user = data?.user || data;
        if (user && (user._id || user.id)) {
          setCurrentUser({ _id: user._id || user.id });
        }
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch feature requests — only after auth check completes
  const fetchRequests = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort,
      });
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (currentUser) params.set('userId', currentUser._id);

      const res = await fetch(`/api/v2/feature-requests?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: ListResponse = await res.json();
      setRequests(data.data || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [authReady, page, sort, statusFilter, debouncedQuery, currentUser]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Vote handler
  const handleVote = async (id: string) => {
    if (!currentUser) {
      router.push('/login?redirect=/feature-requests');
      return;
    }
    if (votingIds.has(id)) return;

    setVotingIds(prev => new Set(prev).add(id));

    // Optimistic update
    setRequests(prev => prev.map(r => {
      if (r._id !== id) return r;
      return {
        ...r,
        hasVoted: !r.hasVoted,
        upvoteCount: r.hasVoted ? r.upvoteCount - 1 : r.upvoteCount + 1,
      };
    }));

    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/vote`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(prev => prev.map(r => {
        if (r._id !== id) return r;
        return { ...r, hasVoted: data.hasVoted, upvoteCount: data.upvoteCount };
      }));
    } catch {
      // Revert optimistic update
      setRequests(prev => prev.map(r => {
        if (r._id !== id) return r;
        return {
          ...r,
          hasVoted: !r.hasVoted,
          upvoteCount: r.hasVoted ? r.upvoteCount - 1 : r.upvoteCount + 1,
        };
      }));
    } finally {
      setVotingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const selectedStatusLabel = STATUS_FILTERS.find(f => f.key === statusFilter)?.label || 'All Statuses';

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

            {/* ── Header ─────────────────────────────────── */}
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem',
              paddingTop: '2rem',
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <h1 style={{
                  fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                  fontWeight: 700,
                  margin: 0,
                  fontFamily: FONT,
                  lineHeight: 1.1,
                  display: 'inline-block',
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Feature Requests
                  </span>
                </h1>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: FONT,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '999px',
                  animation: 'betaPulse 3s ease-in-out infinite',
                  whiteSpace: 'nowrap',
                }}>
                  Beta
                </span>
              </div>
              <p style={{
                margin: '0.6rem auto 0',
                fontSize: '0.95rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.55)',
                maxWidth: '600px',
              }}>
                Vote on ideas or suggest your own
              </p>

              <Link
                href={currentUser ? '/feature-requests/new' : '/login?redirect=/feature-requests/new'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  fontFamily: FONT,
                  color: '#0a0a0f',
                  backgroundColor: '#fbbf24',
                  border: 'none',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 12px rgba(251,191,36,0.3)',
                  marginTop: '1.25rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(251,191,36,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fbbf24';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(251,191,36,0.3)';
                }}
              >
                <PlusIcon style={{ width: '16px', height: '16px' }} />
                Submit Request
              </Link>
            </div>

            {/* ── Search ─────────────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <MagnifyingGlassIcon style={{
                  position: 'absolute', left: '0.9rem', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px', height: '18px',
                  color: 'rgba(255,255,255,0.35)',
                }} />
                <input
                  type="text"
                  placeholder="Search feature requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.7rem',
                    fontSize: '0.9rem',
                    fontFamily: FONT,
                    backgroundColor: 'rgba(15,15,20,0.7)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '0.6rem',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.25s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(251,191,36,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* ── Sort Tabs + Status Filter ───────────────── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              {/* Sort tabs */}
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                backgroundColor: 'rgba(15,15,20,0.5)',
                borderRadius: '0.5rem',
                padding: '0.2rem',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sort === opt.key;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => { setSort(opt.key); setPage(1); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: active ? 600 : 500,
                        fontFamily: FONT,
                        color: active ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                        backgroundColor: active ? 'rgba(251,191,36,0.12)' : 'transparent',
                        border: 'none',
                        borderRadius: '0.4rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon style={{ width: '14px', height: '14px' }} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Status filter dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStatusDropdown(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    fontFamily: FONT,
                    color: statusFilter ? STATUS_CONFIG[statusFilter]?.color || '#fff' : 'rgba(255,255,255,0.55)',
                    backgroundColor: 'rgba(15,15,20,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <FunnelIcon style={{ width: '14px', height: '14px' }} />
                  {selectedStatusLabel}
                </button>

                <AnimatePresence>
                  {showStatusDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 0.35rem)',
                        backgroundColor: 'rgba(12,12,18,0.97)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '0.6rem',
                        padding: '0.3rem',
                        minWidth: '160px',
                        zIndex: 50,
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                    >
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => { setStatusFilter(f.key); setPage(1); setShowStatusDropdown(false); }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.8rem',
                            fontFamily: FONT,
                            fontWeight: statusFilter === f.key ? 600 : 400,
                            color: statusFilter === f.key
                              ? (f.key ? STATUS_CONFIG[f.key]?.color : '#fbbf24')
                              : 'rgba(255,255,255,0.65)',
                            backgroundColor: statusFilter === f.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: 'none',
                            borderRadius: '0.35rem',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { if (statusFilter !== f.key) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                          onMouseLeave={(e) => { if (statusFilter !== f.key) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Results count ───────────────────────────── */}
            {!loading && (
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.8rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.35)',
              }}>
                {totalCount} request{totalCount !== 1 ? 's' : ''}
                {debouncedQuery ? ` matching "${debouncedQuery}"` : ''}
              </p>
            )}

            {/* ── Cards ──────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: loading && !initialLoad ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
              {loading && initialLoad ? (
                // Skeleton loaders
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.25rem',
                    backgroundColor: 'rgba(15,15,20,0.5)',
                    border: '1px solid rgba(59,130,246,0.1)',
                    borderRadius: '0.75rem',
                  }}>
                    <div style={{
                      width: '52px', height: '60px',
                      borderRadius: '0.6rem',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      animation: 'pulse 1.8s ease-in-out infinite',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: `${60 + i * 8}%`, height: '16px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        marginBottom: '0.6rem',
                        animation: 'pulse 1.8s ease-in-out infinite',
                      }} />
                      <div style={{
                        width: '90%', height: '12px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        marginBottom: '0.4rem',
                        animation: 'pulse 1.8s ease-in-out infinite',
                      }} />
                      <div style={{
                        width: '40%', height: '12px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        animation: 'pulse 1.8s ease-in-out infinite',
                      }} />
                    </div>
                  </div>
                ))
              ) : requests.length === 0 ? (
                // Empty state
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  backgroundColor: 'rgba(15,15,20,0.5)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '1rem',
                }}>
                  <div style={{
                    width: '64px', height: '64px',
                    margin: '0 auto 1.25rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(251,191,36,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <PlusIcon style={{ width: '28px', height: '28px', color: '#fbbf24' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.8)',
                    margin: '0 0 0.5rem 0',
                  }}>
                    {debouncedQuery || statusFilter ? 'No matching requests' : 'No feature requests yet'}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.45)',
                    margin: '0 0 1.5rem 0',
                  }}>
                    {debouncedQuery || statusFilter
                      ? 'Try adjusting your search or filters'
                      : 'Be the first to submit a feature request!'}
                  </p>
                  {!(debouncedQuery || statusFilter) && (
                    <Link
                      href={currentUser ? '/feature-requests/new' : '/login?redirect=/feature-requests/new'}
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
                        transition: 'all 0.2s',
                      }}
                    >
                      <PlusIcon style={{ width: '16px', height: '16px' }} />
                      Submit Request
                    </Link>
                  )}
                </div>
              ) : (
                requests.map((item) => (
                  <FeatureCard
                    key={item._id}
                    item={item}
                    onVote={handleVote}
                  />
                ))
              )}
            </div>

            {/* ── Pagination ─────────────────────────────── */}
            {!loading && totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                marginTop: '2rem',
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px', height: '34px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.4rem',
                    backgroundColor: 'rgba(15,15,20,0.5)',
                    color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                    cursor: page === 1 ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <ChevronLeftIcon style={{ width: '14px', height: '14px' }} />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  const active = pageNum === page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      style={{
                        width: '34px', height: '34px',
                        fontSize: '0.8rem',
                        fontWeight: active ? 700 : 500,
                        fontFamily: FONT,
                        color: active ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                        backgroundColor: active ? 'rgba(251,191,36,0.12)' : 'rgba(15,15,20,0.5)',
                        border: active
                          ? '1px solid rgba(251,191,36,0.35)'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0.4rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px', height: '34px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.4rem',
                    backgroundColor: 'rgba(15,15,20,0.5)',
                    color: page === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                    cursor: page === totalPages ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <ChevronRightIcon style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes betaPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.15); }
          50% { box-shadow: 0 0 12px rgba(251,191,36,0.3); }
        }
      `}</style>
    </main>
  );
}
