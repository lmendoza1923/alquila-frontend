import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (nombre, email, password, telefono) => {
    const { data } = await api.post('/auth/register', { nombre, email, password, telefono });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const cambiarPassword = async ({ passwordActual, nuevaPassword, usuario_id }) => {
    const { data } = await api.put('/auth/change-password', { passwordActual, nuevaPassword, usuario_id });
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, cambiarPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
