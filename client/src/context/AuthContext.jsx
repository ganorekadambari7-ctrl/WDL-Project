import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const storedUser = () => {
  try { return JSON.parse(localStorage.getItem('salary-pro-user')); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const login = (data) => { localStorage.setItem('salary-pro-token', data.token); localStorage.setItem('salary-pro-user', JSON.stringify(data.user)); setUser(data.user); };
  const updateUser = (nextUser) => { localStorage.setItem('salary-pro-user', JSON.stringify(nextUser)); setUser(nextUser); };
  const logout = () => { localStorage.removeItem('salary-pro-token'); localStorage.removeItem('salary-pro-user'); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
