const { sql, poolPromise } = require('../config/db');

const taoLoi = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const boDauTiengViet = (str = '') =>
    str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();

const chuanHoaDanhSachTheLoai = (duLieu) => {
    let raw = duLieu.danh_sach_ma_the_loai;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            raw = raw.split(',').map((item) => item.trim());
        }
    }
    if (!Array.isArray(raw) && duLieu.ma_the_loai) {
        raw = [duLieu.ma_the_loai];
    }
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0))];
};

const luuTheLoaiChoSach = async (pool, ma_sach, danhSachId) => {
    await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query('DELETE FROM SachTheLoai WHERE ma_sach = @ma_sach');

    for (const ma_the_loai of danhSachId) {
        await pool.request()
            .input('ma_sach', sql.Int, ma_sach)
            .input('ma_the_loai', sql.Int, ma_the_loai)
            .query('INSERT INTO SachTheLoai (ma_sach, ma_the_loai) VALUES (@ma_sach, @ma_the_loai)');
    }
};

const ganTheLoaiChoDanhSachSach = async (pool, danhSach) => {
    if (!danhSach || danhSach.length === 0) return danhSach;
    const ids = danhSach.map((s) => s.ma_sach);

    const tlRes = await pool.request().query(`
        SELECT stl.ma_sach, tl.ma_the_loai, tl.ten_the_loai
        FROM SachTheLoai stl
        INNER JOIN TheLoai tl ON stl.ma_the_loai = tl.ma_the_loai
        WHERE stl.ma_sach IN (${ids.join(',')})
        ORDER BY tl.ten_the_loai ASC
    `);

    const mapTheLoai = new Map();
    tlRes.recordset.forEach((row) => {
        if (!mapTheLoai.has(row.ma_sach)) mapTheLoai.set(row.ma_sach, []);
        mapTheLoai.get(row.ma_sach).push({
            ma_the_loai: row.ma_the_loai,
            ten_the_loai: row.ten_the_loai
        });
    });

    return danhSach.map((sach) => {
        const dsTl = mapTheLoai.get(sach.ma_sach) || (sach.ma_the_loai && sach.ten_the_loai
            ? [{ ma_the_loai: sach.ma_the_loai, ten_the_loai: sach.ten_the_loai }]
            : []);
        return {
            ...sach,
            danh_sach_the_loai: dsTl,
            ten_the_loai: dsTl.map((t) => t.ten_the_loai).join(', ')
        };
    });
};

