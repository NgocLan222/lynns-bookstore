const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('../config/db');

const laAdminChinh = (nguoiDung) =>
    nguoiDung?.ten_dang_nhap === 'admin' || nguoiDung?.ma_nguoi_dung === 2;

const layThongKeDashboard = async (kyHan = '7_ngay') => {
    const pool = await poolPromise;

    const tongQuanRes = await pool.request().query(`
        SELECT
            (SELECT COUNT(*) FROM Sach) AS tong_so_sach,
            (SELECT COUNT(*) FROM ChuongSach) AS tong_so_chuong,
            (SELECT COUNT(*) FROM NguoiDung WHERE vai_tro = 'doc_gia') AS tong_doc_gia,
            (SELECT ISNULL(SUM(CASE WHEN bien_dong_xu > 0 THEN so_tien_vnd ELSE 0 END), 0) FROM GiaoDichXu WHERE trang_thai = 'THANH_CONG') AS tong_doanh_thu_vnd,
            (SELECT ISNULL(SUM(CASE WHEN bien_dong_xu < 0 THEN ABS(bien_dong_xu) ELSE 0 END), 0) FROM GiaoDichXu WHERE trang_thai = 'THANH_CONG') AS tong_xu_tieu_thu
    `);

    let dieuKienNgay = `AND ngay_tao >= DATEADD(day, -6, CAST(GETDATE() AS DATE))`;
    if (kyHan === '30_ngay') {
        dieuKienNgay = `AND ngay_tao >= DATEADD(day, -29, CAST(GETDATE() AS DATE))`;
    } else if (kyHan === 'nam_nay') {
        dieuKienNgay = `AND YEAR(ngay_tao) = YEAR(GETDATE())`;
    }

    const bieuDoRes = await pool.request().query(`
        SELECT
            CONVERT(VARCHAR(10), ngay_tao, 23) AS moc_thoi_gian,
            ISNULL(SUM(CASE WHEN bien_dong_xu > 0 AND trang_thai = 'THANH_CONG' THEN so_tien_vnd ELSE 0 END), 0) AS doanh_thu_vnd
        FROM GiaoDichXu
        WHERE 1 = 1 ${dieuKienNgay}
        GROUP BY CONVERT(VARCHAR(10), ngay_tao, 23)
        ORDER BY moc_thoi_gian ASC
    `);

    const coCauRes = await pool.request().query(`
        SELECT
            loai_giao_dich,
            ISNULL(SUM(ABS(bien_dong_xu)), 0) AS tong_xu
        FROM GiaoDichXu
        WHERE bien_dong_xu < 0 AND trang_thai = 'THANH_CONG'
        GROUP BY loai_giao_dich
    `);

    const topSachRes = await pool.request().query(`
        SELECT TOP 5
            s.ma_sach,
            s.tieu_de,
            s.hinh_thuc_ban,
            ISNULL(s.luot_xem, 0) AS luot_xem,
            ISNULL(SUM(CASE WHEN gd.bien_dong_xu < 0 AND gd.trang_thai = 'THANH_CONG' THEN ABS(gd.bien_dong_xu) ELSE 0 END), 0) AS doanh_thu_xu
        FROM Sach s
        LEFT JOIN GiaoDichXu gd ON s.ma_sach = gd.ma_sach
        GROUP BY s.ma_sach, s.tieu_de, s.hinh_thuc_ban, s.luot_xem
        ORDER BY ISNULL(s.luot_xem, 0) DESC, s.ma_sach DESC
    `);

    const giaoDichGanDayRes = await pool.request().query(`
        SELECT TOP 10 gd.*, nd.ten_dang_nhap, nd.ho_ten
        FROM GiaoDichXu gd
        INNER JOIN NguoiDung nd ON gd.ma_nguoi_dung = nd.ma_nguoi_dung
        ORDER BY gd.ngay_tao DESC
    `);

    return {
        kpi: tongQuanRes.recordset[0] || {
            tong_so_sach: 0,
            tong_so_chuong: 0,
            tong_doc_gia: 0,
            tong_doanh_thu_vnd: 0,
            tong_xu_tieu_thu: 0,
        },
        bieu_do_thoi_gian: bieuDoRes.recordset || [],
        co_cau_xu: coCauRes.recordset || [],
        top_sach: topSachRes.recordset || [],
        giao_dich_gan_day: giaoDichGanDayRes.recordset || [],
    };
};

