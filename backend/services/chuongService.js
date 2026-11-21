const { sql, poolPromise } = require('../config/db');
const { catNoiDungDocThu } = require('../utils/xuLyVanBan');

const taoLoi = (statusCode, message, maLoi = null) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (maLoi) err.ma_loi = maLoi;
    return err;
};

const taoChuong = async (ma_sach, duLieu) => {
    const { so_thu_tu, tieu_de, noi_dung, la_mien_phi, gia_xu, duong_dan_audio, anh_nen, moc_thoi_gian_json } = duLieu;
    const pool = await poolPromise;

    const mienPhiBit = (la_mien_phi === true || la_mien_phi === 'true' || la_mien_phi === 1 || la_mien_phi === '1') ? 1 : 0;
    const gia = mienPhiBit ? 0 : (parseInt(gia_xu, 10) || 0);

    const result = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('so_thu_tu', sql.Int, parseInt(so_thu_tu, 10))
        .input('tieu_de', sql.NVarChar(255), tieu_de.trim())
        .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung || '')
        .input('la_mien_phi', sql.Bit, mienPhiBit)
        .input('gia_xu', sql.Int, gia)
        .input('duong_dan_audio', sql.VarChar(255), duong_dan_audio || null)
        .input('anh_nen', sql.VarChar(255), anh_nen || null)
        .input('moc_thoi_gian_json', sql.NVarChar(sql.MAX), moc_thoi_gian_json || null)
        .query(`
            INSERT INTO ChuongSach (ma_sach, so_thu_tu, tieu_de, noi_dung, la_mien_phi, gia_xu, duong_dan_audio, anh_nen, moc_thoi_gian_json)
            OUTPUT INSERTED.*
            VALUES (@ma_sach, @so_thu_tu, @tieu_de, @noi_dung, @la_mien_phi, @gia_xu, @duong_dan_audio, @anh_nen, @moc_thoi_gian_json)
        `);
    return result.recordset[0];
};

const capNhatChuong = async (ma_chuong, duLieu) => {
    const pool = await poolPromise;
    const cuRes = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query('SELECT * FROM ChuongSach WHERE ma_chuong = @ma_chuong');

    const cu = cuRes.recordset[0];
    if (!cu) throw taoLoi(404, 'Không tìm thấy chương sách.');

    const mienPhiBit = duLieu.la_mien_phi !== undefined
        ? ((duLieu.la_mien_phi === true || duLieu.la_mien_phi === 'true' || duLieu.la_mien_phi === 1 || duLieu.la_mien_phi === '1') ? 1 : 0)
        : (cu.la_mien_phi ? 1 : 0);

    const gia = mienPhiBit ? 0 : (duLieu.gia_xu !== undefined ? parseInt(duLieu.gia_xu, 10) : cu.gia_xu);

    const result = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .input('so_thu_tu', sql.Int, duLieu.so_thu_tu ? parseInt(duLieu.so_thu_tu, 10) : cu.so_thu_tu)
        .input('tieu_de', sql.NVarChar(255), duLieu.tieu_de ? duLieu.tieu_de.trim() : cu.tieu_de)
        .input('noi_dung', sql.NVarChar(sql.MAX), duLieu.noi_dung !== undefined ? duLieu.noi_dung : cu.noi_dung)
        .input('la_mien_phi', sql.Bit, mienPhiBit)
        .input('gia_xu', sql.Int, gia)
        .input('duong_dan_audio', sql.VarChar(255), duLieu.duong_dan_audio !== undefined ? duLieu.duong_dan_audio : cu.duong_dan_audio)
        .input('anh_nen', sql.VarChar(255), duLieu.anh_nen !== undefined ? duLieu.anh_nen : cu.anh_nen)
        .input('moc_thoi_gian_json', sql.NVarChar(sql.MAX), duLieu.moc_thoi_gian_json !== undefined ? duLieu.moc_thoi_gian_json : cu.moc_thoi_gian_json)
        .query(`
            UPDATE ChuongSach
            SET so_thu_tu = @so_thu_tu, tieu_de = @tieu_de, noi_dung = @noi_dung,
                la_mien_phi = @la_mien_phi, gia_xu = @gia_xu,
                duong_dan_audio = @duong_dan_audio, anh_nen = @anh_nen, moc_thoi_gian_json = @moc_thoi_gian_json
            OUTPUT INSERTED.*
            WHERE ma_chuong = @ma_chuong
        `);
    return result.recordset[0];
};