const layDanhSachSach = async (boLoc) => {
    const { loai_sach, hinh_thuc_ban, ma_the_loai, ma_tac_gia, tu_khoa, sap_xep, bao_gom_an } = boLoc;
    const trang = parseInt(boLoc.trang, 10) || 1;
    const gioiHan = parseInt(boLoc.gioi_han, 10) || 12;
    const offset = (trang - 1) * gioiHan;

    const pool = await poolPromise;
    const request = pool.request();
    const dieuKien = [];

    if (!bao_gom_an) {
        dieuKien.push("s.trang_thai = 'HIEN_THI'");
    }
    if (loai_sach) {
        request.input('loai_sach', sql.VarChar(20), loai_sach);
        dieuKien.push('s.loai_sach = @loai_sach');
    }
    if (hinh_thuc_ban) {
        request.input('hinh_thuc_ban', sql.VarChar(20), hinh_thuc_ban);
        dieuKien.push('s.hinh_thuc_ban = @hinh_thuc_ban');
    }
    if (ma_the_loai) {
        request.input('ma_the_loai', sql.Int, parseInt(ma_the_loai, 10));
        dieuKien.push('EXISTS (SELECT 1 FROM SachTheLoai stl WHERE stl.ma_sach = s.ma_sach AND stl.ma_the_loai = @ma_the_loai)');
    }
    if (ma_tac_gia) {
        request.input('ma_tac_gia', sql.Int, parseInt(ma_tac_gia, 10));
        dieuKien.push('s.ma_tac_gia = @ma_tac_gia');
    }
    if (tu_khoa && tu_khoa.trim()) {
        const tuKhoaGoc = `%${tu_khoa.trim()}%`;
        const tuKhoaKhongDau = `%${boDauTiengViet(tu_khoa)}%`;
        request.input('tu_khoa', sql.NVarChar(255), tuKhoaGoc);
        request.input('tu_khoa_kd', sql.NVarChar(255), tuKhoaKhongDau);
        dieuKien.push(`(
            s.tieu_de COLLATE Vietnamese_CI_AI LIKE @tu_khoa
            OR tg.ten_tac_gia COLLATE Vietnamese_CI_AI LIKE @tu_khoa
            OR REPLACE(REPLACE(s.tieu_de, N'đ', 'd'), N'Đ', 'D') COLLATE Vietnamese_CI_AI LIKE @tu_khoa_kd
            OR REPLACE(REPLACE(tg.ten_tac_gia, N'đ', 'd'), N'Đ', 'D') COLLATE Vietnamese_CI_AI LIKE @tu_khoa_kd
        )`);
    }

    const whereClause = dieuKien.length > 0 ? `WHERE ${dieuKien.join(' AND ')}` : '';

    let orderClause = 'ORDER BY s.ngay_tao DESC';
    if (sap_xep === 'luot_xem') orderClause = 'ORDER BY s.luot_xem DESC';
    else if (sap_xep === 'danh_gia') orderClause = 'ORDER BY s.diem_danh_gia_tb DESC, s.tong_danh_gia DESC';

    const demQuery = `
        SELECT COUNT(*) AS tong
        FROM Sach s
        INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
        ${whereClause}
    `;
    const tongKetQua = await request.query(demQuery);
    const tongSoSach = tongKetQua.recordset[0].tong;

    request.input('offset', sql.Int, offset);
    request.input('gioi_han', sql.Int, gioiHan);

    const duLieuQuery = `
        SELECT s.*, tg.ten_tac_gia, tl.ten_the_loai,
               (SELECT COUNT(*) FROM ChuongSach c WHERE c.ma_sach = s.ma_sach) AS tong_so_chuong
        FROM Sach s
        INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
        LEFT JOIN TheLoai tl ON s.ma_the_loai = tl.ma_the_loai
        ${whereClause}
        ${orderClause}
        OFFSET @offset ROWS FETCH NEXT @gioi_han ROWS ONLY
    `;
    const danhSachRes = await request.query(duLieuQuery);
    const danhSachDayDu = await ganTheLoaiChoDanhSachSach(pool, danhSachRes.recordset);

    return {
        danh_sach: danhSachDayDu,
        phan_trang: {
            trang_hien_tai: trang,
            gioi_han: gioiHan,
            tong_so_sach: tongSoSach,
            tong_so_trang: Math.ceil(tongSoSach / gioiHan)
        }
    };
};

const layChiTietSach = async (ma_sach) => {
    if (isNaN(ma_sach)) throw taoLoi(400, 'Mã tác phẩm không hợp lệ.');

    const pool = await poolPromise;
    const sachResult = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query(`
            SELECT s.*, tg.ten_tac_gia, tg.tieu_su AS tieu_su_tac_gia, tl.ten_the_loai
            FROM Sach s
            INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
            LEFT JOIN TheLoai tl ON s.ma_the_loai = tl.ma_the_loai
            WHERE s.ma_sach = @ma_sach
        `);

    const sachRaw = sachResult.recordset[0];
    if (!sachRaw) throw taoLoi(404, 'Không tìm thấy đầu sách.');

    const [sach] = await ganTheLoaiChoDanhSachSach(pool, [sachRaw]);

    const chuongResult = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query(`
            SELECT ma_chuong, so_thu_tu, tieu_de, la_mien_phi, gia_xu,
                   CASE WHEN duong_dan_audio IS NOT NULL AND duong_dan_audio <> '' THEN 1 ELSE 0 END AS co_audio,
                   ngay_tao
            FROM ChuongSach
            WHERE ma_sach = @ma_sach
            ORDER BY so_thu_tu ASC
        `);

    return { ...sach, danh_sach_chuong: chuongResult.recordset };
};

