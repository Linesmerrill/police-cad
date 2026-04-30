'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';
import {
  FireIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useFeatureRequestSocket } from '@/app/hooks/useFeatureRequestSocket';
import { useRefetchOnFocus } from '@/app/hooks/useRefetchOnFocus';

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
  open:         { label: 'Open',            color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  planned:      { label: 'Planned',         color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  beta_testing: { label: 'In Beta Testing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  released:     { label: 'Released',        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  declined:     { label: 'Declined',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  merged:       { label: 'Merged',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const SORT_OPTIONS = [
  { key: 'trending', label: 'Trending', icon: FireIcon },
  { key: 'top',      label: 'Top',      icon: ArrowTrendingUpIcon },
  { key: 'newest',   label: 'Newest',   icon: ClockIcon },
];

const STATUS_FILTERS = [
  { key: '',             label: 'All Statuses' },
  { key: 'open',         label: 'Open' },
  { key: 'planned',      label: 'Planned' },
  { key: 'beta_testing', label: 'In Beta Testing' },
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

// ── Client-side sort (mirrors backend so optimistic re-order matches) ─
function sortRequestsClient(items: FeatureRequest[], sortKey: string): FeatureRequest[] {
  const arr = [...items];
  const now = Date.now();
  if (sortKey === 'top') {
    arr.sort((a, b) => {
      if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }
  if (sortKey === 'newest') {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return arr;
  }
  // trending — HN-style: (votes + comments*0.5) / (ageHours + 2)^1.5
  const score = (r: FeatureRequest) => {
    const ageH = Math.max(0, (now - new Date(r.createdAt).getTime()) / 3_600_000);
    return (r.upvoteCount + r.commentCount * 0.5) / Math.pow(ageH + 2, 1.5);
  };
  arr.sort((a, b) => score(b) - score(a));
  return arr;
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
function UpvoteButton({ count, voted, onClick, disabled, status }: {
  count: number; voted: boolean; onClick: () => void; disabled?: boolean; status?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const isClosed = status === 'released' || status === 'declined';
  const closedColor = status === 'released' ? '#10b981' : status === 'declined' ? '#ef4444' : undefined;
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
        border: isClosed
          ? `1px solid ${closedColor}30`
          : voted
            ? '1px solid rgba(251,191,36,0.5)'
            : hovering
              ? '1px solid rgba(255,255,255,0.25)'
              : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.6rem',
        backgroundColor: isClosed
          ? `${closedColor}12`
          : voted
            ? 'rgba(251,191,36,0.12)'
            : hovering
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: isClosed ? 0.6 : 1,
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <ChevronUpIcon style={{
        width: '18px',
        height: '18px',
        color: isClosed ? (closedColor + '90') : voted ? '#fbbf24' : hovering ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
        transition: 'color 0.2s, transform 0.2s',
        transform: hovering && !voted && !isClosed ? 'translateY(-1px)' : 'none',
      }} />
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 700,
        fontFamily: FONT,
        color: isClosed ? (closedColor + '90') : voted ? '#fbbf24' : 'rgba(255,255,255,0.7)',
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
  const isClosed = item.status === 'released' || item.status === 'declined';
  const closedColor = item.status === 'released' ? '#10b981' : item.status === 'declined' ? '#ef4444' : undefined;

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
          position: 'relative',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          padding: '1.25rem',
          backgroundColor: isClosed
            ? (hovered ? `${closedColor}14` : `${closedColor}0a`)
            : (hovered ? 'rgba(15,15,20,0.75)' : 'rgba(15,15,20,0.5)'),
          border: isClosed
            ? `1px solid ${closedColor}${hovered ? '35' : '20'}`
            : hovered
              ? '1px solid rgba(251,191,36,0.25)'
              : '1px solid rgba(59,130,246,0.15)',
          borderRadius: '0.75rem',
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          overflow: 'hidden',
        }}>
          {/* Released sparkles */}
          {item.status === 'released' && (
            <>
              {[
                { top: '8%', left: '75%', delay: '0s', size: 10, char: '✦' },
                { top: '55%', left: '88%', delay: '1.2s', size: 8, char: '✦' },
                { top: '15%', left: '93%', delay: '2.4s', size: 12, char: '✦' },
                { top: '70%', left: '72%', delay: '0.6s', size: 7, char: '✦' },
                { top: '35%', left: '96%', delay: '1.8s', size: 9, char: '✦' },
                { top: '80%', left: '83%', delay: '0.3s', size: 6, char: '·' },
                { top: '5%', left: '85%', delay: '2.0s', size: 8, char: '·' },
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
                  {s.char}
                </span>
              ))}
            </>
          )}
          {/* Vote column */}
          <UpvoteButton
            count={item.upvoteCount}
            voted={item.hasVoted}
            onClick={() => onVote(item._id)}
            disabled={['released', 'declined', 'merged'].includes(item.status)}
            status={item.status}
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
                color: isClosed
                  ? (hovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)')
                  : (hovered ? '#fbbf24' : 'rgba(255,255,255,0.92)'),
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
              color: isClosed ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)',
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

// ── Released: Card / Skeleton / Carousel ──────────────────────────
function formatReleaseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ReleasedCard({ item, delayMs }: { item: FeatureRequest; delayMs: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      data-released-card
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: delayMs / 1000, ease: 'easeOut' }}
      style={{
        flex: '0 0 auto',
        width: '300px',
        scrollSnapAlign: 'start',
      }}
    >
      <Link
        href={`/feature-requests/${item._id}`}
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          position: 'relative',
          height: '178px',
          padding: '0.95rem 1rem 0.85rem',
          backgroundColor: hovered ? 'rgba(16,185,129,0.07)' : 'rgba(15,18,16,0.55)',
          border: `1px solid rgba(16,185,129,${hovered ? '0.42' : '0.22'})`,
          borderRadius: '0.7rem',
          transition: 'background-color 0.25s, border-color 0.25s, transform 0.25s, box-shadow 0.25s',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 8px 28px rgba(16,185,129,0.18), inset 0 1px 0 rgba(16,185,129,0.12)'
            : 'inset 0 1px 0 rgba(16,185,129,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'pointer',
        }}>
          {/* Top emerald rule */}
          <span aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '2px',
            background: hovered
              ? 'linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.5) 50%, transparent 100%)',
            transition: 'background 0.25s',
            pointerEvents: 'none',
          }} />

          {/* Released pill + date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.55rem',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.18rem 0.55rem',
              fontSize: '0.62rem',
              fontWeight: 800,
              fontFamily: FONT,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#10b981',
              background: 'rgba(16,185,129,0.13)',
              border: '1px solid rgba(16,185,129,0.32)',
              borderRadius: '999px',
            }}>
              <span style={{
                width: '5px', height: '5px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16,185,129,0.7)',
              }} />
              Released
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.4)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatReleaseDate(item.updatedAt)}
            </span>
          </div>

          {/* Title */}
          <h3 style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 600,
            fontFamily: FONT,
            color: hovered ? '#ffffff' : 'rgba(255,255,255,0.92)',
            lineHeight: 1.32,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'color 0.2s',
          }}>
            {item.title}
          </h3>

          <div style={{ flex: 1 }} />

          {/* Suggested by */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.55rem',
            minWidth: 0,
          }}>
            {item.author.profilePicture ? (
              <img
                src={item.author.profilePicture}
                alt=""
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(16,185,129,0.4)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16,185,129,0.18)',
                border: '1px solid rgba(16,185,129,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#10b981',
                fontFamily: FONT,
                flexShrink: 0,
              }}>
                {item.author.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <span style={{
              fontSize: '0.74rem',
              fontFamily: FONT,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Suggested by </span>
              <span style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
                {item.author.username || 'Unknown'}
              </span>
            </span>
          </div>

          {/* Footer meta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(16,185,129,0.14)',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.55)',
            }}>
              <ChevronUpIcon style={{ width: '12px', height: '12px', color: 'rgba(16,185,129,0.75)' }} />
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{item.upvoteCount}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>votes</span>
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.55)',
            }}>
              <ChatBubbleLeftIcon style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{item.commentCount}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ReleasedSkeleton({ delayMs = 0 }: { delayMs?: number }) {
  const bar = (w: string, h = '10px') => ({
    width: w,
    height: h,
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    animation: `pulse 2.4s ease-in-out ${delayMs}ms infinite`,
  } as const);

  return (
    <div
      aria-hidden
      style={{
        flex: '0 0 auto',
        width: '300px',
        height: '178px',
        padding: '0.95rem 1rem 0.85rem',
        backgroundColor: 'rgba(15,18,16,0.55)',
        border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: '0.7rem',
        scrollSnapAlign: 'start',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top emerald rule (no pulse — matches real card) */}
      <span aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.35) 50%, transparent 100%)',
      }} />

      {/* Pill + date row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.85rem',
      }}>
        <div style={{
          width: '74px',
          height: '18px',
          borderRadius: '999px',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.22)',
          animation: `pulse 2.4s ease-in-out ${delayMs}ms infinite`,
        }} />
        <div style={bar('38px', '10px')} />
      </div>

      {/* Title — 2 lines */}
      <div style={{ ...bar('92%', '12px'), marginBottom: '0.4rem' }} />
      <div style={bar('60%', '12px')} />

      <div style={{ flex: 1 }} />

      {/* Suggested by row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.55rem',
      }}>
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.14)',
          border: '1px solid rgba(16,185,129,0.3)',
          animation: `pulse 2.4s ease-in-out ${delayMs}ms infinite`,
          flexShrink: 0,
        }} />
        <div style={bar('140px', '10px')} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid rgba(16,185,129,0.14)',
      }}>
        <div style={bar('48px', '10px')} />
        <div style={bar('28px', '10px')} />
      </div>
    </div>
  );
}

function ReleasedCarousel({ items, totalCount, loading }: {
  items: FeatureRequest[];
  totalCount: number;
  loading: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateAffordances = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateAffordances();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateAffordances, { passive: true });
    window.addEventListener('resize', updateAffordances);
    return () => {
      el.removeEventListener('scroll', updateAffordances);
      window.removeEventListener('resize', updateAffordances);
    };
  }, [updateAffordances, items.length, loading]);

  // Hide entire section when there's nothing to celebrate
  if (!loading && items.length === 0) return null;

  const scrollByCard = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('[data-released-card]') as HTMLElement | null;
    const step = (card?.offsetWidth || 300) + 14; // card width + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-label="Recently shipped feature requests"
      style={{ marginBottom: '1.75rem' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        marginBottom: '0.85rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          <span aria-hidden style={{
            position: 'relative',
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            animation: 'livePulse 2.1s ease-out infinite',
          }} />
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: FONT,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#10b981',
            whiteSpace: 'nowrap',
          }}>
            Recently Shipped
          </span>
        </div>

        <h2 style={{
          margin: 0,
          fontSize: '0.95rem',
          fontWeight: 600,
          fontFamily: FONT,
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.35,
          flex: '1 1 auto',
          minWidth: '180px',
        }}>
          From your ideas
          <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
            {' '}— thanks for making the CAD better.
          </span>
        </h2>

        {totalCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '0.3rem',
            padding: '0.28rem 0.65rem',
            fontSize: '0.72rem',
            fontFamily: FONT,
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.22)',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            <span style={{
              fontWeight: 700,
              color: '#10b981',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {totalCount}
            </span>
            shipped
          </span>
        )}
      </div>

      {/* Rail */}
      <div style={{ position: 'relative' }}>
        <div
          ref={railRef}
          className="released-rail"
          style={{
            display: 'flex',
            gap: '0.85rem',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            paddingBottom: '0.4rem',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {loading && items.length === 0
            ? [0, 1, 2, 3].map(i => <ReleasedSkeleton key={i} delayMs={i * 150} />)
            : items.map((it, idx) => (
                <ReleasedCard key={it._id} item={it} delayMs={idx * 45} />
              ))
          }
        </div>

        {/* Edge fades */}
        <div aria-hidden style={{
          position: 'absolute',
          top: 0, bottom: '0.4rem', left: 0,
          width: '36px',
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0) 100%)',
          opacity: canLeft ? 1 : 0,
          transition: 'opacity 0.2s',
        }} />
        <div aria-hidden style={{
          position: 'absolute',
          top: 0, bottom: '0.4rem', right: 0,
          width: '36px',
          pointerEvents: 'none',
          background: 'linear-gradient(270deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0) 100%)',
          opacity: canRight ? 1 : 0,
          transition: 'opacity 0.2s',
        }} />

        {/* Arrow buttons */}
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Scroll released features left"
            style={{
              position: 'absolute',
              top: '50%',
              left: '6px',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(16,185,129,0.32)',
              background: 'rgba(8,12,10,0.88)',
              backdropFilter: 'blur(8px)',
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
            }}
          >
            <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Scroll released features right"
            style={{
              position: 'absolute',
              top: '50%',
              right: '6px',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(16,185,129,0.32)',
              background: 'rgba(8,12,10,0.88)',
              backdropFilter: 'blur(8px)',
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
            }}
          >
            <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
          </button>
        )}
      </div>
    </motion.section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function FeatureRequestsPage() {
  return (
    <Suspense>
      <FeatureRequests />
    </Suspense>
  );
}