const xoaChuong = async (ma_chuong) => {
    const pool = await poolPromise;

    const chuongRes = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query('SELECT ma_sach FROM ChuongSach WHERE ma_chuong = @ma_chuong');

    const chuong = chuongRes.recordset[0];
    if (!chuong) {
        throw taoLoi(404, 'Không tìm thấy chương sách.');
    }

    const kiemTraMua = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query('SELECT COUNT(*) AS tong FROM ChuongDaMoKhoa WHERE ma_chuong = @ma_chuong');

    if (kiemTraMua.recordset[0].tong > 0) {
        throw taoLoi(400, 'Chương này đã có độc giả bỏ Xu mở khóa, không thể xóa.');
    }

    // Gỡ dấu vết đang đọc ở bảng TienDoDoc trước khi xóa để không vướng khóa ngoại SQL
    await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query('UPDATE TienDoDoc SET ma_chuong_dang_doc = NULL WHERE ma_chuong_dang_doc = @ma_chuong');

    await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query('DELETE FROM ChuongSach WHERE ma_chuong = @ma_chuong');

    // Tự động đánh lại số thứ tự 1, 2, 3... cho các chương còn lại của sách
    await pool.request()
        .input('ma_sach', sql.Int, chuong.ma_sach)
        .query(`
            WITH DanhSoLai AS (
                SELECT so_thu_tu, ROW_NUMBER() OVER (ORDER BY so_thu_tu ASC) AS stt_moi
                FROM ChuongSach
                WHERE ma_sach = @ma_sach
            )
            UPDATE DanhSoLai
            SET so_thu_tu = stt_moi
        `);
};
const capNhatGiaHangLoat = async (ma_sach, { danh_sach_ma_chuong, la_mien_phi, gia_xu }) => {
    if (!Array.isArray(danh_sach_ma_chuong) || danh_sach_ma_chuong.length === 0) {
        throw taoLoi(400, 'Vui lòng chọn ít nhất một chương để cập nhật.');
    }

    const pool = await poolPromise;
    const mienPhiBit = la_mien_phi ? 1 : 0;
    const gia = mienPhiBit ? 0 : (parseInt(gia_xu, 10) || 0);
    const ids = danh_sach_ma_chuong.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('la_mien_phi', sql.Bit, mienPhiBit)
        .input('gia_xu', sql.Int, gia)
        .query(`
            UPDATE ChuongSach
            SET la_mien_phi = @la_mien_phi, gia_xu = @gia_xu
            WHERE ma_sach = @ma_sach AND ma_chuong IN (${ids.join(',')})
        `);
};

const layTrangThaiSoHuuSach = async (ma_sach, ma_nguoi_dung) => {
    const pool = await poolPromise;
    const muaTronQuyen = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT 1 FROM SachDaMua WHERE ma_sach = @ma_sach AND ma_nguoi_dung = @ma_nguoi_dung');

    const chuongDaMo = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query(`
            SELECT cdm.ma_chuong
            FROM ChuongDaMoKhoa cdm
            INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong
            WHERE c.ma_sach = @ma_sach AND cdm.ma_nguoi_dung = @ma_nguoi_dung
        `);

    const yeuThichRes = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT yeu_thich FROM TienDoDoc WHERE ma_sach = @ma_sach AND ma_nguoi_dung = @ma_nguoi_dung');

    return {
        da_mua_tron_quyen: muaTronQuyen.recordset.length > 0,
        danh_sach_chuong_da_mo: chuongDaMo.recordset.map(r => r.ma_chuong),
        da_yeu_thich: Boolean(yeuThichRes.recordset[0]?.yeu_thich)
    };
};

