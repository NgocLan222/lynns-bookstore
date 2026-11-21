import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Unlock, Headphones, Coins, CheckSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import './DanhSachChuong.css';

const DanhSachChuong = ({ sach, danhSachChuong, trangThaiSoHuu, onCapNhatSoHuu }) => {
  const { nguoiDung, capNhatSoDuXu } = useAuth();
  const navigate = useNavigate();
  const [chuongDangChon, setChuongDangChon] = useState([]);
  const [dangXuLy, setDangXuLy] = useState(false);

  const laSachNghe = sach.loai_sach === 'SACH_NOI';
  const donVi = laSachNghe ? 'tập' : 'chương';
  const donViHoa = laSachNghe ? 'Tập' : 'Chương';

  const laAdmin = nguoiDung?.vai_tro === 'admin';
  const daMuaTronQuyen = trangThaiSoHuu?.da_mua_tron_quyen;
  const dsDaMo = trangThaiSoHuu?.danh_sach_chuong_da_mo || [];

  const kiemTraDuocDoc = (chuong) => {
    if (laAdmin || sach.hinh_thuc_ban === 'MIEN_PHI') return true;
    if (sach.hinh_thuc_ban === 'TRON_QUYEN') {
      return daMuaTronQuyen || chuong.so_thu_tu === 1;
    }
    return Boolean(chuong.la_mien_phi) || dsDaMo.includes(chuong.ma_chuong);
  };

  const chuongCoTheMuaLe = danhSachChuong.filter(
    (c) => sach.hinh_thuc_ban === 'THEO_CHUONG' && !c.la_mien_phi && !dsDaMo.includes(c.ma_chuong)
  );

  const tongXuDangChon = danhSachChuong
    .filter((c) => chuongDangChon.includes(c.ma_chuong))
    .reduce((tong, c) => tong + c.gia_xu, 0);

  const doiChonChuong = (maChuong) => {
    setChuongDangChon((prev) =>
      prev.includes(maChuong) ? prev.filter((id) => id !== maChuong) : [...prev, maChuong]
    );
  };

  const moKhoaMotChuong = async (chuong) => {
    if (!nguoiDung) return navigate('/dang-nhap');
    if (!window.confirm(`Xác nhận dùng ${chuong.gia_xu} Xu để mở khóa "${chuong.tieu_de}"?`)) return;

    setDangXuLy(true);
    try {
      const res = await axiosClient.post('/vi-xu/mo-khoa-le', { ma_chuong: chuong.ma_chuong });
      capNhatSoDuXu(res.du_lieu.so_du_xu);
      onCapNhatSoHuu();
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || `Không thể mở khóa ${donVi}.`);
    } finally {
      setDangXuLy(false);
    }
  };

  const moKhoaHangLoat = async () => {
    if (!nguoiDung) return navigate('/dang-nhap');
    if (chuongDangChon.length === 0) return;
    if (!window.confirm(`Xác nhận dùng ${tongXuDangChon} Xu để mở khóa ${chuongDangChon.length} ${donVi} đã chọn?`)) return;

    setDangXuLy(true);
    try {
      const res = await axiosClient.post('/vi-xu/mo-khoa-hang-loat', {
        ma_sach: sach.ma_sach,
        danh_sach_ma_chuong: chuongDangChon,
      });
      capNhatSoDuXu(res.du_lieu.so_du_xu);
      setChuongDangChon([]);
      onCapNhatSoHuu();
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || 'Không thể mở khóa hàng loạt.');
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <div className="glass-card chapter-list-card">
      <div className="chapter-list-top">
        <h2>Danh sách {donVi} ({danhSachChuong.length} {donVi})</h2>
        {sach.hinh_thuc_ban === 'THEO_CHUONG' && chuongCoTheMuaLe.length > 0 && !laAdmin && (
          <button
            type="button"
            className="btn-outline"
            onClick={() =>
              setChuongDangChon(
                chuongDangChon.length === chuongCoTheMuaLe.length ? [] : chuongCoTheMuaLe.map((c) => c.ma_chuong)
              )
            }
          >
            <CheckSquare size={16} />
            {chuongDangChon.length === chuongCoTheMuaLe.length ? 'Bỏ chọn tất cả' : `Chọn tất cả ${donVi} khóa`}
          </button>
        )}
      </div>

      {chuongDangChon.length > 0 && (
        <div className="bulk-bar">
          <span>
            Đã chọn <strong>{chuongDangChon.length}</strong> {donVi} · Tổng cộng:{' '}
            <strong>{tongXuDangChon.toLocaleString()} Xu</strong>
          </span>
          <button type="button" className="btn-crystal" disabled={dangXuLy} onClick={moKhoaHangLoat}>
            <Coins size={16} /> Mở khóa ngay
          </button>
        </div>
      )}

      {danhSachChuong.length === 0 ? (
        <p style={{ color: 'var(--text-sub)' }}>Tác phẩm hiện chưa cập nhật {donVi} nào.</p>
      ) : (
        <div>
          {danhSachChuong.map((chuong) => {
            const duocDoc = kiemTraDuocDoc(chuong);
            const coTheTich =
              sach.hinh_thuc_ban === 'THEO_CHUONG' && !chuong.la_mien_phi && !dsDaMo.includes(chuong.ma_chuong) && !laAdmin;

            return (
              <div key={chuong.ma_chuong} className="chapter-item">
                <div className="chapter-left">
                  {coTheTich && (
                    <input
                      type="checkbox"
                      checked={chuongDangChon.includes(chuong.ma_chuong)}
                      onChange={() => doiChonChuong(chuong.ma_chuong)}
                    />
                  )}
                  <Link to={`/doc/${chuong.ma_chuong}`} className="chapter-link">
                    <span>{donViHoa} {chuong.so_thu_tu}: {chuong.tieu_de}</span>
                    {Boolean(chuong.co_audio) && <Headphones size={15} color="var(--primary-cyan)" title="Có sách nói" />}
                  </Link>
                </div>

                <div className="chapter-right">
                  {duocDoc ? (
                    <span className="badge badge-free">
                      <Unlock size={13} />
                      {sach.hinh_thuc_ban === 'TRON_QUYEN' && !daMuaTronQuyen && !laAdmin && chuong.so_thu_tu === 1
                        ? (laSachNghe ? 'Nghe thử' : 'Đọc thử')
                        : (laSachNghe ? 'Sẵn sàng nghe' : 'Sẵn sàng đọc')}
                    </span>
                  ) : sach.hinh_thuc_ban === 'THEO_CHUONG' ? (
                    <button type="button" className="badge badge-xu" disabled={dangXuLy} onClick={() => moKhoaMotChuong(chuong)}>
                      <Lock size={13} /> Mở khóa · {chuong.gia_xu} Xu
                    </button>
                  ) : (
                    <span className="badge badge-full">
                      <Lock size={13} /> Cần mua trọn quyển
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DanhSachChuong;