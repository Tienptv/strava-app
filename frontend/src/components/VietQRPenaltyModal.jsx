import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { generateVietQRUrl, formatPenaltyVnd } from '../utils/penaltyUtils';
import Swal from 'sweetalert2';

export default function VietQRPenaltyModal({
  isOpen,
  onClose,
  athlete,
  penaltyAmount = 140000,
  challengeMonth,
  challengeYear,
  bankConfig = {}
}) {
  const { lang, t } = useLang();
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedRemark, setCopiedRemark] = useState(false);

  if (!isOpen) return null;

  const month = challengeMonth || new Date().getMonth() + 1;
  const runnerName = athlete?.name || `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim() || 'Runner';
  const cleanRunnerAscii = runnerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();

  const transferRemark = `HRC ${cleanRunnerAscii} nop phat T${month}`;

  const bankId = bankConfig.bankId || 'MBBank';
  const accountNo = bankConfig.accountNo || '0333868686';
  const accountName = bankConfig.accountName || 'HASKONING RUNNING CLUB';

  const qrUrl = generateVietQRUrl({
    bankId,
    accountNo,
    accountName,
    amount: penaltyAmount,
    addInfo: transferRemark,
    template: 'compact2'
  });

  const handleCopy = (text, type) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'account') {
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2500);
      } else {
        setCopiedRemark(true);
        setTimeout(() => setCopiedRemark(false), 2500);
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: type === 'account' ? t('copiedAccountToast') : t('copiedRemarkToast'),
        showConfirmButton: false,
        timer: 2000
      });
    }
  };

  const isZeroPenalty = !penaltyAmount || penaltyAmount <= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container vietqr-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="vietqr-modal__header">
          <div className="vietqr-modal__icon">
            <QrCode size={22} color="#00A3A6" />
          </div>
          <div>
            <h3 className="vietqr-modal__title">{t('vietQrModalTitle')}</h3>
            <p className="vietqr-modal__sub">{t('vietQrModalSub')}</p>
          </div>
        </div>

        <button type="button" className="modal-close-btn" onClick={onClose} title={t('close')}>
          <X size={20} />
        </button>

        {isZeroPenalty ? (
          <div className="vietqr-zero-box">
            <div className="vietqr-zero-icon">
              <ShieldCheck size={56} color="#78BE20" />
            </div>
            <h4 className="vietqr-zero-title">{t('vietQrZeroFineTitle')}</h4>
            <p className="vietqr-zero-desc">{t('vietQrZeroFineDesc')}</p>
            <button type="button" className="btn btn--primary" onClick={onClose} style={{ marginTop: 16 }}>
              {t('close')}
            </button>
          </div>
        ) : (
          <div className="vietqr-body">
            {/* Left Column: QR Code Image */}
            <div className="vietqr-qr-panel">
              <div className="vietqr-image-wrapper">
                <img
                  src={qrUrl}
                  alt="Napas 247 VietQR"
                  className="vietqr-image"
                />
              </div>
              <div className="vietqr-brand-tag">
                <span>🛡 Napas 247 • Chuyển Nhanh 24/7</span>
              </div>
              <a
                href={qrUrl}
                download={`VietQR_HRC_Penalty_T${month}.png`}
                target="_blank"
                rel="noreferrer"
                className="btn btn--secondary btn--sm vietqr-download-btn"
              >
                <Download size={14} />
                <span>{t('downloadQrBtn')}</span>
              </a>
            </div>

            {/* Right Column: Bank Details & Copiers */}
            <div className="vietqr-info-panel">
              <div className="vietqr-field">
                <span className="vietqr-label">{t('vietQrBankLabel')}:</span>
                <strong className="vietqr-value">{bankId}</strong>
              </div>

              <div className="vietqr-field vietqr-field--copyable">
                <div>
                  <span className="vietqr-label">{t('vietQrAccountLabel')}:</span>
                  <div className="vietqr-value font-mono">{accountNo}</div>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm btn-copy"
                  onClick={() => handleCopy(accountNo, 'account')}
                >
                  {copiedAccount ? <Check size={14} color="#78BE20" /> : <Copy size={14} />}
                  <span>{copiedAccount ? 'Đã chép' : t('copyAccountBtn')}</span>
                </button>
              </div>

              <div className="vietqr-field">
                <span className="vietqr-label">{t('vietQrOwnerLabel')}:</span>
                <strong className="vietqr-value">{accountName}</strong>
              </div>

              <div className="vietqr-field vietqr-field--highlight">
                <span className="vietqr-label">{t('vietQrAmountLabel')}:</span>
                <div className="vietqr-amount-value">{formatPenaltyVnd(penaltyAmount)}</div>
              </div>

              <div className="vietqr-field vietqr-field--copyable">
                <div>
                  <span className="vietqr-label">{t('vietQrRemarkLabel')}:</span>
                  <div className="vietqr-value font-mono vietqr-remark-text">{transferRemark}</div>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm btn-copy"
                  onClick={() => handleCopy(transferRemark, 'remark')}
                >
                  {copiedRemark ? <Check size={14} color="#78BE20" /> : <Copy size={14} />}
                  <span>{copiedRemark ? 'Đã chép' : t('copyRemarkBtn')}</span>
                </button>
              </div>

              <div className="vietqr-alert-note">
                <AlertCircle size={16} />
                <span>{t('vietQrGuide')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
