import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – auto-refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  verifyEmail: (data: { email: string; token: string }) =>
    api.post('/auth/verify-email', data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// ===== PATIENT =====
export const patientApi = {
  getProfile: () => api.get('/profile/patients/me'),
  updateProfile: (data: object) =>
    api.patch('/profile/patients/me', data),
};

// ===== DOCTORS =====
export const doctorApi = {
  getAll: () => api.get('/profile/doctors'),
  create: (data: object) => api.post('/profile/doctors', data),
  updateSelf: (data: object) => api.patch('/profile/doctors/me', data),
  updateByAdmin: (id: number, data: object) =>
    api.patch(`/profile/doctors/${id}`, data),
};

// ===== SCHEDULE =====
export const scheduleApi = {
  getSystemSlots: () => api.get('/booking/schedule/system-slots'),
  createSystemSlot: (data: object) =>
    api.post('/booking/schedule/system-slots', data),
  registerAvailability: (data: object) =>
    api.post('/booking/schedule/doctor-availability', data),
  getMyAvailability: () => api.get('/booking/schedule/doctor-availability/me'),
  deleteAvailability: (id: number) =>
    api.delete(`/booking/schedule/doctor-availability/${id}`),
  getAvailableSlots: (params: object) =>
    api.get('/booking/schedule/calendar-slots', { params }),
  lockSlot: (slotId: number) =>
    api.patch(`/booking/schedule/calendar-slots/${slotId}/lock`),
  // FIX: Sinh slot thực tế ngay sau khi bác sĩ lưu lịch
  generateSlots: () =>
    api.post('/booking/schedule/generate-slots'),
};

// ===== APPOINTMENTS =====
export const appointmentApi = {
  create: (data: { slot_id: number; description: string; medical_files?: string[] }) =>
    api.post('/booking/appointments', data),
  getPaymentStatus: (id: number) =>
    api.get(`/booking/appointments/${id}/payment-status`),
  getMyAppointments: () => api.get('/booking/appointments/patient/my'),
  getTodayForDoctor: () => api.get('/booking/appointments/doctor/today'),
  startAppointment: (id: number) => api.patch(`/booking/appointments/${id}/start`),
  completeAppointment: (id: number, data: object) =>
    api.patch(`/booking/appointments/${id}/complete`, data),
  getMedicalRecord: (id: number) =>
    api.get(`/booking/appointments/${id}/medical-record`),
};

// ===== DRUGS =====
export const drugApi = {
  getAll: (search?: string) =>
    api.get('/drugs', { params: search ? { search } : {} }),
  create: (data: object) => api.post('/admin/drugs', data),
  update: (id: number, data: object) =>
    api.patch(`/admin/drugs/${id}`, data),
  remove: (id: number) => api.delete(`/admin/drugs/${id}`),
};
