import React, { useState } from 'react';
import { ShieldCheck, ChevronLeft, Lock, Globe, ExternalLink, Activity, CheckCircle, Mail, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const [lang, setLang] = useState('en'); // Default to English for Strava API reviewers

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#1e293b',
      padding: '32px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{
        maxWidth: '860px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 45, 84, 0.08)',
        border: '1px solid rgba(0, 163, 166, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #002D54 0%, #004B87 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="#00A3A6" />
              <h1 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em'
              }}>
                {lang === 'en' ? 'Privacy Policy' : 'Chính Sách Bảo Mật'}
              </h1>
            </div>
            <p style={{ margin: '6px 0 0 38px', fontSize: '0.88rem', color: '#94a3b8' }}>
              {lang === 'en' ? 'Haskoning Vietnam Running Club Tracker' : 'Hệ thống Quản lý CLB Chạy bộ Haskoning'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Language Switcher */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <button
                type="button"
                onClick={() => setLang('en')}
                style={{
                  background: lang === 'en' ? '#00A3A6' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('vi')}
                style={{
                  background: lang === 'vi' ? '#00A3A6' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                VI
              </button>
            </div>

            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              <ChevronLeft size={16} />
              <span>{lang === 'en' ? 'Back to App' : 'Quay lại'}</span>
            </Link>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '36px 32px', lineHeight: 1.68 }}>
          <div style={{
            fontSize: '0.82rem',
            color: '#64748b',
            marginBottom: '24px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px'
          }}>
            <strong>{lang === 'en' ? 'Last Updated:' : 'Cập nhật lần cuối:'}</strong> October 2026 | <strong>{lang === 'en' ? 'Effective Date:' : 'Ngày hiệu lực:'}</strong> October 30, 2026
          </div>

          {lang === 'en' ? (
            /* ENGLISH CONTENT (For Strava Reviewers) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#00A3A6" />
                  1. Overview & Purpose
                </h2>
                <p>
                  This Privacy Policy applies to the <strong>Haskoning Vietnam Running Club Tracker</strong> application ("the Application"), operated for the internal employee health, fitness, and running challenges of HaskoningDHV employees and club members in Vietnam.
                </p>
                <p>
                  The Application integrates with the <strong>Strava API</strong> to automatically record, calculate, and display monthly running distances, paces, and club leaderboards. We are committed to protecting your personal data and respecting your privacy in strict accordance with the Strava API Agreement and applicable data protection regulations.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={20} color="#00A3A6" />
                  2. Information We Collect from Strava
                </h2>
                <p>
                  When you voluntarily connect your Strava account to our Application via OAuth authorization, we request read-only access to the following data scopes:
                </p>
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
                  <li><strong>Basic Athlete Profile:</strong> Athlete ID, full name, and avatar image URL (to identify you on the club leaderboard).</li>
                  <li><strong>Activities Data (`activity:read`, `activity:read_all`):</strong> Activity title, type (Run, Trail Run, Virtual Run), distance in meters, moving time, elapsed time, average pace, and start timestamp.</li>
                </ul>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginTop: '12px',
                  color: '#166534',
                  fontSize: '0.90rem'
                }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  <strong>Non-collection Notice:</strong> We <strong>DO NOT</strong> access, store, or process your GPS coordinate streams, detailed heart rate data, personal payment information, private messages, or friend lists.
                </div>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="#00A3A6" />
                  3. How We Use and Protect Your Data
                </h2>
                <p>We use the collected information strictly for the following purposes:</p>
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
                  <li>Aggregating individual monthly and annual running kilometers for Haskoning running challenges.</li>
                  <li>Generating real-time leaderboard rankings, club podium statistics, and training milestones.</li>
                  <li>Enabling real-time activity updates via Strava Webhook Push Subscriptions.</li>
                </ul>
                <p style={{ marginTop: '10px' }}>
                  <strong>Zero Commercial Use Guarantee:</strong> We <strong>NEVER</strong> sell, rent, lease, or monetize your personal data. We do not transfer your data to any third-party advertisers, brokers, or external analytics firms.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={20} color="#00A3A6" />
                  4. Data Storage and Security
                </h2>
                <p>
                  OAuth tokens (access and refresh tokens) are securely stored in protected application storage. Communications between our servers and Strava are encrypted via industry-standard TLS/HTTPS protocols.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ExternalLink size={20} color="#00A3A6" />
                  5. Athlete Rights & Revocation of Access
                </h2>
                <p>
                  As an athlete, you maintain complete ownership and control over your data at all times:
                </p>
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
                  <li>
                    <strong>Revoking Strava Access:</strong> You can disconnect and immediately revoke the Application's access at any time directly through your Strava settings at{' '}
                    <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#00A3A6', fontWeight: 600 }}>
                      strava.com/settings/apps
                    </a>.
                  </li>
                  <li>
                    <strong>Data Deletion Request:</strong> You may request complete removal of your historical leaderboard data and tokens from our system by contacting the club administrator.
                  </li>
                </ul>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={20} color="#00A3A6" />
                  6. Contact Us & Trademark Notice
                </h2>
                <p>
                  If you have any questions or feedback regarding this Privacy Policy or your data, please contact the Haskoning Running Club Administrator at:
                  <br />
                  <strong>Email:</strong> <a href="mailto:viettien274@gmail.com" style={{ color: '#00A3A6' }}>viettien274@gmail.com</a> / <a href="mailto:tienptv94@gmail.com" style={{ color: '#00A3A6' }}>tienptv94@gmail.com</a>
                </p>
                <div style={{
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '20px',
                  paddingTop: '16px',
                  fontSize: '0.84rem',
                  color: '#64748b',
                  fontStyle: 'italic'
                }}>
                  Strava is a registered trademark of Strava, Inc. This Application is an independent internal club solution developed using the public Strava API and adheres strictly to the Strava API Brand Guidelines.
                </div>
              </section>
            </div>
          ) : (
            /* VIETNAMESE CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#00A3A6" />
                  1. Mục Đích & Phạm Vi Ứng Dụng
                </h2>
                <p>
                  Chính sách bảo mật này áp dụng cho phần mềm <strong>Haskoning Vietnam Running Club Tracker</strong>, được vận hành phục vụ các hoạt động chạy bộ, nâng cao sức khỏe và theo dõi giải chạy nội bộ cho nhân viên công ty HaskoningDHV tại Việt Nam.
                </p>
                <p>
                  Ứng dụng tích hợp với <strong>Strava API</strong> để tự động ghi nhận, tổng hợp và xếp hạng số km chạy bộ hàng tháng. Chúng tôi cam kết bảo vệ dữ liệu cá nhân của các vận động viên theo đúng thỏa thuận sử dụng Strava API và quy định bảo vệ dữ liệu hiện hành.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={20} color="#00A3A6" />
                  2. Dữ Liệu Thu Thập Từ Strava
                </h2>
                <p>
                  Khi bạn kết nối tài khoản Strava với ứng dụng, hệ thống chỉ yêu cầu quyền đọc (read-only) các thông tin cơ bản:
                </p>
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
                  <li><strong>Hồ sơ VĐV cơ bản:</strong> ID Strava, họ tên, ảnh đại diện để hiển thị trên bảng xếp hạng CLB.</li>
                  <li><strong>Dữ liệu bài chạy:</strong> Loại hình (Chạy bộ ngoài trời, Trail, Máy chạy), khoảng cách (km), thời gian di chuyển, pace trung bình và thời gian bắt đầu bài tập.</li>
                </ul>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginTop: '12px',
                  color: '#166534',
                  fontSize: '0.90rem'
                }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  <strong>Cam kết:</strong> Ứng dụng <strong>KHÔNG</strong> đọc tọa độ bản đồ chi tiết (GPS streams), thông tin nhịp tim nhạy cảm, danh sách bạn bè hay bất kỳ thông tin tài chính nào.
                </div>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="#00A3A6" />
                  3. Cam Kết Sử Dụng Dữ Liệu
                </h2>
                <p>
                  Dữ liệu được dùng duy nhất để tổng hợp km giải chạy và cập nhật bảng xếp hạng CLB. Chúng tôi <strong>tuyệt đối không</strong> chia sẻ, mua bán hoặc cung cấp dữ liệu cho bất kỳ bên thứ ba hay đơn vị quảng cáo nào.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ExternalLink size={20} color="#00A3A6" />
                  4. Quyền Hủy Kết Nối Của Thành Viên
                </h2>
                <p>
                  Thành viên có toàn quyền ngắt kết nối Strava bất cứ lúc nào tại trang cá nhân Strava: mục <strong>Settings &gt; My Apps &gt; Revoke Access</strong>.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '20px 32px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.84rem',
          color: '#64748b'
        }}>
          <div>
            Powered by Strava API | HaskoningDHV Running Club
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/terms-of-service" style={{ color: '#00A3A6', textDecoration: 'none', fontWeight: 600 }}>
              {lang === 'en' ? 'Terms of Service' : 'Điều Khoản Dịch Vụ'}
            </Link>
            <Link to="/" style={{ color: '#002D54', textDecoration: 'none', fontWeight: 600 }}>
              {lang === 'en' ? 'App Login' : 'Đăng Nhập'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

