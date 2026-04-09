import { create } from 'zustand';
import api from '../services/api';

const useCodingStore = create((set) => ({
  currentAnomaly: null,
  stats: null,
  loading: false,

  fetchStats: async () => {
    const { data } = await api.get('/dashboard/stats');
    set({ stats: data });
  },

  fetchNext: async () => {
    set({ loading: true });
    try {
      const { data } = await api.post('/anomaly/next');
      set({ currentAnomaly: data, loading: false });
      return data;
    } catch (err) {
      set({ currentAnomaly: null, loading: false });
      return null;
    }
  },

  saveCoding: async (anomalyId, coding) => {
    await api.post(`/anomaly/${anomalyId}/save`, coding);
    set({ currentAnomaly: null });
  },

  skipAnomaly: async (anomalyId) => {
    await api.post(`/anomaly/${anomalyId}/skip`);
    set({ currentAnomaly: null });
  },

  reportError: async (anomalyId, report) => {
    await api.post(`/anomaly/${anomalyId}/error-report`, report);
  },

  clear: () => set({ currentAnomaly: null }),
}));

export default useCodingStore;
