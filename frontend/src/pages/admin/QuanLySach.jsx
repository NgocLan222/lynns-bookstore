import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Edit,
  BookOpen,
  Headphones,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  X,
  FolderOpen,
  List,
  Check,
} from 'lucide-react';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import QuanLyChuongModal from '../../components/admin/QuanLyChuongModal';
import './QuanLySach.css';

const TAB_KHU_VUC = [
  { key: 'TAT_CA', ten: 'Tất cả tác phẩm' },
  { key: 'THEO_CHUONG', ten: 'Sách giải trí' },
  { key: 'MIEN_PHI', ten: 'Văn học & Học thuật' },
  { key: 'TRON_QUYEN', ten: 'Sách trọn quyển' },
  { key: 'SACH_NOI', ten: 'Sách nghe' },
];

const FORM_SACH_MAC_DINH = {
  ma_sach: null,
  tieu_de: '',
  mo_ta: '',
  ma_tac_gia: '',
  danh_sach_ma_the_loai: [],
  loai_sach: 'SACH_DOC',
  hinh_thuc_ban: 'MIEN_PHI',
  gia_tron_quyen_xu: 0,
  kieu_doc_mac_dinh: 'CUON_DOC',
  trang_thai: 'HIEN_THI',
};

const SO_DONG_MOI_TRANG = 8;

