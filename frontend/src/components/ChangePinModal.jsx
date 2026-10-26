import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import Swal from 'sweetalert2';

export default function ChangePinModal({ isOpen, onClose, athlete, apiFetch }) {
  const { t, lang } = useLang();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const defaultPin = athlete?.id ? String(athlete.id).slice(-4).padStart(4, '0') : '0000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oldPin.trim()) {
      setErrorMsg(lang === 'en' ? 'Please enter current PIN.' : 'Vui lòng nhập mã PIN hiện tại.');
      return;
    }

    const cleanNewPin = newPin.trim();
    if (!cleanNewPin || !/^\d{4}$/.test(cleanNewPin)) {
      setErrorMsg(t('pinInvalidFormat'));
      return;
    }

    if (cleanNewPin !== confirmPin.trim()) {
      setErrorMsg(t('pinMismatchError'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/member/change-pin', {
        method: 'POST',
        body: JSON.stringify({
          athleteId: athlete?.id,
          oldPin: oldPin.trim(),
          newPin: cleanNewPin
        })
      });

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: t('changePinSuccess'),
          text: lang === 'en' 
            ? 'Your personal PIN has been updated successfully.' 
            : 'Mã PIN cá nhân của bạn đã được cập nhật thành công.',
          confirmButtonColor: '#00A3A6'
        });
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        onClose();
      } else {
        setErrorMsg(res?.error || t('changePinFailed'));
      }
    } catch (err) {
      setErrorMsg(err.message || t('changePinFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 45, 84, 0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 45, 84, 0.22)',
          border: '1px solid rgba(0, 163, 166, 0.2)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
          padding: '18px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <KeyRound size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                {t('changePinTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.88, color: '#e2e8f0' }}>
                {athlete?.name || athlete?.firstname || 'Member'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{
            fontSize: '0.82rem',
            color: '#64748b',
            lineHeight: 1.45,
            marginBottom: '16px',
            background: 'rgba(0, 163, 166, 0.06)',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(0, 163, 166, 0.18)'
          }}>
            {t('changePinDesc')}{' '}
            <span style={{ color: 'var(--primary-navy)', fontWeight: 600 }}>
              {lang === 'en' ? `(Initial default: ${defaultPin})` : `(Mặc định ban đầu: ${defaultPin})`}
            </span>
          </div>

          {/* 1. Mã PIN hiện tại */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              <Lock size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
              {t('oldPinLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPin}
                maxLength={10}
                onChange={(e) => { setOldPin(e.target.value); setErrorMsg(''); }}
                placeholder={t('oldPinPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.90rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 2. Mã PIN mới */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              <ShieldCheck size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
              {t('newPinLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPin}
                maxLength={4}
                onChange={(e) => { setNewPin(e.target.value); setErrorMsg(''); }}
                placeholder={t('newPinPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.90rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '2px',
                  fontWeight: 700
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 3. Xác nhận PIN mới */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              <Check size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
              {t('confirmNewPinLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPin}
                maxLength={4}
                onChange={(e) => { setConfirmPin(e.target.value); setErrorMsg(''); }}
                placeholder={t('confirmNewPinPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.90rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '2px',
                  fontWeight: 700
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Báo lỗi nếu có */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: '16px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nút hành động */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 163, 166, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>{lang === 'en' ? 'Updating...' : 'Đang cập nhật...'}</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{lang === 'en' ? 'Save PIN' : 'Lưu mã PIN'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
