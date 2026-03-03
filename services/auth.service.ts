import api from './api';

export const authService = {
  verifyNit: async (nit: string) => {
    try {
      const response = await api.post('/auth/verify-nit', { nit });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  login: async (pin: string) => {
    try {
      const response = await api.post('/auth/login', { pin });
      if (response.data.token) {
        localStorage.setItem('odonto_data', JSON.stringify(response.data));
        localStorage.setItem('odontos_token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  verify: async () => {
    const token = localStorage.getItem('odontos_token');
    if (!token) return { valid: false };

    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error: any) {
      localStorage.removeItem('odontos_data');
      localStorage.removeItem('odontos_token');
      return { valid: false };
    }
  },
  logout: () => {
    localStorage.removeItem('odontos_data');
    localStorage.removeItem('odontos_token');
  }
};