const QuanLySach = () => {
  const [dsSach, setDsSach] = useState([]);
  const [dsTacGia, setDsTacGia] = useState([]);
  const [dsTheLoai, setDsTheLoai] = useState([]);
  const [dangTai, setDangTai] = useState(true);

  const [tabDangChon, setTabDangChon] = useState('TAT_CA');
  const [theLoaiLoc, setTheLoaiLoc] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  const [cheDoXem, setCheDoXem] = useState('NHOM');
  const [trangHienTai, setTrangHienTai] = useState(1);

  const [moFormSach, setMoFormSach] = useState(false);
  const [formSach, setFormSach] = useState(FORM_SACH_MAC_DINH);
  const [fileAnhBia, setFileAnhBia] = useState(null);
  const [dangLuuSach, setDangLuuSach] = useState(false);

  const [tacGiaMoi, setTacGiaMoi] = useState('');
  const [theLoaiMoi, setTheLoaiMoi] = useState('');

  const [sachQuanLyChuong, setSachQuanLyChuong] = useState(null);
  const [sachNhapEpubId, setSachNhapEpubId] = useState(null);
  const epubInputRef = useRef(null);

  const taiDuLieu = async () => {
    setDangTai(true);
    try {
      const [sachRes, tgRes, tlRes] = await Promise.all([
        axiosClient.get('/sach', { params: { bao_gom_an: 'true', gioi_han: 200 } }),
        axiosClient.get('/danh-muc/tac-gia'),
        axiosClient.get('/danh-muc/the-loai'),
      ]);
      setDsSach(sachRes.du_lieu?.danh_sach || []);
      setDsTacGia(tgRes.du_lieu || []);
      setDsTheLoai(tlRes.du_lieu || []);
    } catch {
      setDsSach([]);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDuLieu();
  }, []);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tabDangChon, theLoaiLoc, tuKhoa, cheDoXem]);

  const demTheoTab = (key) => {
    if (key === 'TAT_CA') return dsSach.length;
    if (key === 'SACH_NOI') return dsSach.filter((s) => s.loai_sach === 'SACH_NOI').length;
    return dsSach.filter((s) => s.hinh_thuc_ban === key).length;
  };

  const dsSachDaLoc = useMemo(() => {
    return dsSach.filter((s) => {
      if (tabDangChon === 'SACH_NOI' && s.loai_sach !== 'SACH_NOI') return false;
      if (['THEO_CHUONG', 'MIEN_PHI', 'TRON_QUYEN'].includes(tabDangChon) && s.hinh_thuc_ban !== tabDangChon) {
        return false;
      }

      if (theLoaiLoc) {
        const dsIdTl = (s.danh_sach_the_loai || []).map((t) => String(t.ma_the_loai));
        if (!dsIdTl.includes(String(theLoaiLoc)) && String(s.ma_the_loai) !== String(theLoaiLoc)) {
          return false;
        }
      }

      if (tuKhoa.trim()) {
        const kw = tuKhoa.toLowerCase().trim();
        const khopTen = s.tieu_de?.toLowerCase().includes(kw);
        const khopTg = s.ten_tac_gia?.toLowerCase().includes(kw);
        if (!khopTen && !khopTg) return false;
      }

      return true;
    });
  }, [dsSach, tabDangChon, theLoaiLoc, tuKhoa]);

  const nhomTheoTheLoai = useMemo(() => {
    const map = new Map();
    dsSachDaLoc.forEach((sach) => {
      const dsTl =
        sach.danh_sach_the_loai?.length > 0
          ? sach.danh_sach_the_loai
          : [{ ma_the_loai: sach.ma_the_loai || 0, ten_the_loai: sach.ten_the_loai || 'Chưa phân loại' }];

      const tlChinh = dsTl[0];
      const key = String(tlChinh.ma_the_loai);
      if (!map.has(key)) {
        map.set(key, {
          ma_the_loai: tlChinh.ma_the_loai,
          ten_the_loai: tlChinh.ten_the_loai,
          danh_sach: [],
        });
      }
      map.get(key).danh_sach.push(sach);
    });
    return Array.from(map.values());
  }, [dsSachDaLoc]);

  const moModalTaoSach = (maTheLoaiMacDinh = null) => {
    const tlBanDau = maTheLoaiMacDinh || dsTheLoai[0]?.ma_the_loai;
    setFormSach({
      ...FORM_SACH_MAC_DINH,
      ma_tac_gia: dsTacGia[0]?.ma_tac_gia || '',
      danh_sach_ma_the_loai: tlBanDau ? [Number(tlBanDau)] : [],
      loai_sach: tabDangChon === 'SACH_NOI' ? 'SACH_NOI' : 'SACH_DOC',
      hinh_thuc_ban: ['THEO_CHUONG', 'MIEN_PHI', 'TRON_QUYEN'].includes(tabDangChon) ? tabDangChon : 'MIEN_PHI',
    });
    setFileAnhBia(null);
    setMoFormSach(true);
  };

  const moModalSuaSach = (sach) => {
    const dsId =
      sach.danh_sach_the_loai?.length > 0
        ? sach.danh_sach_the_loai.map((t) => Number(t.ma_the_loai))
        : sach.ma_the_loai
        ? [Number(sach.ma_the_loai)]
        : [];

    setFormSach({
      ma_sach: sach.ma_sach,
      tieu_de: sach.tieu_de,
      mo_ta: sach.mo_ta || '',
      ma_tac_gia: sach.ma_tac_gia,
      danh_sach_ma_the_loai: dsId,
      loai_sach: sach.loai_sach || 'SACH_DOC',
      hinh_thuc_ban: sach.hinh_thuc_ban,
      gia_tron_quyen_xu: sach.gia_tron_quyen_xu || 0,
      kieu_doc_mac_dinh: sach.kieu_doc_mac_dinh || 'CUON_DOC',
      trang_thai: sach.trang_thai || 'HIEN_THI',
    });
    setFileAnhBia(null);
    setMoFormSach(true);
  };

  const chonBoTheLoai = (maTheLoai) => {
    const idNum = Number(maTheLoai);
    setFormSach((prev) => {
      const tonTai = prev.danh_sach_ma_the_loai.includes(idNum);
      return {
        ...prev,
        danh_sach_ma_the_loai: tonTai
          ? prev.danh_sach_ma_the_loai.filter((id) => id !== idNum)
          : [...prev.danh_sach_ma_the_loai, idNum],
      };
    });
  };

  const themNhanhTacGia = async () => {
    if (!tacGiaMoi.trim()) return;
    try {
      const res = await axiosClient.post('/danh-muc/tac-gia', { ten_tac_gia: tacGiaMoi.trim() });
      const moi = res.du_lieu;
      setDsTacGia((prev) => [...prev, moi]);
      setFormSach((prev) => ({ ...prev, ma_tac_gia: moi.ma_tac_gia }));
      setTacGiaMoi('');
    } catch (error) {
      alert(error.thong_bao || 'Không thể thêm tác giả.');
    }
  };

  const themNhanhTheLoai = async () => {
    if (!theLoaiMoi.trim()) return;
    try {
      const res = await axiosClient.post('/danh-muc/the-loai', { ten_the_loai: theLoaiMoi.trim() });
      const moi = res.du_lieu;
      setDsTheLoai((prev) => [...prev, moi]);
      setFormSach((prev) => ({
        ...prev,
        danh_sach_ma_the_loai: [...prev.danh_sach_ma_the_loai, Number(moi.ma_the_loai)],
      }));
      setTheLoaiMoi('');
    } catch (error) {
      alert(error.thong_bao || 'Không thể thêm thể loại.');
    }
  };

  const xuLyLuuSach = async (e) => {
    e.preventDefault();
    if (formSach.danh_sach_ma_the_loai.length === 0) {
      alert('Vui lòng chọn ít nhất một thể loại cho tác phẩm.');
      return;
    }

    setDangLuuSach(true);
    try {
      const formData = new FormData();
      formData.append('tieu_de', formSach.tieu_de);
      formData.append('mo_ta', formSach.mo_ta);
      formData.append('ma_tac_gia', formSach.ma_tac_gia);
      formData.append('danh_sach_ma_the_loai', JSON.stringify(formSach.danh_sach_ma_the_loai));
      formData.append('loai_sach', formSach.loai_sach);
      formData.append('hinh_thuc_ban', formSach.hinh_thuc_ban);
      formData.append('gia_tron_quyen_xu', formSach.hinh_thuc_ban === 'TRON_QUYEN' ? formSach.gia_tron_quyen_xu : 0);
      formData.append('kieu_doc_mac_dinh', formSach.kieu_doc_mac_dinh);
      formData.append('trang_thai', formSach.trang_thai);
      if (fileAnhBia) {
        formData.append('anh_bia', fileAnhBia);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (formSach.ma_sach) {
        await axiosClient.put(`/sach/${formSach.ma_sach}`, formData, config);
      } else {
        await axiosClient.post('/sach', formData, config);
      }

      setMoFormSach(false);
      await taiDuLieu();
      alert(formSach.ma_sach ? 'Cập nhật tác phẩm thành công!' : 'Tạo tác phẩm mới thành công!');
    } catch (error) {
      alert(error.thong_bao || 'Không thể lưu tác phẩm.');
    } finally {
      setDangLuuSach(false);
    }
  };

  const doiHienThiSach = async (sach) => {
    try {
      const trangThaiMoi = sach.trang_thai === 'HIEN_THI' ? 'NGUNG_PHAT_HANH' : 'HIEN_THI';
      const formData = new FormData();
      formData.append('trang_thai', trangThaiMoi);

      await axiosClient.put(`/sach/${sach.ma_sach}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      taiDuLieu();
    } catch (error) {
      alert(error.thong_bao || 'Không thể đổi trạng thái hiển thị.');
    }
  };

  const xuLyXoaSach = async (sach) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn tác phẩm "${sach.tieu_de}" và toàn bộ chương/tập bên trong?`)) return;
    try {
      const res = await axiosClient.delete(`/sach/${sach.ma_sach}`);
      alert(res.thong_bao || 'Đã xóa tác phẩm.');
      taiDuLieu();
    } catch (error) {
      alert(error.thong_bao || 'Không thể xóa tác phẩm.');
    }
  };

  const kichHoatChonEpub = (maSach) => {
    setSachNhapEpubId(maSach);
    epubInputRef.current?.click();
  };

  const xuLyTaiLenEpub = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !sachNhapEpubId) return;

    try {
      const formData = new FormData();
      formData.append('file_epub', file);
      const res = await axiosClient.post(`/sach/${sachNhapEpubId}/nhap-epub`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(res.thong_bao);
      taiDuLieu();
    } catch (error) {
      alert(error.thong_bao || 'Lỗi khi nhập tệp EPUB.');
    } finally {
      setSachNhapEpubId(null);
    }
  };

  const renderBangSach = (danhSach, coPhanTrang = false) => {
    const tongTrang = coPhanTrang ? Math.max(1, Math.ceil(danhSach.length / SO_DONG_MOI_TRANG)) : 1;
    const trangHopLe = coPhanTrang ? Math.min(trangHienTai, tongTrang) : 1;
    const batDau = coPhanTrang ? (trangHopLe - 1) * SO_DONG_MOI_TRANG : 0;
    const danhSachHienThi = coPhanTrang ? danhSach.slice(batDau, batDau + SO_DONG_MOI_TRANG) : danhSach;

    return (
      <div className="admin-table-wrap">
        <table className="admin-table books-admin-table">
          <thead>
            <tr>
              <th>Bìa</th>
              <th>Tên sách & Tác giả</th>
              <th>Thể loại</th>
              <th>Hình thức</th>
              <th>Nội dung</th>
              <th>Hiển thị</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {danhSachHienThi.map((s) => {
              const laAudio = s.loai_sach === 'SACH_NOI';
              const dsTl =
                s.danh_sach_the_loai?.length > 0
                  ? s.danh_sach_the_loai
                  : [{ ma_the_loai: s.ma_the_loai, ten_the_loai: s.ten_the_loai }];

              return (
                <tr key={s.ma_sach}>
                  <td>
                    {s.anh_bia ? (
                      <img src={`${SERVER_URL}${s.anh_bia}`} alt={s.tieu_de} className="book-admin-cover" />
                    ) : (
                      <div className="book-admin-cover" />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.tieu_de}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>{s.ten_tac_gia}</div>
                  </td>
                  <td>
                    <div className="book-genre-tags">
                      {dsTl.map((tl) => (
                        <span key={tl.ma_the_loai} className="badge badge-full">
                          {tl.ten_the_loai}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {s.hinh_thuc_ban === 'MIEN_PHI' && <span className="badge badge-free">Miễn phí</span>}
                    {s.hinh_thuc_ban === 'THEO_CHUONG' && (
                      <span className="badge badge-xu">{laAudio ? 'Theo tập' : 'Theo chương'}</span>
                    )}
                    {s.hinh_thuc_ban === 'TRON_QUYEN' && <span className="badge badge-full">Trọn quyển</span>}
                  </td>
                  <td>
                    {s.tong_so_chuong || 0} {laAudio ? 'tập' : 'chương'}
                  </td>
                  <td>
                    <button type="button" className="mini-action-btn" onClick={() => doiHienThiSach(s)}>
                      {s.trang_thai === 'HIEN_THI' ? (
                        <>
                          <Eye size={14} color="#059669" /> Đang hiện
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} color="#dc2626" /> Đang ẩn
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button type="button" className="mini-action-btn" onClick={() => moModalSuaSach(s)}>
                        <Edit size={14} /> Sửa
                      </button>
                      <button type="button" className="mini-action-btn" onClick={() => setSachQuanLyChuong(s)}>
                        {laAudio ? (
                          <>
                            <Headphones size={14} /> Tập nghe
                          </>
                        ) : (
                          <>
                            <BookOpen size={14} /> Chương
                          </>
                        )}
                      </button>
                      {!laAudio && (
                        <button type="button" className="mini-action-btn" onClick={() => kichHoatChonEpub(s.ma_sach)}>
                          <Upload size={14} /> Nhập EPUB
                        </button>
                      )}
                      <button
                        type="button"
                        className="mini-action-btn"
                        style={{ color: 'var(--danger-color)', borderColor: '#fecaca', background: '#fff5f5' }}
                        onClick={() => xuLyXoaSach(s)}
                        title="Xóa tác phẩm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {coPhanTrang && tongTrang > 1 && (
          <div className="admin-pagination-bar">
            <span>
              Hiển thị {batDau + 1}–{Math.min(batDau + danhSachHienThi.length, danhSach.length)} / {danhSach.length} tác phẩm
            </span>
            <div className="admin-pagination-btns">
              <button
                type="button"
                className="admin-page-btn"
                disabled={trangHopLe <= 1}
                onClick={() => setTrangHienTai((p) => Math.max(1, p - 1))}
              >
                Trước
              </button>
              {Array.from({ length: tongTrang }, (_, idx) => idx + 1).map((so) => (
                <button
                  key={so}
                  type="button"
                  className={`admin-page-btn ${so === trangHopLe ? 'active' : ''}`}
                  onClick={() => setTrangHienTai(so)}
                >
                  {so}
                </button>
              ))}
              <button
                type="button"
                className="admin-page-btn"
                disabled={trangHopLe >= tongTrang}
                onClick={() => setTrangHienTai((p) => Math.min(tongTrang, p + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <input type="file" accept=".epub" ref={epubInputRef} style={{ display: 'none' }} onChange={xuLyTaiLenEpub} />

      <div className="admin-page-header">
        <h1>Quản lý Sách & Nội dung ({dsSach.length})</h1>
        <button type="button" className="btn-crystal" onClick={() => moModalTaoSach()}>
          <Plus size={18} /> Thêm tác phẩm mới
        </button>
      </div>

      <div className="category-tabs-bar">
        {TAB_KHU_VUC.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`category-tab-btn ${tabDangChon === tab.key ? 'active' : ''}`}
            onClick={() => setTabDangChon(tab.key)}
          >
            <span>{tab.ten}</span>
            <span className="tab-count">{demTheoTab(tab.key)}</span>
          </button>
        ))}
      </div>

      <div className="sub-filter-card">
        <div className="filter-controls-row">
          <input
            type="text"
            className="input-crystal admin-search-input"
            placeholder="Tìm tên tác phẩm, tác giả..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
          />

          <div className="view-toggle-group">
            <button
              type="button"
              className={`mini-action-btn ${cheDoXem === 'NHOM' ? 'active' : ''}`}
              style={cheDoXem === 'NHOM' ? { background: '#e0f2fe', color: 'var(--primary-blue)', borderColor: 'var(--border-crystal)' } : undefined}
              onClick={() => setCheDoXem('NHOM')}
            >
              <FolderOpen size={14} /> Nhóm theo thể loại
            </button>
            <button
              type="button"
              className={`mini-action-btn ${cheDoXem === 'DANH_SACH' ? 'active' : ''}`}
              style={cheDoXem === 'DANH_SACH' ? { background: '#e0f2fe', color: 'var(--primary-blue)', borderColor: 'var(--border-crystal)' } : undefined}
              onClick={() => setCheDoXem('DANH_SACH')}
            >
              <List size={14} /> Danh sách tổng
            </button>
          </div>
        </div>

        <div className="genre-pill-list">
          <button
            type="button"
            className={`genre-pill ${theLoaiLoc === '' ? 'active' : ''}`}
            onClick={() => setTheLoaiLoc('')}
          >
            Tất cả thể loại
          </button>
          {dsTheLoai.map((tl) => (
            <button
              key={tl.ma_the_loai}
              type="button"
              className={`genre-pill ${String(theLoaiLoc) === String(tl.ma_the_loai) ? 'active' : ''}`}
              onClick={() => setTheLoaiLoc(tl.ma_the_loai)}
            >
              {tl.ten_the_loai}
            </button>
          ))}
        </div>
      </div>

      {dangTai ? (
        <div className="admin-card">Đang tải danh sách tác phẩm...</div>
      ) : dsSachDaLoc.length === 0 ? (
        <div className="admin-card">Không tìm thấy tác phẩm phù hợp.</div>
      ) : cheDoXem === 'NHOM' ? (
        nhomTheoTheLoai.map((nhom) => (
          <section key={nhom.ma_the_loai} className="admin-card category-group-section">
            <div className="category-group-header">
              <div className="category-group-title">
                <FolderOpen size={19} color="var(--primary-blue)" />
                <span>{nhom.ten_the_loai}</span>
                <span className="badge badge-full">{nhom.danh_sach.length} tác phẩm</span>
              </div>

              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.84rem' }}
                onClick={() => moModalTaoSach(nhom.ma_the_loai)}
              >
                <Plus size={14} /> Thêm vào {nhom.ten_the_loai}
              </button>
            </div>

            {renderBangSach(nhom.danh_sach, false)}
          </section>
        ))
      ) : (
        <div className="admin-card">{renderBangSach(dsSachDaLoc, true)}</div>
      )}

      {moFormSach && (
        <div className="admin-modal-overlay">
          <div className="book-form-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {formSach.ma_sach ? 'Cập nhật tác phẩm' : 'Thêm tác phẩm mới'}
              </h2>
              <button type="button" onClick={() => setMoFormSach(false)} style={{ background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={xuLyLuuSach} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Tên tác phẩm</label>
                <input
                  type="text"
                  className="input-crystal"
                  value={formSach.tieu_de}
                  onChange={(e) => setFormSach({ ...formSach, tieu_de: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Tác giả</label>
                <select
                  className="input-crystal"
                  value={formSach.ma_tac_gia}
                  onChange={(e) => setFormSach({ ...formSach, ma_tac_gia: e.target.value })}
                  required
                >
                  <option value="">-- Chọn tác giả --</option>
                  {dsTacGia.map((tg) => (
                    <option key={tg.ma_tac_gia} value={tg.ma_tac_gia}>{tg.ten_tac_gia}</option>
                  ))}
                </select>
                <div className="quick-add-bar">
                  <input
                    type="text"
                    className="input-crystal"
                    placeholder="Hoặc nhập tên tác giả mới..."
                    value={tacGiaMoi}
                    onChange={(e) => setTacGiaMoi(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                  <button type="button" className="btn-outline" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={themNhanhTacGia}>
                    Thêm
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                  Thể loại (có thể chọn nhiều thẻ)
                </label>
                <div className="multi-genre-box">
                  {dsTheLoai.map((tl) => {
                    const daChon = formSach.danh_sach_ma_the_loai.includes(Number(tl.ma_the_loai));
                    return (
                      <button
                        key={tl.ma_the_loai}
                        type="button"
                        className={`genre-select-chip ${daChon ? 'selected' : ''}`}
                        onClick={() => chonBoTheLoai(tl.ma_the_loai)}
                      >
                        {daChon && <Check size={13} />}
                        <span>{tl.ten_the_loai}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="quick-add-bar">
                  <input
                    type="text"
                    className="input-crystal"
                    placeholder="Hoặc thêm thể loại mới..."
                    value={theLoaiMoi}
                    onChange={(e) => setTheLoaiMoi(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  />
                  <button type="button" className="btn-outline" style={{ padding: '6px 10px', fontSize: '0.82rem' }} onClick={themNhanhTheLoai}>
                    Thêm
                  </button>
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Định dạng tác phẩm</label>
                  <select
                    className="input-crystal"
                    value={formSach.loai_sach}
                    onChange={(e) => setFormSach({ ...formSach, loai_sach: e.target.value })}
                  >
                    <option value="SACH_DOC">Sách đọc (Văn bản)</option>
                    <option value="SACH_NOI">Sách nghe (Chỉ âm thanh Audio)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Hình thức kinh doanh</label>
                  <select
                    className="input-crystal"
                    value={formSach.hinh_thuc_ban}
                    onChange={(e) => setFormSach({ ...formSach, hinh_thuc_ban: e.target.value })}
                  >
                    <option value="MIEN_PHI">Miễn phí toàn bộ</option>
                    <option value="THEO_CHUONG">Mở khóa theo chương / tập (Xu)</option>
                    <option value="TRON_QUYEN">Mua trọn quyển (Xu)</option>
                  </select>
                </div>
              </div>

              {formSach.hinh_thuc_ban === 'TRON_QUYEN' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Giá trọn quyển (Xu)</label>
                  <input
                    type="number"
                    min={1}
                    className="input-crystal"
                    value={formSach.gia_tron_quyen_xu}
                    onChange={(e) => setFormSach({ ...formSach, gia_tron_quyen_xu: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>
              ) : formSach.loai_sach === 'SACH_DOC' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Kiểu đọc mặc định</label>
                  <select
                    className="input-crystal"
                    value={formSach.kieu_doc_mac_dinh}
                    onChange={(e) => setFormSach({ ...formSach, kieu_doc_mac_dinh: e.target.value })}
                  >
                    <option value="CUON_DOC">Cuộn dọc</option>
                    <option value="LAT_TRANG">Lật từng trang</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  className="input-crystal"
                  value={formSach.mo_ta}
                  onChange={(e) => setFormSach({ ...formSach, mo_ta: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>Ảnh bìa tác phẩm</label>
                <input type="file" accept="image/*" onChange={(e) => setFileAnhBia(e.target.files[0] || null)} />
              </div>

              <button type="submit" className="btn-crystal" disabled={dangLuuSach}>
                {dangLuuSach ? 'Đang lưu...' : formSach.ma_sach ? 'Cập nhật tác phẩm' : 'Tạo tác phẩm'}
              </button>
            </form>
          </div>
        </div>
      )}

      {sachQuanLyChuong && (
        <QuanLyChuongModal
          sach={sachQuanLyChuong}
          onDong={() => setSachQuanLyChuong(null)}
          onCapNhat={taiDuLieu}
        />
      )}
    </div>
  );
};

export default QuanLySach;