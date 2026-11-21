import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Coins,
  BookMarked,
  LogOut,
  Shield,
  ChevronDown,
  UserPen,
  KeyRound,
  Bell,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosClient, { SERVER_URL } from '../api/axiosClient';
import './ReaderLayout.css';

const KHU_VUC_MENU = [
  { key: 'THEO_CHUONG', param: 'hinh_thuc_ban', value: 'THEO_CHUONG', ten: 'Sách giải trí' },
  { key: 'MIEN_PHI', param: 'hinh_thuc_ban', value: 'MIEN_PHI', ten: 'Văn học & Học thuật' },
  { key: 'TRON_QUYEN', param: 'hinh_thuc_ban', value: 'TRON_QUYEN', ten: 'Sách trọn quyển' },
  { key: 'SACH_NOI', param: 'loai_sach', value: 'SACH_NOI', ten: 'Sách nghe' },
];

const ReaderLayout = () => {
  const { nguoiDung, dangXuat } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tuKhoa, setTuKhoa] = useState('');
  const [theLoaiTheoKhuVuc, setTheLoaiTheoKhuVuc] = useState({});
  const [khuVucDangMo, setKhuVucDangMo] = useState(null);
  const [moMenuHoSo, setMoMenuHoSo] = useState(false);
  const [xemThongBao, setXemThongBao] = useState(false);

  const [dsThongBao, setDsThongBao] = useState([]);
  const [soChuaDoc, setSoChuaDoc] = useState(0);

  const menuHoSoRef = useRef(null);

  const taiThongBao = async () => {
    if (!nguoiDung) {
      setDsThongBao([]);
      setSoChuaDoc(0);
      return;
    }
    try {
      const res = await axiosClient.get('/danh-gia/thong-bao');
      setDsThongBao(res.du_lieu?.danh_sach || []);
      setSoChuaDoc(res.du_lieu?.so_chua_doc || 0);
    } catch {
      // Bỏ qua nếu chưa có thông báo
    }
  };

  useEffect(() => {
    const taiDanhMucMenu = async () => {
      try {
        const ketQua = {};
        await Promise.all(
          KHU_VUC_MENU.map(async (kv) => {
            const res = await axiosClient.get('/danh-muc/the-loai', {
              params: { [kv.param]: kv.value },
            });
            ketQua[kv.key] = res.du_lieu || [];
          })
        );
        setTheLoaiTheoKhuVuc(ketQua);
      } catch {
        // Bỏ qua nếu chưa có dữ liệu
      }
    };
    taiDanhMucMenu();
  }, []);

  useEffect(() => {
    taiThongBao();
    if (!nguoiDung) return;
    const interval = setInterval(taiThongBao, 15000);
    return () => clearInterval(interval);
  }, [nguoiDung?.ma_nguoi_dung, location.pathname]);

  useEffect(() => {
    const dongKhiBamNgoai = (e) => {
      if (menuHoSoRef.current && !menuHoSoRef.current.contains(e.target)) {
        setMoMenuHoSo(false);
        setXemThongBao(false);
      }
    };
    document.addEventListener('mousedown', dongKhiBamNgoai);
    return () => document.removeEventListener('mousedown', dongKhiBamNgoai);
  }, []);

  const xuLyTimKiem = (e) => {
    e.preventDefault();
    navigate(`/kham-pha?tu_khoa=${encodeURIComponent(tuKhoa.trim())}`);
  };

  const dieuHuongCaNhan = (tab) => {
    setMoMenuHoSo(false);
    setXemThongBao(false);
    navigate(`/ca-nhan?tab=${tab}`);
  };

  const moDanhSachThongBao = async () => {
    setXemThongBao(true);
    await taiThongBao();
  };

  const bamVaoThongBao = async (tb) => {
    if (!tb.da_doc) {
      setDsThongBao((prev) =>
        prev.map((item) => (item.ma_thong_bao === tb.ma_thong_bao ? { ...item, da_doc: true } : item))
      );
      setSoChuaDoc((prev) => Math.max(0, prev - 1));
      axiosClient.put(`/danh-gia/thong-bao/${tb.ma_thong_bao}/da-doc`).catch(() => {});
    }
    setMoMenuHoSo(false);
    setXemThongBao(false);
    navigate(tb.duong_dan);
  };

  const docTatCa = async () => {
    setDsThongBao((prev) => prev.map((item) => ({ ...item, da_doc: true })));
    setSoChuaDoc(0);
    axiosClient.put('/danh-gia/thong-bao/doc-tat-ca').catch(() => {});
  };

  const chuCaiDau = nguoiDung?.ho_ten?.trim()?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="reader-layout">
      <header className="reader-header">
        <div className="container reader-header-inner">
          <Link to="/" className="brand-logo">
            <span className="brand-icon"><Home size={20} /></span>
            <span className="brand-text">Lynn's Bookstore</span>
          </Link>

          <nav className="reader-nav">
            {KHU_VUC_MENU.map((kv) => (
              <div
                key={kv.key}
                className="nav-dropdown-wrap"
                onMouseEnter={() => setKhuVucDangMo(kv.key)}
                onMouseLeave={() => setKhuVucDangMo(null)}
              >
                <Link to={`/kham-pha?${kv.param}=${kv.value}`} className="nav-link">
                  {kv.ten}
                  <ChevronDown size={15} color="var(--text-sub)" />
                </Link>

                {khuVucDangMo === kv.key && theLoaiTheoKhuVuc[kv.key]?.length > 0 && (
                  <div className="glass-card nav-dropdown-menu">
                    {theLoaiTheoKhuVuc[kv.key].map((tl) => (
                      <Link
                        key={tl.ma_the_loai}
                        to={`/kham-pha?${kv.param}=${kv.value}&ma_the_loai=${tl.ma_the_loai}`}
                        onClick={() => setKhuVucDangMo(null)}
                        className="nav-dropdown-item"
                      >
                        {tl.ten_the_loai}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <form onSubmit={xuLyTimKiem} className="header-search-form">
            <input
              type="text"
              className="input-crystal header-search-input"
              placeholder="Tìm tên sách, tác giả..."
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
            />
            <button type="submit" className="header-search-btn">
              <Search size={17} />
            </button>
          </form>

          <div className="header-actions">
            {nguoiDung ? (
              <div className="profile-menu-anchor" ref={menuHoSoRef}>
                <button
                  type="button"
                  className="profile-trigger-btn"
                  onClick={() => {
                    const next = !moMenuHoSo;
                    setMoMenuHoSo(next);
                    if (!next) setXemThongBao(false);
                  }}
                >
                  <span className="header-avatar-wrap">
                    <span className="header-avatar-circle">
                      {nguoiDung.anh_dai_dien ? (
                        <img src={`${SERVER_URL}${nguoiDung.anh_dai_dien}`} alt={nguoiDung.ho_ten} />
                      ) : (
                        chuCaiDau
                      )}
                    </span>
                    {soChuaDoc > 0 && <span className="avatar-unread-dot" />}
                  </span>
                  <span>{nguoiDung.ho_ten}</span>
                  <ChevronDown size={15} color="var(--text-sub)" />
                </button>

                {moMenuHoSo && (
                  <div className="profile-vertical-panel">
                    {xemThongBao ? (
                      <div>
                        <div className="notif-panel-header">
                          <button type="button" className="notif-back-btn" onClick={() => setXemThongBao(false)}>
                            <ArrowLeft size={15} /> Thông báo ({soChuaDoc})
                          </button>
                          {soChuaDoc > 0 && (
                            <button type="button" className="notif-mark-all-btn" onClick={docTatCa}>
                              Đọc tất cả
                            </button>
                          )}
                        </div>

                        {dsThongBao.length === 0 ? (
                          <p style={{ textAlign: 'center', fontSize: '0.86rem', color: 'var(--text-sub)', padding: '22px 8px' }}>
                            Chưa có thông báo phản hồi nào.
                          </p>
                        ) : (
                          <div className="notif-scroll-list">
                            {dsThongBao.map((tb) => (
                              <button
                                key={tb.ma_thong_bao}
                                type="button"
                                className={`notif-item-btn ${!tb.da_doc ? 'unread' : ''}`}
                                onClick={() => bamVaoThongBao(tb)}
                              >
                                {!tb.da_doc && <span className="notif-unread-dot" />}
                                <div style={{ flex: 1 }}>
                                  <div className="notif-item-text">{tb.noi_dung}</div>
                                  <div className="notif-item-time">
                                    {new Date(tb.ngay_tao).toLocaleString('vi-VN')}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="panel-user-header">
                          <div className="panel-avatar-large">
                            {nguoiDung.anh_dai_dien ? (
                              <img src={`${SERVER_URL}${nguoiDung.anh_dai_dien}`} alt={nguoiDung.ho_ten} />
                            ) : (
                              chuCaiDau
                            )}
                          </div>
                          <div className="panel-user-name">{nguoiDung.ho_ten}</div>
                          <div className="panel-user-email">{nguoiDung.email}</div>
                        </div>

                        <div className="panel-nav-list">
                          <button type="button" className="panel-nav-item" onClick={() => dieuHuongCaNhan('HO_SO')}>
                            <span className="panel-nav-left">
                              <UserPen size={17} color="var(--primary-blue)" />
                              <span>Thông tin hồ sơ</span>
                            </span>
                          </button>

                          <button type="button" className="panel-nav-item" onClick={moDanhSachThongBao}>
                            <span className="panel-nav-left">
                              <Bell size={17} color="var(--primary-blue)" />
                              <span>Thông báo</span>
                            </span>
                            {soChuaDoc > 0 && <span className="notif-count-badge">{soChuaDoc}</span>}
                          </button>

                          <button type="button" className="panel-nav-item" onClick={() => dieuHuongCaNhan('TU_SACH')}>
                            <span className="panel-nav-left">
                              <BookMarked size={17} color="var(--primary-blue)" />
                              <span>Tủ sách</span>
                            </span>
                          </button>

                          <button type="button" className="panel-nav-item" onClick={() => dieuHuongCaNhan('VI_XU')}>
                            <span className="panel-nav-left">
                              <Coins size={17} color="var(--xu-color)" />
                              <span>Ví Xu</span>
                            </span>
                            <span className="badge badge-xu">{nguoiDung.so_du_xu.toLocaleString()} Xu</span>
                          </button>

                          <button type="button" className="panel-nav-item" onClick={() => dieuHuongCaNhan('MAT_KHAU')}>
                            <span className="panel-nav-left">
                              <KeyRound size={17} color="var(--primary-blue)" />
                              <span>Đổi mật khẩu</span>
                            </span>
                          </button>

                          {nguoiDung.vai_tro === 'admin' && (
                            <>
                              <div className="panel-divider" />
                              <Link
                                to="/admin"
                                className="panel-nav-item"
                                onClick={() => setMoMenuHoSo(false)}
                              >
                                <span className="panel-nav-left">
                                  <Shield size={17} color="var(--full-color)" />
                                  <span>Trang quản trị</span>
                                </span>
                              </Link>
                            </>
                          )}

                          <div className="panel-divider" />

                          <button
                            type="button"
                            className="panel-nav-item panel-logout-btn"
                            onClick={() => {
                              setMoMenuHoSo(false);
                              dangXuat();
                              navigate('/');
                            }}
                          >
                            <span className="panel-nav-left">
                              <LogOut size={17} />
                              <span>Đăng xuất</span>
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link to="/dang-nhap" className="btn-crystal header-login-btn">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="reader-main">
        <Outlet />
      </main>

      <footer className="reader-footer">
        <div className="container">
          Lynn's Bookstore — Không gian Đọc sách & Sách nói trực tuyến
        </div>
      </footer>
    </div>
  );
};

export default ReaderLayout;