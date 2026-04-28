'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid';

// ── Constants ──────────────────────────────────────────────────────
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SIMILAR_MIN_CHARS = 8;
const SIMILAR_DEBOUNCE_MS = 300;
const SIMILAR_LIMIT = 4;
const SIMILAR_DISMISS_KEY = 'fr-new-similar-dismissed';
const SIMILAR_DRAFT_KEY = 'fr-new-title-draft';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',          color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  planned:      { label: 'Planned',       color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  beta_testing: { label: 'In Beta',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  released:     { label: 'Released',      color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  declined:     { label: 'Declined',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  merged:       { label: 'Merged',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

interface SimilarRequest {
  _id: string;
  title: string;
  status: string;
  upvoteCount: number;
  commentCount: number;
}

// ── Image Upload Helper ───────────────────────────────────────────
async function uploadImageToCloudinary(file: File): Promise<string> {
  const sigRes = await fetch('/api/v1/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });
  if (!sigRes.ok) throw new Error('Failed to get upload signature');
  const { timestamp, signature, cloudName, apiKey } = await sigRes.json();

  const cfgRes = await fetch('/api/v1/cloudinary-config', { credentials: 'include' });
  if (!cfgRes.ok) throw new Error('Failed to get cloudinary config');
  const cloudCfg = await cfgRes.json();

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

// ── Similar Requests Panel ────────────────────────────────────────
function SimilarRow({ item }: { item: SimilarRequest }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
  const released = item.status === 'released';

  return (
    <Link
      href={`/feature-requests/${item._id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.55rem 0.65rem',
        borderRadius: '0.4rem',
        textDecoration: 'none',
        backgroundColor: hovered
          ? (released ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.06)')
          : 'transparent',
        transition: 'background-color 0.15s, transform 0.15s',
        transform: hovered ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      {/* Vote count */}
      <span style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        padding: '0.25rem 0',
        borderRadius: '0.35rem',
        backgroundColor: released ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: released
          ? '1px solid rgba(16,185,129,0.25)'
          : '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <ChevronUpIcon style={{
          width: '11px',
          height: '11px',
          color: released ? '#10b981' : 'rgba(255,255,255,0.55)',
        }} />
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          fontFamily: FONT,
          color: released ? '#10b981' : 'rgba(255,255,255,0.75)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {item.upvoteCount}
        </span>
      </span>

      {/* Title */}
      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: '0.85rem',
        fontFamily: FONT,
        color: hovered ? '#ffffff' : 'rgba(255,255,255,0.85)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.15s',
      }}>
        {item.title}
      </span>

      {/* Comments */}
      {item.commentCount > 0 && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          fontSize: '0.7rem',
          fontFamily: FONT,
          color: 'rgba(255,255,255,0.4)',
          flexShrink: 0,
        }}>
          <ChatBubbleLeftIcon style={{ width: '11px', height: '11px' }} />
          {item.commentCount}
        </span>
      )}

      {/* Status pill */}
      <span style={{
        display: 'inline-block',
        padding: '0.12rem 0.5rem',
        fontSize: '0.6rem',
        fontWeight: 700,
        fontFamily: FONT,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {cfg.label}
      </span>
    </Link>
  );
}

function SimilarRequestsPanel({ items, total, loading, visible, faded, onDismiss }: {
  items: SimilarRequest[];
  total: number;
  loading: boolean;
  visible: boolean;
  faded: boolean;
  onDismiss: () => void;
}) {
  const hasItems = items.length > 0;
  const hasReleased = items.some(i => i.status === 'released');
  // Hide entirely when not visible OR when search returned nothing — silent
  // when there are no matches keeps the empty state quiet.
  const show = visible && (loading || hasItems);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
          animate={{
            opacity: faded ? 0.5 : 1,
            y: 0,
            height: 'auto',
            marginTop: 12,
          }}
          exit={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            overflow: 'hidden',
            transition: 'opacity 0.25s',
          }}
        >
          <div style={{
            padding: '0.7rem 0.85rem 0.55rem',
            backgroundColor: hasReleased ? 'rgba(16,185,129,0.04)' : 'rgba(251,191,36,0.04)',
            border: hasReleased
              ? '1px solid rgba(16,185,129,0.22)'
              : '1px solid rgba(251,191,36,0.22)',
            borderRadius: '0.55rem',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: hasItems ? '0.5rem' : 0,
            }}>
              <SparklesIcon style={{
                width: '14px',
                height: '14px',
                color: hasReleased ? '#10b981' : '#fbbf24',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.82)',
                flex: 1,
                minWidth: 0,
              }}>
                {loading && !hasItems
                  ? 'Looking for similar requests…'
                  : hasItems
                    ? <>
                        <span style={{ color: hasReleased ? '#10b981' : '#fbbf24' }}>
                          {total > items.length ? `${total}+` : items.length}
                        </span>
                        {' '}similar request{items.length === 1 ? '' : 's'}
                        {hasReleased && (
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                            {' '}— one already shipped
                          </span>
                        )}
                      </>
                    : null}
              </span>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss similar requests"
                title="Don't show again this session"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  borderRadius: '0.25rem',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <XMarkIcon style={{ width: '12px', height: '12px' }} />
              </button>
            </div>

            {/* Rows */}
            {hasItems && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {items.map(item => <SimilarRow key={item._id} item={item} />)}
              </div>
            )}

            {/* Footer microcopy */}
            {hasItems && (
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.45rem',
                borderTop: hasReleased
                  ? '1px solid rgba(16,185,129,0.12)'
                  : '1px solid rgba(251,191,36,0.12)',
                fontSize: '0.7rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}>
                <span>Don&apos;t see yours? Keep typing.</span>
                {total > items.length && (
                  <Link
                    href={`/feature-requests?sort=top`}
                    style={{
                      color: hasReleased ? '#10b981' : '#fbbf24',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View all {total} matches →
                  </Link>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function NewFeatureRequest() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ _id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Similar-requests state
  const [similar, setSimilar] = useState<SimilarRequest[]>([]);
  const [similarTotal, setSimilarTotal] = useState(0);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarDismissed, setSimilarDismissed] = useState(false);
  const similarCacheRef = useRef<Map<string, { items: SimilarRequest[]; total: number }>>(new Map());
  const similarReqIdRef = useRef(0);

  // Restore in-progress title from sessionStorage (e.g. user clicked a
  // similar request, then back-buttoned) and remember dismissal preference.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SIMILAR_DRAFT_KEY);
      if (saved) setTitle(saved);
      if (sessionStorage.getItem(SIMILAR_DISMISS_KEY) === '1') setSimilarDismissed(true);
    } catch {}
  }, []);

  // Persist title draft so back-button preserves work.
  useEffect(() => {
    try {
      if (title) sessionStorage.setItem(SIMILAR_DRAFT_KEY, title);
      else sessionStorage.removeItem(SIMILAR_DRAFT_KEY);
    } catch {}
  }, [title]);

  // Check auth
  useEffect(() => {
    fetch('/api/user/current', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const user = data?.user || data;
        if (user && (user._id || user.id)) {
          setCurrentUser({ _id: user._id || user.id });
        } else {
          router.push('/login?redirect=/feature-requests/new');
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.push('/login?redirect=/feature-requests/new');
        setAuthChecked(true);
      });
  }, [router]);

  // Debounced similar-request lookup. Hits the existing search endpoint
  // (no new backend); cache last few queries so backspace-then-retype is
  // instant. Uses a request id to ignore out-of-order responses.
  useEffect(() => {
    const trimmed = title.trim();
    if (similarDismissed || trimmed.length < SIMILAR_MIN_CHARS) {
      setSimilar([]);
      setSimilarTotal(0);
      setSimilarLoading(false);
      return;
    }

    const cached = similarCacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      setSimilar(cached.items);
      setSimilarTotal(cached.total);
      setSimilarLoading(false);
      return;
    }

    const reqId = ++similarReqIdRef.current;
    setSimilarLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          sort: 'top',
          limit: String(SIMILAR_LIMIT),
          page: '1',
        });
        const res = await fetch(`/api/v2/feature-requests?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('lookup failed');
        const data = await res.json();
        if (reqId !== similarReqIdRef.current) return; // stale response
        const items: SimilarRequest[] = (data.data || []).map((r: any) => ({
          _id: r._id,
          title: r.title,
          status: r.status,
          upvoteCount: r.upvoteCount,
          commentCount: r.commentCount,
        }));
        const total = data.totalCount || 0;
        similarCacheRef.current.set(trimmed.toLowerCase(), { items, total });
        // Cap cache so it doesn't grow without bound.
        if (similarCacheRef.current.size > 12) {
          const firstKey = similarCacheRef.current.keys().next().value;
          if (firstKey !== undefined) similarCacheRef.current.delete(firstKey);
        }
        setSimilar(items);
        setSimilarTotal(total);
      } catch {
        if (reqId === similarReqIdRef.current) {
          setSimilar([]);
          setSimilarTotal(0);
        }
      } finally {
        if (reqId === similarReqIdRef.current) setSimilarLoading(false);
      }
    }, SIMILAR_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [title, similarDismissed]);

  const handleDismissSimilar = useCallback(() => {
    setSimilarDismissed(true);
    try { sessionStorage.setItem(SIMILAR_DISMISS_KEY, '1'); } catch {}
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrls.length >= 3) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setImageUrls(prev => [...prev, url]);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (title.trim().length > 200) { setError('Title must be under 200 characters'); return; }
    if (description.trim().length > 5000) { setError('Description must be under 5000 characters'); return; }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/feature-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          imageUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create feature request');
      }

      const data = await res.json();
      try {
        sessionStorage.removeItem(SIMILAR_DRAFT_KEY);
        sessionStorage.removeItem(SIMILAR_DISMISS_KEY);
      } catch {}
      router.push(`/feature-requests/${data._id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(251,191,36,0.2)',
          borderTop: '3px solid #fbbf24',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  if (!currentUser) return null;

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
            maxWidth: 'min(100%, 40rem)',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 1.5rem)',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {/* Back link + Beta badge */}
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
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.45rem',
                fontSize: '0.6rem',
                fontWeight: 700,
                fontFamily: FONT,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: '#fbbf24',
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '999px',
                animation: 'betaPulse 3s ease-in-out infinite',
              }}>
                Beta
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* Header */}
              <h1 style={{
                margin: '0 0 0.4rem 0',
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 700,
                fontFamily: FONT,
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Submit a Feature Request
                </span>
              </h1>
              <p style={{
                margin: '0 0 2rem 0',
                fontSize: '0.9rem',
                fontFamily: FONT,
                color: 'rgba(255,255,255,0.5)',
              }}>
                Describe the feature you&apos;d like to see. Others can vote and comment on your idea.
              </p>

              {/* Form Card */}
              <div style={{
                backgroundColor: 'rgba(15,15,20,0.5)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
              }}>
                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      padding: '0.7rem 1rem',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      fontFamily: FONT,
                      color: '#ef4444',
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Title */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setError(''); }}
                    placeholder="A short, descriptive title for your idea"
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      fontFamily: FONT,
                      backgroundColor: 'rgba(15,15,20,0.6)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                  />
                  <div style={{
                    textAlign: 'right',
                    marginTop: '0.25rem',
                    fontSize: '0.72rem',
                    fontFamily: FONT,
                    color: title.length > 180 ? '#f59e0b' : 'rgba(255,255,255,0.25)',
                  }}>
                    {title.length}/200
                  </div>

                  {/* Similar Requests Panel */}
                  <SimilarRequestsPanel
                    items={similar}
                    total={similarTotal}
                    loading={similarLoading}
                    visible={!similarDismissed && title.trim().length >= SIMILAR_MIN_CHARS}
                    faded={description.trim().length > 0}
                    onDismiss={handleDismissSimilar}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setError(''); }}
                    placeholder="Describe the feature in detail. What problem does it solve? How would it work?"
                    maxLength={5000}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      padding: '0.75rem',
                      fontSize: '0.9rem',
                      fontFamily: FONT,
                      backgroundColor: 'rgba(15,15,20,0.6)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: 1.6,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                  />
                  <div style={{
                    textAlign: 'right',
                    marginTop: '0.25rem',
                    fontSize: '0.72rem',
                    fontFamily: FONT,
                    color: description.length > 4500 ? '#f59e0b' : 'rgba(255,255,255,0.25)',
                  }}>
                    {description.length}/5000
                  </div>
                </div>

                {/* Images */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    Images <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>(optional, up to 3)</span>
                  </label>

                  {imageUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {imageUrls.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt=""
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '0.5rem',
                              objectFit: 'cover',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                          />
                          <button
                            onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              border: '2px solid rgba(15,15,20,0.8)',
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

                  {imageUrls.length < 3 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.9rem',
                          fontSize: '0.82rem',
                          fontFamily: FONT,
                          color: 'rgba(255,255,255,0.5)',
                          backgroundColor: 'rgba(15,15,20,0.5)',
                          border: '1px dashed rgba(255,255,255,0.15)',
                          borderRadius: '0.5rem',
                          cursor: uploadingImage ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!uploadingImage) {
                            e.currentTarget.style.borderColor = 'rgba(251,191,36,0.3)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }}
                      >
                        <PhotoIcon style={{ width: '16px', height: '16px' }} />
                        {uploadingImage ? 'Uploading...' : 'Add Image'}
                      </button>
                    </>
                  )}
                </div>

                {/* Submit */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <Link
                    href="/feature-requests"
                    style={{
                      padding: '0.6rem 1.1rem',
                      fontSize: '0.88rem',
                      fontFamily: FONT,
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s',
                    }}
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !description.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1.3rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      fontFamily: FONT,
                      color: !title.trim() || !description.trim() ? 'rgba(255,255,255,0.3)' : '#0a0a0f',
                      backgroundColor: !title.trim() || !description.trim() ? 'rgba(255,255,255,0.05)' : '#fbbf24',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: submitting || !title.trim() || !description.trim() ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: title.trim() && description.trim() ? '0 2px 12px rgba(251,191,36,0.3)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (title.trim() && description.trim() && !submitting) {
                        e.currentTarget.style.backgroundColor = '#f59e0b';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (title.trim() && description.trim()) {
                        e.currentTarget.style.backgroundColor = '#fbbf24';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <PaperAirplaneIcon style={{ width: '15px', height: '15px' }} />
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <Footer />
      </div>

      <style>{`
        @keyframes betaPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.15); }
          50% { box-shadow: 0 0 12px rgba(251,191,36,0.3); }
        }
      `}</style>
    </main>
  );
}
