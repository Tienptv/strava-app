import React, { useState } from 'react';
import { FileText, ChevronLeft, CheckCircle, AlertCircle, Shield, Globe, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  const [lang, setLang] = useState('en'); // Default to English for Strava API Reviewers

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
              <FileText size={28} color="#00A3A6" />
              <h1 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em'
              }}>
                {lang === 'en' ? 'Terms of Service' : 'Điều Khoản Dịch Vụ'}
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
            /* ENGLISH CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing or connecting your Strava account to the <strong>Haskoning Vietnam Running Club Tracker</strong> ("the Application"), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree to these terms, please do not authorize the Application.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  2. Purpose & Non-Commercial Nature
                </h2>
                <p>
                  This Application is an internal, non-commercial sports tracking platform specifically designed for employees and club members of HaskoningDHV Vietnam. The sole objective is to encourage physical activity, promote a healthy work-life balance, track club distance goals, and organize friendly sports leaderboards.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  3. Strava API Adherence
                </h2>
                <p>
                  The Application utilizes the public Strava API and strictly complies with the Strava API Agreement and Brand Guidelines:
                </p>
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
                  <li>We only access activity and athlete profile data with explicit consent from the user via Strava OAuth.</li>
                  <li>We respect athlete privacy settings set within the Strava platform.</li>
                  <li>We do not duplicate, redistribute, or monetize any Strava user data.</li>
                </ul>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  4. Fair Play & Club Guidelines
                </h2>
                <p>
                  Participants agree to log authentic running and walking activities. Club administrators reserve the right to review, flag, or exclude activities that violate club rules (e.g., cycling logged as running, erroneous GPS logs, or motorized transport).
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  5. Disclaimer & Limitation of Liability
                </h2>
                <p>
                  The Application is provided on an "as is" and "as available" basis without warranties of any kind. Participants are solely responsible for their personal physical safety, health condition, and medical clearance during all running and training activities.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  6. Contact Information
                </h2>
                <p>
                  For inquiries regarding these Terms of Service, please contact the Haskoning Running Club Administration at <a href="mailto:viettien274@gmail.com" style={{ color: '#00A3A6' }}>viettien274@gmail.com</a>.
                </p>
              </section>
            </div>
          ) : (
            /* VIETNAMESE CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  1. Chấp Thuận Điều Khoản
                </h2>
                <p>
                  Khi sử dụng hoặc kết nối tài khoản Strava với ứng dụng <strong>Haskoning Vietnam Running Club Tracker</strong>, bạn đồng ý tuân thủ các điều khoản dịch vụ này.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  2. Mục Đích Phi Thương Mại
                </h2>
                <p>
                  Ứng dụng được xây dựng hoàn toàn phi thương mại, phục vụ phong trào rèn luyện thể thao nội bộ của nhân viên công ty HaskoningDHV tại Việt Nam.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  3. Tuân Thủ Quy Định Strava
                </h2>
                <p>
                  Hệ thống kết nối qua Strava API chính thức, bảo đảm tôn trọng quyền riêng tư và chỉ sử dụng số liệu chạy bộ cho bảng xếp hạng CLB.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '1.2rem', color: '#002D54', fontWeight: 700, marginBottom: '8px' }}>
                  4. Tinh Thần Thể Thao & Trung Thực
                </h2>
                <p>
                  Thành viên cam kết ghi nhận bài tập trung thực. Ban quản trị có quyền loại trừ các bài tập sai quy chế (như đi xe máy/xe đạp gắn mác chạy bộ).
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
            <Link to="/privacy-policy" style={{ color: '#00A3A6', textDecoration: 'none', fontWeight: 600 }}>
              {lang === 'en' ? 'Privacy Policy' : 'Chính Sách Bảo Mật'}
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