const layDanhSachNguoiDung = async () => {
    const pool = await poolPromise;
    const res = await pool.request().query(`
        SELECT ma_nguoi_dung, ten_dang_nhap, email, ho_ten, vai_tro, so_du_xu, trang_thai, ngay_tao
        FROM NguoiDung
        ORDER BY ma_nguoi_dung DESC
    `);
    return res.recordset;
};

const taoTaiKhoanAdmin = async (nguoiThucHien, { ten_dang_nhap, email, mat_khau, ho_ten }) => {
    if (!laAdminChinh(nguoiThucHien)) {
        const err = new Error('Chỉ tài khoản Admin chính mới có quyền cấp tài khoản quản trị viên mới.');
        err.statusCode = 403;
        throw err;
    }

    const tenDN = (ten_dang_nhap || '').trim();
    const emailSach = (email || '').trim().toLowerCase();
    const hoTenSach = (ho_ten || '').trim();
    const matKhauSach = mat_khau || '';

    if (!tenDN || !emailSach || !hoTenSach || matKhauSach.length < 6) {
        const err = new Error('Vui lòng nhập đầy đủ họ tên, tên đăng nhập, email và mật khẩu (tối thiểu 6 ký tự).');
        err.statusCode = 400;
        throw err;
    }

    const pool = await poolPromise;
    const trungRes = await pool.request()
        .input('ten_dang_nhap', sql.VarChar(100), tenDN)
        .input('email', sql.VarChar(150), emailSach)
        .query(`
            SELECT ma_nguoi_dung
            FROM NguoiDung
            WHERE ten_dang_nhap = @ten_dang_nhap OR LOWER(email) = @email
        `);

    if (trungRes.recordset.length > 0) {
        const err = new Error('Tên đăng nhập hoặc email đã tồn tại trong hệ thống.');
        err.statusCode = 400;
        throw err;
    }

    const matKhauHash = await bcrypt.hash(matKhauSach, 10);

    const kq = await pool.request()
        .input('ten_dang_nhap', sql.VarChar(100), tenDN)
        .input('email', sql.VarChar(150), emailSach)
        .input('mat_khau_hash', sql.VarChar(255), matKhauHash)
        .input('ho_ten', sql.NVarChar(150), hoTenSach)
        .query(`
            INSERT INTO NguoiDung (ten_dang_nhap, email, mat_khau_hash, ho_ten, vai_tro, so_du_xu, trang_thai)
            OUTPUT INSERTED.ma_nguoi_dung, INSERTED.ten_dang_nhap, INSERTED.email, INSERTED.ho_ten, INSERTED.vai_tro, INSERTED.so_du_xu, INSERTED.trang_thai
            VALUES (@ten_dang_nhap, @email, @mat_khau_hash, @ho_ten, 'admin', 0, 'HOAT_DONG')
        `);

    return kq.recordset[0];
};

const doiTrangThaiNguoiDung = async (nguoiThucHien, maNguoiDungMucTieu, trangThaiMoi) => {
    if (!['HOAT_DONG', 'BI_KHOA'].includes(trangThaiMoi)) {
        const err = new Error('Trạng thái tài khoản không hợp lệ.');
        err.statusCode = 400;
        throw err;
    }

    const pool = await poolPromise;
    const mucTieuRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, maNguoiDungMucTieu)
        .query('SELECT ma_nguoi_dung, ten_dang_nhap, vai_tro FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');

    const mucTieu = mucTieuRes.recordset[0];
    if (!mucTieu) {
        const err = new Error('Không tìm thấy tài khoản.');
        err.statusCode = 404;
        throw err;
    }

    if (maNguoiDungMucTieu === nguoiThucHien?.ma_nguoi_dung || laAdminChinh(mucTieu)) {
        const err = new Error('Không thể khóa hoặc thay đổi trạng thái tài khoản hiện tại / Admin chính.');
        err.statusCode = 400;
        throw err;
    }

    if (mucTieu.vai_tro === 'admin' && !laAdminChinh(nguoiThucHien)) {
        const err = new Error('Chỉ tài khoản Admin chính mới có quyền khóa/mở khóa tài khoản Quản trị viên.');
        err.statusCode = 403;
        throw err;
    }

    await pool.request()
        .input('ma_nguoi_dung', sql.Int, maNguoiDungMucTieu)
        .input('trang_thai', sql.VarChar(20), trangThaiMoi)
        .query('UPDATE NguoiDung SET trang_thai = @trang_thai WHERE ma_nguoi_dung = @ma_nguoi_dung');
};

module.exports = {
    layThongKeDashboard,
    layDanhSachNguoiDung,
    taoTaiKhoanAdmin,
    doiTrangThaiNguoiDung
};