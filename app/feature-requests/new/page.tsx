'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/solid';

// ── Constants ──────────────────────────────────────────────────────
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

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

  // Check auth
  useEffect(() => {
    fetch('/api/user/current', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (data._id || data.id)) {
          setCurrentUser({ _id: data._id || data.id });
        } else {
          router.push('/login');
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.push('/login');
        setAuthChecked(true);
      });
  }, [router]);

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
            {/* Back link */}
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
                marginBottom: '1.5rem',
                paddingTop: '2rem',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fbbf24'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <ArrowLeftIcon style={{ width: '14px', height: '14px' }} />
              Back to Feature Requests
            </Link>

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
    </main>
  );
}
