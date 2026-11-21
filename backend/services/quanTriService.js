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
            (SELECT ISNULL(SUM(so_tien_vnd), 0) FROM LichSuGiaoDich WHERE loai_giao_dich = 'NAP_XU' AND trang_thai = 'THANH_CONG') AS tong_doanh_thu_vnd,
            (SELECT ISNULL(SUM(ABS(bien_dong_xu)), 0) FROM LichSuGiaoDich WHERE loai_giao_dich <> 'NAP_XU' AND trang_thai = 'THANH_CONG') AS tong_xu_tieu_thu
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
            ISNULL(SUM(so_tien_vnd), 0) AS doanh_thu_vnd
        FROM LichSuGiaoDich
        WHERE loai_giao_dich = 'NAP_XU' AND trang_thai = 'THANH_CONG' ${dieuKienNgay}
        GROUP BY CONVERT(VARCHAR(10), ngay_tao, 23)
        ORDER BY moc_thoi_gian ASC
    `);

    const coCauRes = await pool.request().query(`
        SELECT
            loai_giao_dich,
            ISNULL(SUM(ABS(bien_dong_xu)), 0) AS tong_xu
        FROM LichSuGiaoDich
        WHERE loai_giao_dich <> 'NAP_XU' AND trang_thai = 'THANH_CONG'
        GROUP BY loai_giao_dich
    `);

    const topSachRes = await pool.request().query(`
        SELECT TOP 5
            s.ma_sach,
            s.tieu_de,
            s.hinh_thuc_ban,
            ISNULL(s.luot_xem, 0) AS luot_xem,
            (
                ISNULL((SELECT COUNT(*) FROM SachDaMua sdm WHERE sdm.ma_sach = s.ma_sach), 0) * ISNULL(s.gia_tron_quyen_xu, 0)
                + ISNULL((
                    SELECT SUM(ISNULL(c.gia_xu, 0))
                    FROM ChuongDaMoKhoa cdm
                    INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong
                    WHERE c.ma_sach = s.ma_sach
                ), 0)
            ) AS doanh_thu_xu
        FROM Sach s
        ORDER BY ISNULL(s.luot_xem, 0) DESC, s.ma_sach DESC
    `);

    const giaoDichGanDayRes = await pool.request().query(`
        SELECT TOP 10 gd.*, nd.ten_dang_nhap, nd.ho_ten
        FROM LichSuGiaoDich gd
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

// ===== QUẢN LÝ GÓI NẠP XU =====
const layDanhSachGoiNap = async () => {
    const pool = await poolPromise;
    const res = await pool.request().query(`
        SELECT ma_goi, ten_goi, gia_tien_vnd, so_xu_nhan, dang_hoat_dong
        FROM GoiNapXu
        ORDER BY gia_tien_vnd ASC, ma_goi ASC
    `);
    return res.recordset;
};

const taoGoiNap = async ({ ten_goi, gia_tien_vnd, so_xu_nhan, dang_hoat_dong }) => {
    const tenGoi = (ten_goi || '').trim();
    const giaTien = parseInt(gia_tien_vnd, 10);
    const soXu = parseInt(so_xu_nhan, 10);
    const hoatDong = dang_hoat_dong === false || dang_hoat_dong === 0 ? 0 : 1;

    if (!tenGoi || Number.isNaN(giaTien) || giaTien <= 0 || Number.isNaN(soXu) || soXu <= 0) {
        const err = new Error('Vui lòng nhập tên gói hợp lệ, giá tiền (VNĐ) và số Xu lớn hơn 0.');
        err.statusCode = 400;
        throw err;
    }

    const pool = await poolPromise;
    const res = await pool.request()
        .input('ten_goi', sql.NVarChar(100), tenGoi)
        .input('gia_tien_vnd', sql.Int, giaTien)
        .input('so_xu_nhan', sql.Int, soXu)
        .input('dang_hoat_dong', sql.Bit, hoatDong)
        .query(`
            INSERT INTO GoiNapXu (ten_goi, gia_tien_vnd, so_xu_nhan, dang_hoat_dong)
            OUTPUT INSERTED.*
            VALUES (@ten_goi, @gia_tien_vnd, @so_xu_nhan, @dang_hoat_dong)
        `);

    return res.recordset[0];
};

const capNhatGoiNap = async (maGoi, { ten_goi, gia_tien_vnd, so_xu_nhan, dang_hoat_dong }) => {
    const tenGoi = (ten_goi || '').trim();
    const giaTien = parseInt(gia_tien_vnd, 10);
    const soXu = parseInt(so_xu_nhan, 10);
    const hoatDong = dang_hoat_dong === false || dang_hoat_dong === 0 ? 0 : 1;

    if (!tenGoi || Number.isNaN(giaTien) || giaTien <= 0 || Number.isNaN(soXu) || soXu <= 0) {
        const err = new Error('Vui lòng nhập tên gói hợp lệ, giá tiền (VNĐ) và số Xu lớn hơn 0.');
        err.statusCode = 400;
        throw err;
    }

    const pool = await poolPromise;
    const kq = await pool.request()
        .input('ma_goi', sql.Int, maGoi)
        .input('ten_goi', sql.NVarChar(100), tenGoi)
        .input('gia_tien_vnd', sql.Int, giaTien)
        .input('so_xu_nhan', sql.Int, soXu)
        .input('dang_hoat_dong', sql.Bit, hoatDong)
        .query(`
            UPDATE GoiNapXu
            SET ten_goi = @ten_goi,
                gia_tien_vnd = @gia_tien_vnd,
                so_xu_nhan = @so_xu_nhan,
                dang_hoat_dong = @dang_hoat_dong
            OUTPUT INSERTED.*
            WHERE ma_goi = @ma_goi
        `);

    if (kq.recordset.length === 0) {
        const err = new Error('Không tìm thấy gói nạp Xu.');
        err.statusCode = 404;
        throw err;
    }

    return kq.recordset[0];
};

const doiTrangThaiGoiNap = async (maGoi, dangHoatDong) => {
    const pool = await poolPromise;
    const bitVal = dangHoatDong ? 1 : 0;

    const kq = await pool.request()
        .input('ma_goi', sql.Int, maGoi)
        .input('dang_hoat_dong', sql.Bit, bitVal)
        .query(`
            UPDATE GoiNapXu
            SET dang_hoat_dong = @dang_hoat_dong
            OUTPUT INSERTED.*
            WHERE ma_goi = @ma_goi
        `);

    if (kq.recordset.length === 0) {
        const err = new Error('Không tìm thấy gói nạp Xu.');
        err.statusCode = 404;
        throw err;
    }

    return kq.recordset[0];
};

const xoaGoiNap = async (maGoi) => {
    const pool = await poolPromise;
    const kq = await pool.request()
        .input('ma_goi', sql.Int, maGoi)
        .query('DELETE FROM GoiNapXu WHERE ma_goi = @ma_goi');

    if (kq.rowsAffected[0] === 0) {
        const err = new Error('Không tìm thấy gói nạp Xu để xóa.');
        err.statusCode = 404;
        throw err;
    }
};

module.exports = {
    layThongKeDashboard,
    layDanhSachNguoiDung,
    taoTaiKhoanAdmin,
    doiTrangThaiNguoiDung,
    layDanhSachGoiNap,
    taoGoiNap,
    capNhatGoiNap,
    doiTrangThaiGoiNap,
    xoaGoiNap
};