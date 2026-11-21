import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import TheSach from '../../components/dungChung/TheSach';
import './KhamPhaSach.css';

const KhamPhaSach = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [danhSachSach, setDanhSachSach] = useState([]);
  const [dsTheLoai, setDsTheLoai] = useState([]);
  const [phanTrang, setPhanTrang] = useState({ trang_hien_tai: 1, tong_so_trang: 1, tong_so_sach: 0 });
  const [dangTai, setDangTai] = useState(true);

  const tuKhoa = searchParams.get('tu_khoa') || '';
  const loaiSach = searchParams.get('loai_sach') || '';
  const hinhThucBan = searchParams.get('hinh_thuc_ban') || '';
  const maTheLoai = searchParams.get('ma_the_loai') || '';
  const sapXep = searchParams.get('sap_xep') || 'moi_nhat';
  const trang = parseInt(searchParams.get('trang'), 10) || 1;

  useEffect(() => {
    axiosClient.get('/danh-muc/the-loai').then((res) => setDsTheLoai(res.du_lieu || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const taiDuLieu = async () => {
      setDangTai(true);
      try {
        const res = await axiosClient.get('/sach', {
          params: {
            tu_khoa: tuKhoa || undefined,
            loai_sach: loaiSach || undefined,
            hinh_thuc_ban: hinhThucBan || undefined,
            ma_the_loai: maTheLoai || undefined,
            sap_xep: sapXep,
            trang,
            gioi_han: 12,
          },
        });
        setDanhSachSach(res.du_lieu?.danh_sach || []);
        setPhanTrang(res.du_lieu?.phan_trang || { trang_hien_tai: 1, tong_so_trang: 1, tong_so_sach: 0 });
      } catch {
        setDanhSachSach([]);
      } finally {
        setDangTai(false);
      }
    };
    taiDuLieu();
  }, [tuKhoa, loaiSach, hinhThucBan, maTheLoai, sapXep, trang]);

  const capNhatBoLoc = (truong, giaTri) => {
    const next = new URLSearchParams(searchParams);
    if (giaTri) next.set(truong, giaTri);
    else next.delete(truong);
    if (truong !== 'trang') next.set('trang', '1');
    setSearchParams(next);
  };

  return (
    <div className="container explore-page">
      <div className="glass-card explore-filter-bar">
        <input
          type="text"
          className="input-crystal"
          placeholder="Nhập tên sách hoặc tác giả..."
          value={tuKhoa}
          onChange={(e) => capNhatBoLoc('tu_khoa', e.target.value)}
        />

        <select className="input-crystal" value={loaiSach} onChange={(e) => capNhatBoLoc('loai_sach', e.target.value)}>
          <option value="">Tất cả định dạng</option>
          <option value="SACH_DOC">Sách đọc (E-book)</option>
          <option value="SACH_NOI">Sách nghe (Audio)</option>
        </select>

        <select className="input-crystal" value={hinhThucBan} onChange={(e) => capNhatBoLoc('hinh_thuc_ban', e.target.value)}>
          <option value="">Tất cả hình thức</option>
          <option value="THEO_CHUONG">Theo chương / tập</option>
          <option value="MIEN_PHI">Miễn phí 100%</option>
          <option value="TRON_QUYEN">Trọn quyển</option>
        </select>

        <select className="input-crystal" value={maTheLoai} onChange={(e) => capNhatBoLoc('ma_the_loai', e.target.value)}>
          <option value="">Tất cả thể loại</option>
          {dsTheLoai.map((tl) => (
            <option key={tl.ma_the_loai} value={tl.ma_the_loai}>{tl.ten_the_loai}</option>
          ))}
        </select>

        <select className="input-crystal" value={sapXep} onChange={(e) => capNhatBoLoc('sap_xep', e.target.value)}>
          <option value="moi_nhat">Mới cập nhật</option>
          <option value="luot_xem">Phổ biến nhất</option>
          <option value="danh_gia">Đánh giá cao nhất</option>
        </select>
      </div>

      <div className="explore-header">
        <h1>{loaiSach === 'SACH_NOI' ? 'Thư viện Sách nghe' : 'Thư viện tác phẩm'}</h1>
        <span className="explore-count">Tìm thấy {phanTrang.tong_so_sach} tác phẩm</span>
      </div>

      {dangTai ? (
        <div className="glass-card empty-section-box">Đang tải dữ liệu...</div>
      ) : danhSachSach.length === 0 ? (
        <div className="glass-card empty-section-box">Không tìm thấy tác phẩm phù hợp với bộ lọc.</div>
      ) : (
        <div className="book-grid">
          {danhSachSach.map((sach) => (
            <TheSach key={sach.ma_sach} sach={sach} />
          ))}
        </div>
      )}

      {phanTrang.tong_so_trang > 1 && (
        <div className="pagination-bar">
          <button className="page-btn" disabled={trang <= 1} onClick={() => capNhatBoLoc('trang', String(trang - 1))}>
            Trước
          </button>
          {Array.from({ length: phanTrang.tong_so_trang }, (_, idx) => idx + 1).map((soTrang) => (
            <button
              key={soTrang}
              className={`page-btn ${soTrang === trang ? 'active' : ''}`}
              onClick={() => capNhatBoLoc('trang', String(soTrang))}
            >
              {soTrang}
            </button>
          ))}
          <button className="page-btn" disabled={trang >= phanTrang.tong_so_trang} onClick={() => capNhatBoLoc('trang', String(trang + 1))}>
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default KhamPhaSach;