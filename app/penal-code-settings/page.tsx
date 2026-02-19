'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface Violation {
  name: string;
  jailTime: string;
  fine?: string;
  explanation?: string;
}

interface PenalCodeCategory {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  columns: string[];
  violations: Violation[];
}

interface PenalCodesData {
  categories: PenalCodeCategory[];
}

export default function PenalCodeSettingsPage() {
  const searchParams = useSearchParams();
  const communityId = searchParams.get('c') || '';

  const [data, setData] = useState<PenalCodesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<'addCategory' | 'editCategory' | 'addViolation' | 'editViolation' | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingViolationIndex, setEditingViolationIndex] = useState<number | null>(null);

  // Form fields
  const [formCategoryName, setFormCategoryName] = useState('');
  const [formViolationName, setFormViolationName] = useState('');
  const [formJailTime, setFormJailTime] = useState('');
  const [formFine, setFormFine] = useState('');
  const [formExplanation, setFormExplanation] = useState('');

  useEffect(() => {
    if (!communityId) {
      setError('No community ID provided. Please access this page from your community dashboard.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [communityId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/community/${communityId}/penal-codes`);
      if (!res.ok) throw new Error('Failed to fetch penal codes');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to load penal codes. Make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (updatedData: PenalCodesData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/community/${communityId}/penal-codes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch {
      alert('Failed to save penal codes.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all penal codes to the default values? This will replace all your customizations.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/community/${communityId}/penal-codes/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset');
      const json = await res.json();
      setData(json);
    } catch {
      alert('Failed to reset penal codes.');
    } finally {
      setSaving(false);
    }
  };

  // Filter
  const filteredCategories = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.categories;
    const q = searchQuery.toLowerCase();
    return data.categories
      .map((cat) => ({
        ...cat,
        violations: cat.violations.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.jailTime.toLowerCase().includes(q) ||
            (v.fine && v.fine.toLowerCase().includes(q)) ||
            (v.explanation && v.explanation.toLowerCase().includes(q)) ||
            cat.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.violations.length > 0 || cat.name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // Modal helpers
  const openAddCategory = () => {
    setFormCategoryName('');
    setModalType('addCategory');
  };

  const openEditCategory = (cat: PenalCodeCategory) => {
    setEditingCategoryId(cat.id);
    setFormCategoryName(cat.name);
    setModalType('editCategory');
  };

  const openAddViolation = (cat: PenalCodeCategory) => {
    setEditingCategoryId(cat.id);
    setFormViolationName('');
    setFormJailTime('');
    setFormFine('');
    setFormExplanation('');
    setModalType('addViolation');
  };

  const openEditViolation = (cat: PenalCodeCategory, v: Violation, idx: number) => {
    setEditingCategoryId(cat.id);
    setEditingViolationIndex(idx);
    setFormViolationName(v.name);
    setFormJailTime(v.jailTime);
    setFormFine(v.fine || '');
    setFormExplanation(v.explanation || '');
    setModalType('editViolation');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingCategoryId(null);
    setEditingViolationIndex(null);
  };

  // CRUD
  const handleAddCategory = async () => {
    if (!formCategoryName.trim() || !data) return;
    const newCat: PenalCodeCategory = {
      id: formCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
      name: formCategoryName.trim(),
      subtitle: '',
      icon: 'fa-gavel',
      color: '#6b7280',
      columns: ['name', 'jailTime', 'fine', 'explanation'],
      violations: [],
    };
    const updated = { ...data, categories: [...data.categories, newCat] };
    setData(updated);
    closeModal();
    await saveData(updated);
  };

  const handleEditCategory = async () => {
    if (!formCategoryName.trim() || !data || !editingCategoryId) return;
    const updated = {
      ...data,
      categories: data.categories.map((c) =>
        c.id === editingCategoryId ? { ...c, name: formCategoryName.trim() } : c
      ),
    };
    setData(updated);
    closeModal();
    await saveData(updated);
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!data) return;
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return;
    if (!confirm(`Delete "${cat.name}" and its ${cat.violations.length} violation(s)?`)) return;
    const updated = { ...data, categories: data.categories.filter((c) => c.id !== catId) };
    setData(updated);
    await saveData(updated);
  };

  const handleAddViolation = async () => {
    if (!formViolationName.trim() || !formJailTime.trim() || !data || !editingCategoryId) return;
    const newV: Violation = { name: formViolationName.trim(), jailTime: formJailTime.trim() };
    if (formFine.trim()) newV.fine = formFine.trim();
    if (formExplanation.trim()) newV.explanation = formExplanation.trim();
    const updated = {
      ...data,
      categories: data.categories.map((c) =>
        c.id === editingCategoryId ? { ...c, violations: [...c.violations, newV] } : c
      ),
    };
    setData(updated);
    closeModal();
    await saveData(updated);
  };

  const handleEditViolation = async () => {
    if (!formViolationName.trim() || !formJailTime.trim() || !data || !editingCategoryId || editingViolationIndex === null) return;
    const updatedV: Violation = { name: formViolationName.trim(), jailTime: formJailTime.trim() };
    if (formFine.trim()) updatedV.fine = formFine.trim();
    if (formExplanation.trim()) updatedV.explanation = formExplanation.trim();
    const updated = {
      ...data,
      categories: data.categories.map((c) =>
        c.id === editingCategoryId
          ? { ...c, violations: c.violations.map((v, i) => (i === editingViolationIndex ? updatedV : v)) }
          : c
      ),
    };
    setData(updated);
    closeModal();
    await saveData(updated);
  };

  const handleDeleteViolation = async (catId: string, idx: number) => {
    if (!data) return;
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return;
    if (!confirm(`Delete "${cat.violations[idx].name}"?`)) return;
    const updated = {
      ...data,
      categories: data.categories.map((c) =>
        c.id === catId ? { ...c, violations: c.violations.filter((_, i) => i !== idx) } : c
      ),
    };
    setData(updated);
    await saveData(updated);
  };

  if (loading) {
    return (
      <div style={{ fontFamily, minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading penal codes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily, minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <a href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Go home</a>
      </div>
    );
  }

  return (
    <div style={{ fontFamily, minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
            <ArrowLeftIcon style={{ width: 20, height: 20 }} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Penal Code Settings</h1>
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          style={{
            background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            opacity: saving ? 0.5 : 1, fontSize: 14,
          }}
        >
          <ArrowPathIcon style={{ width: 16, height: 16 }} />
          Reset to Defaults
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <MagnifyingGlassIcon style={{ width: 18, height: 18, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search violations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 40px', background: '#1f2937', border: '1px solid #374151',
              borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Add Category Button */}
        <button
          onClick={openAddCategory}
          style={{
            width: '100%', padding: 12, background: '#3b82f6', border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, fontSize: 14, marginBottom: 24,
          }}
        >
          <PlusIcon style={{ width: 18, height: 18 }} />
          Add New Category
        </button>

        {saving && (
          <div style={{ textAlign: 'center', color: '#3b82f6', marginBottom: 16, fontSize: 14 }}>Saving...</div>
        )}

        {/* Categories */}
        {filteredCategories.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>No categories or violations found</p>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 32 }}>
              {/* Category Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: cat.color || '#fff' }}>{cat.name}</h2>
                  {cat.subtitle && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>{cat.subtitle}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openAddViolation(cat)}
                    style={{ background: '#3b82f6', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#fff' }}
                    title="Add violation"
                  >
                    <PlusIcon style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    onClick={() => openEditCategory(cat)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 6 }}
                    title="Edit category"
                  >
                    <PencilIcon style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}
                    title="Delete category"
                  >
                    <TrashIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              {/* Violations */}
              {cat.violations.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: 14 }}>No violations in this category</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cat.violations.map((v, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#111827', borderRadius: 8, padding: '12px 16px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1, marginRight: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Jail Time: {v.jailTime}</div>
                        {v.fine && <div style={{ fontSize: 13, color: '#9ca3af' }}>Fine: {v.fine}</div>}
                        {v.explanation && (
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{v.explanation}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => openEditViolation(cat, v, idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                        >
                          <PencilIcon style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => handleDeleteViolation(cat.id, idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                        >
                          <TrashIcon style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalType && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#111827', borderRadius: 12, padding: 24, width: '90%', maxWidth: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
              {modalType === 'addCategory' && 'Add New Category'}
              {modalType === 'editCategory' && 'Edit Category'}
              {modalType === 'addViolation' && 'Add Violation'}
              {modalType === 'editViolation' && 'Edit Violation'}
            </h3>

            {(modalType === 'addCategory' || modalType === 'editCategory') && (
              <input
                type="text"
                placeholder="Category Name"
                value={formCategoryName}
                onChange={(e) => setFormCategoryName(e.target.value)}
                style={{
                  width: '100%', padding: 10, background: '#1f2937', border: '1px solid #374151',
                  borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 16, boxSizing: 'border-box',
                }}
                autoFocus
              />
            )}

            {(modalType === 'addViolation' || modalType === 'editViolation') && (
              <>
                <input
                  type="text"
                  placeholder="Violation Name *"
                  value={formViolationName}
                  onChange={(e) => setFormViolationName(e.target.value)}
                  style={{
                    width: '100%', padding: 10, background: '#1f2937', border: '1px solid #374151',
                    borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Jail Time (e.g., 30 seconds) *"
                  value={formJailTime}
                  onChange={(e) => setFormJailTime(e.target.value)}
                  style={{
                    width: '100%', padding: 10, background: '#1f2937', border: '1px solid #374151',
                    borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  placeholder="Fine (e.g., $1000) - Optional"
                  value={formFine}
                  onChange={(e) => setFormFine(e.target.value)}
                  style={{
                    width: '100%', padding: 10, background: '#1f2937', border: '1px solid #374151',
                    borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
                  }}
                />
                <textarea
                  placeholder="Explanation - Optional"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: 10, background: '#1f2937', border: '1px solid #374151',
                    borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 16, resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1, padding: 10, background: '#374151', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={
                  modalType === 'addCategory'
                    ? handleAddCategory
                    : modalType === 'editCategory'
                    ? handleEditCategory
                    : modalType === 'addViolation'
                    ? handleAddViolation
                    : handleEditViolation
                }
                style={{
                  flex: 1, padding: 10, background: '#3b82f6', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                {modalType.startsWith('add') ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
