import api from './api';

export const authService = {
  login: async (pin: string) => {
    try {
      const response = await api.post('/auth/login', { pin });
      if (response.data.token) {
        localStorage.setItem('barber_token', response.data.token);
      }
      console.log('Auth.service Response: ', response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  verify: async () => {
    const token = localStorage.getItem('barber_token');
    if (!token) return { valid: false };

    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error: any) {
      // Si el token es inválido o el servidor no responde, limpiamos el almacenamiento
      localStorage.removeItem('barber_token');
      return { valid: false };
    }
  },
  logout: () => {
    localStorage.removeItem('barber_token');
  }
};