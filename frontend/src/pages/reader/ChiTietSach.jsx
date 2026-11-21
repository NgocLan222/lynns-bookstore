import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, Eye, Heart, Coins, CheckCircle, Headphones } from 'lucide-react';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import DanhSachChuong from '../../components/docGia/DanhSachChuong';
import KhuVucDanhGia from '../../components/docGia/KhuVucDanhGia';
import './ChiTietSach.css';

const ChiTietSach = () => {
  const { id } = useParams();
  const { nguoiDung, capNhatSoDuXu } = useAuth();
  const navigate = useNavigate();

  const [sach, setSach] = useState(null);
  const [trangThaiSoHuu, setTrangThaiSoHuu] = useState({
    da_mua_tron_quyen: false,
    danh_sach_chuong_da_mo: [],
    da_yeu_thich: false,
  });
  const [dangMua, setDangMua] = useState(false);

  const taiChiTiet = async () => {
    try {
      const res = await axiosClient.get(`/sach/${id}`);
      setSach(res.du_lieu);
    } catch {
      setSach(null);
    }
  };

  const taiSoHuu = async () => {
    if (!nguoiDung) return;
    try {
      const res = await axiosClient.get(`/chuong/sach/${id}/so-huu`);
      setTrangThaiSoHuu(res.du_lieu);
    } catch {
      // Bỏ qua nếu lỗi
    }
  };

  useEffect(() => {
    taiChiTiet();
  }, [id]);

  useEffect(() => {
    taiSoHuu();
  }, [id, nguoiDung]);

  const xuLyQuayLai = () => {
    navigate('/');
  };

  const xuLyMuaTronQuyen = async () => {
    if (!nguoiDung) return navigate('/dang-nhap');
    if (!window.confirm(`Xác nhận dùng ${sach.gia_tron_quyen_xu} Xu để mua trọn quyển "${sach.tieu_de}"?`)) return;

    setDangMua(true);
    try {
      const res = await axiosClient.post('/vi-xu/mua-tron-quyen', { ma_sach: sach.ma_sach });
      capNhatSoDuXu(res.du_lieu.so_du_xu);
      await taiSoHuu();
      alert(res.thong_bao);
    } catch (error) {
      alert(error.thong_bao || 'Không thể mua trọn quyển.');
    } finally {
      setDangMua(false);
    }
  };

  const xuLyYeuThich = async () => {
    if (!nguoiDung) return navigate('/dang-nhap');
    try {
      const res = await axiosClient.post(`/tu-sach/yeu-thich/${sach.ma_sach}`);
      setTrangThaiSoHuu((prev) => ({
        ...prev,
        da_yeu_thich: Boolean(res.du_lieu?.yeu_thich),
      }));
    } catch (error) {
      alert(error.thong_bao || 'Thao tác thất bại.');
    }
  };

  if (!sach) {
    return <div className="container" style={{ padding: '40px 0' }}>Đang tải thông tin tác phẩm...</div>;
  }

  const laSachNghe = sach.loai_sach === 'SACH_NOI';
  const chuongDauTien = sach.danh_sach_chuong?.[0];

  return (
    <div className="container book-detail-page">
      <div className="detail-top-bar">
        <button type="button" className="btn-back-crystal" onClick={xuLyQuayLai}>
          <ArrowLeft size={16} />
          
        </button>
      </div>

      <div className="glass-card book-detail-hero">
        <div className="detail-cover">
          {sach.anh_bia ? (
            <img src={`${SERVER_URL}${sach.anh_bia}`} alt={sach.tieu_de} />
          ) : (
            <div className="book-cover-placeholder">
              {laSachNghe ? <Headphones size={42} /> : <BookOpen size={42} />}
              <span>{sach.tieu_de}</span>
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-badges">
            {laSachNghe && (
              <span className="badge badge-full">
                <Headphones size={13} /> Sách nghe
              </span>
            )}

            {(sach.danh_sach_the_loai?.length > 0
              ? sach.danh_sach_the_loai
              : [{ ma_the_loai: sach.ma_the_loai, ten_the_loai: sach.ten_the_loai }]
            ).map((tl) => (
              <Link
                key={tl.ma_the_loai}
                to={`/kham-pha?ma_the_loai=${tl.ma_the_loai}`}
                className="badge badge-full"
              >
                {tl.ten_the_loai}
              </Link>
            ))}

            {sach.hinh_thuc_ban === 'MIEN_PHI' && (
              <span className="badge badge-free">{laSachNghe ? 'Nghe miễn phí' : 'Đọc miễn phí'}</span>
            )}
            {sach.hinh_thuc_ban === 'THEO_CHUONG' && (
              <span className="badge badge-xu">{laSachNghe ? 'Mở khóa theo tập' : 'Mở khóa theo chương'}</span>
            )}
            {sach.hinh_thuc_ban === 'TRON_QUYEN' && (
              <span className="badge badge-xu">Trọn quyển · {sach.gia_tron_quyen_xu} Xu</span>
            )}
          </div>

          <h1 className="detail-title">{sach.tieu_de}</h1>
          <p style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>Tác giả: {sach.ten_tac_gia}</p>

          <div className="detail-stats">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={16} color="#eab308" fill="#eab308" />
              <strong>{Number(sach.diem_danh_gia_tb || 0).toFixed(1)}</strong> ({sach.tong_danh_gia} đánh giá)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={16} /> {sach.luot_xem.toLocaleString()} {laSachNghe ? 'lượt nghe' : 'lượt đọc'}
            </span>
            <span>
              {sach.danh_sach_chuong?.length || 0} {laSachNghe ? 'tập' : 'chương'}
            </span>
          </div>

          <p className="detail-desc">{sach.mo_ta || 'Chưa có mô tả tóm tắt cho tác phẩm này.'}</p>

          <div className="detail-actions">
            {chuongDauTien && (
              <Link to={`/doc/${chuongDauTien.ma_chuong}`} className="btn-crystal">
                {laSachNghe ? <><Headphones size={18} /> Nghe từ đầu</> : <><BookOpen size={18} /> Đọc từ đầu</>}
              </Link>
            )}

            {sach.hinh_thuc_ban === 'TRON_QUYEN' && (
              trangThaiSoHuu.da_mua_tron_quyen ? (
                <span className="badge badge-free" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
                  <CheckCircle size={16} /> Đã sở hữu trọn quyển
                </span>
              ) : (
                <button type="button" className="btn-outline" disabled={dangMua} onClick={xuLyMuaTronQuyen}>
                  <Coins size={17} color="var(--xu-color)" />
                  Mua trọn quyển ({sach.gia_tron_quyen_xu} Xu)
                </button>
              )
            )}

            <button
              type="button"
              className={`btn-outline btn-heart ${trangThaiSoHuu.da_yeu_thich ? 'liked' : ''}`}
              onClick={xuLyYeuThich}
            >
              <Heart
                size={17}
                color={trangThaiSoHuu.da_yeu_thich ? '#e11d48' : 'currentColor'}
                fill={trangThaiSoHuu.da_yeu_thich ? '#e11d48' : 'none'}
              />
              {trangThaiSoHuu.da_yeu_thich ? 'Đã yêu thích' : 'Yêu thích'}
            </button>
          </div>
        </div>
      </div>

      <DanhSachChuong
        sach={sach}
        danhSachChuong={sach.danh_sach_chuong || []}
        trangThaiSoHuu={trangThaiSoHuu}
        onCapNhatSoHuu={taiSoHuu}
      />

      <KhuVucDanhGia maSach={sach.ma_sach} onCapNhatSach={taiChiTiet} />
    </div>
  );
};

export default ChiTietSach;