import { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [nguoiDung, setNguoiDung] = useState(null);
  const [dangTai, setDangTai] = useState(true);

  const taiThongTinNguoiDung = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setDangTai(false);
      return;
    }
    try {
      const res = await axiosClient.get('/auth/toi');
      setNguoiDung(res.du_lieu);
    } catch {
      localStorage.removeItem('token');
      setNguoiDung(null);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiThongTinNguoiDung();
  }, []);

  const luuPhienDangNhap = (token, user) => {
    localStorage.setItem('token', token);
    setNguoiDung(user);
  };

  const dangXuat = () => {
    localStorage.removeItem('token');
    setNguoiDung(null);
  };

  const capNhatSoDuXu = (soDuMoi) => {
    setNguoiDung((prev) => (prev ? { ...prev, so_du_xu: soDuMoi } : null));
  };

  const capNhatThongTinUser = (duLieuMoi) => {
    setNguoiDung((prev) => (prev ? { ...prev, ...duLieuMoi } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        nguoiDung,
        dangTai,
        luuPhienDangNhap,
        dangXuat,
        capNhatSoDuXu,
        capNhatThongTinUser,
        taiThongTinNguoiDung,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);