const layNoiDungChuong = async (ma_chuong, nguoiDung) => {
    const pool = await poolPromise;
    const res = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query(`
            SELECT c.*, s.tieu_de AS ten_sach, s.anh_bia, s.loai_sach, s.hinh_thuc_ban, s.gia_tron_quyen_xu, s.kieu_doc_mac_dinh
FROM ChuongSach c
INNER JOIN Sach s ON c.ma_sach = s.ma_sach
WHERE c.ma_chuong = @ma_chuong
        `);

    const chuong = res.recordset[0];
    if (!chuong) throw taoLoi(404, 'Không tìm thấy nội dung.');

    const laAdmin = nguoiDung && nguoiDung.vai_tro === 'admin';
    let laBanDocThu = false;

    if (!laAdmin) {
        if (chuong.hinh_thuc_ban === 'MIEN_PHI') {
            if (chuong.so_thu_tu >= 4 && !nguoiDung) {
                throw taoLoi(401, 'Vui lòng đăng nhập để tiếp tục từ phần 4.', 'CAN_DANG_NHAP');
            }
        } else if (chuong.hinh_thuc_ban === 'THEO_CHUONG') {
            if (chuong.la_mien_phi) {
                if (chuong.so_thu_tu >= 4 && !nguoiDung) {
                    throw taoLoi(401, 'Vui lòng đăng nhập để thưởng thức phần miễn phí này.', 'CAN_DANG_NHAP');
                }
            } else {
                if (!nguoiDung) {
                    throw taoLoi(401, 'Vui lòng đăng nhập để mở khóa phần thu phí.', 'CAN_DANG_NHAP');
                }
                const kiemTraMo = await pool.request()
                    .input('ma_nguoi_dung', sql.Int, nguoiDung.ma_nguoi_dung)
                    .input('ma_chuong', sql.Int, ma_chuong)
                    .query('SELECT 1 FROM ChuongDaMoKhoa WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_chuong = @ma_chuong');

                if (kiemTraMo.recordset.length === 0) {
                    throw taoLoi(403, `Nội dung này cần ${chuong.gia_xu} Xu để mở khóa.`, 'CAN_MO_KHOA_CHUONG');
                }
            }
        } else if (chuong.hinh_thuc_ban === 'TRON_QUYEN') {
            let daMua = false;
            if (nguoiDung) {
                const kiemTraMua = await pool.request()
                    .input('ma_nguoi_dung', sql.Int, nguoiDung.ma_nguoi_dung)
                    .input('ma_sach', sql.Int, chuong.ma_sach)
                    .query('SELECT 1 FROM SachDaMua WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');
                daMua = kiemTraMua.recordset.length > 0;
            }

            if (!daMua) {
                if (chuong.so_thu_tu === 1) {
                    if (chuong.noi_dung) {
                        const ketQuaCat = catNoiDungDocThu(chuong.noi_dung, 3000);
                        chuong.noi_dung = ketQuaCat.noiDungCat;
                        laBanDocThu = ketQuaCat.biCat;
                    } else {
                        laBanDocThu = true;
                    }
                } else {
                    throw taoLoi(403, `Vui lòng mua trọn quyển (${chuong.gia_tron_quyen_xu} Xu) để tiếp tục.`, 'CAN_MUA_TRON_QUYEN');
                }
            }
        }

        await pool.request()
            .input('ma_sach', sql.Int, chuong.ma_sach)
            .query('UPDATE Sach SET luot_xem = luot_xem + 1 WHERE ma_sach = @ma_sach');
    }

    const dieuHuongRes = await pool.request()
        .input('ma_sach', sql.Int, chuong.ma_sach)
        .input('so_thu_tu', sql.Int, chuong.so_thu_tu)
        .query(`
            SELECT
                (SELECT TOP 1 ma_chuong FROM ChuongSach WHERE ma_sach = @ma_sach AND so_thu_tu < @so_thu_tu ORDER BY so_thu_tu DESC) AS chuong_truoc,
                (SELECT TOP 1 ma_chuong FROM ChuongSach WHERE ma_sach = @ma_sach AND so_thu_tu > @so_thu_tu ORDER BY so_thu_tu ASC) AS chuong_sau
        `);

    return {
        chuong,
        la_ban_doc_thu: laBanDocThu,
        chuong_truoc: dieuHuongRes.recordset[0].chuong_truoc,
        chuong_sau: dieuHuongRes.recordset[0].chuong_sau
    };
};

module.exports = {
    taoChuong,
    capNhatChuong,
    xoaChuong,
    capNhatGiaHangLoat,
    layTrangThaiSoHuuSach,
    layNoiDungChuong
};