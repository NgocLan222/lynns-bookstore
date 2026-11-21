import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Star, Trash2, Edit, MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import './KhuVucDanhGia.css';

const tachMention = (text = '') => {
  const match = text.match(/^(@[^\s:]+(?:\s+[^\s:]+){0,3})\s+(.*)$/s);
  if (match) return { mention: match[1], body: match[2] };
  return { mention: null, body: text };
};

const KhuVucDanhGia = ({ maSach, onCapNhatSach }) => {
  const { nguoiDung } = useAuth();
  const location = useLocation();

  const [dsDanhGia, setDsDanhGia] = useState([]);
  const [soSao, setSoSao] = useState(5);
  const [binhLuan, setBinhLuan] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const [dangSuaId, setDangSuaId] = useState(null);
  const [saoSua, setSaoSua] = useState(5);
  const [noiDungSua, setNoiDungSua] = useState('');

  const [dangPhanHoiId, setDangPhanHoiId] = useState(null);
  const [nguoiNhanId, setNguoiNhanId] = useState(null);
  const [tenNguoiNhan, setTenNguoiNhan] = useState('');
  const [noiDungPhanHoi, setNoiDungPhanHoi] = useState('');

  const [highlightId, setHighlightId] = useState('');

  const taiDanhGia = async () => {
    try {
      const res = await axiosClient.get(`/danh-gia/sach/${maSach}`);
      setDsDanhGia(res.du_lieu || []);
    } catch {
      setDsDanhGia([]);
    }
  };

  useEffect(() => {
    taiDanhGia();
  }, [maSach]);

  useEffect(() => {
    if (!location.hash || dsDanhGia.length === 0) return;
    const targetId = location.hash.replace('#', '');
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(targetId);
      const timer = setTimeout(() => setHighlightId(''), 2800);
      return () => clearTimeout(timer);
    }
  }, [location.hash, dsDanhGia]);

  const danhGiaCuaToi = nguoiDung
    ? dsDanhGia.find((dg) => dg.ma_nguoi_dung === nguoiDung.ma_nguoi_dung)
    : null;

  const xuLyGui = async (e) => {
    e.preventDefault();
    setDangGui(true);
    try {
      await axiosClient.post('/danh-gia', { ma_sach: maSach, so_sao: soSao, binh_luan: binhLuan });
      setBinhLuan('');
      setSoSao(5);
      await taiDanhGia();
      if (onCapNhatSach) onCapNhatSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể gửi đánh giá.');
    } finally {
      setDangGui(false);
    }
  };

  const batDauSua = (dg) => {
    setDangSuaId(dg.ma_danh_gia);
    setSaoSua(dg.so_sao);
    setNoiDungSua(dg.binh_luan || '');
  };

  const xuLyLuuSua = async (maDanhGia) => {
    try {
      await axiosClient.put(`/danh-gia/${maDanhGia}`, { so_sao: saoSua, binh_luan: noiDungSua });
      setDangSuaId(null);
      await taiDanhGia();
      if (onCapNhatSach) onCapNhatSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể cập nhật đánh giá.');
    }
  };

  const xuLyXoa = async (maDanhGia) => {
    if (!window.confirm('Xác nhận xóa đánh giá này?')) return;
    try {
      await axiosClient.delete(`/danh-gia/${maDanhGia}`);
      if (dangSuaId === maDanhGia) setDangSuaId(null);
      await taiDanhGia();
      if (onCapNhatSach) onCapNhatSach();
    } catch (error) {
      alert(error.thong_bao || 'Không thể xóa đánh giá.');
    }
  };

  const moKhungPhanHoi = (maDanhGia, maNguoiDuocTag, tenNguoiDuocTag, ganTag = false) => {
    setDangPhanHoiId(maDanhGia);
    setNguoiNhanId(maNguoiDuocTag);
    setTenNguoiNhan(tenNguoiDuocTag);
    setNoiDungPhanHoi(ganTag ? `@${tenNguoiDuocTag} ` : '');
  };

  const xuLyGuiPhanHoi = async (e, maDanhGia) => {
    e.preventDefault();
    if (!noiDungPhanHoi.trim()) return;
    try {
      await axiosClient.post(`/danh-gia/${maDanhGia}/phan-hoi`, {
        noi_dung: noiDungPhanHoi,
        ma_nguoi_nhan: nguoiNhanId,
      });
      setNoiDungPhanHoi('');
      setDangPhanHoiId(null);
      await taiDanhGia();
    } catch (error) {
      alert(error.thong_bao || 'Không thể gửi phản hồi.');
    }
  };

  const xuLyXoaPhanHoi = async (maPhanHoi) => {
    if (!window.confirm('Xóa phản hồi này?')) return;
    try {
      await axiosClient.delete(`/danh-gia/phan-hoi/${maPhanHoi}`);
      await taiDanhGia();
    } catch (error) {
      alert(error.thong_bao || 'Không thể xóa phản hồi.');
    }
  };

  const renderAvatar = (hoTen, anhDaiDien) => {
    const chuCai = hoTen?.trim()?.charAt(0)?.toUpperCase() || 'U';
    return (
      <span className="review-avatar">
        {anhDaiDien ? <img src={`${SERVER_URL}${anhDaiDien}`} alt={hoTen} /> : chuCai}
      </span>
    );
  };

  return (
    <div className="glass-card review-card">
      <h2 style={{ marginBottom: '16px' }}>Đánh giá ({dsDanhGia.length})</h2>

      {!nguoiDung ? (
        <p style={{ color: 'var(--text-sub)', marginBottom: '16px' }}>
          Đăng nhập để chấm sao, viết cảm nhận hoặc phản hồi đánh giá của độc giả khác.
        </p>
      ) : !danhGiaCuaToi && (
        <form onSubmit={xuLyGui} className="review-form">
          <div className="star-picker">
            <span style={{ fontSize: '0.9rem', fontWeight: 600, marginRight: '6px' }}>Chấm điểm:</span>
            {[1, 2, 3, 4, 5].map((sao) => (
              <button key={sao} type="button" className="star-btn" onClick={() => setSoSao(sao)}>
                <Star size={22} color="#eab308" fill={sao <= soSao ? '#eab308' : 'none'} />
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            className="input-crystal"
            placeholder="Chia sẻ cảm nhận của bạn về tác phẩm này..."
            value={binhLuan}
            onChange={(e) => setBinhLuan(e.target.value)}
          />

          <div>
            <button type="submit" className="btn-crystal" disabled={dangGui}>
              {dangGui ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      )}

      {dsDanhGia.length === 0 ? (
        <p style={{ color: 'var(--text-sub)' }}>Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét!</p>
      ) : (
        dsDanhGia.map((dg) => {
          const laCuaToi = nguoiDung?.ma_nguoi_dung === dg.ma_nguoi_dung;
          const coQuyenXoa = nguoiDung?.vai_tro === 'admin' || laCuaToi;
          const elemId = `danh-gia-${dg.ma_danh_gia}`;

          return (
            <div
              key={dg.ma_danh_gia}
              id={elemId}
              className={`review-item ${highlightId === elemId ? 'highlight-target' : ''}`}
            >
              <div className="review-item-header">
                <div className="review-user-info">
                  {renderAvatar(dg.ho_ten, dg.anh_dai_dien)}
                  <span>{dg.ho_ten}</span>
                  <div className="review-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} color="#eab308" fill={i <= dg.so_sao ? '#eab308' : 'none'} />
                    ))}
                  </div>
                  <span className="review-time">
                    {new Date(dg.ngay_tao).toLocaleDateString('vi-VN')}
                    {dg.ngay_cap_nhat ? ' · đã chỉnh sửa' : ''}
                  </span>
                </div>

                <div className="review-actions">
                  {nguoiDung && (
                    <button
                      type="button"
                      className="review-action-btn"
                      onClick={() => moKhungPhanHoi(dg.ma_danh_gia, dg.ma_nguoi_dung, dg.ho_ten, false)}
                    >
                      <MessageSquare size={13} /> Phản hồi
                    </button>
                  )}

                  {laCuaToi && dangSuaId !== dg.ma_danh_gia && (
                    <button type="button" className="review-action-btn" onClick={() => batDauSua(dg)}>
                      <Edit size={13} /> Sửa
                    </button>
                  )}

                  {coQuyenXoa && (
                    <button
                      type="button"
                      className="review-action-btn danger"
                      onClick={() => xuLyXoa(dg.ma_danh_gia)}
                      title="Xóa đánh giá"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  )}
                </div>
              </div>

              {dangSuaId === dg.ma_danh_gia ? (
                <div className="review-edit-box">
                  <div className="star-picker">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Điểm mới:</span>
                    {[1, 2, 3, 4, 5].map((sao) => (
                      <button key={sao} type="button" className="star-btn" onClick={() => setSaoSua(sao)}>
                        <Star size={20} color="#eab308" fill={sao <= saoSua ? '#eab308' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    className="input-crystal"
                    value={noiDungSua}
                    onChange={(e) => setNoiDungSua(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-crystal" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => xuLyLuuSua(dg.ma_danh_gia)}>
                      Lưu thay đổi
                    </button>
                    <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => setDangSuaId(null)}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                dg.binh_luan && <p className="review-text">{dg.binh_luan}</p>
              )}

              {dg.danh_sach_phan_hoi?.length > 0 && (
                <div className="reply-list">
                  {dg.danh_sach_phan_hoi.map((ph) => {
                    const coQuyenXoaPh = nguoiDung?.vai_tro === 'admin' || nguoiDung?.ma_nguoi_dung === ph.ma_nguoi_dung;
                    const { mention, body } = tachMention(ph.noi_dung);

                    return (
                      <div key={ph.ma_phan_hoi} className="reply-item">
                        <div className="reply-item-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700 }}>
                            <span>{ph.ho_ten}</span>
                            <span className="review-time">{new Date(ph.ngay_tao).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {nguoiDung && (
                              <button
                                type="button"
                                className="reply-sub-btn"
                                onClick={() => moKhungPhanHoi(dg.ma_danh_gia, ph.ma_nguoi_dung, ph.ho_ten, true)}
                              >
                                <MessageSquare size={12} /> Phản hồi
                              </button>
                            )}
                            {coQuyenXoaPh && (
                              <button
                                type="button"
                                onClick={() => xuLyXoaPhanHoi(ph.ma_phan_hoi)}
                                style={{ background: 'transparent', color: 'var(--danger-color)', padding: '2px' }}
                                title="Xóa phản hồi"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="reply-item-text">
                          {mention && <span className="mention-tag">{mention}</span>}
                          {body}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {dangPhanHoiId === dg.ma_danh_gia && (
                <form onSubmit={(e) => xuLyGuiPhanHoi(e, dg.ma_danh_gia)} className="reply-form-box">
                  <input
                    type="text"
                    className="input-crystal"
                    placeholder={`Phản hồi ${tenNguoiNhan}...`}
                    value={noiDungPhanHoi}
                    onChange={(e) => setNoiDungPhanHoi(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit" className="btn-crystal" style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                    <Send size={14} /> Gửi
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '9px 10px' }}
                    onClick={() => setDangPhanHoiId(null)}
                  >
                    <X size={14} />
                  </button>
                </form>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default KhuVucDanhGia;