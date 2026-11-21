const { sql, poolPromise } = require('../config/db');

const capNhatTienDo = async (ma_nguoi_dung, { ma_sach, ma_chuong_dang_doc, ti_le_doc }) => {
    const pool = await poolPromise;
    const tiLe = Math.min(100, Math.max(0, parseInt(ti_le_doc, 10) || 0));

    const kiemTra = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('ma_sach', sql.Int, parseInt(ma_sach, 10))
        .query('SELECT ma_tien_do FROM TienDoDoc WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');

    if (kiemTra.recordset.length > 0) {
        await pool.request()
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, parseInt(ma_sach, 10))
            .input('ma_chuong', sql.Int, ma_chuong_dang_doc ? parseInt(ma_chuong_dang_doc, 10) : null)
            .input('ti_le_doc', sql.Int, tiLe)
            .query(`
                UPDATE TienDoDoc
                SET ma_chuong_dang_doc = @ma_chuong, ti_le_doc = @ti_le_doc, ngay_cap_nhat = GETDATE()
                WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach
            `);
    } else {
        await pool.request()
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, parseInt(ma_sach, 10))
            .input('ma_chuong', sql.Int, ma_chuong_dang_doc ? parseInt(ma_chuong_dang_doc, 10) : null)
            .input('ti_le_doc', sql.Int, tiLe)
            .query(`
                INSERT INTO TienDoDoc (ma_nguoi_dung, ma_sach, ma_chuong_dang_doc, ti_le_doc)
                VALUES (@ma_nguoi_dung, @ma_sach, @ma_chuong, @ti_le_doc)
            `);
    }
};

const batTatYeuThich = async (ma_nguoi_dung, ma_sach) => {
    const pool = await poolPromise;
    const kiemTra = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('ma_sach', sql.Int, ma_sach)
        .query('SELECT yeu_thich FROM TienDoDoc WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');

    if (kiemTra.recordset.length > 0) {
        const trangThaiMoi = kiemTra.recordset[0].yeu_thich ? 0 : 1;
        await pool.request()
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, ma_sach)
            .input('yeu_thich', sql.Bit, trangThaiMoi)
            .query('UPDATE TienDoDoc SET yeu_thich = @yeu_thich WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');
        return { yeu_thich: Boolean(trangThaiMoi) };
    }

    await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('ma_sach', sql.Int, ma_sach)
        .query('INSERT INTO TienDoDoc (ma_nguoi_dung, ma_sach, yeu_thich) VALUES (@ma_nguoi_dung, @ma_sach, 1)');
    return { yeu_thich: true };
};

const layTuSachCaNhan = async (ma_nguoi_dung) => {
    const pool = await poolPromise;

    const dangDocRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query(`
            SELECT td.ma_sach, td.ma_chuong_dang_doc, td.ti_le_doc, td.yeu_thich, td.ngay_cap_nhat,
                   s.tieu_de, s.anh_bia, s.loai_sach, s.hinh_thuc_ban, tg.ten_tac_gia,
                   c.so_thu_tu AS chuong_dang_doc_stt, c.tieu_de AS chuong_dang_doc_ten
            FROM TienDoDoc td
            INNER JOIN Sach s ON td.ma_sach = s.ma_sach
            INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
            LEFT JOIN ChuongSach c ON td.ma_chuong_dang_doc = c.ma_chuong
            WHERE td.ma_nguoi_dung = @ma_nguoi_dung AND td.ma_chuong_dang_doc IS NOT NULL
            ORDER BY td.ngay_cap_nhat DESC
        `);

    const yeuThichRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query(`
            SELECT s.ma_sach, s.tieu_de, s.anh_bia, s.loai_sach, s.hinh_thuc_ban, s.diem_danh_gia_tb, tg.ten_tac_gia
            FROM TienDoDoc td
            INNER JOIN Sach s ON td.ma_sach = s.ma_sach
            INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
            WHERE td.ma_nguoi_dung = @ma_nguoi_dung AND td.yeu_thich = 1
            ORDER BY td.ngay_cap_nhat DESC
        `);

    const daSoHuuRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query(`
            SELECT DISTINCT s.ma_sach, s.tieu_de, s.anh_bia, s.loai_sach, s.hinh_thuc_ban, tg.ten_tac_gia,
                   CASE WHEN sdm.ma_mua_sach IS NOT NULL THEN N'Trọn quyển'
                        ELSE N'Đã mở khóa một phần' END AS trang_thai_so_huu
            FROM Sach s
            INNER JOIN TacGia tg ON s.ma_tac_gia = tg.ma_tac_gia
            LEFT JOIN SachDaMua sdm ON s.ma_sach = sdm.ma_sach AND sdm.ma_nguoi_dung = @ma_nguoi_dung
            LEFT JOIN (
                SELECT DISTINCT c.ma_sach
                FROM ChuongDaMoKhoa cdm
                INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong
                WHERE cdm.ma_nguoi_dung = @ma_nguoi_dung
            ) cm ON s.ma_sach = cm.ma_sach
            WHERE sdm.ma_mua_sach IS NOT NULL OR cm.ma_sach IS NOT NULL
        `);

    return {
        dang_doc: dangDocRes.recordset,
        yeu_thich: yeuThichRes.recordset,
        da_so_huu: daSoHuuRes.recordset
    };
};

module.exports = { capNhatTienDo, batTatYeuThich, layTuSachCaNhan };