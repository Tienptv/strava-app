/**
 * Strava API Wrapper
 * Đóng gói tất cả các lời gọi tới Strava API v3
 */

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize';

export class StravaAPI {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Helper: gọi Strava API với access token
   */
  async _fetch(accessToken, endpoint, options = {}) {
    const url = `${STRAVA_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Strava API error ${response.status}: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Đổi authorization code lấy access token
   */
  async exchangeToken(code, redirectUri) {
    const response = await fetch(STRAVA_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await fetch(STRAVA_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  /**
   * Hủy quyền truy cập
   */
  async deauthorize(accessToken) {
    const response = await fetch(STRAVA_DEAUTH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // ==========================================
  // ATHLETE
  // ==========================================

  async getAthlete(accessToken) {
    return this._fetch(accessToken, '/athlete');
  }

  async getAthleteStats(accessToken, athleteId) {
    return this._fetch(accessToken, `/athletes/${athleteId}/stats`);
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  async getActivities(accessToken, { page = 1, per_page = 30, after, before } = {}) {
    const params = new URLSearchParams({ page, per_page });
    if (after) params.append('after', after);
    if (before) params.append('before', before);
    return this._fetch(accessToken, `/athlete/activities?${params}`);
  }

  async getActivity(accessToken, activityId) {
    return this._fetch(accessToken, `/activities/${activityId}?include_all_efforts=true`);
  }

  // ==========================================
  // CLUBS
  // ==========================================

  async getAthleteClubs(accessToken) {
    return this._fetch(accessToken, '/athlete/clubs');
  }

  async getClub(accessToken, clubId) {
    return this._fetch(accessToken, `/clubs/${clubId}`);
  }

  async getClubMembers(accessToken, clubId, { page = 1, per_page = 30 } = {}) {
    const params = new URLSearchParams({ page, per_page });
    return this._fetch(accessToken, `/clubs/${clubId}/members?${params}`);
  }

  async getClubActivities(accessToken, clubId, { page = 1, per_page = 30 } = {}) {
    const params = new URLSearchParams({ page, per_page });
    return this._fetch(accessToken, `/clubs/${clubId}/activities?${params}`);
  }
}
