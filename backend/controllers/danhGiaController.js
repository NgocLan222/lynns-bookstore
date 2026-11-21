const danhGiaService = require('../services/danhGiaService');

const layDanhGia = async (req, res) => {
    try {
        const duLieu = await danhGiaService.layDanhGiaTheoSach(parseInt(req.params.ma_sach, 10));
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const guiDanhGia = async (req, res) => {
    try {
        await danhGiaService.guiDanhGia(req.nguoiDung.ma_nguoi_dung, req.body);
        res.status(201).json({ thanh_cong: true, thong_bao: 'Gửi đánh giá thành công!' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const suaDanhGia = async (req, res) => {
    try {
        await danhGiaService.suaDanhGia(parseInt(req.params.id, 10), req.nguoiDung.ma_nguoi_dung, req.body);
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật đánh giá thành công!' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xoaDanhGia = async (req, res) => {
    try {
        await danhGiaService.xoaDanhGia(parseInt(req.params.id, 10), req.nguoiDung);
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa đánh giá.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const guiPhanHoi = async (req, res) => {
    try {
        await danhGiaService.themPhanHoiDanhGia(parseInt(req.params.id, 10), req.nguoiDung.ma_nguoi_dung, req.body);
        res.status(201).json({ thanh_cong: true, thong_bao: 'Đã gửi phản hồi.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xoaPhanHoi = async (req, res) => {
    try {
        await danhGiaService.xoaPhanHoiDanhGia(parseInt(req.params.ma_phan_hoi, 10), req.nguoiDung);
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa phản hồi.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layBinhLuanChuong = async (req, res) => {
    try {
        const duLieu = await danhGiaService.layBinhLuanTheoChuong(parseInt(req.params.ma_chuong, 10));
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const guiBinhLuanChuong = async (req, res) => {
    try {
        await danhGiaService.guiBinhLuanChuong(
            parseInt(req.params.ma_chuong, 10),
            req.nguoiDung.ma_nguoi_dung,
            req.body
        );
        res.status(201).json({ thanh_cong: true, thong_bao: 'Đã đăng bình luận.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const suaBinhLuanChuong = async (req, res) => {
    try {
        await danhGiaService.suaBinhLuanChuong(
            parseInt(req.params.ma_binh_luan, 10),
            req.nguoiDung.ma_nguoi_dung,
            req.body
        );
        res.json({ thanh_cong: true, thong_bao: 'Đã cập nhật bình luận.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xoaBinhLuanChuong = async (req, res) => {
    try {
        await danhGiaService.xoaBinhLuanChuong(parseInt(req.params.ma_binh_luan, 10), req.nguoiDung);
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa bình luận.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layThongBao = async (req, res) => {
    try {
        const duLieu = await danhGiaService.layThongBaoNguoiDung(req.nguoiDung.ma_nguoi_dung);
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const daDocThongBao = async (req, res) => {
    try {
        await danhGiaService.danhDauDaDocThongBao(parseInt(req.params.id, 10), req.nguoiDung.ma_nguoi_dung);
        res.json({ thanh_cong: true });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const docTatCaThongBao = async (req, res) => {
    try {
        await danhGiaService.danhDauDocTatCaThongBao(req.nguoiDung.ma_nguoi_dung);
        res.json({ thanh_cong: true });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = {
    layDanhGia,
    guiDanhGia,
    suaDanhGia,
    xoaDanhGia,
    guiPhanHoi,
    xoaPhanHoi,
    layBinhLuanChuong,
    guiBinhLuanChuong,
    suaBinhLuanChuong,
    xoaBinhLuanChuong,
    layThongBao,
    daDocThongBao,
    docTatCaThongBao,
};