function FeatureRequests() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial filter values from URL query params
  const validSorts = SORT_OPTIONS.map(o => o.key);
  const validStatuses = STATUS_FILTERS.map(f => f.key);
  const initialSort = validSorts.includes(searchParams.get('sort') || '') ? searchParams.get('sort')! : 'trending';
  const initialStatus = validStatuses.includes(searchParams.get('status') || '') ? searchParams.get('status')! : '';
  const initialMine = searchParams.get('mine') === '1';

  // State
  const [currentUser, setCurrentUser] = useState<{ _id: string; username?: string; profilePicture?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(initialSort);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [mineOnly, setMineOnly] = useState(initialMine);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recently-released celebration carousel
  const [recentlyReleased, setRecentlyReleased] = useState<FeatureRequest[]>([]);
  const [recentlyReleasedTotal, setRecentlyReleasedTotal] = useState(0);
  const [recentlyReleasedLoading, setRecentlyReleasedLoading] = useState(true);

  // Sync sort & status filter to URL query params
  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== 'trending') params.set('sort', sort);
    if (statusFilter) params.set('status', statusFilter);
    if (mineOnly) params.set('mine', '1');
    const qs = params.toString();
    const newPath = '/feature-requests' + (qs ? '?' + qs : '');
    router.replace(newPath, { scroll: false });
  }, [sort, statusFilter, mineOnly, router]);

  // Real-time updates via Socket.IO
  useFeatureRequestSocket({
    room: 'listing',
    events: {
      feature_request_created: (data: { featureRequest: FeatureRequest }) => {
        if (mineOnly && (!currentUser || data.featureRequest.author?._id !== currentUser._id)) {
          return;
        }
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
        // Any flip into or out of "released" changes the celebration rail
        if (data.status === 'released' || recentlyReleased.some(r => r._id === data.featureRequestId)) {
          fetchRecentlyReleased();
        }
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
          setCurrentUser({
            _id: user._id || user.id,
            username: user.username,
            profilePicture: user.profilePicture || undefined,
          });
        } else if (mineOnly) {
          // Drop the filter if the user isn't signed in.
          setMineOnly(false);
        }
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Stale-while-revalidate: only show the skeleton on the very first fetch.
  // Background refetches (auth resolving with a userId, focus refetch, socket
  // events) keep the existing list visible so we don't get a content -> skeleton
  // -> content flash on Next.js client-side route transitions or auth resolution.
  const requestsRef = useRef<FeatureRequest[]>([]);
  requestsRef.current = requests;

  // Fetch feature requests — only after auth check completes
  const fetchRequests = useCallback(async () => {
    if (!authReady) return;
    if (requestsRef.current.length === 0) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort,
      });
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedQuery) params.set('q', debouncedQuery);
      // Hide Released items from the default list — they live in the
      // celebration carousel above. Surface them only when the user explicitly
      // filters to Released, picks any status, or runs a search.
      if (!statusFilter && !debouncedQuery) params.set('excludeStatus', 'released');
      if (currentUser) params.set('userId', currentUser._id);
      if (mineOnly && currentUser) params.set('authorId', currentUser._id);

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
  }, [authReady, page, sort, statusFilter, debouncedQuery, mineOnly, currentUser]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useRefetchOnFocus(fetchRequests, authReady);

  // Fetch the latest released items for the celebration carousel
  const fetchRecentlyReleased = useCallback(async () => {
    if (!authReady) return;
    try {
      const params = new URLSearchParams({
        status: 'released',
        sort: 'newest',
        limit: '8',
        page: '1',
      });
      if (currentUser) params.set('userId', currentUser._id);
      const res = await fetch(`/api/v2/feature-requests?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch released');
      const data: ListResponse = await res.json();
      setRecentlyReleased(data.data || []);
      setRecentlyReleasedTotal(data.totalCount || 0);
    } catch {
      setRecentlyReleased([]);
      setRecentlyReleasedTotal(0);
    } finally {
      setRecentlyReleasedLoading(false);
    }
  }, [authReady, currentUser]);

  useEffect(() => { fetchRecentlyReleased(); }, [fetchRecentlyReleased]);

  // Vote handler
  const handleVote = async (id: string) => {
    if (!currentUser) {
      router.push('/login?redirect=/feature-requests');
      return;
    }
    if (votingIds.has(id)) return;

    setVotingIds(prev => new Set(prev).add(id));

    // Optimistic update — bump the count AND re-sort so the user sees their
    // own vote move the item into its new position. Layout animation on the
    // wrapper smooths the visual swap.
    setRequests(prev => sortRequestsClient(
      prev.map(r => r._id !== id ? r : {
        ...r,
        hasVoted: !r.hasVoted,
        upvoteCount: r.hasVoted ? r.upvoteCount - 1 : r.upvoteCount + 1,
      }),
      sort,
    ));

    try {
      const res = await fetch(`/api/v1/feature-requests/${id}/vote`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(prev => sortRequestsClient(
        prev.map(r => r._id !== id ? r : { ...r, hasVoted: data.hasVoted, upvoteCount: data.upvoteCount }),
        sort,
      ));
    } catch {
      // Revert optimistic update
      setRequests(prev => sortRequestsClient(
        prev.map(r => r._id !== id ? r : {
          ...r,
          hasVoted: !r.hasVoted,
          upvoteCount: r.hasVoted ? r.upvoteCount - 1 : r.upvoteCount + 1,
        }),
        sort,
      ));
    } finally {
      setVotingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // Defensive client-side filter: even if the API server is on an older build
  // that doesn't honor excludeStatus / authorId yet, never surface Released
  // items in the default browse view, and always honor the Mine toggle.
  const hideReleasedHere = !statusFilter && !debouncedQuery;
  const releasedFiltered = hideReleasedHere
    ? requests.filter(r => r.status !== 'released')
    : requests;
  const visibleRequests = mineOnly && currentUser
    ? releasedFiltered.filter(r => r.author?._id === currentUser._id)
    : releasedFiltered;
  // If we had to drop items the API gave us, the totalCount it returned is
  // also untrustworthy (older API ignored our filters) — fall back to the
  // visible count on the current page rather than reporting an inflated total.
  const apiHonoredFilters = visibleRequests.length === requests.length;
  const droppedCount = requests.length - visibleRequests.length;
  const visibleTotalCount = apiHonoredFilters
    ? Math.max(0, totalCount - droppedCount)
    : visibleRequests.length;
  const totalPages = Math.max(1, Math.ceil(visibleTotalCount / LIMIT));
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

            {/* ── Recently Shipped Carousel ──────────────── */}
            <ReleasedCarousel
              items={recentlyReleased}
              totalCount={recentlyReleasedTotal}
              loading={recentlyReleasedLoading}
            />

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

              {/* Right side: Mine pill + Status filter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginLeft: 'auto',
              }}>
                {currentUser && (
                  <button
                    onClick={() => { setMineOnly(prev => !prev); setPage(1); }}
                    aria-pressed={mineOnly}
                    title={mineOnly ? 'Showing only your requests' : 'Show only your requests'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.4rem 0.75rem 0.4rem 0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: mineOnly ? 600 : 500,
                      fontFamily: FONT,
                      color: mineOnly ? '#3b82f6' : 'rgba(255,255,255,0.55)',
                      backgroundColor: mineOnly ? 'rgba(59,130,246,0.12)' : 'rgba(15,15,20,0.5)',
                      border: mineOnly
                        ? '1px solid rgba(59,130,246,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: mineOnly ? '0 0 14px rgba(59,130,246,0.18)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!mineOnly) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.78)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!mineOnly) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                      }
                    }}
                  >
                    {currentUser.profilePicture ? (
                      <img
                        src={currentUser.profilePicture}
                        alt=""
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: mineOnly
                            ? '1px solid rgba(59,130,246,0.6)'
                            : '1px solid rgba(255,255,255,0.15)',
                          flexShrink: 0,
                        }}
                      />
                    ) : currentUser.username ? (
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: mineOnly ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)',
                        border: mineOnly
                          ? '1px solid rgba(59,130,246,0.55)'
                          : '1px solid rgba(255,255,255,0.15)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        fontFamily: FONT,
                        color: mineOnly ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                        flexShrink: 0,
                      }}>
                        {currentUser.username.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserCircleIcon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    )}
                    <span>Mine</span>
                    {mineOnly && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: FONT,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#0a0a0f',
                        backgroundColor: '#3b82f6',
                        borderRadius: '999px',
                        lineHeight: 1,
                      }}>
                        {visibleTotalCount}
                      </span>
                    )}
                  </button>
                )}

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
                        maxHeight: 'min(60vh, 320px)',
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
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
            </div>

            {/* ── Results count ───────────────────────────── */}
            {!loading && (
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.8rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.35)',
              }}>
                {visibleTotalCount}{mineOnly ? ' of your' : ''} request{visibleTotalCount !== 1 ? 's' : ''}
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
              ) : visibleRequests.length === 0 ? (
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
                    {mineOnly
                      ? "You haven't submitted any requests yet"
                      : debouncedQuery || statusFilter
                        ? 'No matching requests'
                        : 'No feature requests yet'}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.45)',
                    margin: '0 0 1.5rem 0',
                  }}>
                    {mineOnly
                      ? 'Got an idea to make the CAD better? We’d love to hear it.'
                      : debouncedQuery || statusFilter
                        ? 'Try adjusting your search or filters'
                        : 'Be the first to submit a feature request!'}
                  </p>
                  {(mineOnly || !(debouncedQuery || statusFilter)) && (
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
                visibleRequests.map((item) => (
                  <motion.div
                    key={item._id}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
                    style={{ width: '100%' }}
                  >
                    <FeatureCard
                      item={item}
                      onVote={handleVote}
                    />
                  </motion.div>
                ))
              )}
            </div>

            {/* ── Pagination ─────────────────────────────── */}
            {!loading && totalPages > 1 && apiHonoredFilters && (
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
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes drift {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .released-rail {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .released-rail::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
