import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import TheSach from '../dungChung/TheSach';
import './KhuVucSachTrangChu.css';

const KhuVucSachTrangChu = ({ tieuDe, moTa, hinhThucBan, loaiSach }) => {
  const [danhSachSach, setDanhSachSach] = useState([]);
  const [theLoaiCon, setTheLoaiCon] = useState([]);
  const [theLoaiDangChon, setTheLoaiDangChon] = useState('');
  const [dangTai, setDangTai] = useState(true);

  const boLocCoBan = loaiSach ? { loai_sach: loaiSach } : { hinh_thuc_ban: hinhThucBan };

  useEffect(() => {
    axiosClient
      .get('/danh-muc/the-loai', { params: boLocCoBan })
      .then((res) => setTheLoaiCon(res.du_lieu || []))
      .catch(() => setTheLoaiCon([]));
  }, [hinhThucBan, loaiSach]);

  useEffect(() => {
    const taiSach = async () => {
      setDangTai(true);
      try {
        const params = { ...boLocCoBan, gioi_han: 5 };
        if (theLoaiDangChon) params.ma_the_loai = theLoaiDangChon;
        const res = await axiosClient.get('/sach', { params });
        setDanhSachSach(res.du_lieu?.danh_sach || []);
      } catch {
        setDanhSachSach([]);
      } finally {
        setDangTai(false);
      }
    };
    taiSach();
  }, [hinhThucBan, loaiSach, theLoaiDangChon]);

  const linkXemThem = loaiSach
    ? `/kham-pha?loai_sach=${loaiSach}`
    : `/kham-pha?hinh_thuc_ban=${hinhThucBan}`;

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div className="home-section-title-group">
          <h2>{tieuDe}</h2>
          <p>{moTa}</p>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab-btn ${theLoaiDangChon === '' ? 'active' : ''}`}
            onClick={() => setTheLoaiDangChon('')}
          >
            Tất cả
          </button>

          {theLoaiCon.map((tl) => (
            <button
              key={tl.ma_the_loai}
              className={`filter-tab-btn ${String(theLoaiDangChon) === String(tl.ma_the_loai) ? 'active' : ''}`}
              onClick={() => setTheLoaiDangChon(tl.ma_the_loai)}
            >
              {tl.ten_the_loai}
            </button>
          ))}

          <Link to={linkXemThem} className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.84rem' }}>
            Xem thêm <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {dangTai ? (
        <div className="glass-card empty-section-box">Đang tải danh sách tác phẩm...</div>
      ) : danhSachSach.length === 0 ? (
        <div className="glass-card empty-section-box">Chưa có tác phẩm nào trong khu vực này.</div>
      ) : (
        <div className="book-grid">
          {danhSachSach.map((sach) => (
            <TheSach key={sach.ma_sach} sach={sach} />
          ))}
        </div>
      )}
    </section>
  );
};

export default KhuVucSachTrangChu;