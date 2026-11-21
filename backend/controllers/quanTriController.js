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

const taoAdmin = async (req, res) => {
    try {
        const duLieu = await quanTriService.taoTaiKhoanAdmin(req.nguoiDung, req.body);
        res.status(201).json({
            thanh_cong: true,
            thong_bao: `Đã cấp tài khoản Admin "${duLieu.ten_dang_nhap}" thành công!`,
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const doiTrangThaiNguoiDung = async (req, res) => {
    try {
        await quanTriService.doiTrangThaiNguoiDung(
            req.nguoiDung,
            parseInt(req.params.id, 10),
            req.body.trang_thai
        );
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật trạng thái tài khoản thành công!' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layGoiNap = async (req, res) => {
    try {
        const duLieu = await quanTriService.layDanhSachGoiNap();
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const taoGoiNap = async (req, res) => {
    try {
        const duLieu = await quanTriService.taoGoiNap(req.body);
        res.status(201).json({
            thanh_cong: true,
            thong_bao: `Đã thêm gói nạp "${duLieu.ten_goi}" thành công!`,
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const capNhatGoiNap = async (req, res) => {
    try {
        const duLieu = await quanTriService.capNhatGoiNap(parseInt(req.params.id, 10), req.body);
        res.json({
            thanh_cong: true,
            thong_bao: 'Cập nhật gói nạp Xu thành công!',
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const doiTrangThaiGoiNap = async (req, res) => {
    try {
        const duLieu = await quanTriService.doiTrangThaiGoiNap(
            parseInt(req.params.id, 10),
            req.body.dang_hoat_dong
        );
        res.json({
            thanh_cong: true,
            thong_bao: duLieu.dang_hoat_dong ? 'Đã mở bán gói nạp Xu.' : 'Đã tạm ngưng gói nạp Xu.',
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xoaGoiNap = async (req, res) => {
    try {
        await quanTriService.xoaGoiNap(parseInt(req.params.id, 10));
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa gói nạp Xu.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = {
    layThongKe,
    layNguoiDung,
    taoAdmin,
    doiTrangThaiNguoiDung,
    layGoiNap,
    taoGoiNap,
    capNhatGoiNap,
    doiTrangThaiGoiNap,
    xoaGoiNap
};