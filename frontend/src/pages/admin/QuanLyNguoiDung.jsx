import { useState, useEffect } from 'react';
import { Lock, Unlock, UserPlus, Shield, Users, X } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './QuanLyNguoiDung.css';

const SO_DONG_MOI_TRANG = 10;

const FORM_ADMIN_MAC_DINH = {
  ho_ten: '',
  ten_dang_nhap: '',
  email: '',
  mat_khau: '',
};

const QuanLyNguoiDung = () => {
  const { nguoiDung: adminHienTai } = useAuth();
  const [dsNguoiDung, setDsNguoiDung] = useState([]);
  const [tabDangChon, setTabDangChon] = useState('admin');
  const [tuKhoa, setTuKhoa] = useState('');
  const [dangTai, setDangTai] = useState(true);
  const [trangHienTai, setTrangHienTai] = useState(1);

  const [moFormTaoAdmin, setMoFormTaoAdmin] = useState(false);
  const [formAdmin, setFormAdmin] = useState(FORM_ADMIN_MAC_DINH);
  const [dangTaoAdmin, setDangTaoAdmin] = useState(false);

  const laAdminChinh =
    adminHienTai?.ten_dang_nhap === 'admin' || adminHienTai?.ma_nguoi_dung === 2;

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
  }, [tuKhoa, tabDangChon]);

  const xuLyTaoAdmin = async (e) => {
    e.preventDefault();
    setDangTaoAdmin(true);
    try {
      const res = await axiosClient.post('/quan-tri/nguoi-dung/tao-admin', formAdmin);
      alert(res.thong_bao || 'Cấp tài khoản Admin thành công!');
      setFormAdmin(FORM_ADMIN_MAC_DINH);
      setMoFormTaoAdmin(false);
      setTabDangChon('admin');
      await taiDanhSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể cấp tài khoản Admin.');
    } finally {
      setDangTaoAdmin(false);
    }
  };

  const doiTrangThai = async (user) => {
    if (user.ten_dang_nhap === 'admin' || user.ma_nguoi_dung === 2) {
      return alert('Không thể thay đổi trạng thái của tài khoản Admin chính.');
    }
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

  const dsAdmin = dsLoc.filter((u) => u.vai_tro === 'admin');
  const dsDocGia = dsLoc.filter((u) => u.vai_tro !== 'admin');

  const tongTrang = Math.max(1, Math.ceil(dsDocGia.length / SO_DONG_MOI_TRANG));
  const trangHopLe = Math.min(trangHienTai, tongTrang);
  const batDau = (trangHopLe - 1) * SO_DONG_MOI_TRANG;
  const dsDocGiaHienThi = dsDocGia.slice(batDau, batDau + SO_DONG_MOI_TRANG);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Quản lý tài khoản ({dsLoc.length})</h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-sub)', marginTop: '2px' }}>
            Phân tách tài khoản Quản trị viên và Độc giả
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input-crystal user-search-box"
            placeholder="Tìm theo tên, tài khoản, email..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
          />

          {laAdminChinh && (
            <button
              type="button"
              className="btn-crystal"
              onClick={() => {
                setTabDangChon('admin');
                setMoFormTaoAdmin(true);
              }}
            >
              <UserPlus size={16} /> Cấp tài khoản Admin
            </button>
          )}
        </div>
      </div>

      {/* 2 Tab nằm cạnh nhau */}
      <div className="user-role-tabs">
        <button
          type="button"
          className={`user-role-tab-btn ${tabDangChon === 'admin' ? 'active' : ''}`}
          onClick={() => setTabDangChon('admin')}
        >
          <Shield size={16} />
          <span>Quản trị viên</span>
          <span className="user-tab-badge">{dsAdmin.length}</span>
        </button>

        <button
          type="button"
          className={`user-role-tab-btn ${tabDangChon === 'doc_gia' ? 'active' : ''}`}
          onClick={() => setTabDangChon('doc_gia')}
        >
          <Users size={16} />
          <span>Độc giả</span>
          <span className="user-tab-badge">{dsDocGia.length}</span>
        </button>
      </div>

      {moFormTaoAdmin && laAdminChinh && tabDangChon === 'admin' && (
        <div className="admin-card" style={{ marginBottom: '20px', border: '1px solid var(--border-crystal)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary-blue)" /> Cấp tài khoản Quản trị viên mới
            </h2>
            <button
              type="button"
              onClick={() => { setMoFormTaoAdmin(false); setFormAdmin(FORM_ADMIN_MAC_DINH); }}
              style={{ background: 'transparent', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={xuLyTaoAdmin} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Họ tên</label>
              <input
                type="text"
                className="input-crystal"
                placeholder="VD: Biên tập viên 1"
                value={formAdmin.ho_ten}
                onChange={(e) => setFormAdmin({ ...formAdmin, ho_ten: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Tên đăng nhập</label>
              <input
                type="text"
                className="input-crystal"
                placeholder="VD: admin_btv1"
                value={formAdmin.ten_dang_nhap}
                onChange={(e) => setFormAdmin({ ...formAdmin, ten_dang_nhap: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                className="input-crystal"
                placeholder="admin.btv1@gmail.com"
                value={formAdmin.email}
                onChange={(e) => setFormAdmin({ ...formAdmin, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Mật khẩu khởi tạo</label>
              <input
                type="password"
                minLength={6}
                className="input-crystal"
                placeholder="Tối thiểu 6 ký tự"
                value={formAdmin.mat_khau}
                onChange={(e) => setFormAdmin({ ...formAdmin, mat_khau: e.target.value })}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => { setMoFormTaoAdmin(false); setFormAdmin(FORM_ADMIN_MAC_DINH); }}
              >
                Hủy
              </button>
              <button type="submit" className="btn-crystal" disabled={dangTaoAdmin}>
                {dangTaoAdmin ? 'Đang tạo...' : 'Xác nhận cấp quyền Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tabDangChon === 'admin' ? (
        <div className="admin-card admin-table-wrap">
          {dangTai ? (
            <p>Đang tải danh sách quản trị viên...</p>
          ) : dsAdmin.length === 0 ? (
            <p style={{ color: 'var(--text-sub)' }}>Không tìm thấy tài khoản quản trị viên phù hợp.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Tài khoản / Email</th>
                  <th>Phân cấp</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dsAdmin.map((u) => {
                  const isRootAdmin = u.ten_dang_nhap === 'admin' || u.ma_nguoi_dung === 2;
                  return (
                    <tr key={u.ma_nguoi_dung}>
                      <td>#{u.ma_nguoi_dung}</td>
                      <td style={{ fontWeight: 600 }}>{u.ho_ten}</td>
                      <td>
                        <div>{u.ten_dang_nhap}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${isRootAdmin ? 'badge-xu' : 'badge-full'}`}>
                          {isRootAdmin ? 'Admin chính' : 'Quản trị viên'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.trang_thai === 'HOAT_DONG' ? 'badge-free' : 'badge-xu'}`}>
                          {u.trang_thai === 'HOAT_DONG' ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td>
                        {laAdminChinh && !isRootAdmin && u.ma_nguoi_dung !== adminHienTai?.ma_nguoi_dung && (
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="admin-card admin-table-wrap">
          {dangTai ? (
            <p>Đang tải danh sách độc giả...</p>
          ) : dsDocGia.length === 0 ? (
            <p style={{ color: 'var(--text-sub)' }}>Không tìm thấy tài khoản độc giả phù hợp.</p>
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
                  {dsDocGiaHienThi.map((u) => (
                    <tr key={u.ma_nguoi_dung}>
                      <td>#{u.ma_nguoi_dung}</td>
                      <td style={{ fontWeight: 600 }}>{u.ho_ten}</td>
                      <td>
                        <div>{u.ten_dang_nhap}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-free">Độc giả</span>
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
                    Hiển thị {batDau + 1}–{Math.min(batDau + dsDocGiaHienThi.length, dsDocGia.length)} / {dsDocGia.length} độc giả
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
      )}
    </div>
  );
};

export default QuanLyNguoiDung;