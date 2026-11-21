import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Compass, Headphones, BookOpen } from 'lucide-react';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import KhuVucSachTrangChu from '../../components/docGia/KhuVucSachTrangChu';
import './TrangChu.css';

const TrangChu = () => {
  const [sachNoiBat, setSachNoiBat] = useState([]);
  const [viTriHienTai, setViTriHienTai] = useState(0);
  const [tamDungXoay, setTamDungXoay] = useState(false);

  useEffect(() => {
    axiosClient
      .get('/sach', { params: { sap_xep: 'luot_xem', gioi_han: 6 } })
      .then((res) => setSachNoiBat(res.du_lieu?.danh_sach || []))
      .catch(() => setSachNoiBat([]));
  }, []);

  useEffect(() => {
    if (sachNoiBat.length <= 1 || tamDungXoay) return;
    const timer = setInterval(() => {
      setViTriHienTai((prev) => (prev + 1) % sachNoiBat.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [sachNoiBat.length, tamDungXoay]);

  const layLopViTri = (index) => {
    const tong = sachNoiBat.length;
    if (index === viTriHienTai) return 'pos-center';
    if (tong === 2) return 'pos-right';
    if (index === (viTriHienTai - 1 + tong) % tong) return 'pos-left';
    if (index === (viTriHienTai + 1) % tong) return 'pos-right';
    return 'pos-hidden';
  };

  const sachDangGiua = sachNoiBat[viTriHienTai];

  return (
    <div className="container">
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={15} /> Góc nhỏ dành cho tâm hồn yêu trang sách
          </div>
          <h1 className="hero-title">
            Chạm vào từng trang sách, lắng nghe trọn vẹn mọi thanh âm
          </h1>
          <p className="hero-desc">
            Đắm mình trong thế giới tri thức và những câu chuyện cuốn hút với không gian đọc tùy biến tinh tế cùng giọng đọc sách nói truyền cảm mọi lúc mọi nơi.
          </p>
          <div className="hero-actions">
            <Link to="/kham-pha" className="btn-crystal">
              <Compass size={18} /> Khám phá thư viện
            </Link>
            <Link to="/kham-pha?loai_sach=SACH_NOI" className="hero-btn-light">
              <Headphones size={16} /> Nghe sách nói ngay
            </Link>
          </div>
        </div>

        {sachNoiBat.length > 0 && (
          <div
            className="hero-showcase"
            onMouseEnter={() => setTamDungXoay(true)}
            onMouseLeave={() => setTamDungXoay(false)}
          >
            <div className="coverflow-stage">
              {sachNoiBat.map((sach, idx) => {
                const posClass = layLopViTri(idx);
                return (
                  <Link
                    key={sach.ma_sach}
                    to={`/sach/${sach.ma_sach}`}
                    className={`coverflow-card ${posClass}`}
                    onClick={(e) => {
                      if (posClass !== 'pos-center') {
                        e.preventDefault();
                        setViTriHienTai(idx);
                      }
                    }}
                  >
                    {sach.anh_bia ? (
                      <img src={`${SERVER_URL}${sach.anh_bia}`} alt={sach.tieu_de} />
                    ) : (
                      <div className="coverflow-fallback">
                        <BookOpen size={30} />
                        <span>{sach.tieu_de}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {sachDangGiua && (
              <div className="coverflow-caption">
                <Link to={`/sach/${sachDangGiua.ma_sach}`} className="coverflow-book-name">
                  {sachDangGiua.tieu_de}
                </Link>
                {sachNoiBat.length > 1 && (
                  <div className="coverflow-dots">
                    {sachNoiBat.map((s, idx) => (
                      <button
                        key={s.ma_sach}
                        type="button"
                        className={`coverflow-dot ${idx === viTriHienTai ? 'active' : ''}`}
                        onClick={() => setViTriHienTai(idx)}
                        aria-label={s.tieu_de}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <KhuVucSachTrangChu
        tieuDe="Sách Giải Trí Cập Nhật Theo Chương"
        moTa="Đọc miễn phí các chương đầu và mở khóa từng chương tiếp theo bằng Xu"
        hinhThucBan="THEO_CHUONG"
      />

      <KhuVucSachTrangChu
        tieuDe="Tủ Sách Văn Học & Học Thuật"
        moTa="Kho tác phẩm văn học kinh điển và tài liệu nghiên cứu mở miễn phí 100%"
        hinhThucBan="MIEN_PHI"
      />

      <KhuVucSachTrangChu
        tieuDe="Sách Điện Tử Trọn Quyển"
        moTa="Đọc thử 3.000 từ đầu tiên và sở hữu trọn đời toàn bộ tác phẩm"
        hinhThucBan="TRON_QUYEN"
      />

      <KhuVucSachTrangChu
        tieuDe="Không Gian Sách Nghe (Audiobook)"
        moTa="Thưởng thức truyện và sách nói với âm thanh chất lượng cao mọi lúc mọi nơi"
        loaiSach="SACH_NOI"
      />
    </div>
  );
};

export default TrangChu;