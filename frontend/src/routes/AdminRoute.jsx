import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { nguoiDung, dangTai } = useAuth();

  if (dangTai) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang kiểm tra quyền truy cập...</div>;
  }

  if (!nguoiDung || nguoiDung.vai_tro !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;