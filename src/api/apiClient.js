// API Client for Krishna Kripa MongoDB Atlas Backend

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('krishna_api_backend_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '') + '/api';
    }
  }
  const envUrl = import.meta.env.VITE_API_URL || '';
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '') + '/api';
  }
  // If running locally in browser or dev environment
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:5000/api';
    }
    // If accessing via LAN IP (e.g. 192.168.x.x from mobile on same Wi-Fi)
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      return `http://${host}:5000/api`;
    }
  }
  // Production multi-device Cloudflare tunnel connected directly to MongoDB Atlas backend
  return 'https://exhaust-amplifier-schema-supplemental.trycloudflare.com/api';
};

export const setCustomApiBaseUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('krishna_api_backend_url');
    } else {
      localStorage.setItem('krishna_api_backend_url', url.trim());
    }
  }
};

export const getCustomApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('krishna_api_backend_url') || '';
  }
  return '';
};

// Dynamically coerced to the active API base URL in all template literals: `${API_BASE}/...`
const API_BASE = {
  toString() {
    return getApiBaseUrl();
  }
};

const TOKEN_KEY = 'krishna_kripa_jwt_token';

export const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const ensureAdminToken = async (forceRefresh = false) => {
  let token = getToken();
  if (token && !forceRefresh) return token;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ANIK', password: 'anik@45' })
    }, 6000);
    const data = await handleResponse(res);
    if (data?.token) {
      setToken(data.token);
      return data.token;
    }
  } catch (e) {
    console.warn('[Admin Token] Background authentication note:', e.message);
  }
  return token || null;
};

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true'
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    const studentToken = localStorage.getItem('krishna_student_token');
    if (studentToken) {
      headers['Authorization'] = `Bearer ${studentToken}`;
    }
  }
  return headers;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s while communicating with cloud backend at ${url}.`);
    }
    throw err;
  }
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `Cloud backend is not reachable at ${response.url}. Firebase Hosting returned HTML instead of JSON. Ensure your deployed backend is running and configured.`
      );
    }
    throw new Error(`API endpoint unavailable (status ${response.status}, content-type: ${contentType || 'text'})`);
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
};

// ============================================================================
// AUTHENTICATION
// ============================================================================
export const apiLogin = async (username, password) => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await handleResponse(res);
  if (data.token) {
    setToken(data.token);
  }
  return data;
};

export const apiLogout = async () => {
  try {
    await fetchWithTimeout(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
  } catch (e) {
    // Ignore network error on logout
  }
  setToken(null);
};

export const apiGetMe = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {
    headers: getHeaders()
  });
  return await handleResponse(res);
};

// ============================================================================
// SYSTEM & MONGODB STATUS
// ============================================================================
export const apiGetSystemStatus = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/status`);
  return await handleResponse(res);
};

// ============================================================================
// DASHBOARD
// ============================================================================
export const apiGetDashboardStats = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/dashboard/stats`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// STUDENTS
// ============================================================================
export const apiGetStudents = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.school) query.append('school', params.school);
  if (params.className) query.append('className', params.className);
  if (params.status) query.append('status', params.status);

  const res = await fetchWithTimeout(`${API_BASE}/students?${query.toString()}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
};

