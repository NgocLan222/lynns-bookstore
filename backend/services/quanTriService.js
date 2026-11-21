const { sql, poolPromise } = require('../config/db');

const layThongKeDashboard = async (kyHan = '7_ngay') => {
    const pool = await poolPromise;

    const kpiRes = await pool.request().query(`
        SELECT
            (SELECT ISNULL(SUM(so_tien_vnd), 0) FROM LichSuGiaoDich WHERE loai_giao_dich = 'NAP_XU' AND trang_thai = 'THANH_CONG') AS tong_doanh_thu_vnd,
            (SELECT ISNULL(SUM(ABS(bien_dong_xu)), 0) FROM LichSuGiaoDich WHERE loai_giao_dich <> 'NAP_XU' AND trang_thai = 'THANH_CONG') AS tong_xu_tieu_thu,
            (SELECT COUNT(*) FROM Sach) AS tong_so_sach,
            (SELECT COUNT(*) FROM ChuongSach) AS tong_so_chuong,
            (SELECT COUNT(*) FROM NguoiDung WHERE vai_tro = 'doc_gia') AS tong_doc_gia
    `);

    let dieuKienThoiGian = 'ngay_tao >= DATEADD(DAY, -7, GETDATE())';
    let nhomThoiGian = 'CONVERT(VARCHAR(10), ngay_tao, 23)';

    if (kyHan === '30_ngay') {
        dieuKienThoiGian = 'ngay_tao >= DATEADD(DAY, -30, GETDATE())';
    } else if (kyHan === 'nam_nay') {
        dieuKienThoiGian = 'YEAR(ngay_tao) = YEAR(GETDATE())';
        nhomThoiGian = "CAST(YEAR(ngay_tao) AS VARCHAR) + '-' + RIGHT('0' + CAST(MONTH(ngay_tao) AS VARCHAR), 2)";
    }

    const bieuDoThoiGianRes = await pool.request().query(`
        SELECT ${nhomThoiGian} AS moc_thoi_gian,
               ISNULL(SUM(CASE WHEN loai_giao_dich = 'NAP_XU' THEN so_tien_vnd ELSE 0 END), 0) AS doanh_thu_vnd,
               ISNULL(SUM(CASE WHEN loai_giao_dich <> 'NAP_XU' THEN ABS(bien_dong_xu) ELSE 0 END), 0) AS xu_tieu_thu
        FROM LichSuGiaoDich
        WHERE trang_thai = 'THANH_CONG' AND ${dieuKienThoiGian}
        GROUP BY ${nhomThoiGian}
        ORDER BY moc_thoi_gian ASC
    `);

    const coCauXuRes = await pool.request().query(`
        SELECT loai_giao_dich, ISNULL(SUM(ABS(bien_dong_xu)), 0) AS tong_xu
        FROM LichSuGiaoDich
        WHERE trang_thai = 'THANH_CONG' AND loai_giao_dich <> 'NAP_XU'
        GROUP BY loai_giao_dich
    `);

    const topSachRes = await pool.request().query(`
        SELECT TOP 5 s.ma_sach, s.tieu_de, s.anh_bia, s.hinh_thuc_ban, s.luot_xem, s.diem_danh_gia_tb,
               ISNULL(mua.tong_xu_tron_quyen, 0) + ISNULL(chuong.tong_xu_chuong, 0) AS doanh_thu_xu
        FROM Sach s
        LEFT JOIN (
            SELECT sdm.ma_sach, COUNT(*) * MAX(s2.gia_tron_quyen_xu) AS tong_xu_tron_quyen
            FROM SachDaMua sdm
            INNER JOIN Sach s2 ON sdm.ma_sach = s2.ma_sach
            GROUP BY sdm.ma_sach
        ) mua ON s.ma_sach = mua.ma_sach
        LEFT JOIN (
            SELECT c.ma_sach, SUM(c.gia_xu) AS tong_xu_chuong
            FROM ChuongDaMoKhoa cdm
            INNER JOIN ChuongSach c ON cdm.ma_chuong = c.ma_chuong
            GROUP BY c.ma_sach
        ) chuong ON s.ma_sach = chuong.ma_sach
        ORDER BY doanh_thu_xu DESC, s.luot_xem DESC
    `);

    const giaoDichGanDayRes = await pool.request().query(`
        SELECT TOP 10 gd.*, nd.ten_dang_nhap, nd.ho_ten
        FROM LichSuGiaoDich gd
        INNER JOIN NguoiDung nd ON gd.ma_nguoi_dung = nd.ma_nguoi_dung
        ORDER BY gd.ngay_tao DESC
    `);

    return {
        kpi: kpiRes.recordset[0],
        bieu_do_thoi_gian: bieuDoThoiGianRes.recordset,
        co_cau_xu: coCauXuRes.recordset,
        top_sach: topSachRes.recordset,
        giao_dich_gan_day: giaoDichGanDayRes.recordset
    };
};

const layDanhSachNguoiDung = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT ma_nguoi_dung, ten_dang_nhap, email, ho_ten, vai_tro, so_du_xu, trang_thai, ngay_tao
        FROM NguoiDung
        ORDER BY ngay_tao DESC
    `);
    return result.recordset;
};

const doiTrangThaiNguoiDung = async (maAdmin, maNguoiDungCanSua, trang_thai) => {
    if (maAdmin === maNguoiDungCanSua) {
        const err = new Error('Không thể tự khóa tài khoản của chính mình.');
        err.statusCode = 400;
        throw err;
    }
    if (!['HOAT_DONG', 'BI_KHOA'].includes(trang_thai)) {
        const err = new Error('Trạng thái không hợp lệ.');
        err.statusCode = 400;
        throw err;
    }

    const pool = await poolPromise;
    await pool.request()
        .input('ma_nguoi_dung', sql.Int, maNguoiDungCanSua)
        .input('trang_thai', sql.VarChar(20), trang_thai)
        .query('UPDATE NguoiDung SET trang_thai = @trang_thai WHERE ma_nguoi_dung = @ma_nguoi_dung');
};

module.exports = { layThongKeDashboard, layDanhSachNguoiDung, doiTrangThaiNguoiDung };