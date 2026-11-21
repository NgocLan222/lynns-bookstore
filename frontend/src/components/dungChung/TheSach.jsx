import { Link } from 'react-router-dom';
import { Star, BookOpen, Coins, Headphones, Eye } from 'lucide-react';
import { SERVER_URL } from '../../api/axiosClient';
import './TheSach.css';

const TheSach = ({ sach }) => {
  const laSachNghe = sach.loai_sach === 'SACH_NOI';

  const renderNhanBan = () => {
    if (sach.hinh_thuc_ban === 'MIEN_PHI') {
      return <span className="badge badge-free book-badge-pos">Miễn phí</span>;
    }
    if (sach.hinh_thuc_ban === 'TRON_QUYEN') {
      return (
        <span className="badge badge-full book-badge-pos">
          <Coins size={13} /> Trọn quyển
        </span>
      );
    }
    return (
      <span className="badge badge-xu book-badge-pos">
        <Coins size={13} /> {laSachNghe ? 'Theo tập' : 'Theo chương'}
      </span>
    );
  };

  return (
    <Link to={`/sach/${sach.ma_sach}`} className="glass-card book-card">
      <div className="book-cover-wrap">
        {sach.anh_bia ? (
          <img src={`${SERVER_URL}${sach.anh_bia}`} alt={sach.tieu_de} className="book-cover-img" />
        ) : (
          <div className="book-cover-placeholder">
            {laSachNghe ? <Headphones size={32} /> : <BookOpen size={32} />}
            <span>{sach.tieu_de}</span>
          </div>
        )}
        {renderNhanBan()}
        {laSachNghe && (
          <span className="book-audio-badge">
            <Headphones size={13} /> Audio
          </span>
        )}
      </div>

      <div className="book-info">
        <span className="book-category">{sach.ten_the_loai}</span>
        <h3 className="book-title">{sach.tieu_de}</h3>
        <p className="book-author">{sach.ten_tac_gia}</p>

        <div className="book-meta">
          <div className="book-meta-left">
            <span className="book-rating">
              <Star size={14} fill="#eab308" />
              {Number(sach.diem_danh_gia_tb || 0).toFixed(1)}
            </span>
            <span className="book-views" title="Lượt xem">
              <Eye size={14} />
              {Number(sach.luot_xem || 0).toLocaleString()}
            </span>
          </div>

          <span>
            {sach.tong_so_chuong || 0} {laSachNghe ? 'tập' : 'chương'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default TheSach;