'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { penalCodeCategories, columnLabels, type PenalCodeCategory } from './data';

const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function PenalCodePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState(penalCodeCategories[0].id);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    penalCodeCategories.forEach((cat) => {
      const el = document.getElementById(cat.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // URL hash deep linking
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setActiveSection(hash);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  // Filter violations by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return penalCodeCategories;
    const q = searchQuery.toLowerCase();
    return penalCodeCategories
      .map((cat) => ({
        ...cat,
        violations: cat.violations.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.jailTime.toLowerCase().includes(q) ||
            (v.fine && v.fine.toLowerCase().includes(q)) ||
            (v.explanation && v.explanation.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.violations.length > 0);
  }, [searchQuery]);

  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return filteredCategories.reduce((sum, cat) => sum + cat.violations.length, 0);
  }, [filteredCategories, searchQuery]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
      />

      {/* Dark Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />

        <div
          style={{
            paddingTop: '2rem',
            paddingBottom: '4rem',
            minHeight: 'calc(100vh - 80px)',
          }}
        >
          <div
            style={{
              maxWidth: 'min(100%, 80rem)',
              margin: '0 auto',
              padding: '0 clamp(1rem, 4vw, 1.5rem)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '1.25rem',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)',
                }}
              >
                <i className="fa fa-gavel" style={{ color: '#fff', fontSize: '2rem' }} />
              </div>
              <h1
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: '800',
                  margin: '0 0 1rem 0',
                  fontFamily,
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: '#fbbf24',
                    textShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)',
                    filter: 'blur(2px)',
                    zIndex: 0,
                  }}
                >
                  Penal Codes
                </span>
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'linear-gradient(90deg, #fbbf24 0%, #ffffff 30%, #ffffff 70%, #fbbf24 100%)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 12s linear infinite',
                    display: 'inline-block',
                  }}
                >
                  Penal Codes
                </span>
              </h1>
              <p
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily,
                  lineHeight: '1.6',
                }}
              >
                A comprehensive reference guide for violations and their penalties
              </p>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
                <MagnifyingGlassIcon
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    color: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search violations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 3rem',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(15, 15, 20, 0.8)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    outline: 'none',
                    fontFamily,
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {searchQuery && (
                <p
                  style={{
                    textAlign: 'center',
                    marginTop: '0.75rem',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily,
                  }}
                >
                  {totalMatches === 0
                    ? 'No results found'
                    : `Found ${totalMatches} result${totalMatches === 1 ? '' : 's'}`}
                </p>
              )}
            </div>

            {/* Mobile Category Nav */}
            {isMobile && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  padding: '0 0 1.5rem 0',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {penalCodeCategories.map((cat) => {
                  const matchCount = filteredCategories.find((c) => c.id === cat.id)?.violations.length;
                  const isActive = activeSection === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => scrollToSection(cat.id)}
                      style={{
                        flexShrink: 0,
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        border: `1px solid ${isActive ? 'rgba(251,191,36,0.4)' : 'rgba(59,130,246,0.2)'}`,
                        backgroundColor: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(15,15,20,0.6)',
                        color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                        fontFamily,
                        opacity: searchQuery && matchCount === undefined ? 0.4 : 1,
                      }}
                    >
                      <i className={`fa ${cat.icon}`} style={{ marginRight: '0.375rem' }} />
                      {cat.name}
                      {searchQuery && matchCount !== undefined && (
                        <span
                          style={{
                            marginLeft: '0.375rem',
                            fontSize: '0.6875rem',
                            backgroundColor: 'rgba(59,130,246,0.3)',
                            borderRadius: '9999px',
                            padding: '0.1rem 0.4rem',
                          }}
                        >
                          {matchCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Layout: Sidebar + Content */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Desktop Sidebar */}
              {!isMobile && (
                <div
                  style={{
                    width: '220px',
                    flexShrink: 0,
                    position: 'sticky',
                    top: '6rem',
                    alignSelf: 'flex-start',
                  }}
                >
                  <nav
                    style={{
                      backgroundColor: 'rgba(15, 15, 20, 0.6)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '1rem',
                      padding: '0.75rem',
                    }}
                  >
                    {penalCodeCategories.map((cat) => {
                      const isActive = activeSection === cat.id;
                      const matchCount = filteredCategories.find((c) => c.id === cat.id)?.violations.length;
                      return (
                        <a
                          key={cat.id}
                          href={`#${cat.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToSection(cat.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '0.5rem',
                            color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                            backgroundColor: isActive ? 'rgba(251,191,36,0.1)' : 'transparent',
                            borderLeft: isActive ? '3px solid #fbbf24' : '3px solid transparent',
                            textDecoration: 'none',
                            fontSize: '0.8125rem',
                            fontWeight: isActive ? '600' : '500',
                            transition: 'all 0.2s',
                            fontFamily,
                            opacity: searchQuery && matchCount === undefined ? 0.4 : 1,
                          }}
                        >
                          <i
                            className={`fa ${cat.icon}`}
                            style={{ color: cat.color, width: '16px', textAlign: 'center', fontSize: '0.8125rem' }}
                          />
                          <span style={{ flex: 1 }}>{cat.name}</span>
                          {searchQuery && matchCount !== undefined && (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                backgroundColor: 'rgba(59,130,246,0.2)',
                                borderRadius: '9999px',
                                padding: '0.125rem 0.5rem',
                                color: 'rgba(255,255,255,0.6)',
                              }}
                            >
                              {matchCount}
                            </span>
                          )}
                        </a>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Content Sections */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {filteredCategories.length === 0 && searchQuery && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      backgroundColor: 'rgba(15, 15, 20, 0.6)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '1rem',
                    }}
                  >
                    <i
                      className="fa fa-search"
                      style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.2)', marginBottom: '1rem', display: 'block' }}
                    />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', fontFamily, margin: 0 }}>
                      No violations match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', fontFamily, marginTop: '0.5rem' }}>
                      Try adjusting your search terms
                    </p>
                  </div>
                )}

                {filteredCategories.map((category) => (
                  <CategorySection key={category.id} category={category} searchQuery={searchQuery} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}

function CategorySection({
  category,
  searchQuery,
}: {
  category: PenalCodeCategory;
  searchQuery: string;
}) {
  return (
    <section
      id={category.id}
      style={{
        marginBottom: '2rem',
        scrollMarginTop: '6rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(15, 15, 20, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '1rem',
          overflow: 'hidden',
          transition: 'all 0.3s',
        }}
      >
        {/* Category Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.75rem',
              background: `linear-gradient(135deg, ${category.color}, ${category.color}cc)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 0 15px ${category.color}40`,
            }}
          >
            <i className={`fa ${category.icon}`} style={{ color: '#fff', fontSize: '1rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#fbbf24',
                margin: 0,
                fontFamily,
              }}
            >
              {category.name}
            </h2>
            {category.subtitle && (
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.55)',
                  margin: '0.25rem 0 0 0',
                  fontStyle: 'italic',
                  lineHeight: '1.4',
                }}
              >
                &ldquo;{category.subtitle}&rdquo;
              </p>
            )}
          </div>
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.45)',
              fontWeight: '500',
              fontFamily,
              whiteSpace: 'nowrap',
            }}
          >
            {category.violations.length} {category.violations.length === 1 ? 'violation' : 'violations'}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {category.columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: 'rgba(255,255,255,0.85)',
                      borderBottom: '1px solid rgba(59,130,246,0.2)',
                      backgroundColor: 'rgba(59,130,246,0.05)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      fontFamily,
                    }}
                  >
                    {columnLabels[col]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {category.violations.map((violation, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom:
                      idx < category.violations.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {category.columns.map((col) => {
                    const value = violation[col as keyof typeof violation] ?? 'N/A';
                    const isName = col === 'name';
                    return (
                      <td
                        key={col}
                        style={{
                          padding: '0.75rem 1rem',
                          color: isName ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
                          fontWeight: isName ? '600' : '400',
                          verticalAlign: 'top',
                          lineHeight: '1.5',
                          fontFamily,
                        }}
                      >
                        {searchQuery && isName ? (
                          <HighlightMatch text={value} query={searchQuery} />
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} style={{ backgroundColor: 'rgba(251,191,36,0.3)', borderRadius: '2px', padding: '0 1px' }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
