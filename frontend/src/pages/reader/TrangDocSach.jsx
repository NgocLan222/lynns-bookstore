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

const tachKhoiVanBan = (html) => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('p, h1, h2, h3, h4, blockquote, li'));
  if (nodes.length > 0) {
    return nodes.map((n) => n.innerHTML).filter((str) => str.trim().length > 0);
  }
  return html.split(/\n+/).map((s) => s.trim()).filter(Boolean);
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
  const [doanDangPhat, setDoanDangPhat] = useState(-1);
  const [tocDo, setTocDo] = useState(1);

  const audioRef = useRef(null);

  const taiChuong = async () => {
    setDangTai(true);
    setLoiQuyen(null);
    setTrangHienTai(0);
    setDoanDangPhat(-1);
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

  const danhSachTrang = useMemo(() => {
    const pages = [];
    let trangTam = [];
    let kyTuTam = 0;

    cacKhoiVanBan.forEach((html, index) => {
      const doDai = html.replace(/<[^>]+>/g, '').length;
      if (kyTuTam + doDai > 1500 && trangTam.length > 0) {
        pages.push(trangTam);
        trangTam = [];
        kyTuTam = 0;
      }
      trangTam.push({ html, index });
      kyTuTam += doDai;
    });
    if (trangTam.length > 0) pages.push(trangTam);
    return pages.length > 0 ? pages : [[]];
  }, [cacKhoiVanBan]);

  const mocThoiGian = useMemo(() => {
    try {
      const raw = duLieu?.chuong?.moc_thoi_gian_json;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [duLieu?.chuong?.moc_thoi_gian_json]);

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
    if (!audioRef.current || mocThoiGian.length === 0) return;
    const giay = audioRef.current.currentTime;
    const moc = mocThoiGian.find((m) => giay >= m.bat_dau && giay <= m.ket_thuc);
    if (moc && moc.doan !== doanDangPhat) {
      setDoanDangPhat(moc.doan);
      if (kieuDoc === 'LAT_TRANG') {
        const trangChuaDoan = danhSachTrang.findIndex((p) => p.some((item) => item.index === moc.doan));
        if (trangChuaDoan !== -1) setTrangHienTai(trangChuaDoan);
      }
    }
  };

  const tuaAudioToiDoan = (indexDoan) => {
    if (!audioRef.current || mocThoiGian.length === 0) return;
    const moc = mocThoiGian.find((m) => m.doan === indexDoan);
    if (moc) {
      audioRef.current.currentTime = moc.bat_dau;
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
  const anhNenTap = chuong?.anh_nen || chuong?.anh_bia;
  const laSachNghe = chuong?.loai_sach === 'SACH_NOI';
  const donViHoa = laSachNghe ? 'Tập' : 'Chương';
  const donViThuong = laSachNghe ? 'tập' : 'chương';

  const quayLaiTrangSach = () => {
    if (maSachQuayLai) {
      navigate(`/sach/${maSachQuayLai}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`reader-room reader-theme-${nenDoc} ${anhNenTap ? 'has-custom-bg' : ''}`}>
      {anhNenTap && (
        <div
          className="chapter-custom-backdrop"
          style={{ backgroundImage: `url("${SERVER_URL}${anhNenTap}")` }}
        />
      )}

      <div className="reader-topbar">
        <div className="reader-book-meta">
          {maSachQuayLai ? (
            <Link to={`/sach/${maSachQuayLai}`} className="control-pill">
              <ArrowLeft size={16} /> Mục lục
            </Link>
          ) : (
            <button type="button" className="control-pill" onClick={quayLaiTrangSach}>
              <ArrowLeft size={16} /> Mục lục
            </button>
          )}

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
              maSachQuayLai ? (
                <Link to={`/sach/${maSachQuayLai}`} className="btn-outline">
                  Quay lại trang thông tin tác phẩm
                </Link>
              ) : (
                <button type="button" className="btn-outline" onClick={quayLaiTrangSach}>
                  Quay lại trang thông tin tác phẩm
                </button>
              )
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
                  {(kieuDoc === 'CUON_DOC'
                    ? cacKhoiVanBan.map((html, index) => ({ html, index }))
                    : danhSachTrang[trangHienTai] || []
                  ).map(({ html, index }) => (
                    <p
                      key={index}
                      className={`${doanDangPhat === index ? 'sync-active' : ''} ${mocThoiGian.length > 0 ? 'sync-clickable' : ''}`}
                      onClick={() => tuaAudioToiDoan(index)}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
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
            onTimeUpdate={xuLyDongBoAudio}
          />
        </div>
      )}
    </div>
  );
};

export default TrangDocSach;