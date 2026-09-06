import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, DollarSign, Users, CheckCircle, Clock, Award } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { getAthleteAvatar } from '../utils/avatar';

export default function TreasuryTransparencyModal({ isOpen, onClose, apiFetch, currentMonth, currentYear }) {
  const { lang } = useLang();
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'members'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !apiFetch) return;
    setLoading(true);

    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    Promise.all([
      apiFetch('/penalties/summary').catch(() => null),
      apiFetch(`/penalties/ledger?month=${monthStr}`).catch(() => null)
    ])
      .then(([summaryData, ledgerData]) => {
        if (summaryData) setSummary(summaryData);
        if (ledgerData && Array.isArray(ledgerData.members)) {
          setLedger(ledgerData.members);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, apiFetch, currentMonth, currentYear]);

  if (!isOpen) return null;

  const currentBalance = summary?.currentClubFundBalance || 11097000;
  const totalCollected = summary?.totalPenaltyFundCollected || 16900000;
  const totalExpenditure = summary?.totalClubExpenditure || 5803000;

  const filteredMembers = ledger.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      (m.fullName && m.fullName.toLowerCase().includes(q)) ||
      (m.rawName && m.rawName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="treasury-modal-overlay" onClick={onClose}>
      <div className="treasury-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Modal Handle bar for mobile drag feeling */}
        <div className="treasury-modal-handle"></div>

        {/* Modal Header */}
        <div className="treasury-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="treasury-modal-icon">💰</div>
            <div>
              <h3 className="treasury-modal-title">
                {lang === 'en' ? 'Club Treasury Transparency' : 'Minh Bạch Quỹ Hoạt Động CLB'}
              </h3>
              <p className="treasury-modal-subtitle">
                {lang === 'en' ? `Status for Month ${currentMonth}/${currentYear}` : `Trạng thái Tháng ${currentMonth}/${currentYear} • Haskoning Running Club`}
              </p>
            </div>
          </div>
          <button className="treasury-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="treasury-modal-tabs">
          <button 
            className={`treasury-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 {lang === 'en' ? 'Fund Overview' : 'Tổng Quan Quỹ'}
          </button>
          <button 
            className={`treasury-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            👥 {lang === 'en' ? 'Penalty Status' : 'Trạng Thái Đóng Phạt'} ({ledger.length})
          </button>
        </div>

        {loading ? (
          <div className="treasury-loading">
            <div className="loading__spinner"></div>
            <span>{lang === 'en' ? 'Loading financial report...' : 'Đang tải báo cáo quỹ...'}</span>
          </div>
        ) : (
          <div className="treasury-modal-content">
            {activeTab === 'summary' ? (
              <div className="treasury-summary-pane">
                {/* Main Highlight Card */}
                <div className="treasury-balance-card">
                  <span className="treasury-balance-label">
                    {lang === 'en' ? 'CURRENT AVAILABLE FUND' : 'SỐ DƯ QUỸ HIỆN TẠI'}
                  </span>
                  <div className="treasury-balance-amount">
                    {currentBalance.toLocaleString('vi-VN')} <small>VNĐ</small>
                  </div>
                  <div className="treasury-transparency-pill">
                    <ShieldCheck size={14} />
                    <span>{lang === 'en' ? '100% Transparent Financial Ledger' : 'Sổ cái minh bạch 100%'}</span>
                  </div>
                </div>

                {/* Sub Cards Grid */}
                <div className="treasury-metrics-grid">
                  <div className="treasury-metric-item collected">
                    <span className="metric-label">{lang === 'en' ? 'Total Collected' : 'Tổng tiền phạt đã nộp'}</span>
                    <span className="metric-value">+{totalCollected.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="treasury-metric-item spent">
                    <span className="metric-label">{lang === 'en' ? 'Total Club Expenses' : 'Đã chi hoạt động / liên hoan'}</span>
                    <span className="metric-value">-{totalExpenditure.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {/* Transparency Note */}
                <div className="treasury-note-box">
                  <Award size={18} style={{ color: '#00A3A6', flexShrink: 0 }} />
                  <p>
                    {lang === 'en'
                      ? 'All funds collected from monthly challenges are strictly dedicated to club bonding events, marathon support, and running prizes.'
                      : 'Toàn bộ tiền phạt từ các đợt thử thách hàng tháng được quản lý công khai, dùng 100% cho các buổi giao lưu, hỗ trợ thành viên tham gia giải chạy và phần thưởng.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="treasury-members-pane">
                <div className="treasury-search-box">
                  <input 
                    type="text" 
                    placeholder={lang === 'en' ? 'Search runner...' : '🔍 Tìm tên thành viên...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="treasury-members-list">
                  {filteredMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      {lang === 'en' ? 'No runner records found' : 'Không tìm thấy dữ liệu'}
                    </div>
                  ) : (
                    filteredMembers.map((m, idx) => {
                      const isPaid = m.currentMonthPaymentStatus === 'paid';
                      const amount = m.currentMonthPenalty || 0;
                      return (
                        <div key={idx} className="treasury-member-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                              src={getAthleteAvatar({ firstname: m.fullName || m.rawName }, 32)} 
                              alt="avatar" 
                              className="treasury-member-avatar"
                            />
                            <div>
                              <div className="treasury-member-name">{m.fullName || m.rawName}</div>
                              <div className="treasury-member-target">
                                {m.currentMonthTarget ? `${m.currentMonthTarget} km target` : 'Tự do'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {amount > 0 ? (
                              <>
                                <div className="treasury-member-amount">
                                  {amount.toLocaleString('vi-VN')} đ
                                </div>
                                <span className={`treasury-status-badge ${isPaid ? 'paid' : 'pending'}`}>
                                  {isPaid ? (
                                    <>
                                      <CheckCircle size={11} /> {lang === 'en' ? 'Paid' : 'Đã nộp'}
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={11} /> {lang === 'en' ? 'Pending' : 'Chưa nộp'}
                                    </>
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="treasury-status-badge free">
                                ✅ {lang === 'en' ? 'Completed' : 'Đạt chuẩn'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
