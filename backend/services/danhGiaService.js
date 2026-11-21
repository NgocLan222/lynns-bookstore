const { sql, poolPromise } = require('../config/db');

const taoLoi = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const rutGonNoiDung = (text = '', max = 70) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};

const taoThongBaoPhanHoi = async (pool, { ma_nguoi_nhan, ma_nguoi_gui, noi_dung, duong_dan }) => {
    const nhanId = parseInt(ma_nguoi_nhan, 10);
    const guiId = parseInt(ma_nguoi_gui, 10);
    if (!nhanId || !guiId || nhanId === guiId) return;

    await pool.request()
        .input('ma_nguoi_nhan', sql.Int, nhanId)
        .input('ma_nguoi_gui', sql.Int, guiId)
        .input('noi_dung', sql.NVarChar(500), noi_dung)
        .input('duong_dan', sql.VarChar(255), duong_dan)
        .query(`
            INSERT INTO ThongBao (ma_nguoi_nhan, ma_nguoi_gui, noi_dung, duong_dan)
            VALUES (@ma_nguoi_nhan, @ma_nguoi_gui, @noi_dung, @duong_dan)
        `);
};

const capNhatDiemTrungBinh = async (transaction, ma_sach) => {
    const thongKeRes = await new sql.Request(transaction)
        .input('ma_sach', sql.Int, ma_sach)
        .query(`
            SELECT ISNULL(CAST(AVG(CAST(so_sao AS FLOAT)) AS DECIMAL(2,1)), 0.0) AS diem_tb,
                   COUNT(*) AS tong
            FROM DanhGia
            WHERE ma_sach = @ma_sach
        `);

    const { diem_tb, tong } = thongKeRes.recordset[0];
    await new sql.Request(transaction)
        .input('ma_sach', sql.Int, ma_sach)
        .input('diem_tb', sql.Decimal(2, 1), diem_tb)
        .input('tong', sql.Int, tong)
        .query('UPDATE Sach SET diem_danh_gia_tb = @diem_tb, tong_danh_gia = @tong WHERE ma_sach = @ma_sach');
};

const layDanhGiaTheoSach = async (ma_sach) => {
    const pool = await poolPromise;
    const dgRes = await pool.request()
        .input('ma_sach', sql.Int, ma_sach)
        .query(`
            SELECT dg.*, nd.ho_ten, nd.anh_dai_dien
            FROM DanhGia dg
            INNER JOIN NguoiDung nd ON dg.ma_nguoi_dung = nd.ma_nguoi_dung
            WHERE dg.ma_sach = @ma_sach
            ORDER BY dg.ngay_tao DESC
        `);

    const danhSach = dgRes.recordset;
    if (danhSach.length === 0) return [];

    const ids = danhSach.map((d) => d.ma_danh_gia);
    const phRes = await pool.request().query(`
        SELECT ph.*, nd.ho_ten, nd.anh_dai_dien
        FROM PhanHoiDanhGia ph
        INNER JOIN NguoiDung nd ON ph.ma_nguoi_dung = nd.ma_nguoi_dung
        WHERE ph.ma_danh_gia IN (${ids.join(',')})
        ORDER BY ph.ngay_tao ASC
    `);

    const mapPhanHoi = new Map();
    phRes.recordset.forEach((row) => {
        if (!mapPhanHoi.has(row.ma_danh_gia)) mapPhanHoi.set(row.ma_danh_gia, []);
        mapPhanHoi.get(row.ma_danh_gia).push(row);
    });

    return danhSach.map((dg) => ({
        ...dg,
        danh_sach_phan_hoi: mapPhanHoi.get(dg.ma_danh_gia) || []
    }));
};

const guiDanhGia = async (ma_nguoi_dung, { ma_sach, so_sao, binh_luan }) => {
    const sao = parseInt(so_sao, 10);
    if (!sao || sao < 1 || sao > 5) {
        throw taoLoi(400, 'Số sao đánh giá phải từ 1 đến 5.');
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    const maSachInt = parseInt(ma_sach, 10);
    let daBatDau = false;

    try {
        await transaction.begin();
        daBatDau = true;

        const kiemTra = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, maSachInt)
            .query('SELECT ma_danh_gia FROM DanhGia WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');

        if (kiemTra.recordset.length > 0) {
            throw taoLoi(400, 'Bạn đã đánh giá tác phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có.');
        }

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, maSachInt)
            .input('so_sao', sql.Int, sao)
            .input('binh_luan', sql.NVarChar(sql.MAX), binh_luan?.trim() || null)
            .query(`
                INSERT INTO DanhGia (ma_nguoi_dung, ma_sach, so_sao, binh_luan)
                VALUES (@ma_nguoi_dung, @ma_sach, @so_sao, @binh_luan)
            `);

        await capNhatDiemTrungBinh(transaction, maSachInt);
        await transaction.commit();
    } catch (error) {
        if (daBatDau) await transaction.rollback();
        throw error;
    }
};

