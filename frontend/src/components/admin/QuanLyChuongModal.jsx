import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Headphones } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import './QuanLyChuongModal.css';

const FORM_CHUONG_MAC_DINH = {
  ma_chuong: null,
  so_thu_tu: 1,
  tieu_de: '',
  noi_dung: '',
  la_mien_phi: true,
  gia_xu: 0,
  moc_thoi_gian_json: '',
};

const QuanLyChuongModal = ({ sach, onDong, onCapNhat }) => {
  const [dsChuong, setDsChuong] = useState([]);
  const [form, setForm] = useState(FORM_CHUONG_MAC_DINH);
  const [fileAudio, setFileAudio] = useState(null);
  const [fileAnhNen, setFileAnhNen] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);

  const laSachNghe = sach.loai_sach === 'SACH_NOI';
  const donVi = laSachNghe ? 'tập' : 'chương';
  const donViHoa = laSachNghe ? 'Tập' : 'Chương';

  const taiDanhSachChuong = async () => {
    try {
      const res = await axiosClient.get(`/sach/${sach.ma_sach}`);
      const list = res.du_lieu?.danh_sach_chuong || [];
      setDsChuong(list);
      if (!form.ma_chuong) {
        setForm((prev) => ({ ...prev, so_thu_tu: list.length + 1 }));
      }
    } catch {
      setDsChuong([]);
    }
  };

  useEffect(() => {
    taiDanhSachChuong();
  }, [sach.ma_sach]);

  const chonSuaChuong = async (chuong) => {
    try {
      const res = await axiosClient.get(`/chuong/${chuong.ma_chuong}`);
      const chiTiet = res.du_lieu?.chuong;
      setForm({
        ma_chuong: chiTiet.ma_chuong,
        so_thu_tu: chiTiet.so_thu_tu,
        tieu_de: chiTiet.tieu_de,
        noi_dung: chiTiet.noi_dung || '',
        la_mien_phi: Boolean(chiTiet.la_mien_phi),
        gia_xu: chiTiet.gia_xu || 0,
        moc_thoi_gian_json: chiTiet.moc_thoi_gian_json || '',
      });
      setFileAudio(null);
      setFileAnhNen(null);
    } catch (error) {
      alert(error.thong_bao || `Không thể tải thông tin ${donVi}.`);
    }
  };

  const lamMoiForm = () => {
    setForm({ ...FORM_CHUONG_MAC_DINH, so_thu_tu: dsChuong.length + 1 });
    setFileAudio(null);
    setFileAnhNen(null);
  };

  const xuLyLuuChuong = async (e) => {
    e.preventDefault();
    setDangLuu(true);
    try {
      const formData = new FormData();
      formData.append('so_thu_tu', form.so_thu_tu);
      formData.append('tieu_de', form.tieu_de);
      if (!laSachNghe) {
        formData.append('noi_dung', form.noi_dung);
        if (form.moc_thoi_gian_json.trim()) {
          formData.append('moc_thoi_gian_json', form.moc_thoi_gian_json.trim());
        }
      }
      formData.append('la_mien_phi', form.la_mien_phi);
      formData.append('gia_xu', form.la_mien_phi ? 0 : form.gia_xu);
      if (fileAudio) {
        formData.append('audio', fileAudio);
      }
      if (fileAnhNen) {
        formData.append('anh_nen', fileAnhNen);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (form.ma_chuong) {
        await axiosClient.put(`/chuong/${form.ma_chuong}`, formData, config);
      } else {
        await axiosClient.post(`/chuong/sach/${sach.ma_sach}`, formData, config);
      }

      lamMoiForm();
      await taiDanhSachChuong();
      onCapNhat();
      alert(form.ma_chuong ? `Cập nhật ${donVi} thành công!` : `Thêm ${donVi} mới thành công!`);
    } catch (error) {
      alert(error.thong_bao || `Lỗi khi lưu ${donVi}.`);
    } finally {
      setDangLuu(false);
    }
  };

  const xuLyXoaChuong = async (chuong) => {
    if (!window.confirm(`Xóa "${donViHoa} ${chuong.so_thu_tu}: ${chuong.tieu_de}"?`)) return;
    try {
      await axiosClient.delete(`/chuong/${chuong.ma_chuong}`);
      if (form.ma_chuong === chuong.ma_chuong) lamMoiForm();
      await taiDanhSachChuong();
      onCapNhat();
    } catch (error) {
      alert(error.thong_bao || `Không thể xóa ${donVi}.`);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              Quản lý {donVi}: {sach.tieu_de}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
              Tổng số: {dsChuong.length} {donVi}
            </span>
          </div>
          <button type="button" onClick={onDong} style={{ background: 'transparent', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        <div className="admin-modal-body">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem' }}>Danh sách {donVi}</h3>
              <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={lamMoiForm}>
                <Plus size={14} /> Thêm {donVi} mới
              </button>
            </div>

            <div className="chapter-admin-list">
              {dsChuong.length === 0 ? (
                <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>Chưa có {donVi} nào.</p>
              ) : (
                dsChuong.map((c) => (
                  <div key={c.ma_chuong} className={`chapter-admin-row ${form.ma_chuong === c.ma_chuong ? 'editing' : ''}`}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                        {donViHoa} {c.so_thu_tu}: {c.tieu_de}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                        {c.la_mien_phi ? (
                          <span className="badge badge-free">Miễn phí</span>
                        ) : (
                          <span className="badge badge-xu">{c.gia_xu} Xu</span>
                        )}
                        {Boolean(c.co_audio) && (
                          <span className="badge badge-full"><Headphones size={12} /> Audio</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn-outline" style={{ padding: '6px' }} onClick={() => chonSuaChuong(c)}>
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => xuLyXoaChuong(c)}
                        style={{ padding: '6px', borderRadius: '8px', background: '#fee2e2', color: 'var(--danger-color)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={xuLyLuuChuong} className="chapter-form-box">
            <h3 style={{ fontSize: '1rem' }}>
              {form.ma_chuong ? `Chỉnh sửa ${donViHoa} ${form.so_thu_tu}` : `Thêm ${donVi} mới`}
            </h3>

            <div className="form-row-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Số thứ tự</label>
                <input
                  type="number"
                  min={1}
                  className="input-crystal"
                  value={form.so_thu_tu}
                  onChange={(e) => setForm({ ...form, so_thu_tu: parseInt(e.target.value, 10) || 1 })}
                  required
                />
              </div>

              {sach.hinh_thuc_ban === 'THEO_CHUONG' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Giá mở khóa (Xu)</label>
                  <input
                    type="number"
                    min={0}
                    className="input-crystal"
                    disabled={form.la_mien_phi}
                    value={form.la_mien_phi ? 0 : form.gia_xu}
                    onChange={(e) => setForm({ ...form, gia_xu: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              )}
            </div>

            {sach.hinh_thuc_ban === 'THEO_CHUONG' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.la_mien_phi}
                  onChange={(e) => setForm({ ...form, la_mien_phi: e.target.checked })}
                />
                Cho phép {laSachNghe ? 'nghe' : 'đọc'} miễn phí {donVi} này
              </label>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Tiêu đề {donVi}</label>
              <input
                type="text"
                className="input-crystal"
                value={form.tieu_de}
                onChange={(e) => setForm({ ...form, tieu_de: e.target.value })}
                required
              />
            </div>

            {!laSachNghe && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Nội dung văn bản / HTML</label>
                <textarea
                  rows={6}
                  className="input-crystal"
                  value={form.noi_dung}
                  onChange={(e) => setForm({ ...form, noi_dung: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                {laSachNghe ? 'Tệp âm thanh (.mp3, .m4a, .wav) *' : 'Tệp sách nói (.mp3 — tùy chọn)'}
              </label>
              <input
                type="file"
                accept="audio/*"
                required={laSachNghe && !form.ma_chuong}
                onChange={(e) => setFileAudio(e.target.files[0] || null)}
              />
            </div>

            {laSachNghe && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Ảnh nền riêng cho tập (tùy chọn)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFileAnhNen(e.target.files[0] || null)}
                />
              </div>
            )}

            {!laSachNghe && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mốc thời gian đồng bộ Audio (JSON — tùy chọn)
                </label>
                <input
                  type="text"
                  className="input-crystal"
                  placeholder='[{"doan":0,"bat_dau":0,"ket_thuc":5.5}]'
                  value={form.moc_thoi_gian_json}
                  onChange={(e) => setForm({ ...form, moc_thoi_gian_json: e.target.value })}
                />
              </div>
            )}

            <button type="submit" className="btn-crystal" disabled={dangLuu}>
              {dangLuu ? 'Đang lưu...' : form.ma_chuong ? `Cập nhật ${donVi}` : `Lưu ${donVi} mới`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuanLyChuongModal;