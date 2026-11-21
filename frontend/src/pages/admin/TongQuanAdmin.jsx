import { useState, useEffect } from 'react';
import { TrendingUp, Coins, BookOpen, Users } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import './TongQuanAdmin.css';

const NHAN_LOAI_GD = {
  MO_CHUONG_LE: 'Mở khóa chương lẻ',
  MO_CHUONG_HANG_LOAT: 'Mở khóa hàng loạt',
  MUA_TRON_QUYEN: 'Mua trọn quyển',
};

const TongQuanAdmin = () => {
  const [kyHan, setKyHan] = useState('7_ngay');
  const [duLieu, setDuLieu] = useState(null);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    const taiThongKe = async () => {
      setDangTai(true);
      try {
        const res = await axiosClient.get('/quan-tri/thong-ke', { params: { ky_han: kyHan } });
        setDuLieu(res.du_lieu);
      } catch {
        setDuLieu(null);
      } finally {
        setDangTai(false);
      }
    };
    taiThongKe();
  }, [kyHan]);

  if (dangTai) return <div>Đang tổng hợp số liệu thống kê...</div>;
  if (!duLieu) return <div>Không thể tải dữ liệu thống kê.</div>;

  const { kpi, bieu_do_thoi_gian, co_cau_xu, top_sach, giao_dich_gan_day } = duLieu;
  const maxDoanhThu = Math.max(...bieu_do_thoi_gian.map((d) => d.doanh_thu_vnd), 1);
  const tongXuCoCau = co_cau_xu.reduce((sum, item) => sum + item.tong_xu, 0) || 1;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Tổng quan hệ thống</h1>
        <select className="input-crystal" style={{ width: '180px' }} value={kyHan} onChange={(e) => setKyHan(e.target.value)}>
          <option value="7_ngay">7 ngày gần nhất</option>
          <option value="30_ngay">30 ngày gần nhất</option>
          <option value="nam_nay">Trong năm nay</option>
        </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="kpi-label">Tổng doanh thu nạp</div>
            <div className="kpi-value">{Number(kpi.tong_doanh_thu_vnd).toLocaleString()} đ</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Coins size={24} />
          </div>
          <div>
            <div className="kpi-label">Tổng Xu đã tiêu thụ</div>
            <div className="kpi-value">{Number(kpi.tong_xu_tieu_thu).toLocaleString()} Xu</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="kpi-label">Kho nội dung</div>
            <div className="kpi-value">{kpi.tong_so_sach} sách · {kpi.tong_so_chuong} chương</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-label">Độc giả đăng ký</div>
            <div className="kpi-value">{kpi.tong_doc_gia} thành viên</div>
          </div>
        </div>
      </div>

      <div className="dashboard-split">
        <div className="admin-card">
          <h2>Biểu đồ doanh thu nạp Xu (VNĐ)</h2>
          {bieu_do_thoi_gian.length === 0 ? (
            <p style={{ color: 'var(--text-sub)', padding: '40px 0', textAlign: 'center' }}>
              Chưa phát sinh giao dịch nạp Xu trong kỳ hạn này.
            </p>
          ) : (
            <div className="bar-chart-area">
              {bieu_do_thoi_gian.map((item) => {
                const tyLeChieuCao = Math.round((item.doanh_thu_vnd / maxDoanhThu) * 140);
                return (
                  <div key={item.moc_thoi_gian} className="bar-col">
                    <span className="bar-val">{(item.doanh_thu_vnd / 1000).toFixed(0)}k</span>
                    <div className="bar-fill" style={{ height: `${Math.max(8, tyLeChieuCao)}px` }} />
                    <span className="bar-date">{item.moc_thoi_gian.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-card">
          <h2>Cơ cấu tiêu thụ Xu</h2>
          {co_cau_xu.length === 0 ? (
            <p style={{ color: 'var(--text-sub)' }}>Chưa có dữ liệu mở khóa.</p>
          ) : (
            <div className="breakdown-list">
              {co_cau_xu.map((item) => {
                const phanTram = Math.round((item.tong_xu / tongXuCoCau) * 100);
                return (
                  <div key={item.loai_giao_dich} className="breakdown-item">
                    <div className="breakdown-top">
                      <span>{NHAN_LOAI_GD[item.loai_giao_dich] || item.loai_giao_dich}</span>
                      <span>{item.tong_xu.toLocaleString()} Xu ({phanTram}%)</span>
                    </div>
                    <div className="breakdown-track">
                      <div className="breakdown-fill" style={{ width: `${phanTram}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-split">
        <div className="admin-card admin-table-wrap">
          <h2>Top 5 đầu sách nổi bật</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tác phẩm</th>
                <th>Hình thức</th>
                <th>Lượt đọc</th>
                <th>Doanh thu Xu</th>
              </tr>
            </thead>
            <tbody>
              {top_sach.map((s) => (
                <tr key={s.ma_sach}>
                  <td style={{ fontWeight: 600 }}>{s.tieu_de}</td>
                  <td>{s.hinh_thuc_ban}</td>
                  <td>{s.luot_xem.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--xu-color)' }}>{s.doanh_thu_xu.toLocaleString()} Xu</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card admin-table-wrap">
          <h2>Giao dịch gần đây</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Độc giả</th>
                <th>Nội dung</th>
                <th>Biến động</th>
              </tr>
            </thead>
            <tbody>
              {giao_dich_gan_day.map((gd) => (
                <tr key={gd.ma_giao_dich}>
                  <td style={{ fontWeight: 600 }}>{gd.ten_dang_nhap}</td>
                  <td>{gd.mo_ta}</td>
                  <td style={{ fontWeight: 700, color: gd.bien_dong_xu >= 0 ? 'var(--free-color)' : 'var(--xu-color)' }}>
                    {gd.bien_dong_xu > 0 ? `+${gd.bien_dong_xu}` : gd.bien_dong_xu} Xu
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TongQuanAdmin;