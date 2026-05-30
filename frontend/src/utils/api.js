export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/';
    return null;
  }
  
  return response;
};
