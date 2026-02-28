import api from './api';

export const authService = {
  login: async (pin: string) => {
    try {
      const response = await api.post('/auth/login', { pin });
      if (response.data.token) {
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
      // Si el token es inválido o el servidor no responde, limpiamos el almacenamiento
      localStorage.removeItem('odontos_token');
      return { valid: false };
    }
  },
  logout: () => {
    localStorage.removeItem('odontos_token');
  }
};