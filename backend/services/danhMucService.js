const { sql, poolPromise } = require('../config/db');

const layTatCaTheLoai = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM TheLoai ORDER BY ten_the_loai ASC');
    return result.recordset;
};

const layTheLoaiTheoKhuVuc = async ({ hinh_thuc_ban, loai_sach }) => {
    const pool = await poolPromise;
    const request = pool.request();
    const dieuKien = ["s.trang_thai = 'HIEN_THI'"];

    if (hinh_thuc_ban) {
        request.input('hinh_thuc_ban', sql.VarChar(20), hinh_thuc_ban);
        dieuKien.push('s.hinh_thuc_ban = @hinh_thuc_ban');
    }
    if (loai_sach) {
        request.input('loai_sach', sql.VarChar(20), loai_sach);
        dieuKien.push('s.loai_sach = @loai_sach');
    }

    const result = await request.query(`
        SELECT DISTINCT tl.ma_the_loai, tl.ten_the_loai
        FROM TheLoai tl
        INNER JOIN SachTheLoai stl ON tl.ma_the_loai = stl.ma_the_loai
        INNER JOIN Sach s ON stl.ma_sach = s.ma_sach
        WHERE ${dieuKien.join(' AND ')}
        ORDER BY tl.ten_the_loai ASC
    `);
    return result.recordset;
};

const taoTheLoai = async ({ ten_the_loai, mo_ta }) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('ten_the_loai', sql.NVarChar(100), ten_the_loai.trim())
        .input('mo_ta', sql.NVarChar(500), mo_ta || null)
        .query('INSERT INTO TheLoai (ten_the_loai, mo_ta) OUTPUT INSERTED.* VALUES (@ten_the_loai, @mo_ta)');
    return result.recordset[0];
};

const layTatCaTacGia = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM TacGia ORDER BY ten_tac_gia ASC');
    return result.recordset;
};

const taoTacGia = async ({ ten_tac_gia, tieu_su }) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('ten_tac_gia', sql.NVarChar(150), ten_tac_gia.trim())
        .input('tieu_su', sql.NVarChar(sql.MAX), tieu_su || null)
        .query('INSERT INTO TacGia (ten_tac_gia, tieu_su) OUTPUT INSERTED.* VALUES (@ten_tac_gia, @tieu_su)');
    return result.recordset[0];
};

module.exports = { layTatCaTheLoai, layTheLoaiTheoKhuVuc, taoTheLoai, layTatCaTacGia, taoTacGia };