const suaDanhGia = async (ma_danh_gia, ma_nguoi_dung, { so_sao, binh_luan }) => {
    const sao = parseInt(so_sao, 10);
    if (!sao || sao < 1 || sao > 5) {
        throw taoLoi(400, 'Số sao đánh giá phải từ 1 đến 5.');
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    let daBatDau = false;

    try {
        await transaction.begin();
        daBatDau = true;

        const dgRes = await new sql.Request(transaction)
            .input('ma_danh_gia', sql.Int, ma_danh_gia)
            .query('SELECT * FROM DanhGia WHERE ma_danh_gia = @ma_danh_gia');

        const dg = dgRes.recordset[0];
        if (!dg) throw taoLoi(404, 'Không tìm thấy đánh giá.');
        if (dg.ma_nguoi_dung !== ma_nguoi_dung) {
            throw taoLoi(403, 'Bạn chỉ có thể chỉnh sửa đánh giá của chính mình.');
        }

        await new sql.Request(transaction)
            .input('ma_danh_gia', sql.Int, ma_danh_gia)
            .input('so_sao', sql.Int, sao)
            .input('binh_luan', sql.NVarChar(sql.MAX), binh_luan?.trim() || null)
            .query(`
                UPDATE DanhGia
                SET so_sao = @so_sao, binh_luan = @binh_luan, ngay_cap_nhat = GETDATE()
                WHERE ma_danh_gia = @ma_danh_gia
            `);

        await capNhatDiemTrungBinh(transaction, dg.ma_sach);
        await transaction.commit();
    } catch (error) {
        if (daBatDau) await transaction.rollback();
        throw error;
    }
};

const xoaDanhGia = async (ma_danh_gia, nguoiDung) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    let daBatDau = false;

    try {
        await transaction.begin();
        daBatDau = true;

        const dgRes = await new sql.Request(transaction)
            .input('ma_danh_gia', sql.Int, ma_danh_gia)
            .query('SELECT * FROM DanhGia WHERE ma_danh_gia = @ma_danh_gia');

        const dg = dgRes.recordset[0];
        if (!dg) throw taoLoi(404, 'Không tìm thấy đánh giá.');

        if (nguoiDung.vai_tro !== 'admin' && dg.ma_nguoi_dung !== nguoiDung.ma_nguoi_dung) {
            throw taoLoi(403, 'Bạn không có quyền xóa đánh giá này.');
        }

        await new sql.Request(transaction)
            .input('ma_danh_gia', sql.Int, ma_danh_gia)
            .query('DELETE FROM DanhGia WHERE ma_danh_gia = @ma_danh_gia');

        await capNhatDiemTrungBinh(transaction, dg.ma_sach);
        await transaction.commit();
    } catch (error) {
        if (daBatDau) await transaction.rollback();
        throw error;
    }
};

const themPhanHoiDanhGia = async (ma_danh_gia, ma_nguoi_dung, { noi_dung, ma_nguoi_nhan }) => {
    if (!noi_dung || !noi_dung.trim()) {
        throw taoLoi(400, 'Vui lòng nhập nội dung phản hồi.');
    }

    const pool = await poolPromise;
    const dgRes = await pool.request()
        .input('ma_danh_gia', sql.Int, ma_danh_gia)
        .query(`
            SELECT dg.ma_danh_gia, dg.ma_sach, dg.ma_nguoi_dung, s.tieu_de AS ten_sach
            FROM DanhGia dg
            INNER JOIN Sach s ON dg.ma_sach = s.ma_sach
            WHERE dg.ma_danh_gia = @ma_danh_gia
        `);

    const dg = dgRes.recordset[0];
    if (!dg) {
        throw taoLoi(404, 'Đánh giá gốc không tồn tại.');
    }

    await pool.request()
        .input('ma_danh_gia', sql.Int, ma_danh_gia)
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung.trim())
        .query(`
            INSERT INTO PhanHoiDanhGia (ma_danh_gia, ma_nguoi_dung, noi_dung)
            VALUES (@ma_danh_gia, @ma_nguoi_dung, @noi_dung)
        `);

    const nguoiGuiRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT ho_ten FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');
    const tenNguoiGui = nguoiGuiRes.recordset[0]?.ho_ten || 'Một độc giả';

    const nguoiNhanId = ma_nguoi_nhan ? parseInt(ma_nguoi_nhan, 10) : dg.ma_nguoi_dung;
    const noiDungTb = `${tenNguoiGui} đã phản hồi bình luận của bạn trong "${dg.ten_sach}": "${rutGonNoiDung(noi_dung)}"`;

    await taoThongBaoPhanHoi(pool, {
        ma_nguoi_nhan: nguoiNhanId,
        ma_nguoi_gui: ma_nguoi_dung,
        noi_dung: noiDungTb,
        duong_dan: `/sach/${dg.ma_sach}#danh-gia-${ma_danh_gia}`
    });
};

