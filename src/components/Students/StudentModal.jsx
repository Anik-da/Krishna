import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Sparkles, School, Phone, BookOpen, User } from 'lucide-react';
import { idbGetAll } from '../../db/indexedDbService';

export const StudentModal = ({ isOpen, onClose, onSave, editingStudent }) => {
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    whatsapp: '',
    school: '',
    notes: '',
    registrationDate: new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbSchools, setDbSchools] = useState([]);

  useEffect(() => {
    if (isOpen) {
      idbGetAll('students').then(list => {
        const schools = Array.from(
          new Set(
            (list || [])
              .map(s => (s.schoolName || s.school || '').trim())
              .filter(Boolean)
          )
        ).sort();
        setDbSchools(schools);
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        name: editingStudent.name || '',
        grade: editingStudent.grade || '',
        whatsapp: editingStudent.whatsapp || '',
        school: editingStudent.school || '',
        notes: editingStudent.notes || '',
        registrationDate: editingStudent.registrationDate || new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData({
        name: '',
        grade: '',
        whatsapp: '',
        school: '',
        notes: '',
        registrationDate: new Date().toISOString().split('T')[0]
      });
    }
    setError('');
  }, [editingStudent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Strict validation of the 4 required fields
    if (!formData.name.trim()) {
      setError('Student Full Name is required.');
      return;
    }
    if (!formData.grade.trim()) {
      setError('Class or Grade is required.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setError('WhatsApp Phone Number is required.');
      return;
    }
    if (!formData.school.trim()) {
      setError('School Name is required.');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData, editingStudent ? editingStudent.id : null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  const commonGrades = [
    'Pre-Nursery',
    'Nursery',
    'L.K.G',
    'U.K.G',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
    'College Youth',
    'Youth Gita Forum',
    'Sunday School Junior',
    'Sunday School Senior'
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        className="devotional-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #FFD700',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #8B4513 100%)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #FFD700',
            color: '#FFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 215, 0, 0.2)', padding: '8px', borderRadius: '8px', border: '1px solid #FFD700' }}>
              <UserPlus size={20} color="#FFD700" />
            </div>
            <div>
              <h3 className="heading-gold" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingStudent ? 'Edit Student Details' : 'Register New Bhagavad Gita Student'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#FFF8DC', opacity: 0.9 }}>
                {editingStudent ? `Updating ${editingStudent.id}` : 'Permanent ID (BGK-2026-XXXX) assigned automatically'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFF8DC',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div 
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFB4B4',
                color: '#C62828',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* Student Full Name (Required) */}
            <div>
              <label className="form-label">
                Student Full Name <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Radhika Sharma"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ paddingLeft: '2.4rem' }}
                />
                <User size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Class / Grade (Required) */}
            <div>
              <label className="form-label">
                Class or Grade <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  required
                  list="grade-suggestions"
                  placeholder="e.g. Class 8 or Class 10"
                  className="form-input"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  style={{ paddingLeft: '2.4rem' }}
                />
                <BookOpen size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <datalist id="grade-suggestions">
                  {commonGrades.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
            </div>

            {/* WhatsApp Phone Number (Required) */}
            <div>
              <label className="form-label">
                WhatsApp Phone Number <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  className="form-input"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  style={{ paddingLeft: '2.4rem' }}
                />
                <Phone size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* School Name (Required) */}
            <div>
              <label className="form-label">
                School Name <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  required
                  list="modal-school-suggestions"
                  placeholder="e.g. Bhavan's Vidya Mandir"
                  className="form-input"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  style={{ paddingLeft: '2.4rem' }}
                />
                <School size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <datalist id="modal-school-suggestions">
                  {dbSchools.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Registration Date */}
            <div>
              <label className="form-label">
                Registration Date
              </label>
              <input 
                type="date"
                disabled={!!editingStudent}
                className="form-input"
                value={formData.registrationDate}
                onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                style={{ backgroundColor: editingStudent ? '#F5F5F5' : '#FFF' }}
              />
              {editingStudent && (
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '3px' }}>
                  Registration date cannot be modified once set to preserve attendance history.
                </div>
              )}
            </div>

            {/* Optional Devotional Notes */}
            <div>
              <label className="form-label">
                Devotional Notes &amp; Talents (Optional)
              </label>
              <textarea 
                rows={2}
                placeholder="e.g. Chants shlokas, plays mridanga/kartalas, youth volunteer..."
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold"
            >
              <Save size={16} />
              <span>{loading ? 'Saving...' : (editingStudent ? 'Save Changes' : 'Register Student')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
