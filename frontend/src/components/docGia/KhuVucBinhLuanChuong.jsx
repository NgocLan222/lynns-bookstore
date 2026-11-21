import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Edit, Trash2, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import './KhuVucBinhLuanChuong.css';

const tachMention = (text = '') => {
  const match = text.match(/^(@[^\s:]+(?:\s+[^\s:]+){0,3})\s+(.*)$/s);
  if (match) return { mention: match[1], body: match[2] };
  return { mention: null, body: text };
};

const KhuVucBinhLuanChuong = ({ maChuong, laSachNghe = false }) => {
  const { nguoiDung } = useAuth();
  const location = useLocation();

  const [dsBinhLuan, setDsBinhLuan] = useState([]);
  const [noiDungMoi, setNoiDungMoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const [dangSuaId, setDangSuaId] = useState(null);
  const [noiDungSua, setNoiDungSua] = useState('');

  const [dangPhanHoiId, setDangPhanHoiId] = useState(null);
  const [nguoiNhanId, setNguoiNhanId] = useState(null);
  const [tenNguoiNhan, setTenNguoiNhan] = useState('');
  const [noiDungPhanHoi, setNoiDungPhanHoi] = useState('');

  const [highlightId, setHighlightId] = useState('');

  const donVi = laSachNghe ? 'tập' : 'chương';

  const taiBinhLuan = async () => {
    try {
      const res = await axiosClient.get(`/danh-gia/chuong/${maChuong}`);
      setDsBinhLuan(res.du_lieu || []);
    } catch {
      setDsBinhLuan([]);
    }
  };

  useEffect(() => {
    if (maChuong) taiBinhLuan();
  }, [maChuong]);

  useEffect(() => {
    if (!location.hash || dsBinhLuan.length === 0) return;
    const targetId = location.hash.replace('#', '');
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(targetId);
      const timer = setTimeout(() => setHighlightId(''), 2800);
      return () => clearTimeout(timer);
    }
  }, [location.hash, dsBinhLuan]);

  const xuLyDangBinhLuan = async (e) => {
    e.preventDefault();
    if (!noiDungMoi.trim()) return;
    setDangGui(true);
    try {
      await axiosClient.post(`/danh-gia/chuong/${maChuong}`, { noi_dung: noiDungMoi });
      setNoiDungMoi('');
      await taiBinhLuan();
    } catch (error) {
      alert(error.thong_bao || 'Không thể đăng bình luận.');
    } finally {
      setDangGui(false);
    }
  };

  const xuLyLuuSua = async (maBinhLuan) => {
    if (!noiDungSua.trim()) return;
    try {
      await axiosClient.put(`/danh-gia/binh-luan/${maBinhLuan}`, { noi_dung: noiDungSua });
      setDangSuaId(null);
      await taiBinhLuan();
    } catch (error) {
      alert(error.thong_bao || 'Không thể cập nhật bình luận.');
    }
  };

  const xuLyXoa = async (maBinhLuan) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    try {
      await axiosClient.delete(`/danh-gia/binh-luan/${maBinhLuan}`);
      if (dangSuaId === maBinhLuan) setDangSuaId(null);
      await taiBinhLuan();
    } catch (error) {
      alert(error.thong_bao || 'Không thể xóa bình luận.');
    }
  };

  const moKhungPhanHoi = (maBinhLuanCha, maNguoiDuocTag, tenNguoiDuocTag, ganTag = false) => {
    setDangPhanHoiId(maBinhLuanCha);
    setNguoiNhanId(maNguoiDuocTag);
    setTenNguoiNhan(tenNguoiDuocTag);
    setNoiDungPhanHoi(ganTag ? `@${tenNguoiDuocTag} ` : '');
  };

  const xuLyGuiPhanHoi = async (e, maBinhLuanCha) => {
    e.preventDefault();
    if (!noiDungPhanHoi.trim()) return;
    try {
      await axiosClient.post(`/danh-gia/chuong/${maChuong}`, {
        noi_dung: noiDungPhanHoi,
        ma_binh_luan_cha: maBinhLuanCha,
        ma_nguoi_nhan: nguoiNhanId,
      });
      setNoiDungPhanHoi('');
      setDangPhanHoiId(null);
      await taiBinhLuan();
    } catch (error) {
      alert(error.thong_bao || 'Không thể gửi phản hồi.');
    }
  };

  const tongBinhLuan = dsBinhLuan.reduce(
    (sum, bl) => sum + 1 + (bl.danh_sach_phan_hoi?.length || 0),
    0
  );

  return (
    <section className="chapter-comment-section">
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '14px' }}>
        Thảo luận {donVi} này ({tongBinhLuan})
      </h2>

      {nguoiDung ? (
        <form onSubmit={xuLyDangBinhLuan} className="chapter-comment-form">
          <textarea
            rows={3}
            className="input-crystal"
            placeholder={`Viết bình luận của bạn về ${donVi} này...`}
            value={noiDungMoi}
            onChange={(e) => setNoiDungMoi(e.target.value)}
            required
          />
          <div>
            <button type="submit" className="btn-crystal" disabled={dangGui}>
              <Send size={15} /> {dangGui ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ opacity: 0.78, marginBottom: '16px', fontSize: '0.92rem' }}>
          Đăng nhập để tham gia bình luận cùng các độc giả khác ở {donVi} này.
        </p>
      )}

      {dsBinhLuan.length === 0 ? (
        <p style={{ opacity: 0.75, fontSize: '0.92rem' }}>
          Chưa có bình luận nào cho {donVi} này. Hãy mở đầu cuộc trò chuyện nhé!
        </p>
      ) : (
        dsBinhLuan.map((bl) => {
          const laCuaToi = nguoiDung?.ma_nguoi_dung === bl.ma_nguoi_dung;
          const coQuyenXoa = nguoiDung?.vai_tro === 'admin' || laCuaToi;
          const chuCai = bl.ho_ten?.trim()?.charAt(0)?.toUpperCase() || 'U';
          const elemId = `binh-luan-${bl.ma_binh_luan}`;

          return (
            <div
              key={bl.ma_binh_luan}
              id={elemId}
              className={`chapter-comment-item ${highlightId === elemId ? 'highlight-target' : ''}`}
            >
              <div className="comment-top-row">
                <div className="comment-author-box">
                  <span className="comment-avatar-dot">
                    {bl.anh_dai_dien ? <img src={`${SERVER_URL}${bl.anh_dai_dien}`} alt={bl.ho_ten} /> : chuCai}
                  </span>
                  <span>{bl.ho_ten}</span>
                  <span className="comment-time-tag">
                    {new Date(bl.ngay_tao).toLocaleString('vi-VN')}
                    {bl.ngay_cap_nhat ? ' · đã sửa' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {nguoiDung && (
                    <button
                      type="button"
                      className="review-action-btn"
                      onClick={() => moKhungPhanHoi(bl.ma_binh_luan, bl.ma_nguoi_dung, bl.ho_ten, false)}
                    >
                      <MessageSquare size={13} /> Phản hồi
                    </button>
                  )}
                  {laCuaToi && dangSuaId !== bl.ma_binh_luan && (
                    <button
                      type="button"
                      className="review-action-btn"
                      onClick={() => {
                        setDangSuaId(bl.ma_binh_luan);
                        setNoiDungSua(bl.noi_dung);
                      }}
                    >
                      <Edit size={13} /> Sửa
                    </button>
                  )}
                  {coQuyenXoa && (
                    <button
                      type="button"
                      className="review-action-btn danger"
                      onClick={() => xuLyXoa(bl.ma_binh_luan)}
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  )}
                </div>
              </div>

              {dangSuaId === bl.ma_binh_luan ? (
                <div style={{ marginLeft: '41px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    rows={2}
                    className="input-crystal"
                    value={noiDungSua}
                    onChange={(e) => setNoiDungSua(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-crystal" style={{ padding: '6px 14px', fontSize: '0.84rem' }} onClick={() => xuLyLuuSua(bl.ma_binh_luan)}>
                      Lưu
                    </button>
                    <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: '0.84rem' }} onClick={() => setDangSuaId(null)}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <p className="comment-body-text">{bl.noi_dung}</p>
              )}

              {bl.danh_sach_phan_hoi?.length > 0 && (
                <div className="comment-reply-thread">
                  {bl.danh_sach_phan_hoi.map((ph) => {
                    const coQuyenXoaPh = nguoiDung?.vai_tro === 'admin' || nguoiDung?.ma_nguoi_dung === ph.ma_nguoi_dung;
                    const { mention, body } = tachMention(ph.noi_dung);

                    return (
                      <div key={ph.ma_binh_luan} className="comment-reply-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {ph.ho_ten}{' '}
                            <span className="comment-time-tag">{new Date(ph.ngay_tao).toLocaleString('vi-VN')}</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {nguoiDung && (
                              <button
                                type="button"
                                className="reply-sub-btn"
                                onClick={() => moKhungPhanHoi(bl.ma_binh_luan, ph.ma_nguoi_dung, ph.ho_ten, true)}
                              >
                                <MessageSquare size={12} /> Phản hồi
                              </button>
                            )}
                            {coQuyenXoaPh && (
                              <button
                                type="button"
                                onClick={() => xuLyXoa(ph.ma_binh_luan)}
                                style={{ background: 'transparent', color: 'var(--danger-color)', padding: '2px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
                          {mention && <span className="mention-tag">{mention}</span>}
                          {body}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {dangPhanHoiId === bl.ma_binh_luan && (
                <form
                  onSubmit={(e) => xuLyGuiPhanHoi(e, bl.ma_binh_luan)}
                  style={{ marginLeft: '41px', marginTop: '8px', display: 'flex', gap: '8px' }}
                >
                  <input
                    type="text"
                    className="input-crystal"
                    placeholder={`Phản hồi ${tenNguoiNhan}...`}
                    value={noiDungPhanHoi}
                    onChange={(e) => setNoiDungPhanHoi(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit" className="btn-crystal" style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                    Gửi
                  </button>
                  <button type="button" className="btn-outline" style={{ padding: '8px 10px' }} onClick={() => setDangPhanHoiId(null)}>
                    <X size={14} />
                  </button>
                </form>
              )}
            </div>
          );
        })
      )}
    </section>
  );
};

export default KhuVucBinhLuanChuong;