import { useState, useEffect } from 'react';
import { Coins, Plus, Pencil, Eye, EyeOff, Trash2, X } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import './QuanLyGoiNap.css';

const FORM_MAC_DINH = {
  ten_goi: '',
  gia_tien_vnd: '',
  so_xu_nhan: '',
  dang_hoat_dong: true,
};

const QuanLyGoiNap = () => {
  const [dsGoiNap, setDsGoiNap] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [moForm, setMoForm] = useState(false);
  const [goiDangSua, setGoiDangSua] = useState(null);
  const [form, setForm] = useState(FORM_MAC_DINH);
  const [dangLuu, setDangLuu] = useState(false);

  const taiDanhSach = async () => {
    setDangTai(true);
    try {
      const res = await axiosClient.get('/quan-tri/goi-nap');
      setDsGoiNap(res.du_lieu || []);
    } catch {
      try {
        const fallback = await axiosClient.get('/vi-xu/goi-nap');
        setDsGoiNap(fallback.du_lieu || []);
      } catch {
        setDsGoiNap([]);
      }
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDanhSach();
  }, []);

  const moFormThemMoi = () => {
    setGoiDangSua(null);
    setForm(FORM_MAC_DINH);
    setMoForm(true);
  };

  const moFormChinhSua = (goi) => {
    setGoiDangSua(goi);
    setForm({
      ten_goi: goi.ten_goi,
      gia_tien_vnd: String(goi.gia_tien_vnd),
      so_xu_nhan: String(goi.so_xu_nhan),
      dang_hoat_dong: Boolean(goi.dang_hoat_dong),
    });
    setMoForm(true);
  };

  const dongForm = () => {
    setMoForm(false);
    setGoiDangSua(null);
    setForm(FORM_MAC_DINH);
  };

  const xuLyLuu = async (e) => {
    e.preventDefault();
    setDangLuu(true);
    try {
      const payload = {
        ten_goi: form.ten_goi,
        gia_tien_vnd: Number(form.gia_tien_vnd),
        so_xu_nhan: Number(form.so_xu_nhan),
        dang_hoat_dong: form.dang_hoat_dong,
      };

      const res = goiDangSua
        ? await axiosClient.put(`/quan-tri/goi-nap/${goiDangSua.ma_goi}`, payload)
        : await axiosClient.post('/quan-tri/goi-nap', payload);

      alert(res.thong_bao || 'Lưu gói nạp thành công!');
      dongForm();
      await taiDanhSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể lưu gói nạp Xu (kiểm tra Render đã deploy Backend mới nhất chưa).');
    } finally {
      setDangLuu(false);
    }
  };

  const doiTrangThai = async (goi) => {
    const trangThaiMoi = !goi.dang_hoat_dong;
    try {
      const res = await axiosClient.put(`/quan-tri/goi-nap/${goi.ma_goi}/trang-thai`, {
        dang_hoat_dong: trangThaiMoi,
      });
      alert(res.thong_bao);
      taiDanhSach();
    } catch (error) {
      alert(error.thong_bao || 'Thao tác thất bại.');
    }
  };

  const xoaGoi = async (goi) => {
    if (!window.confirm(`Xác nhận xóa gói nạp "${goi.ten_goi}"?`)) return;
    try {
      const res = await axiosClient.delete(`/quan-tri/goi-nap/${goi.ma_goi}`);
      alert(res.thong_bao);
      taiDanhSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể xóa gói nạp.');
    }
  };

  const giaSo = Number(form.gia_tien_vnd) || 0;
  const xuSo = Number(form.so_xu_nhan) || 0;
  const donGiaQuyDoi = xuSo > 0 && giaSo > 0 ? Math.round(giaSo / xuSo) : 0;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Quản lý gói nạp Xu ({dsGoiNap.length})</h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-sub)', marginTop: '2px' }}>
            Thiết lập mệnh giá nạp tiền và số Xu quy đổi hiển thị đồng bộ cho độc giả
          </p>
        </div>

        <button type="button" className="btn-crystal" onClick={moFormThemMoi}>
          <Plus size={16} /> Thêm gói nạp mới
        </button>
      </div>

      {moForm && (
        <div className="admin-card package-form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={18} color="var(--xu-color)" />
              {goiDangSua ? `Chỉnh sửa gói #${goiDangSua.ma_goi}` : 'Thêm gói nạp Xu mới'}
            </h2>
            <button type="button" onClick={dongForm} style={{ background: 'transparent', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={xuLyLuu}>
            <div className="package-form-grid">
              <div className="package-field">
                <label>Tên gói nạp</label>
                <input
                  type="text"
                  className="input-crystal"
                  placeholder="VD: Gói Đọc Thả Ga"
                  value={form.ten_goi}
                  onChange={(e) => setForm({ ...form, ten_goi: e.target.value })}
                  required
                />
              </div>

              <div className="package-field">
                <label>Giá tiền (VNĐ)</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  className="input-crystal"
                  placeholder="VD: 50000"
                  value={form.gia_tien_vnd}
                  onChange={(e) => setForm({ ...form, gia_tien_vnd: e.target.value })}
                  required
                />
              </div>

              <div className="package-field">
                <label>Số Xu nhận được</label>
                <input
                  type="number"
                  min={1}
                  className="input-crystal"
                  placeholder="VD: 550"
                  value={form.so_xu_nhan}
                  onChange={(e) => setForm({ ...form, so_xu_nhan: e.target.value })}
                  required
                />
              </div>

              <div className="package-field">
                <label>Trạng thái hiển thị</label>
                <select
                  className="input-crystal"
                  value={form.dang_hoat_dong ? '1' : '0'}
                  onChange={(e) => setForm({ ...form, dang_hoat_dong: e.target.value === '1' })}
                >
                  <option value="1">Đang mở bán</option>
                  <option value="0">Tạm ngưng (Ẩn)</option>
                </select>
              </div>
            </div>

            {donGiaQuyDoi > 0 && (
              <div className="package-hint">
                Tỷ lệ quy đổi dự kiến: <strong>{donGiaQuyDoi.toLocaleString()} đ / Xu</strong> (Nạp{' '}
                <strong>{giaSo.toLocaleString()} đ</strong> nhận <strong>{xuSo.toLocaleString()} Xu</strong>)
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn-outline" onClick={dongForm}>
                Hủy
              </button>
              <button type="submit" className="btn-crystal" disabled={dangLuu}>
                {dangLuu ? 'Đang lưu...' : goiDangSua ? 'Cập nhật gói nạp' : 'Tạo gói nạp'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card admin-table-wrap">
        {dangTai ? (
          <p>Đang tải danh sách gói nạp Xu...</p>
        ) : dsGoiNap.length === 0 ? (
          <p style={{ color: 'var(--text-sub)' }}>Chưa có gói nạp Xu nào trong hệ thống.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã gói</th>
                <th>Tên gói</th>
                <th>Mệnh giá (VNĐ)</th>
                <th>Số Xu nhận</th>
                <th>Đơn giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsGoiNap.map((goi) => {
                const donGia = Math.round(goi.gia_tien_vnd / Math.max(1, goi.so_xu_nhan));
                return (
                  <tr key={goi.ma_goi}>
                    <td>#{goi.ma_goi}</td>
                    <td style={{ fontWeight: 700 }}>{goi.ten_goi}</td>
                    <td style={{ fontWeight: 600 }}>{Number(goi.gia_tien_vnd).toLocaleString()} đ</td>
                    <td style={{ fontWeight: 700, color: 'var(--xu-color)' }}>
                      +{Number(goi.so_xu_nhan).toLocaleString()} Xu
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                      {donGia.toLocaleString()} đ / Xu
                    </td>
                    <td>
                      <span className={`badge ${goi.dang_hoat_dong ? 'badge-free' : 'badge-xu'}`}>
                        {goi.dang_hoat_dong ? 'Đang mở bán' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td>
                      <div className="package-actions">
                        <button type="button" className="pkg-btn" onClick={() => moFormChinhSua(goi)}>
                          <Pencil size={13} /> Sửa
                        </button>
                        <button
                          type="button"
                          className={`pkg-btn ${goi.dang_hoat_dong ? 'warn' : 'ok'}`}
                          onClick={() => doiTrangThai(goi)}
                        >
                          {goi.dang_hoat_dong ? (
                            <>
                              <EyeOff size={13} /> Ẩn
                            </>
                          ) : (
                            <>
                              <Eye size={13} /> Mở bán
                            </>
                          )}
                        </button>
                        <button type="button" className="pkg-btn danger" onClick={() => xoaGoi(goi)}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QuanLyGoiNap;