const taoSach = async (duLieu) => {
    const { tieu_de, mo_ta, anh_bia, ma_tac_gia, loai_sach, hinh_thuc_ban, gia_tron_quyen_xu, kieu_doc_mac_dinh, tinh_trang_phat_hanh } = duLieu;
    const dsTheLoai = chuanHoaDanhSachTheLoai(duLieu);
    if (dsTheLoai.length === 0) {
        throw taoLoi(400, 'Vui lòng chọn ít nhất một thể loại cho tác phẩm.');
    }

    const pool = await poolPromise;
    const loai = loai_sach === 'SACH_NOI' ? 'SACH_NOI' : 'SACH_DOC';

    const result = await pool.request()
        .input('tieu_de', sql.NVarChar(255), tieu_de.trim())
        .input('mo_ta', sql.NVarChar(sql.MAX), mo_ta || null)
        .input('anh_bia', sql.VarChar(255), anh_bia || null)
        .input('ma_tac_gia', sql.Int, parseInt(ma_tac_gia, 10))
        .input('ma_the_loai', sql.Int, dsTheLoai[0])
        .input('loai_sach', sql.VarChar(20), loai)
        .input('hinh_thuc_ban', sql.VarChar(20), hinh_thuc_ban)
        .input('gia_tron_quyen_xu', sql.Int, hinh_thuc_ban === 'TRON_QUYEN' ? (parseInt(gia_tron_quyen_xu, 10) || 0) : 0)
        .input('kieu_doc_mac_dinh', sql.VarChar(20), kieu_doc_mac_dinh || 'CUON_DOC')
        .input('tinh_trang_phat_hanh', sql.VarChar(20), tinh_trang_phat_hanh || 'HOAN_THANH')
        .query(`
            INSERT INTO Sach (tieu_de, mo_ta, anh_bia, ma_tac_gia, ma_the_loai, loai_sach, hinh_thuc_ban, gia_tron_quyen_xu, kieu_doc_mac_dinh, tinh_trang_phat_hanh)
            OUTPUT INSERTED.*
            VALUES (@tieu_de, @mo_ta, @anh_bia, @ma_tac_gia, @ma_the_loai, @loai_sach, @hinh_thuc_ban, @gia_tron_quyen_xu, @kieu_doc_mac_dinh, @tinh_trang_phat_hanh)
        `);

    const sachMoi = result.recordset[0];
    await luuTheLoaiChoSach(pool, sachMoi.ma_sach, dsTheLoai);
    return sachMoi;
};

