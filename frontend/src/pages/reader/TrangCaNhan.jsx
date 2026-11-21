import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Coins,
  KeyRound,
  UserPen,
  Camera,
  Pencil,
  Play,
  Star,
  CheckCircle,
  XCircle,
  QrCode,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './TrangCaNhan.css';

const THONG_TIN_NGAN_HANG = {
  maNganHang: 'MB',
  tenNganHang: 'MB Bank (Ngân hàng Quân Đội)',
  soTaiKhoan: '0369888999',
  chuTaiKhoan: "LYNN'S BOOKSTORE",
};

const TrangCaNhan = () => {
  const { nguoiDung, dangTai: dangTaiUser, capNhatSoDuXu, capNhatThongTinUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'HO_SO';

  const [tabKeSach, setTabKeSach] = useState('DANG_DOC');

  const [hoTenMoi, setHoTenMoi] = useState('');
  const [dangSuaTen, setDangSuaTen] = useState(false);
  const [fileAvatar, setFileAvatar] = useState(null);
  const [anhXemTruoc, setAnhXemTruoc] = useState('');
  const [dangLuuHoSo, setDangLuuHoSo] = useState(false);

  const avatarInputRef = useRef(null);
  const tenInputRef = useRef(null);

  const [tuSach, setTuSach] = useState({ dang_doc: [], yeu_thich: [], da_so_huu: [] });
  const [goiNap, setGoiNap] = useState([]);
  const [lichSuGd, setLichSuGd] = useState([]);

  // State cho hộp thoại Quét mã QR nạp Xu
  const [goiDangThanhToan, setGoiDangThanhToan] = useState(null);
  const [maChuyenKhoan, setMaChuyenKhoan] = useState('');
  const [giayConLaiQr, setGiayConLaiQr] = useState(600);
  const [daSaoChep, setDaSaoChep] = useState('');
  const [loiAnhQr, setLoiAnhQr] = useState(false);
  const [dangXacNhanNap, setDangXacNhanNap] = useState(false);

  const [matKhauForm, setMatKhauForm] = useState({ mat_khau_cu: '', mat_khau_moi: '' });

  useEffect(() => {
    if (nguoiDung) {
      setHoTenMoi(nguoiDung.ho_ten || '');
      setDangSuaTen(false);
      setAnhXemTruoc('');
      setFileAvatar(null);
    }
  }, [nguoiDung?.ma_nguoi_dung]);

  const taiDuLieu = async () => {
    try {
      const [tsRes, goiRes, lsRes] = await Promise.all([
        axiosClient.get('/tu-sach'),
        axiosClient.get('/vi-xu/goi-nap'),
        axiosClient.get('/vi-xu/lich-su'),
      ]);
      setTuSach(tsRes.du_lieu || { dang_doc: [], yeu_thich: [], da_so_huu: [] });
      setGoiNap(goiRes.du_lieu || []);
      setLichSuGd(lsRes.du_lieu || []);
    } catch {
      // Bỏ qua nếu lỗi
    }
  };

  useEffect(() => {
    if (nguoiDung) taiDuLieu();
  }, [nguoiDung?.ma_nguoi_dung]);

  useEffect(() => {
    if (!goiDangThanhToan || giayConLaiQr <= 0) return;
    const timer = setInterval(() => {
      setGiayConLaiQr((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [goiDangThanhToan, giayConLaiQr]);

  if (dangTaiUser) return <div className="container" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace />;

  const xuLyQuayLai = () => {
    navigate('/');
  };

  const doiTab = (tabMoi) => {
    setSearchParams({ tab: tabMoi });
  };

  const kichHoatSuaTen = () => {
    setDangSuaTen(true);
    setTimeout(() => {
      tenInputRef.current?.focus();
    }, 0);
  };

  const huyChinhSuaHoSo = () => {
    setHoTenMoi(nguoiDung.ho_ten || '');
    setDangSuaTen(false);
    setFileAvatar(null);
    setAnhXemTruoc('');
  };

  const chonAnhDaiDien = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileAvatar(file);
    setAnhXemTruoc(URL.createObjectURL(file));
  };

  const coTheLuuHoSo = dangSuaTen || Boolean(fileAvatar);

  const xuLyLuuHoSo = async (e) => {
    e.preventDefault();
    if (!coTheLuuHoSo) return;
    setDangLuuHoSo(true);
    try {
      const formData = new FormData();
      formData.append('ho_ten', hoTenMoi);
      if (fileAvatar) {
        formData.append('anh_dai_dien', fileAvatar);
      }
      const res = await axiosClient.put('/auth/ho-so', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      capNhatThongTinUser(res.du_lieu);
      setDangSuaTen(false);
      setFileAvatar(null);
      setAnhXemTruoc('');
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || 'Không thể cập nhật hồ sơ.');
    } finally {
      setDangLuuHoSo(false);
    }
  };

  const moHopThoaiQuetQR = (goi) => {
    const maNgauNhien = Math.floor(1000 + Math.random() * 9000);
    setMaChuyenKhoan(`LYNN${nguoiDung.ma_nguoi_dung}G${goi.ma_goi}${maNgauNhien}`);
    setGiayConLaiQr(600);
    setLoiAnhQr(false);
    setDaSaoChep('');
    setGoiDangThanhToan(goi);
  };

  const saoChepChuoi = (nhan, giaTri) => {
    navigator.clipboard?.writeText(giaTri);
    setDaSaoChep(nhan);
    setTimeout(() => setDaSaoChep(''), 1800);
  };

  const dinhDangDemNguoc = () => {
    const phut = String(Math.floor(giayConLaiQr / 60)).padStart(2, '0');
    const giay = String(giayConLaiQr % 60).padStart(2, '0');
    return `${phut}:${giay}`;
  };

  const xuLyThanhToanGiaLap = async (trangThai) => {
    if (!goiDangThanhToan) return;
    setDangXacNhanNap(true);
    try {
      const res = await axiosClient.post('/vi-xu/nap-xu', {
        ma_goi: goiDangThanhToan.ma_goi,
        trang_thai: trangThai,
      });
      if (res.du_lieu.so_du_xu !== null) {
        capNhatSoDuXu(res.du_lieu.so_du_xu);
      }
      setGoiDangThanhToan(null);
      await taiDuLieu();
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || 'Giao dịch thất bại.');
    } finally {
      setDangXacNhanNap(false);
    }
  };

  const xuLyDoiMatKhau = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.put('/auth/doi-mat-khau', matKhauForm);
      setMatKhauForm({ mat_khau_cu: '', mat_khau_moi: '' });
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || 'Không thể đổi mật khẩu.');
    }
  };

  const renderAnhBiaKeSach = (item, nhanGoc = null) => (
    <Link to={`/sach/${item.ma_sach}`} className="shelf-cover-link">
      {item.anh_bia ? (
        <img src={`${SERVER_URL}${item.anh_bia}`} alt={item.tieu_de} />
      ) : (
        <div className="shelf-cover-fallback">
          <BookOpen size={22} />
          <span>{item.tieu_de}</span>
        </div>
      )}
      {nhanGoc}
    </Link>
  );

  const chuCaiDau = nguoiDung.ho_ten?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const nguonAnhHienTai = anhXemTruoc || (nguoiDung.anh_dai_dien ? `${SERVER_URL}${nguoiDung.anh_dai_dien}` : '');

  const linkAnhVietQR = goiDangThanhToan
    ? `https://img.vietqr.io/image/${THONG_TIN_NGAN_HANG.maNganHang}-${THONG_TIN_NGAN_HANG.soTaiKhoan}-qr_only.png?amount=${goiDangThanhToan.gia_tien_vnd}&addInfo=${encodeURIComponent(maChuyenKhoan)}&accountName=${encodeURIComponent(THONG_TIN_NGAN_HANG.chuTaiKhoan)}`
    : '';

  return (
    <div className="container profile-page-wrap">
      <div className="profile-top-bar">
        <button type="button" className="btn-back-crystal" onClick={xuLyQuayLai}>
          <ArrowLeft size={16} />
          <span>Trở về</span>
        </button>
      </div>

      <div className="profile-layout">
        <aside className="glass-card profile-sidebar-card">
          <div className="sidebar-avatar-box">
            {nguoiDung.anh_dai_dien ? (
              <img src={`${SERVER_URL}${nguoiDung.anh_dai_dien}`} alt={nguoiDung.ho_ten} />
            ) : (
              chuCaiDau
            )}
          </div>

          <div className="sidebar-name">{nguoiDung.ho_ten}</div>
          <div className="sidebar-email">{nguoiDung.email}</div>

          <span className="badge badge-xu" style={{ marginTop: '10px' }}>
            <Coins size={14} /> {nguoiDung.so_du_xu.toLocaleString()} Xu
          </span>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'HO_SO' ? 'active' : ''}`}
              onClick={() => doiTab('HO_SO')}
            >
              <UserPen size={17} /> Thông tin hồ sơ
            </button>
            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'TU_SACH' ? 'active' : ''}`}
              onClick={() => doiTab('TU_SACH')}
            >
              <BookMarked size={17} /> Tủ sách cá nhân
            </button>
            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'VI_XU' ? 'active' : ''}`}
              onClick={() => doiTab('VI_XU')}
            >
              <Coins size={17} /> Ví Xu & Giao dịch
            </button>
            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'MAT_KHAU' ? 'active' : ''}`}
              onClick={() => doiTab('MAT_KHAU')}
            >
              <KeyRound size={17} /> Đổi mật khẩu
            </button>
          </nav>
        </aside>

        <section className="glass-card profile-content-card">
          {tab === 'HO_SO' && (
            <div>
              <h1 className="profile-section-heading">Thông tin hồ sơ cá nhân</h1>

              <form onSubmit={xuLyLuuHoSo}>
                <div className="avatar-edit-row">
                  <div className="avatar-preview-circle">
                    {nguonAnhHienTai ? <img src={nguonAnhHienTai} alt="Ảnh đại diện" /> : chuCaiDau}
                  </div>

                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={avatarInputRef}
                      style={{ display: 'none' }}
                      onChange={chonAnhDaiDien}
                    />
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera size={16} /> Đổi ảnh đại diện
                    </button>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginTop: '6px' }}>
                      Hỗ trợ định dạng JPG, PNG hoặc WEBP.
                    </p>
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label>Tên hiển thị</label>
                    <div className="input-edit-wrap">
                      <input
                        ref={tenInputRef}
                        type="text"
                        className={`input-crystal ${!dangSuaTen ? 'input-locked' : ''}`}
                        value={hoTenMoi}
                        readOnly={!dangSuaTen}
                        onChange={(e) => setHoTenMoi(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={`edit-pencil-btn ${dangSuaTen ? 'active' : ''}`}
                        onClick={kichHoatSuaTen}
                        title="Chỉnh sửa tên hiển thị"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="profile-form-group">
                    <label>Tên đăng nhập</label>
                    <input
                      type="text"
                      className="input-crystal input-readonly"
                      value={nguoiDung.ten_dang_nhap}
                      readOnly
                    />
                  </div>

                  <div className="profile-form-group">
                    <label>Email liên kết</label>
                    <input
                      type="email"
                      className="input-crystal input-readonly"
                      value={nguoiDung.email}
                      readOnly
                    />
                  </div>

                  <div className="profile-form-group">
                    <label>Loại tài khoản</label>
                    <input
                      type="text"
                      className="input-crystal input-readonly"
                      value={nguoiDung.vai_tro === 'admin' ? 'Quản trị viên' : 'Độc giả thành viên'}
                      readOnly
                    />
                  </div>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="btn-crystal btn-save-disabled"
                    disabled={!coTheLuuHoSo || dangLuuHoSo}
                  >
                    {dangLuuHoSo ? 'Đang lưu thay đổi...' : 'Lưu thông tin hồ sơ'}
                  </button>

                  {coTheLuuHoSo && (
                    <button type="button" className="btn-outline" onClick={huyChinhSuaHoSo}>
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {tab === 'TU_SACH' && (
            <div>
              <h1 className="profile-section-heading">Tủ sách cá nhân</h1>

              <div className="shelf-subtabs-bar">
                <button
                  type="button"
                  className={`shelf-subtab-btn ${tabKeSach === 'DANG_DOC' ? 'active' : ''}`}
                  onClick={() => setTabKeSach('DANG_DOC')}
                >
                  <span>Đang đọc gần đây</span>
                  <span className="shelf-subtab-count">{tuSach.dang_doc.length}</span>
                </button>

                <button
                  type="button"
                  className={`shelf-subtab-btn ${tabKeSach === 'DA_SO_HUU' ? 'active' : ''}`}
                  onClick={() => setTabKeSach('DA_SO_HUU')}
                >
                  <span>Đã sở hữu</span>
                  <span className="shelf-subtab-count">{tuSach.da_so_huu.length}</span>
                </button>

                <button
                  type="button"
                  className={`shelf-subtab-btn ${tabKeSach === 'YEU_THICH' ? 'active' : ''}`}
                  onClick={() => setTabKeSach('YEU_THICH')}
                >
                  <span>Yêu thích</span>
                  <span className="shelf-subtab-count">{tuSach.yeu_thich.length}</span>
                </button>
              </div>

              {tabKeSach === 'DANG_DOC' && (
                tuSach.dang_doc.length === 0 ? (
                  <div className="shelf-empty-box">Bạn chưa có lịch sử đọc tác phẩm nào.</div>
                ) : (
                  <div className="shelf-book-grid">
                    {tuSach.dang_doc.map((item) => {
                      const donVi = item.loai_sach === 'SACH_NOI' ? 'Tập' : 'Chương';
                      const linkTiepTuc = item.chuong_dang_doc_stt
                        ? `/doc/${item.ma_chuong_dang_doc}`
                        : `/sach/${item.ma_sach}`;

                      return (
                        <div key={item.ma_sach} className="shelf-book-card">
                          {renderAnhBiaKeSach(item)}

                          <div className="shelf-book-body">
                            <Link to={`/sach/${item.ma_sach}`} className="shelf-book-title">
                              {item.tieu_de}
                            </Link>
                            <span className="shelf-book-sub">{item.ten_tac_gia}</span>
                            {item.chuong_dang_doc_stt && (
                              <span className="shelf-chapter-tag">
                                {donVi} {item.chuong_dang_doc_stt}
                              </span>
                            )}

                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${item.ti_le_doc || 0}%` }} />
                            </div>

                            <div className="shelf-card-footer">
                              <Link to={linkTiepTuc} className="btn-crystal shelf-continue-btn">
                                <Play size={12} /> Tiếp tục
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {tabKeSach === 'DA_SO_HUU' && (
                tuSach.da_so_huu.length === 0 ? (
                  <div className="shelf-empty-box">Chưa có tác phẩm nào được mở khóa hoặc mua trọn quyển.</div>
                ) : (
                  <div className="shelf-book-grid">
                    {tuSach.da_so_huu.map((item) => (
                      <div key={item.ma_sach} className="shelf-book-card">
                        {renderAnhBiaKeSach(
                          item,
                          <span className="badge badge-free shelf-cover-badge">
                            {item.trang_thai_so_huu}
                          </span>
                        )}

                        <div className="shelf-book-body">
                          <Link to={`/sach/${item.ma_sach}`} className="shelf-book-title">
                            {item.tieu_de}
                          </Link>
                          <span className="shelf-book-sub">{item.ten_tac_gia}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tabKeSach === 'YEU_THICH' && (
                tuSach.yeu_thich.length === 0 ? (
                  <div className="shelf-empty-box">Chưa có tác phẩm yêu thích nào.</div>
                ) : (
                  <div className="shelf-book-grid">
                    {tuSach.yeu_thich.map((item) => (
                      <div key={item.ma_sach} className="shelf-book-card">
                        {renderAnhBiaKeSach(item)}

                        <div className="shelf-book-body">
                          <Link to={`/sach/${item.ma_sach}`} className="shelf-book-title">
                            {item.tieu_de}
                          </Link>
                          <span className="shelf-book-sub">{item.ten_tac_gia}</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              color: '#eab308',
                              fontWeight: 600,
                            }}
                          >
                            <Star size={12} fill="#eab308" />
                            {Number(item.diem_danh_gia_tb || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {tab === 'VI_XU' && (
            <div>
              <h1 className="profile-section-heading">Ví Xu & Nạp Xu</h1>

              <div className="topup-grid">
                {goiNap.map((goi) => (
                  <div key={goi.ma_goi} className="topup-card">
                    <span style={{ fontWeight: 700 }}>{goi.ten_goi}</span>
                    <div className="topup-xu">+{goi.so_xu_nhan.toLocaleString()} Xu</div>
                    <span style={{ color: 'var(--text-sub)', fontWeight: 600 }}>
                      {goi.gia_tien_vnd.toLocaleString()} đ
                    </span>
                    <button type="button" className="btn-crystal" onClick={() => moHopThoaiQuetQR(goi)}>
                      <QrCode size={16} /> Nạp gói này
                    </button>
                  </div>
                ))}
              </div>

              <h2 className="shelf-section-title">Lịch sử giao dịch</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Nội dung</th>
                      <th>Biến động Xu</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lichSuGd.map((gd) => (
                      <tr key={gd.ma_giao_dich}>
                        <td>{new Date(gd.ngay_tao).toLocaleString('vi-VN')}</td>
                        <td>{gd.mo_ta}</td>
                        <td style={{ fontWeight: 700, color: gd.bien_dong_xu >= 0 ? 'var(--free-color)' : 'var(--xu-color)' }}>
                          {gd.bien_dong_xu > 0 ? `+${gd.bien_dong_xu}` : gd.bien_dong_xu} Xu
                        </td>
                        <td>
                          <span className={`badge ${gd.trang_thai === 'THANH_CONG' ? 'badge-free' : 'badge-xu'}`}>
                            {gd.trang_thai === 'THANH_CONG' ? 'Thành công' : 'Đã hủy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'MAT_KHAU' && (
            <div>
              <h1 className="profile-section-heading">Đổi mật khẩu</h1>

              <form onSubmit={xuLyDoiMatKhau} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                <div className="profile-form-group">
                  <label>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    className="input-crystal"
                    value={matKhauForm.mat_khau_cu}
                    onChange={(e) => setMatKhauForm({ ...matKhauForm, mat_khau_cu: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label>Mật khẩu mới (tối thiểu 6 ký tự)</label>
                  <input
                    type="password"
                    className="input-crystal"
                    value={matKhauForm.mat_khau_moi}
                    onChange={(e) => setMatKhauForm({ ...matKhauForm, mat_khau_moi: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="btn-crystal">Cập nhật mật khẩu</button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      {goiDangThanhToan && (
        <div className="modal-backdrop">
          <div className="qr-payment-modal">
            <div className="qr-modal-top">
              <span className="qr-modal-title">
                <QrCode size={19} color="var(--primary-blue)" /> Quét mã QR thanh toán
              </span>
              <span className="qr-timer-pill">
                <Clock size={13} /> {dinhDangDemNguoc()}
              </span>
            </div>

            <div className="qr-package-summary">
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{goiDangThanhToan.ten_goi}</span>
              <span className="badge badge-xu" style={{ fontSize: '0.86rem' }}>
                +{goiDangThanhToan.so_xu_nhan.toLocaleString()} Xu
              </span>
            </div>

            <div className="qr-frame-box">
              {!loiAnhQr ? (
                <img
                  src={linkAnhVietQR}
                  alt="Mã QR chuyển khoản VietQR"
                  onError={() => setLoiAnhQr(true)}
                />
              ) : (
                <div className="qr-fallback-box">
                  <QrCode size={88} strokeWidth={1.6} />
                  <span>Mã QR: {maChuyenKhoan}</span>
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: '12px' }}>
              Mở ứng dụng Ngân hàng hoặc Ví điện tử bất kỳ để quét mã QR trên
            </p>

            <div className="qr-bank-details">
              <div className="qr-bank-row">
                <span className="qr-bank-label">Ngân hàng</span>
                <span className="qr-bank-val">{THONG_TIN_NGAN_HANG.tenNganHang}</span>
              </div>

              <div className="qr-bank-row">
                <span className="qr-bank-label">Số tài khoản</span>
                <span className="qr-bank-val">
                  {THONG_TIN_NGAN_HANG.soTaiKhoan}
                  <button
                    type="button"
                    className="qr-copy-btn"
                    onClick={() => saoChepChuoi('STK', THONG_TIN_NGAN_HANG.soTaiKhoan)}
                  >
                    {daSaoChep === 'STK' ? <><Check size={12} /> Đã chép</> : <><Copy size={12} /> Chép</>}
                  </button>
                </span>
              </div>

              <div className="qr-bank-row">
                <span className="qr-bank-label">Chủ tài khoản</span>
                <span className="qr-bank-val">{THONG_TIN_NGAN_HANG.chuTaiKhoan}</span>
              </div>

              <div className="qr-bank-row">
                <span className="qr-bank-label">Số tiền</span>
                <span className="qr-bank-val" style={{ color: 'var(--primary-blue)', fontSize: '0.95rem' }}>
                  {goiDangThanhToan.gia_tien_vnd.toLocaleString()} đ
                </span>
              </div>

              <div className="qr-bank-row">
                <span className="qr-bank-label">Nội dung CK</span>
                <span className="qr-bank-val" style={{ color: 'var(--xu-color)' }}>
                  {maChuyenKhoan}
                  <button
                    type="button"
                    className="qr-copy-btn"
                    onClick={() => saoChepChuoi('ND', maChuyenKhoan)}
                  >
                    {daSaoChep === 'ND' ? <><Check size={12} /> Đã chép</> : <><Copy size={12} /> Chép</>}
                  </button>
                </span>
              </div>
            </div>

            {giayConLaiQr === 0 ? (
              <div className="qr-action-stack">
                <p style={{ color: 'var(--danger-color)', fontSize: '0.86rem', fontWeight: 600 }}>
                  Phiên giao dịch đã hết hạn. Vui lòng tạo mã QR mới.
                </p>
                <button
                  type="button"
                  className="btn-crystal"
                  onClick={() => moHopThoaiQuetQR(goiDangThanhToan)}
                >
                  Tạo mã QR mới
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setGoiDangThanhToan(null)}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="qr-action-stack">
                <button
                  type="button"
                  className="btn-crystal"
                  disabled={dangXacNhanNap}
                  onClick={() => xuLyThanhToanGiaLap('THANH_CONG')}
                >
                  <CheckCircle size={17} />
                  {dangXacNhanNap ? 'Đang xử lý...' : 'Tôi đã chuyển khoản (Xác nhận)'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={dangXacNhanNap}
                  onClick={() => xuLyThanhToanGiaLap('DA_HUY')}
                >
                  <XCircle size={17} /> Hủy giao dịch
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrangCaNhan;