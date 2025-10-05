import { useAuth } from '../context/AuthContext';

export const useFetchWithAuth = () => {
  const { token } = useAuth();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) console.warn('Unauthorized request');
    return res;
  };

  return fetchWithAuth;
};
