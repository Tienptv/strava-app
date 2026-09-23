import React, { useState } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, X, ChevronRight, Info } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { BADGE_CATEGORIES } from '../utils/badgeEngine';

export default function TrophyCabinet({ badgeData, onOpenShareModal }) {
  const { lang, t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeBadgeModal, setActiveBadgeModal] = useState(null);

  if (!badgeData) return null;

  const { badges, unlockedCount, totalBadges, completionRate } = badgeData;

  const filteredBadges = badges.filter(b => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  return (
    <div className="trophy-cabinet card">
      {/* Header with Title & Stats */}
      <div className="trophy-cabinet__header">
        <div className="trophy-cabinet__title-box">
          <div className="trophy-cabinet__icon-glow">
            <Award size={24} color="#00A3A6" />
          </div>
          <div>
            <h2 className="trophy-cabinet__title">{t('trophyCabinetTitle')}</h2>
            <p className="trophy-cabinet__subtitle">{t('trophyCabinetSub')}</p>
          </div>
        </div>

        {onOpenShareModal && (
          <button
            type="button"
            className="btn btn--accent trophy-share-btn"
            onClick={onOpenShareModal}
          >
            <Sparkles size={16} />
            <span>{t('socialShareBtn')}</span>
          </button>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="trophy-progress-banner">
        <div className="trophy-progress-info">
          <span className="trophy-progress-label">
            🏆 {t('unlockedBadges')}: <strong>{unlockedCount} / {totalBadges}</strong> ({completionRate}%)
          </span>
          <span className="trophy-progress-tier">
            {completionRate >= 80 ? '👑 Master Legend' : completionRate >= 50 ? '⚡ Centurion Hero' : '🥉 Rising Star'}
          </span>
        </div>
        <div className="trophy-progress-track">
          <div 
            className="trophy-progress-fill" 
            style={{ width: `${Math.max(5, completionRate)}%` }}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="trophy-categories">
        {BADGE_CATEGORIES.map(cat => {
          const countInCat = badges.filter(b => cat.id === 'all' || b.category === cat.id).length;
          const unlockedInCat = badges.filter(b => (cat.id === 'all' || b.category === cat.id) && b.unlocked).length;

          return (
            <button
              key={cat.id}
              type="button"
              className={`trophy-cat-pill ${selectedCategory === cat.id ? 'trophy-cat-pill--active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{lang === 'vi' ? cat.labelVi : cat.labelEn}</span>
              <span className="trophy-cat-badge">{unlockedInCat}/{countInCat}</span>
            </button>
          );
        })}
      </div>

      {/* Badges 3D Grid */}
      <div className="trophy-grid">
        {filteredBadges.map(badge => {
          const title = lang === 'vi' ? badge.titleVi : badge.titleEn;
          const desc = lang === 'vi' ? badge.descVi : badge.descEn;

          return (
            <div
              key={badge.id}
              className={`trophy-card ${badge.unlocked ? 'trophy-card--unlocked' : 'trophy-card--locked'} trophy-tier--${badge.tier}`}
              onClick={() => setActiveBadgeModal(badge)}
              title={t('viewBadgeDetail')}
            >
              <div className="trophy-card__top">
                <span className="trophy-card__tier-tag">{badge.tier.toUpperCase()}</span>
                {badge.unlocked ? (
                  <span className="trophy-card__status-unlocked" title={t('badgeUnlocked')}>
                    <CheckCircle2 size={16} />
                  </span>
                ) : (
                  <span className="trophy-card__status-locked" title={t('badgeLocked')}>
                    <Lock size={14} />
                  </span>
                )}
              </div>

              <div className="trophy-card__icon-wrapper">
                <div className="trophy-card__icon">{badge.icon}</div>
              </div>

              <h4 className="trophy-card__title">{title}</h4>
              <p className="trophy-card__desc">{desc}</p>

              {/* Progress mini indicator */}
              <div className="trophy-card__progress-wrap">
                <div className="trophy-card__progress-track">
                  <div 
                    className="trophy-card__progress-fill"
                    style={{ 
                      width: `${badge.progress}%`,
                      background: badge.unlocked ? 'var(--secondary)' : 'var(--accent)'
                    }}
                  />
                </div>
                <div className="trophy-card__progress-text">
                  <span>{t('badgeProgress')}</span>
                  <span>{badge.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {activeBadgeModal && (
        <div className="modal-overlay" onClick={() => setActiveBadgeModal(null)}>
          <div className="modal-container trophy-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveBadgeModal(null)}
              title={t('close')}
            >
              <X size={20} />
            </button>

            <div className="trophy-modal__hero" style={{ background: activeBadgeModal.gradient }}>
              <div className="trophy-modal__big-icon">{activeBadgeModal.icon}</div>
              <span className="trophy-modal__tier-badge">{activeBadgeModal.tier.toUpperCase()} MILESTONE</span>
            </div>

            <div className="trophy-modal__body">
              <h3 className="trophy-modal__title">
                {lang === 'vi' ? activeBadgeModal.titleVi : activeBadgeModal.titleEn}
              </h3>

              <div className="trophy-modal__status-box">
                {activeBadgeModal.unlocked ? (
                  <div className="trophy-modal__unlocked-badge">
                    <CheckCircle2 size={18} />
                    <span>{t('badgeUnlocked')}</span>
                  </div>
                ) : (
                  <div className="trophy-modal__locked-badge">
                    <Lock size={18} />
                    <span>{t('badgeLocked')} ({activeBadgeModal.progress}%)</span>
                  </div>
                )}
              </div>

              <div className="trophy-modal__section">
                <h5 className="trophy-modal__section-title">
                  <Info size={16} />
                  {t('badgeCriteria')}
                </h5>
                <p className="trophy-modal__desc">
                  {lang === 'vi' ? activeBadgeModal.descVi : activeBadgeModal.descEn}
                </p>
              </div>

              <div className="trophy-modal__quote-box">
                <p className="trophy-modal__quote">
                  "{lang === 'vi' ? activeBadgeModal.quoteVi : activeBadgeModal.quoteEn}"
                </p>
              </div>

              {activeBadgeModal.unlocked && activeBadgeModal.unlockedAt && (
                <div className="trophy-modal__date">
                  <span>{t('badgeUnlockedDate')}:</span>
                  <strong>{new Date(activeBadgeModal.unlockedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</strong>
                </div>
              )}

              <div className="trophy-modal__footer">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setActiveBadgeModal(null)}
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
