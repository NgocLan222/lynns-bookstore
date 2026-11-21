const quanTriService = require('../services/quanTriService');

const layThongKe = async (req, res) => {
    try {
        const duLieu = await quanTriService.layThongKeDashboard(req.query.ky_han);
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layNguoiDung = async (req, res) => {
    try {
        const duLieu = await quanTriService.layDanhSachNguoiDung();
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const doiTrangThaiNguoiDung = async (req, res) => {
    try {
        await quanTriService.doiTrangThaiNguoiDung(
            req.nguoiDung.ma_nguoi_dung,
            parseInt(req.params.id, 10),
            req.body.trang_thai
        );
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật trạng thái tài khoản thành công!' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = { layThongKe, layNguoiDung, doiTrangThaiNguoiDung };