import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck, KeyRound } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './DangNhapDangKy.css';

const DangNhapDangKy = () => {
  const [cheDo, setCheDo] = useState('DANG_NHAP');
  const [form, setForm] = useState({
    tai_khoan: '',
    ten_dang_nhap: '',
    email: '',
    ho_ten: '',
    mat_khau: '',
  });
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [dangGui, setDangGui] = useState(false);

  // State cho luồng Quên mật khẩu 3 bước
  const [buocQuenMk, setBuocQuenMk] = useState(1);
  const [emailQuenMk, setEmailQuenMk] = useState('');
  const [maOtp, setMaOtp] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [giayConLai, setGiayConLai] = useState(0);

  const { luuPhienDangNhap } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cheDo !== 'QUEN_MAT_KHAU' || buocQuenMk !== 2 || giayConLai <= 0) return;
    const timer = setInterval(() => {
      setGiayConLai((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cheDo, buocQuenMk, giayConLai]);

  const doiGiaTri = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setLoi('');
    setThongBao('');
  };

  const moQuenMatKhau = () => {
    setCheDo('QUEN_MAT_KHAU');
    setBuocQuenMk(1);
    setEmailQuenMk(form.tai_khoan.includes('@') ? form.tai_khoan.trim() : '');
    setMaOtp('');
    setMatKhauMoi('');
    setXacNhanMatKhau('');
    setLoi('');
    setThongBao('');
  };

  const xuLyGui = async (e) => {
    e.preventDefault();
    setDangGui(true);
    setLoi('');
    setThongBao('');

    try {
      const res =
        cheDo === 'DANG_NHAP'
          ? await axiosClient.post('/auth/dang-nhap', { tai_khoan: form.tai_khoan, mat_khau: form.mat_khau })
          : await axiosClient.post('/auth/dang-ky', {
              ten_dang_nhap: form.ten_dang_nhap,
              email: form.email,
              ho_ten: form.ho_ten,
              mat_khau: form.mat_khau,
            });

      const { token, nguoi_dung } = res.du_lieu;
      luuPhienDangNhap(token, nguoi_dung);
      navigate(nguoi_dung.vai_tro === 'admin' ? '/admin' : '/');
    } catch (error) {
      setLoi(error.thong_bao || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setDangGui(false);
    }
  };

  const xuLyGuiOtpEmail = async (e) => {
    if (e) e.preventDefault();
    setDangGui(true);
    setLoi('');
    setThongBao('');
    try {
      const res = await axiosClient.post('/auth/quen-mat-khau/gui-otp', { email: emailQuenMk });
      setThongBao(res.thong_bao);
      setBuocQuenMk(2);
      setMaOtp('');
      setGiayConLai(300);
    } catch (error) {
      setLoi(error.thong_bao || 'Không thể gửi mã OTP.');
    } finally {
      setDangGui(false);
    }
  };

  const xuLyXacThucOtp = async (e) => {
    e.preventDefault();
    setDangGui(true);
    setLoi('');
    setThongBao('');
    try {
      const res = await axiosClient.post('/auth/quen-mat-khau/xac-thuc-otp', {
        email: emailQuenMk,
        ma_code: maOtp,
      });
      setThongBao(res.thong_bao);
      setBuocQuenMk(3);
    } catch (error) {
      setLoi(error.thong_bao || 'Mã OTP không hợp lệ.');
    } finally {
      setDangGui(false);
    }
  };

  const xuLyDatLaiMatKhau = async (e) => {
    e.preventDefault();
    if (matKhauMoi !== xacNhanMatKhau) {
      setLoi('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setDangGui(true);
    setLoi('');
    setThongBao('');
    try {
      const res = await axiosClient.post('/auth/quen-mat-khau/dat-lai', {
        email: emailQuenMk,
        ma_code: maOtp,
        mat_khau_moi: matKhauMoi,
      });
      setForm((prev) => ({ ...prev, tai_khoan: emailQuenMk, mat_khau: '' }));
      setCheDo('DANG_NHAP');
      setThongBao(res.thong_bao);
    } catch (error) {
      setLoi(error.thong_bao || 'Không thể đặt lại mật khẩu.');
    } finally {
      setDangGui(false);
    }
  };

  const dinhDangDemNguoc = () => {
    const phut = String(Math.floor(giayConLai / 60)).padStart(2, '0');
    const giay = String(giayConLai % 60).padStart(2, '0');
    return `${phut}:${giay}`;
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        {cheDo === 'QUEN_MAT_KHAU' ? (
          <div>
            <div className="forgot-header">
              <button
                type="button"
                className="forgot-back-btn"
                onClick={() => {
                  setCheDo('DANG_NHAP');
                  setLoi('');
                  setThongBao('');
                }}
              >
                <ArrowLeft size={15} /> Quay lại đăng nhập
              </button>
              <span className="badge badge-full">Bước {buocQuenMk} / 3</span>
            </div>

            {loi && <div className="auth-error" style={{ marginBottom: '14px' }}>{loi}</div>}
            {thongBao && <div className="auth-success" style={{ marginBottom: '14px' }}>{thongBao}</div>}

            {buocQuenMk === 1 && (
              <form onSubmit={xuLyGuiOtpEmail} className="auth-form">
                <div>
                  <h2 className="forgot-title">Quên mật khẩu</h2>
                  <p className="forgot-desc">
                    Nhập địa chỉ email đã đăng ký tài khoản, hệ thống sẽ gửi mã xác thực OTP 6 chữ số qua hộp thư của bạn.
                  </p>
                </div>

                <div className="form-group">
                  <label>Email tài khoản</label>
                  <input
                    type="email"
                    className="input-crystal"
                    placeholder="vi-du@gmail.com"
                    value={emailQuenMk}
                    onChange={(e) => {
                      setEmailQuenMk(e.target.value);
                      setLoi('');
                    }}
                    required
                  />
                </div>

                <button type="submit" className="btn-crystal" disabled={dangGui}>
                  <Mail size={17} /> {dangGui ? 'Đang gửi email...' : 'Gửi mã xác nhận OTP'}
                </button>
              </form>
            )}

            {buocQuenMk === 2 && (
              <form onSubmit={xuLyXacThucOtp} className="auth-form">
                <div>
                  <h2 className="forgot-title">Nhập mã xác thực OTP</h2>
                  <p className="forgot-desc">
                    Mã gồm 6 chữ số đã được gửi tới <strong>{emailQuenMk}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).
                  </p>
                </div>

                <div className="form-group">
                  <label>Mã OTP (6 chữ số)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input-crystal otp-input-box"
                    placeholder="••••••"
                    value={maOtp}
                    onChange={(e) => {
                      setMaOtp(e.target.value.replace(/\D/g, ''));
                      setLoi('');
                    }}
                    required
                  />
                </div>

                <div className="otp-meta-row">
                  <span>
                    {giayConLai > 0 ? (
                      <>Hết hạn sau: <strong>{dinhDangDemNguoc()}</strong></>
                    ) : (
                      <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>Mã OTP đã hết hạn</span>
                    )}
                  </span>

                  <button
                    type="button"
                    className="otp-resend-btn"
                    disabled={dangGui}
                    onClick={() => xuLyGuiOtpEmail()}
                  >
                    Gửi lại mã
                  </button>
                </div>

                <button type="submit" className="btn-crystal" disabled={dangGui || maOtp.length < 6}>
                  <ShieldCheck size={17} /> {dangGui ? 'Đang kiểm tra...' : 'Xác thực mã OTP'}
                </button>
              </form>
            )}

            {buocQuenMk === 3 && (
              <form onSubmit={xuLyDatLaiMatKhau} className="auth-form">
                <div>
                  <h2 className="forgot-title">Đặt lại mật khẩu mới</h2>
                  <p className="forgot-desc">
                    Tạo mật khẩu mới có độ dài tối thiểu 6 ký tự cho tài khoản <strong>{emailQuenMk}</strong>.
                  </p>
                </div>

                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    className="input-crystal"
                    placeholder="Tối thiểu 6 ký tự"
                    value={matKhauMoi}
                    onChange={(e) => {
                      setMatKhauMoi(e.target.value);
                      setLoi('');
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className="input-crystal"
                    placeholder="Nhập lại mật khẩu mới"
                    value={xacNhanMatKhau}
                    onChange={(e) => {
                      setXacNhanMatKhau(e.target.value);
                      setLoi('');
                    }}
                    required
                  />
                </div>

                <button type="submit" className="btn-crystal" disabled={dangGui}>
                  <KeyRound size={17} /> {dangGui ? 'Đang cập nhật...' : 'Hoàn tất đổi mật khẩu'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${cheDo === 'DANG_NHAP' ? 'active' : ''}`}
                onClick={() => {
                  setCheDo('DANG_NHAP');
                  setLoi('');
                  setThongBao('');
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`auth-tab ${cheDo === 'DANG_KY' ? 'active' : ''}`}
                onClick={() => {
                  setCheDo('DANG_KY');
                  setLoi('');
                  setThongBao('');
                }}
              >
                Đăng ký thành viên
              </button>
            </div>

            {loi && <div className="auth-error" style={{ marginBottom: '16px' }}>{loi}</div>}
            {thongBao && <div className="auth-success" style={{ marginBottom: '16px' }}>{thongBao}</div>}

            <form onSubmit={xuLyGui} className="auth-form">
              {cheDo === 'DANG_NHAP' ? (
                <div className="form-group">
                  <label>Tên đăng nhập hoặc Email</label>
                  <input
                    type="text"
                    name="tai_khoan"
                    className="input-crystal"
                    value={form.tai_khoan}
                    onChange={doiGiaTri}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Họ và tên hiển thị</label>
                    <input
                      type="text"
                      name="ho_ten"
                      className="input-crystal"
                      value={form.ho_ten}
                      onChange={doiGiaTri}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tên đăng nhập</label>
                    <input
                      type="text"
                      name="ten_dang_nhap"
                      className="input-crystal"
                      value={form.ten_dang_nhap}
                      onChange={doiGiaTri}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      className="input-crystal"
                      value={form.email}
                      onChange={doiGiaTri}
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  name="mat_khau"
                  className="input-crystal"
                  value={form.mat_khau}
                  onChange={doiGiaTri}
                  required
                />
              </div>

              {cheDo === 'DANG_NHAP' && (
                <div className="forgot-link-row">
                  <button type="button" className="forgot-link-btn" onClick={moQuenMatKhau}>
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              <button type="submit" className="btn-crystal" disabled={dangGui} style={{ marginTop: '6px' }}>
                {dangGui ? 'Đang xử lý...' : cheDo === 'DANG_NHAP' ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DangNhapDangKy;