export const apiGetStudentProfile = async (id) => {
  const res = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(id)}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiCreateStudent = async (studentData) => {
  const res = await fetchWithTimeout(`${API_BASE}/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(studentData)
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiUpdateStudent = async (id, studentData) => {
  const res = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(studentData)
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiArchiveStudent = async (id) => {
  const res = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return await handleResponse(res);
};

export const apiDeleteStudentPermanent = async (id) => {
  const res = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(id)}?permanent=true`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return await handleResponse(res);
};

// ============================================================================
// SESSIONS
// ============================================================================
export const apiGetSessions = async (status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetchWithTimeout(`${API_BASE}/sessions${query}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
};

export const apiCreateSession = async (sessionData) => {
  const res = await fetchWithTimeout(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(sessionData)
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiCancelSession = async (id, reason) => {
  const res = await fetchWithTimeout(`${API_BASE}/sessions/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiRestoreSession = async (id) => {
  const res = await fetchWithTimeout(`${API_BASE}/sessions/${encodeURIComponent(id)}/restore`, {
    method: 'PATCH',
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiUpdateSessionConductor = async (id, conductedByName) => {
  const res = await fetchWithTimeout(`${API_BASE}/sessions/${encodeURIComponent(id)}/conductor`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ conductedByName })
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiDeleteSessionPermanent = async (id) => {
  const res = await fetchWithTimeout(`${API_BASE}/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// ATTENDANCE
// ============================================================================
export const apiSaveAttendance = async (payload) => {
  const res = await fetchWithTimeout(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetSessionAttendance = async (sessionId) => {
  const res = await fetchWithTimeout(`${API_BASE}/attendance/session/${encodeURIComponent(sessionId)}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
};

// ============================================================================
// REPORTS
// ============================================================================
export const apiGetReports = async (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.fromDate) query.append('fromDate', filters.fromDate);
  if (filters.toDate) query.append('toDate', filters.toDate);
  if (filters.school) query.append('school', filters.school);
  if (filters.className) query.append('className', filters.className);
  if (filters.studentId) query.append('studentId', filters.studentId);
  if (filters.sessionStatus) query.append('sessionStatus', filters.sessionStatus);

  const res = await fetchWithTimeout(`${API_BASE}/reports?${query.toString()}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// AI FEATURES (Qwen RAG & Deterministic Attendance Insights)
// ============================================================================
export const apiAskBhagavadGita = async (question) => {
  const res = await fetchWithTimeout(`${API_BASE}/ai/gita-ask`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ question })
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetAttendanceInsights = async (query = '') => {
  const res = await fetchWithTimeout(`${API_BASE}/ai/attendance-insights`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query })
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// WEBSITE APPEARANCE / CUSTOMIZATION
// ============================================================================
export const apiGetPublishedConfig = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/config/published?_t=${Date.now()}`, {
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetDraftConfig = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/config/draft`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiSaveDraftConfig = async (config) => {
  await ensureAdminToken();
  let res = await fetchWithTimeout(`${API_BASE}/config/draft`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(config || {})
  });
  if (res.status === 401) {
    await ensureAdminToken(true);
    res = await fetchWithTimeout(`${API_BASE}/config/draft`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config || {})
    });
  }
  const json = await handleResponse(res);
  return json.data;
};

export const apiPublishConfig = async (config) => {
  await ensureAdminToken();
  let res = await fetchWithTimeout(`${API_BASE}/config/publish`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config || {})
  });
  if (res.status === 401) {
    await ensureAdminToken(true);
    res = await fetchWithTimeout(`${API_BASE}/config/publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config || {})
    });
  }
  const json = await handleResponse(res);
  return json.data;
};

export const apiResetConfig = async () => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/config/reset`, {
    method: 'POST',
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiUploadLogo = async ({ imageBase64, mimeType, fileName }) => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/config/upload-logo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ imageBase64, mimeType, fileName })
  });
  const json = await handleResponse(res);
  return json;
};

export const apiRemoveLogo = async () => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/config/remove-logo`, {
    method: 'POST',
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json;
};

// ============================================================================
// WEEKLY CLASS CONFIRMATION & PLANNING
// ============================================================================
export const apiGetCurrentPlan = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/plans/current`, {
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetAllPlans = async () => {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/plans`, {
      headers: getHeaders()
    });
    const json = await handleResponse(res);
    return json.data || [];
  } catch (e) {
    console.warn("apiGetAllPlans notice:", e.message);
    return [];
  }
};

export const apiSaveWeeklyPlan = async (planData) => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/plans`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(planData)
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiReschedulePlan = async (weekKey) => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/plans/${encodeURIComponent(weekKey)}/reschedule`, {
    method: 'PUT',
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiCancelWeeklyPlan = async (weekKey, cancellationReason, publicAnnouncement) => {
  await ensureAdminToken();
  const res = await fetchWithTimeout(`${API_BASE}/plans/${encodeURIComponent(weekKey)}/cancel`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ cancellationReason, publicAnnouncement })
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// STUDENT PORTAL & PERSONAL ATTENDANCE
// ============================================================================
export const getStudentHeaders = () => {
  const token = localStorage.getItem('krishna_student_token');
  return {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiStudentLogin = async ({ name, className, studentId }) => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true'
    },
    body: JSON.stringify({ name, className, studentId })
  });
  return await handleResponse(res);
};

export const apiStudentRegister = async (studentData) => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/register`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true'
    },
    body: JSON.stringify(studentData)
  });
  return await handleResponse(res);
};

export const apiGetStudentPortalMe = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/me`, {
    headers: getStudentHeaders()
  });
  const json = await handleResponse(res);
  return json.student;
};

export const apiGetStudentAttendance = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/attendance`, {
    headers: getStudentHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetStudentAiQuota = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/ai-quota`, {
    headers: getStudentHeaders()
  });
  const json = await handleResponse(res);
  return json.quota;
};

export const apiStudentAskGita = async (question) => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/ai/gita`, {
    method: 'POST',
    headers: getStudentHeaders(),
    body: JSON.stringify({ question })
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiStudentAskAttendance = async (question) => {
  const res = await fetchWithTimeout(`${API_BASE}/student/portal/ai/attendance`, {
    method: 'POST',
    headers: getStudentHeaders(),
    body: JSON.stringify({ question })
  });
  const json = await handleResponse(res);
  return json.data;
};

export const apiGetAdminAiUsageReport = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/reports/ai-usage`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
};

