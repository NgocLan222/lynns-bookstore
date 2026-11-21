import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './QuanLyNguoiDung.css';

const SO_DONG_MOI_TRANG = 10;

const QuanLyNguoiDung = () => {
  const { nguoiDung: adminHienTai } = useAuth();
  const [dsNguoiDung, setDsNguoiDung] = useState([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [dangTai, setDangTai] = useState(true);
  const [trangHienTai, setTrangHienTai] = useState(1);

  const taiDanhSach = async () => {
    setDangTai(true);
    try {
      const res = await axiosClient.get('/quan-tri/nguoi-dung');
      setDsNguoiDung(res.du_lieu || []);
    } catch {
      setDsNguoiDung([]);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDanhSach();
  }, []);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tuKhoa]);

  const doiTrangThai = async (user) => {
    const trangThaiMoi = user.trang_thai === 'HOAT_DONG' ? 'BI_KHOA' : 'HOAT_DONG';
    const hanhDong = trangThaiMoi === 'BI_KHOA' ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Xác nhận ${hanhDong} tài khoản "${user.ten_dang_nhap}"?`)) return;

    try {
      const res = await axiosClient.put(`/quan-tri/nguoi-dung/${user.ma_nguoi_dung}/trang-thai`, {
        trang_thai: trangThaiMoi,
      });
      alert(res.thong_bao);
      taiDanhSach();
    } catch (error) {
      alert(error.thong_bao || 'Thao tác thất bại.');
    }
  };

  const dsLoc = dsNguoiDung.filter(
    (u) =>
      u.ten_dang_nhap.toLowerCase().includes(tuKhoa.toLowerCase()) ||
      u.ho_ten.toLowerCase().includes(tuKhoa.toLowerCase()) ||
      u.email.toLowerCase().includes(tuKhoa.toLowerCase())
  );

  const tongTrang = Math.max(1, Math.ceil(dsLoc.length / SO_DONG_MOI_TRANG));
  const trangHopLe = Math.min(trangHienTai, tongTrang);
  const batDau = (trangHopLe - 1) * SO_DONG_MOI_TRANG;
  const dsHienThi = dsLoc.slice(batDau, batDau + SO_DONG_MOI_TRANG);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Quản lý tài khoản độc giả ({dsLoc.length})</h1>
        <input
          type="text"
          className="input-crystal user-search-box"
          placeholder="Tìm theo tên, tài khoản, email..."
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
      </div>

      <div className="admin-card admin-table-wrap">
        {dangTai ? (
          <p>Đang tải danh sách tài khoản...</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Tài khoản / Email</th>
                  <th>Vai trò</th>
                  <th>Số dư Xu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dsHienThi.map((u) => (
                  <tr key={u.ma_nguoi_dung}>
                    <td>#{u.ma_nguoi_dung}</td>
                    <td style={{ fontWeight: 600 }}>{u.ho_ten}</td>
                    <td>
                      <div>{u.ten_dang_nhap}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${u.vai_tro === 'admin' ? 'badge-full' : 'badge-free'}`}>
                        {u.vai_tro === 'admin' ? 'Quản trị viên' : 'Độc giả'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--xu-color)' }}>{u.so_du_xu.toLocaleString()} Xu</td>
                    <td>
                      <span className={`badge ${u.trang_thai === 'HOAT_DONG' ? 'badge-free' : 'badge-xu'}`}>
                        {u.trang_thai === 'HOAT_DONG' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td>
                      {u.ma_nguoi_dung !== adminHienTai?.ma_nguoi_dung && (
                        <button
                          type="button"
                          className={`btn-lock ${u.trang_thai === 'HOAT_DONG' ? 'danger' : 'success'}`}
                          onClick={() => doiTrangThai(u)}
                        >
                          {u.trang_thai === 'HOAT_DONG' ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở khóa</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tongTrang > 1 && (
              <div className="admin-pagination-bar">
                <span>
                  Hiển thị {batDau + 1}–{Math.min(batDau + dsHienThi.length, dsLoc.length)} / {dsLoc.length} tài khoản
                </span>
                <div className="admin-pagination-btns">
                  <button
                    type="button"
                    className="admin-page-btn"
                    disabled={trangHopLe <= 1}
                    onClick={() => setTrangHienTai((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  {Array.from({ length: tongTrang }, (_, idx) => idx + 1).map((so) => (
                    <button
                      key={so}
                      type="button"
                      className={`admin-page-btn ${so === trangHopLe ? 'active' : ''}`}
                      onClick={() => setTrangHienTai(so)}
                    >
                      {so}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="admin-page-btn"
                    disabled={trangHopLe >= tongTrang}
                    onClick={() => setTrangHienTai((p) => Math.min(tongTrang, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuanLyNguoiDung;