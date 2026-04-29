import { create } from 'zustand';
import api from '../services/api';

const useCodingStore = create((set) => ({
  currentAnomaly: null,
  stats: null,
  loading: false,

  fetchStats: async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      set({ stats: data });
    } catch {
      set({ stats: null });
    }
  },

  fetchNext: async () => {
    set({ loading: true });
    try {
      const { data } = await api.post('/anomaly/next');
      set({ currentAnomaly: data, loading: false });
      return data;
    } catch (err) {
      set({ currentAnomaly: null, loading: false });
      // Return error info so callers can distinguish "no data" from "auth error"
      if (err.response?.status === 401) return { _authError: true };
      return null;
    }
  },

  saveCoding: async (anomalyId, coding) => {
    await api.post(`/anomaly/${anomalyId}/save`, coding);
    set({ currentAnomaly: null });
  },

  saveCodingIcd11: async (anomalyId, coding) => {
    await api.post(`/anomaly/${anomalyId}/save-icd11`, coding);
    set({ currentAnomaly: null });
  },

  skipAnomaly: async (anomalyId) => {
    await api.post(`/anomaly/${anomalyId}/skip`);
    set({ currentAnomaly: null });
  },

  reportError: async (anomalyId, report) => {
    await api.post(`/anomaly/${anomalyId}/error-report`, report);
  },

  setAnomaly: (anomaly) => set({ currentAnomaly: anomaly }),

  clear: () => set({ currentAnomaly: null }),
}));

export default useCodingStore;