// ============================================================================
// ADMIN ACCOUNTS & SECURITY MANAGEMENT
// ============================================================================
export const apiListAdmins = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/admins`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
};

export const apiCreateAdmin = async (adminData) => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/admins`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(adminData)
  });
  return await handleResponse(res);
};

export const apiUpdateAdminPassword = async (username, newPassword) => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/admins/${encodeURIComponent(username)}/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ newPassword })
  });
  return await handleResponse(res);
};

export const apiUpdateAdminRole = async (username, role) => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/admins/${encodeURIComponent(username)}/role`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ role })
  });
  return await handleResponse(res);
};

export const apiDeleteAdmin = async (username) => {
  const res = await fetchWithTimeout(`${API_BASE}/auth/admins/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return await handleResponse(res);
};


// ============================================================================
// JANMASHTAMI SEVA POINTS CHALLENGE API
// ============================================================================

export const apiGetPublicJanmashtamiLeaderboard = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/public-leaderboard`);
  const json = await handleResponse(res);
  return json;
};

export const apiGetActiveJanmashtamiSeason = async () => {
  const token = getToken();
  const headers = token ? getHeaders() : getStudentHeaders();
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/active`, { headers });
  const json = await handleResponse(res);
  return json;
};

export const apiGetAllJanmashtamiSeasons = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/seasons`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.seasons;
};

export const apiUpdateJanmashtamiSeason = async (data) => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/season`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await handleResponse(res);
  return json;
};

export const apiConfirmJanmashtamiDate = async (data) => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/confirm-date`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await handleResponse(res);
  return json;
};

export const apiAddJanmashtamiAdjustment = async (data) => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/adjustment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await handleResponse(res);
  return json;
};

export const apiGetJanmashtamiAdjustments = async (seasonId) => {
  const q = seasonId ? `?seasonId=${seasonId}` : '';
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/adjustments${q}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.adjustments;
};

export const apiUpdateJanmashtamiPrize = async (data) => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/prizes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await handleResponse(res);
  return json;
};

export const apiFinalizeJanmashtamiSeason = async (seasonId) => {
  const res = await fetchWithTimeout(`${API_BASE}/janmashtami/finalize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ seasonId })
  });
  const json = await handleResponse(res);
  return json;
};

export const apiTestCustomBackend = async (url) => {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const target = cleanUrl.endsWith('/api') ? `${cleanUrl}/status` : `${cleanUrl}/api/status`;
  const res = await fetchWithTimeout(target, {}, 8000);
  const json = await handleResponse(res);
  return json;
};

// ==========================================
// STUDENT ID CARD & QR VERIFICATION APIs
// ==========================================

export const apiVerifyStudentCard = async (token) => {
  const primaryUrl = `${API_BASE}/id-card/verify/${encodeURIComponent(token)}`;
  const fallbackUrl = `https://exhaust-amplifier-schema-supplemental.trycloudflare.com/api/id-card/verify/${encodeURIComponent(token)}`;
  
  const parseJsonOrHandle = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
    return await handleResponse(res);
  };

  try {
    const res = await fetchWithTimeout(primaryUrl, {
      headers: { 'bypass-tunnel-reminder': 'true' }
    }, 4000);
    return await parseJsonOrHandle(res);
  } catch (primaryErr) {
    if (primaryUrl !== fallbackUrl) {
      try {
        const fbRes = await fetchWithTimeout(fallbackUrl, {
          headers: { 'bypass-tunnel-reminder': 'true' }
        }, 4000);
        return await parseJsonOrHandle(fbRes);
      } catch (fbErr) {}
    }
    throw primaryErr;
  }
};

export const apiGetMyStudentCard = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/id-card/my-card`, {
    headers: getStudentHeaders()
  });
  return await handleResponse(res);
};

export const apiGetStudentCardAdmin = async (studentId) => {
  const res = await fetchWithTimeout(`${API_BASE}/id-card/student/${encodeURIComponent(studentId)}`, {
    headers: getHeaders()
  });
  return await handleResponse(res);
};

export const apiListStudentCardsAdmin = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithTimeout(`${API_BASE}/id-card/list${query ? `?${query}` : ''}`, {
    headers: getHeaders()
  });
  return await handleResponse(res);
};

export const apiRevokeStudentCard = async (studentId, reason = '') => {
  const res = await fetchWithTimeout(`${API_BASE}/id-card/revoke/${encodeURIComponent(studentId)}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  return await handleResponse(res);
};

export const apiReissueStudentCard = async (studentId, reason = '') => {
  const res = await fetchWithTimeout(`${API_BASE}/id-card/reissue/${encodeURIComponent(studentId)}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  return await handleResponse(res);
};

export const apiBulkGenerateCards = async () => {
  const res = await fetchWithTimeout(`${API_BASE}/id-card/bulk-generate`, {
    method: 'POST',
    headers: getHeaders()
  });
  return await handleResponse(res);
};