const capNhatSach = async (ma_sach, duLieu) => {
    const pool = await poolPromise;
    const sachCuRes = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query('SELECT * FROM Sach WHERE ma_sach = @ma_sach');

    const sachCu = sachCuRes.recordset[0];
    if (!sachCu) throw taoLoi(404, 'Không tìm thấy đầu sách.');

    if (duLieu.hinh_thuc_ban && duLieu.hinh_thuc_ban !== sachCu.hinh_thuc_ban) {
        const kiemTraGiaoDich = await pool.request()
            .input('ma_sach', sql.Int, ma_sach)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM SachDaMua WHERE ma_sach = @ma_sach) +
                    (SELECT COUNT(*) FROM ChuongDaMoKhoa cdm INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong WHERE c.ma_sach = @ma_sach) AS tong_gd
            `);
        if (kiemTraGiaoDich.recordset[0].tong_gd > 0) {
            throw taoLoi(400, 'Sách đã phát sinh giao dịch mua, không thể thay đổi hình thức bán.');
        }
    }

    const coCapNhatTheLoai = duLieu.danh_sach_ma_the_loai !== undefined || duLieu.ma_the_loai !== undefined;
    const dsTheLoai = coCapNhatTheLoai ? chuanHoaDanhSachTheLoai(duLieu) : null;
    if (coCapNhatTheLoai && dsTheLoai.length === 0) {
        throw taoLoi(400, 'Vui lòng chọn ít nhất một thể loại cho tác phẩm.');
    }

    const hinhThucMoi = duLieu.hinh_thuc_ban || sachCu.hinh_thuc_ban;
    const giaMoi = hinhThucMoi === 'TRON_QUYEN'
        ? (duLieu.gia_tron_quyen_xu !== undefined ? parseInt(duLieu.gia_tron_quyen_xu, 10) : sachCu.gia_tron_quyen_xu)
        : 0;

    const result = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .input('tieu_de', sql.NVarChar(255), duLieu.tieu_de ? duLieu.tieu_de.trim() : sachCu.tieu_de)
        .input('mo_ta', sql.NVarChar(sql.MAX), duLieu.mo_ta !== undefined ? duLieu.mo_ta : sachCu.mo_ta)
        .input('anh_bia', sql.VarChar(255), duLieu.anh_bia || sachCu.anh_bia)
        .input('ma_tac_gia', sql.Int, duLieu.ma_tac_gia ? parseInt(duLieu.ma_tac_gia, 10) : sachCu.ma_tac_gia)
        .input('ma_the_loai', sql.Int, coCapNhatTheLoai ? dsTheLoai[0] : sachCu.ma_the_loai)
        .input('loai_sach', sql.VarChar(20), duLieu.loai_sach || sachCu.loai_sach)
        .input('hinh_thuc_ban', sql.VarChar(20), hinhThucMoi)
        .input('gia_tron_quyen_xu', sql.Int, giaMoi)
        .input('kieu_doc_mac_dinh', sql.VarChar(20), duLieu.kieu_doc_mac_dinh || sachCu.kieu_doc_mac_dinh)
        .input('tinh_trang_phat_hanh', sql.VarChar(20), duLieu.tinh_trang_phat_hanh || sachCu.tinh_trang_phat_hanh)
        .input('trang_thai', sql.VarChar(20), duLieu.trang_thai || sachCu.trang_thai)
        .query(`
            UPDATE Sach
            SET tieu_de = @tieu_de, mo_ta = @mo_ta, anh_bia = @anh_bia,
                ma_tac_gia = @ma_tac_gia, ma_the_loai = @ma_the_loai,
                loai_sach = @loai_sach, hinh_thuc_ban = @hinh_thuc_ban,
                gia_tron_quyen_xu = @gia_tron_quyen_xu, kieu_doc_mac_dinh = @kieu_doc_mac_dinh,
                tinh_trang_phat_hanh = @tinh_trang_phat_hanh, trang_thai = @trang_thai
            OUTPUT INSERTED.*
            WHERE ma_sach = @ma_sach
        `);

    if (coCapNhatTheLoai) {
        await luuTheLoaiChoSach(pool, ma_sach, dsTheLoai);
    }

    return result.recordset[0];
};

const xoaSach = async (ma_sach) => {
    const pool = await poolPromise;

    const sachRes = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query('SELECT ma_sach FROM Sach WHERE ma_sach = @ma_sach');
    if (sachRes.recordset.length === 0) {
        throw taoLoi(404, 'Không tìm thấy tác phẩm.');
    }

    const kiemTraGd = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query(`
            SELECT
                (SELECT COUNT(*) FROM SachDaMua WHERE ma_sach = @ma_sach) +
                (SELECT COUNT(*) FROM ChuongDaMoKhoa cdm INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong WHERE c.ma_sach = @ma_sach) AS tong_gd
        `);
    if (kiemTraGd.recordset[0].tong_gd > 0) {
        throw taoLoi(400, 'Tác phẩm đã có độc giả mua hoặc mở khóa, không thể xóa (hãy chuyển sang Ngừng phát hành để ẩn).');
    }

    await pool.request().input('ma_sach', sql.Int, ma_sach).query('DELETE FROM DanhGia WHERE ma_sach = @ma_sach');
    await pool.request().input('ma_sach', sql.Int, ma_sach).query('DELETE FROM TienDoDoc WHERE ma_sach = @ma_sach');
    await pool.request().input('ma_sach', sql.Int, ma_sach).query('DELETE FROM ChuongSach WHERE ma_sach = @ma_sach');
    await pool.request().input('ma_sach', sql.Int, ma_sach).query('DELETE FROM SachTheLoai WHERE ma_sach = @ma_sach');
    await pool.request().input('ma_sach', sql.Int, ma_sach).query('DELETE FROM Sach WHERE ma_sach = @ma_sach');
};

module.exports = { layDanhSachSach, layChiTietSach, taoSach, capNhatSach, xoaSach };