import axios from 'axios';

const GATEWAY = 'https://gateway-production-7565.up.railway.app/api';

const createInstance = (baseURL) => {
  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          const res = await axios.post(`${GATEWAY}/auth/refresh`, { refreshToken });
          const newToken = res.data.token;
          const newRefresh = res.data.refreshToken;

          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefresh);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const authAPI     = createInstance(`${GATEWAY}/auth`);
export const incidentAPI = createInstance(`${GATEWAY}/incident`);
export const dispatchAPI = createInstance(`${GATEWAY}/dispatch`);
export const analyticsAPI = createInstance(`${GATEWAY}/analytics`);