const xoaPhanHoiDanhGia = async (ma_phan_hoi, nguoiDung) => {
    const pool = await poolPromise;
    const phRes = await pool.request()
        .input('ma_phan_hoi', sql.Int, ma_phan_hoi)
        .query('SELECT * FROM PhanHoiDanhGia WHERE ma_phan_hoi = @ma_phan_hoi');

    const ph = phRes.recordset[0];
    if (!ph) throw taoLoi(404, 'Không tìm thấy phản hồi.');

    if (nguoiDung.vai_tro !== 'admin' && ph.ma_nguoi_dung !== nguoiDung.ma_nguoi_dung) {
        throw taoLoi(403, 'Bạn không có quyền xóa phản hồi này.');
    }

    await pool.request()
        .input('ma_phan_hoi', sql.Int, ma_phan_hoi)
        .query('DELETE FROM PhanHoiDanhGia WHERE ma_phan_hoi = @ma_phan_hoi');
};

const layBinhLuanTheoChuong = async (ma_chuong) => {
    const pool = await poolPromise;
    const res = await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .query(`
            SELECT bl.*, nd.ho_ten, nd.anh_dai_dien
            FROM BinhLuanChuong bl
            INNER JOIN NguoiDung nd ON bl.ma_nguoi_dung = nd.ma_nguoi_dung
            WHERE bl.ma_chuong = @ma_chuong
            ORDER BY bl.ngay_tao ASC
        `);

    const tatCa = res.recordset;
    const mapCon = new Map();
    const goc = [];

    tatCa.forEach((item) => {
        if (item.ma_binh_luan_cha) {
            if (!mapCon.has(item.ma_binh_luan_cha)) mapCon.set(item.ma_binh_luan_cha, []);
            mapCon.get(item.ma_binh_luan_cha).push(item);
        } else {
            goc.push(item);
        }
    });

    return goc
        .reverse()
        .map((bl) => ({
            ...bl,
            danh_sach_phan_hoi: mapCon.get(bl.ma_binh_luan) || []
        }));
};

const guiBinhLuanChuong = async (ma_chuong, ma_nguoi_dung, { noi_dung, ma_binh_luan_cha, ma_nguoi_nhan }) => {
    if (!noi_dung || !noi_dung.trim()) {
        throw taoLoi(400, 'Vui lòng nhập nội dung bình luận.');
    }

    const pool = await poolPromise;
    const chaId = ma_binh_luan_cha ? parseInt(ma_binh_luan_cha, 10) : null;

    await pool.request()
        .input('ma_chuong', sql.Int, ma_chuong)
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('ma_binh_luan_cha', sql.Int, chaId)
        .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung.trim())
        .query(`
            INSERT INTO BinhLuanChuong (ma_chuong, ma_nguoi_dung, ma_binh_luan_cha, noi_dung)
            VALUES (@ma_chuong, @ma_nguoi_dung, @ma_binh_luan_cha, @noi_dung)
        `);

    if (chaId) {
        const thongTinRes = await pool.request()
            .input('ma_binh_luan_cha', sql.Int, chaId)
            .input('ma_chuong', sql.Int, ma_chuong)
            .input('ma_nguoi_gui', sql.Int, ma_nguoi_dung)
            .query(`
                SELECT
                    (SELECT ma_nguoi_dung FROM BinhLuanChuong WHERE ma_binh_luan = @ma_binh_luan_cha) AS chu_binh_luan,
                    (SELECT ho_ten FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_gui) AS ten_nguoi_gui,
                    c.so_thu_tu, s.tieu_de AS ten_sach, s.loai_sach
                FROM ChuongSach c
                INNER JOIN Sach s ON c.ma_sach = s.ma_sach
                WHERE c.ma_chuong = @ma_chuong
            `);

        const info = thongTinRes.recordset[0];
        if (info) {
            const donVi = info.loai_sach === 'SACH_NOI' ? 'Tập' : 'Chương';
            const nguoiNhanId = ma_nguoi_nhan ? parseInt(ma_nguoi_nhan, 10) : info.chu_binh_luan;
            const noiDungTb = `${info.ten_nguoi_gui} đã phản hồi bình luận của bạn ở ${donVi} ${info.so_thu_tu} (${info.ten_sach}): "${rutGonNoiDung(noi_dung)}"`;

            await taoThongBaoPhanHoi(pool, {
                ma_nguoi_nhan: nguoiNhanId,
                ma_nguoi_gui: ma_nguoi_dung,
                noi_dung: noiDungTb,
                duong_dan: `/doc/${ma_chuong}#binh-luan-${chaId}`
            });
        }
    }
};

