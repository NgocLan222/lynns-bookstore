import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Lock,
  Coins,
  Headphones,
  BookOpen,
  ScrollText,
} from 'lucide-react';
import axiosClient, { SERVER_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './TrangDocSach.css';

const TOC_DO_PHAT = [0.75, 1, 1.25, 1.5, 2];

const BANG_NEN_TAP = [
  'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 52%, #fce7f3 100%)',
  'linear-gradient(135deg, #fef3c7 0%, #ffedd5 50%, #e0f2fe 100%)',
  'linear-gradient(135deg, #dcfce7 0%, #e0f7fa 50%, #ede9fe 100%)',
  'linear-gradient(135deg, #fae8ff 0%, #e0e7ff 50%, #cffafe 100%)',
  'linear-gradient(135deg, #ffe4e6 0%, #fef9c3 50%, #e0f2fe 100%)',
];

const tachKhoiVanBan = (html) => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('p, h1, h2, h3, h4, blockquote, li'));
  if (nodes.length > 0) {
    return nodes.map((n) => n.innerHTML).filter((str) => str.trim().length > 0);
  }
  return html.split(/\n+/).map((s) => s.trim()).filter(Boolean);
};

// Tách đoạn văn thành từng câu để highlight chạy nối tiếp theo giọng đọc
const tachCauTrongDoan = (htmlDoan) => {
  if (!htmlDoan) return [];
  const textSach = htmlDoan.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!textSach) return [];
  const cauList = textSach.match(/[^.!?…]+[.!?…]+(?:["'”’»\)\]]+)?|[^.!?…]+$/g);
  return (cauList || [textSach]).map((c) => c.trim()).filter(Boolean);
};

const TrangDocSach = () => {
  const { id } = useParams();
  const { nguoiDung, capNhatSoDuXu } = useAuth();
  const navigate = useNavigate();

  const [duLieu, setDuLieu] = useState(null);
  const [loiQuyen, setLoiQuyen] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangThanhToan, setDangThanhToan] = useState(false);

  const [nenDoc, setNenDoc] = useState('sepia');
  const [coChu, setCoChu] = useState(19);
  const [kieuDoc, setKieuDoc] = useState('CUON_DOC');
  const [trangHienTai, setTrangHienTai] = useState(0);
  const [cauDangPhat, setCauDangPhat] = useState(-1);
  const [tocDo, setTocDo] = useState(1);
  const [thoiLuongAudio, setThoiLuongAudio] = useState(0);

  const audioRef = useRef(null);

  const taiChuong = async () => {
    setDangTai(true);
    setLoiQuyen(null);
    setTrangHienTai(0);
    setCauDangPhat(-1);
    setThoiLuongAudio(0);
    try {
      const res = await axiosClient.get(`/chuong/${id}`);
      setDuLieu(res.du_lieu);
      if (res.du_lieu?.chuong?.kieu_doc_mac_dinh) {
        setKieuDoc(res.du_lieu.chuong.kieu_doc_mac_dinh);
      }
    } catch (error) {
      setDuLieu(null);
      setLoiQuyen(error);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiChuong();
    window.scrollTo(0, 0);
  }, [id, nguoiDung?.ma_nguoi_dung]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = tocDo;
    }
  }, [tocDo, duLieu?.chuong?.ma_chuong]);

  const cacKhoiVanBan = useMemo(() => tachKhoiVanBan(duLieu?.chuong?.noi_dung), [duLieu?.chuong?.noi_dung]);

  const danhSachCau = useMemo(() => {
    const ds = [];
    let sttCau = 0;
    cacKhoiVanBan.forEach((htmlDoan, indexDoan) => {
      const cacCau = tachCauTrongDoan(htmlDoan);
      cacCau.forEach((noiDungCau) => {
        ds.push({
          id: sttCau,
          doanIndex: indexDoan,
          text: noiDungCau,
          doDai: Math.max(1, noiDungCau.length),
        });
        sttCau += 1;
      });
    });
    return ds;
  }, [cacKhoiVanBan]);

  // Tính khoảng thời gian [bat_dau, ket_thuc] cho từng câu dựa trên thời lượng audio
  const mocThoiGianCau = useMemo(() => {
    if (danhSachCau.length === 0) return [];

    try {
      const raw = duLieu?.chuong?.moc_thoi_gian_json;
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const chuanHoa = parsed
          .map((m, i) => ({
            cauId: Number(m.cau ?? m.doan ?? i),
            bat_dau: Number(m.bat_dau ?? m.thoi_gian ?? 0),
            ket_thuc: Number(m.ket_thuc ?? thoiLuongAudio ?? 99999),
          }))
          .filter((m) => Number.isFinite(m.bat_dau))
          .sort((a, b) => a.bat_dau - b.bat_dau);

        if (chuanHoa.length > 0) return chuanHoa;
      }
    } catch {
      // Bỏ qua nếu JSON mốc không hợp lệ
    }

    if (!thoiLuongAudio || thoiLuongAudio <= 0) return [];
    const tongKyTu = danhSachCau.reduce((sum, c) => sum + c.doDai, 0);
    let batDauTichLuy = 0;

    return danhSachCau.map((cau, idx) => {
      const thoiGianCau = (cau.doDai / tongKyTu) * thoiLuongAudio;
      const batDau = batDauTichLuy;
      const ketThuc = idx === danhSachCau.length - 1 ? thoiLuongAudio : batDauTichLuy + thoiGianCau;
      batDauTichLuy = ketThuc;
      return {
        cauId: cau.id,
        bat_dau: batDau,
        ket_thuc: ketThuc,
      };
    });
  }, [danhSachCau, duLieu?.chuong?.moc_thoi_gian_json, thoiLuongAudio]);

  const danhSachTrang = useMemo(() => {
    const pages = [];
    let trangTam = [];
    let kyTuTam = 0;

    danhSachCau.forEach((cau) => {
      if (kyTuTam + cau.doDai > 1500 && trangTam.length > 0) {
        pages.push(trangTam);
        trangTam = [];
        kyTuTam = 0;
      }
      trangTam.push(cau);
      kyTuTam += cau.doDai;
    });
    if (trangTam.length > 0) pages.push(trangTam);
    return pages.length > 0 ? pages : [[]];
  }, [danhSachCau]);

  const nhomTheoDoan = (dsCau) => {
    const map = new Map();
    dsCau.forEach((cau) => {
      if (!map.has(cau.doanIndex)) map.set(cau.doanIndex, []);
      map.get(cau.doanIndex).push(cau);
    });
    return Array.from(map.entries()).map(([doanIndex, cauList]) => ({ doanIndex, cauList }));
  };

  useEffect(() => {
    if (!nguoiDung || !duLieu?.chuong) return;
    const laSachNghe = duLieu.chuong.loai_sach === 'SACH_NOI';
    const tiLe = !laSachNghe && kieuDoc === 'LAT_TRANG'
      ? Math.round(((trangHienTai + 1) / danhSachTrang.length) * 100)
      : 100;

    axiosClient.post('/tu-sach/tien-do', {
      ma_sach: duLieu.chuong.ma_sach,
      ma_chuong_dang_doc: duLieu.chuong.ma_chuong,
      ti_le_doc: tiLe,
    }).catch(() => {});
  }, [duLieu?.chuong?.ma_chuong, trangHienTai, kieuDoc]);

  const tuaGiay = (deltaGiay) => {
    const player = audioRef.current;
    if (!player) return;
    const thoiLuong = Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.min(thoiLuong, Math.max(0, (player.currentTime || 0) + deltaGiay));
  };

  const xuLyDongBoAudio = () => {
    if (!audioRef.current || mocThoiGianCau.length === 0) return;
    const giay = audioRef.current.currentTime;

    let mocHienTai = null;
    for (let i = 0; i < mocThoiGianCau.length; i += 1) {
      if (giay >= mocThoiGianCau[i].bat_dau) {
        mocHienTai = mocThoiGianCau[i];
      } else {
        break;
      }
    }

    const mocCuoi = mocThoiGianCau[mocThoiGianCau.length - 1];
    const cauMoi = mocHienTai && giay <= (mocCuoi?.ket_thuc ?? Infinity) + 0.25
      ? mocHienTai.cauId
      : -1;

    if (cauMoi !== cauDangPhat) {
      setCauDangPhat(cauMoi);
      if (cauMoi !== -1 && kieuDoc === 'LAT_TRANG') {
        const trangChuaCau = danhSachTrang.findIndex((p) => p.some((item) => item.id === cauMoi));
        if (trangChuaCau !== -1) setTrangHienTai(trangChuaCau);
      }
    }
  };

  const tuaAudioToiCau = (cauId) => {
    if (!audioRef.current || mocThoiGianCau.length === 0) return;
    const moc = mocThoiGianCau.find((m) => m.cauId === cauId);
    if (moc) {
      audioRef.current.currentTime = moc.bat_dau;
      setCauDangPhat(cauId);
      audioRef.current.play();
    }
  };

  const moKhoaNgay = async () => {
    setDangThanhToan(true);
    try {
      const res = await axiosClient.post('/vi-xu/mo-khoa-le', { ma_chuong: parseInt(id, 10) });
      capNhatSoDuXu(res.du_lieu.so_du_xu);
      await taiChuong();
    } catch (error) {
      alert(error.thong_bao || 'Không thể mở khóa nội dung.');
    } finally {
      setDangThanhToan(false);
    }
  };

  const muaTronQuyenNgay = async (maSach) => {
    if (!nguoiDung) return navigate('/dang-nhap');
    setDangThanhToan(true);
    try {
      const res = await axiosClient.post('/vi-xu/mua-tron-quyen', { ma_sach: maSach });
      capNhatSoDuXu(res.du_lieu.so_du_xu);
      await taiChuong();
    } catch (error) {
      alert(error.thong_bao || 'Không thể mua trọn quyển.');
    } finally {
      setDangThanhToan(false);
    }
  };

  const chuong = duLieu?.chuong;
  const maSachQuayLai = chuong?.ma_sach || loiQuyen?.ma_sach;
  const laSachNghe = chuong?.loai_sach === 'SACH_NOI';
  const donViHoa = laSachNghe ? 'Tập' : 'Chương';
  const donViThuong = laSachNghe ? 'tập' : 'chương';

  const styleNenPhongNghe = laSachNghe && nenDoc !== 'dark'
    ? {
        background: BANG_NEN_TAP[((chuong?.so_thu_tu || 1) - 1) % BANG_NEN_TAP.length],
        color: '#0f172a',
      }
    : undefined;

  const cacDoanHienThi = nhomTheoDoan(
    kieuDoc === 'CUON_DOC' ? danhSachCau : (danhSachTrang[trangHienTai] || [])
  );

  return (
    <div className={`reader-room reader-theme-${nenDoc}`} style={styleNenPhongNghe}>
      <div className="reader-topbar">
        <div className="reader-book-meta">
          <Link to={maSachQuayLai ? `/sach/${maSachQuayLai}` : '/'} className="control-pill">
            <ArrowLeft size={16} /> Mục lục
          </Link>
          {chuong && (
            <div>
              <div className="reader-book-title">{chuong.ten_sach}</div>
              <div className="reader-chapter-name">{donViHoa} {chuong.so_thu_tu}: {chuong.tieu_de}</div>
            </div>
          )}
        </div>

        <div className="reader-controls">
          {!laSachNghe && (
            <>
              <button
                type="button"
                className={`control-pill ${kieuDoc === 'CUON_DOC' ? 'active' : ''}`}
                onClick={() => setKieuDoc('CUON_DOC')}
              >
                <ScrollText size={14} /> Cuộn dọc
              </button>
              <button
                type="button"
                className={`control-pill ${kieuDoc === 'LAT_TRANG' ? 'active' : ''}`}
                onClick={() => { setKieuDoc('LAT_TRANG'); setTrangHienTai(0); }}
              >
                <BookOpen size={14} /> Lật trang
              </button>

              <button type="button" className="control-pill" onClick={() => setCoChu((c) => Math.max(15, c - 1))}>A-</button>
              <button type="button" className="control-pill" onClick={() => setCoChu((c) => Math.min(26, c + 1))}>A+</button>
            </>
          )}

          <button
            type="button"
            className={`theme-dot ${nenDoc === 'light' ? 'active' : ''}`}
            style={{ background: '#ffffff' }}
            onClick={() => setNenDoc('light')}
            title="Nền sáng"
          />
          <button
            type="button"
            className={`theme-dot ${nenDoc === 'sepia' ? 'active' : ''}`}
            style={{ background: '#f4ecd8' }}
            onClick={() => setNenDoc('sepia')}
            title="Nền giấy cũ"
          />
          <button
            type="button"
            className={`theme-dot ${nenDoc === 'dark' ? 'active' : ''}`}
            style={{ background: '#18181b' }}
            onClick={() => setNenDoc('dark')}
            title="Nền ban đêm"
          />
        </div>
      </div>

      <div className="reader-container">
        {dangTai ? (
          <p style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải nội dung...</p>
        ) : loiQuyen ? (
          <div className="lock-wall-card">
            <Lock size={38} color="var(--xu-color)" style={{ marginBottom: '12px' }} />
            <h2 style={{ marginBottom: '8px' }}>Nội dung được bảo vệ</h2>
            <p style={{ marginBottom: '20px', opacity: 0.85 }}>{loiQuyen.thong_bao}</p>

            {loiQuyen.ma_loi === 'CAN_DANG_NHAP' && (
              <Link to="/dang-nhap" className="btn-crystal">Đăng nhập để tiếp tục</Link>
            )}
            {loiQuyen.ma_loi === 'CAN_MO_KHOA_CHUONG' && (
              <button type="button" className="btn-crystal" disabled={dangThanhToan} onClick={moKhoaNgay}>
                <Coins size={17} /> Mở khóa ngay
              </button>
            )}
            {loiQuyen.ma_loi === 'CAN_MUA_TRON_QUYEN' && (
              <Link to={maSachQuayLai ? `/sach/${maSachQuayLai}` : '/'} className="btn-outline">
                Quay lại trang thông tin tác phẩm
              </Link>
            )}
          </div>
        ) : chuong && (
          <>
            <div className="chapter-top-nav">
              {duLieu.chuong_truoc ? (
                <Link to={`/doc/${duLieu.chuong_truoc}`} className="btn-outline">
                  <ChevronLeft size={16} /> {donViHoa} trước
                </Link>
              ) : <div />}

              {duLieu.chuong_sau ? (
                <Link to={`/doc/${duLieu.chuong_sau}`} className="btn-crystal">
                  {donViHoa} sau <ChevronRight size={16} />
                </Link>
              ) : <div />}
            </div>

            {laSachNghe ? (
              <div className="audiobook-studio-card">
                <div className="audiobook-cover-disc">
                  {chuong.anh_bia ? (
                    <img src={`${SERVER_URL}${chuong.anh_bia}`} alt={chuong.ten_sach} />
                  ) : (
                    <Headphones size={64} color="var(--primary-blue)" />
                  )}
                </div>

                <div>
                  <span className="badge badge-full" style={{ marginBottom: '8px' }}>
                    <Headphones size={13} /> Phòng nghe Sách nói
                  </span>
                  <h1 className="chapter-heading" style={{ marginBottom: '6px' }}>
                    {donViHoa} {chuong.so_thu_tu}: {chuong.tieu_de}
                  </h1>
                  <p style={{ opacity: 0.78, fontSize: '0.95rem' }}>{chuong.ten_sach}</p>
                </div>

                <div className="speed-pills-row">
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, opacity: 0.8 }}>Tốc độ nghe:</span>
                  {TOC_DO_PHAT.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`control-pill ${tocDo === rate ? 'active' : ''}`}
                      onClick={() => setTocDo(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {chuong.duong_dan_audio ? (
                  <>
                    <div className="seek-controls-row">
                      <button type="button" className="seek-btn" onClick={() => tuaGiay(-10)}>
                        <RotateCcw size={15} /> Tua lùi 10s
                      </button>
                      <button type="button" className="seek-btn" onClick={() => tuaGiay(10)}>
                        <RotateCw size={15} /> Tua tới 10s
                      </button>
                    </div>

                    <div className="audiobook-main-player">
                      <audio
                        ref={audioRef}
                        controls
                        src={`${SERVER_URL}${chuong.duong_dan_audio}`}
                      />
                    </div>
                  </>
                ) : (
                  <p style={{ opacity: 0.75 }}>Tập này hiện chưa có tệp âm thanh.</p>
                )}
              </div>
            ) : (
              <>
                <h1 className="chapter-heading">Chương {chuong.so_thu_tu}: {chuong.tieu_de}</h1>

                <div className="chapter-content" style={{ fontSize: `${coChu}px` }}>
                  {cacDoanHienThi.map(({ doanIndex, cauList }) => (
                    <p key={doanIndex}>
                      {cauList.map((cau, i) => (
                        <span
                          key={cau.id}
                          className={`sync-sentence ${cauDangPhat === cau.id ? 'sync-active' : ''} ${mocThoiGianCau.length > 0 ? 'sync-clickable' : ''}`}
                          onClick={() => tuaAudioToiCau(cau.id)}
                        >
                          {cau.text}
                          {i < cauList.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>

                {kieuDoc === 'LAT_TRANG' && danhSachTrang.length > 1 && (
                  <div className="paged-nav-bar">
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={trangHienTai === 0}
                      onClick={() => { setTrangHienTai((t) => t - 1); window.scrollTo(0, 0); }}
                    >
                      <ChevronLeft size={16} /> Trang trước
                    </button>
                    <span style={{ fontWeight: 600 }}>
                      Trang {trangHienTai + 1} / {danhSachTrang.length}
                    </span>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={trangHienTai >= danhSachTrang.length - 1}
                      onClick={() => { setTrangHienTai((t) => t + 1); window.scrollTo(0, 0); }}
                    >
                      Trang sau <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {duLieu.la_ban_doc_thu && (
              <div className="lock-wall-card">
                <h3 style={{ marginBottom: '8px' }}>
                  {laSachNghe
                    ? 'Bạn đang nghe thử Tập 1 miễn phí'
                    : 'Bạn đã đọc hết 3.000 từ đọc thử miễn phí'}
                </h3>
                <p style={{ marginBottom: '18px', opacity: 0.85 }}>
                  Mua trọn quyển để mở khóa toàn bộ các {donViThuong} của tác phẩm này vĩnh viễn.
                </p>
                <button
                  type="button"
                  className="btn-crystal"
                  disabled={dangThanhToan}
                  onClick={() => muaTronQuyenNgay(chuong.ma_sach)}
                >
                  <Coins size={17} /> Mua trọn quyển ({chuong.gia_tron_quyen_xu} Xu)
                </button>
              </div>
            )}

            <div className="chapter-bottom-nav">
              {duLieu.chuong_truoc ? (
                <Link to={`/doc/${duLieu.chuong_truoc}`} className="btn-outline">
                  <ChevronLeft size={16} /> {donViHoa} trước
                </Link>
              ) : <div />}

              <Link to={`/sach/${chuong.ma_sach}`} className="btn-outline">
                Danh sách {donViThuong}
              </Link>

              {duLieu.chuong_sau ? (
                <Link to={`/doc/${duLieu.chuong_sau}`} className="btn-crystal">
                  {donViHoa} sau <ChevronRight size={16} />
                </Link>
              ) : <div />}
            </div>
          </>
        )}
      </div>

      {!laSachNghe && chuong?.duong_dan_audio && (
        <div className="audio-dock">
          <Headphones size={20} color="#38bdf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sách nói</span>
          <button type="button" className="dock-seek-btn" onClick={() => tuaGiay(-10)} title="Tua lùi 10s">
            <RotateCcw size={13} /> -10s
          </button>
          <button type="button" className="dock-seek-btn" onClick={() => tuaGiay(10)} title="Tua tới 10s">
            <RotateCw size={13} /> +10s
          </button>
          <audio
            ref={audioRef}
            controls
            src={`${SERVER_URL}${chuong.duong_dan_audio}`}
            onLoadedMetadata={() => setThoiLuongAudio(audioRef.current?.duration || 0)}
            onTimeUpdate={xuLyDongBoAudio}
          />
        </div>
      )}
    </div>
  );
};

export default TrangDocSach;