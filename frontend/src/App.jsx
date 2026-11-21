import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ReaderLayout from './layouts/ReaderLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminRoute from './routes/AdminRoute';

import TrangChu from './pages/reader/TrangChu';
import KhamPhaSach from './pages/reader/KhamPhaSach';
import ChiTietSach from './pages/reader/ChiTietSach';
import TrangDocSach from './pages/reader/TrangDocSach';
import TrangCaNhan from './pages/reader/TrangCaNhan';
import DangNhapDangKy from './pages/reader/DangNhapDangKy';

import TongQuanAdmin from './pages/admin/TongQuanAdmin';
import QuanLySach from './pages/admin/QuanLySach';
import QuanLyGoiNap from './pages/admin/QuanLyGoiNap';
import QuanLyNguoiDung from './pages/admin/QuanLyNguoiDung';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ReaderLayout />}>
            <Route path="/" element={<TrangChu />} />
            <Route path="/kham-pha" element={<KhamPhaSach />} />
            <Route path="/sach/:id" element={<ChiTietSach />} />
            <Route path="/ca-nhan" element={<TrangCaNhan />} />
            <Route path="/dang-nhap" element={<DangNhapDangKy />} />
          </Route>

          <Route path="/doc/:id" element={<TrangDocSach />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<TongQuanAdmin />} />
            <Route path="sach" element={<QuanLySach />} />
            <Route path="goi-nap" element={<QuanLyGoiNap />} />
            <Route path="nguoi-dung" element={<QuanLyNguoiDung />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;