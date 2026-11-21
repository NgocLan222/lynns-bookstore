const { giaiMaToken } = require('../utils/jwtHelper');
const { sql, poolPromise } = require('../config/db');

const batBuocDangNhap = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ thanh_cong: false, thong_bao: 'Vui lòng đăng nhập để tiếp tục.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = giaiMaToken(token);

        const pool = await poolPromise;
        const result = await pool.request()
    .input('ma_nguoi_dung', sql.Int, decoded.ma_nguoi_dung)
    .query('SELECT ma_nguoi_dung, ten_dang_nhap, email, ho_ten, anh_dai_dien, vai_tro, so_du_xu, trang_thai FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');
        const user = result.recordset[0];
        if (!user) {
            return res.status(401).json({ thanh_cong: false, thong_bao: 'Tài khoản không tồn tại.' });
        }
        if (user.trang_thai === 'BI_KHOA') {
            return res.status(403).json({ thanh_cong: false, thong_bao: 'Tài khoản của bạn đã bị khóa.' });
        }

        req.nguoiDung = user;
        next();
    } catch (error) {
        return res.status(401).json({ thanh_cong: false, thong_bao: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
    }
};

const xacThucTuyChon = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.nguoiDung = null;
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = giaiMaToken(token);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('ma_nguoi_dung', sql.Int, decoded.ma_nguoi_dung)
            .query('SELECT ma_nguoi_dung, vai_tro, trang_thai FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');

        const user = result.recordset[0];
        req.nguoiDung = (user && user.trang_thai === 'HOAT_DONG') ? user : null;
        next();
    } catch {
        req.nguoiDung = null;
        next();
    }
};

module.exports = { batBuocDangNhap, xacThucTuyChon };