const suaBinhLuanChuong = async (ma_binh_luan, ma_nguoi_dung, { noi_dung }) => {
    if (!noi_dung || !noi_dung.trim()) {
        throw taoLoi(400, 'Nội dung bình luận không được để trống.');
    }

    const pool = await poolPromise;
    const blRes = await pool.request()
        .input('ma_binh_luan', sql.Int, ma_binh_luan)
        .query('SELECT * FROM BinhLuanChuong WHERE ma_binh_luan = @ma_binh_luan');

    const bl = blRes.recordset[0];
    if (!bl) throw taoLoi(404, 'Không tìm thấy bình luận.');
    if (bl.ma_nguoi_dung !== ma_nguoi_dung) {
        throw taoLoi(403, 'Bạn chỉ có thể sửa bình luận của chính mình.');
    }

    await pool.request()
        .input('ma_binh_luan', sql.Int, ma_binh_luan)
        .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung.trim())
        .query(`
            UPDATE BinhLuanChuong
            SET noi_dung = @noi_dung, ngay_cap_nhat = GETDATE()
            WHERE ma_binh_luan = @ma_binh_luan
        `);
};

const xoaBinhLuanChuong = async (ma_binh_luan, nguoiDung) => {
    const pool = await poolPromise;
    const blRes = await pool.request()
        .input('ma_binh_luan', sql.Int, ma_binh_luan)
        .query('SELECT * FROM BinhLuanChuong WHERE ma_binh_luan = @ma_binh_luan');

    const bl = blRes.recordset[0];
    if (!bl) throw taoLoi(404, 'Không tìm thấy bình luận.');

    if (nguoiDung.vai_tro !== 'admin' && bl.ma_nguoi_dung !== nguoiDung.ma_nguoi_dung) {
        throw taoLoi(403, 'Bạn không có quyền xóa bình luận này.');
    }

    await pool.request()
        .input('ma_binh_luan', sql.Int, ma_binh_luan)
        .query('DELETE FROM BinhLuanChuong WHERE ma_binh_luan = @ma_binh_luan OR ma_binh_luan_cha = @ma_binh_luan');
};

const layThongBaoNguoiDung = async (ma_nguoi_dung) => {
    const pool = await poolPromise;
    const dsRes = await pool.request()
        .input('ma_nguoi_nhan', sql.Int, ma_nguoi_dung)
        .query(`
            SELECT TOP 25 tb.*, nd.ho_ten AS ten_nguoi_gui, nd.anh_dai_dien AS avatar_nguoi_gui
            FROM ThongBao tb
            INNER JOIN NguoiDung nd ON tb.ma_nguoi_gui = nd.ma_nguoi_dung
            WHERE tb.ma_nguoi_nhan = @ma_nguoi_nhan
            ORDER BY tb.ngay_tao DESC
        `);

    const demRes = await pool.request()
        .input('ma_nguoi_nhan', sql.Int, ma_nguoi_dung)
        .query('SELECT COUNT(*) AS so_chua_doc FROM ThongBao WHERE ma_nguoi_nhan = @ma_nguoi_nhan AND da_doc = 0');

    return {
        danh_sach: dsRes.recordset,
        so_chua_doc: demRes.recordset[0]?.so_chua_doc || 0
    };
};

const danhDauDaDocThongBao = async (ma_thong_bao, ma_nguoi_dung) => {
    const pool = await poolPromise;
    await pool.request()
        .input('ma_thong_bao', sql.Int, ma_thong_bao)
        .input('ma_nguoi_nhan', sql.Int, ma_nguoi_dung)
        .query('UPDATE ThongBao SET da_doc = 1 WHERE ma_thong_bao = @ma_thong_bao AND ma_nguoi_nhan = @ma_nguoi_nhan');
};

const danhDauDocTatCaThongBao = async (ma_nguoi_dung) => {
    const pool = await poolPromise;
    await pool.request()
        .input('ma_nguoi_nhan', sql.Int, ma_nguoi_dung)
        .query('UPDATE ThongBao SET da_doc = 1 WHERE ma_nguoi_nhan = @ma_nguoi_nhan AND da_doc = 0');
};

module.exports = {
    layDanhGiaTheoSach,
    guiDanhGia,
    suaDanhGia,
    xoaDanhGia,
    themPhanHoiDanhGia,
    xoaPhanHoiDanhGia,
    layBinhLuanTheoChuong,
    guiBinhLuanChuong,
    suaBinhLuanChuong,
    xoaBinhLuanChuong,
    layThongBaoNguoiDung,
    danhDauDaDocThongBao,
    danhDauDocTatCaThongBao,
};