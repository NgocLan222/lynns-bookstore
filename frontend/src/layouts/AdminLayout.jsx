import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Coins, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const AdminLayout = () => {
  const { nguoiDung } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <Sparkles size={22} color="#38bdf8" />
            <span>Crystal Admin</span>
          </div>

          <nav className="admin-nav">
            <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Tổng quan & Thống kê</span>
            </NavLink>
            <NavLink to="/admin/sach" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>Quản lý Sách & Chương</span>
            </NavLink>
            <NavLink to="/admin/goi-nap" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <Coins size={18} />
              <span>Quản lý Gói nạp Xu</span>
            </NavLink>
            <NavLink to="/admin/nguoi-dung" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Quản lý Tài khoản</span>
            </NavLink>
          </nav>
        </div>

        <Link to="/" className="admin-back-btn">
          <ArrowLeft size={16} />
          <span>Về trang Độc giả</span>
        </Link>
      </aside>

      <div className="admin-content-area">
        <header className="admin-topbar">
          <span className="admin-topbar-title">Hệ thống Quản trị Nội dung & Doanh thu Xu</span>
          <span className="admin-topbar-user">Xin chào, <strong>{nguoiDung?.ho_ten}</strong></span>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;