const chuongService = require('../services/chuongService');

const layFileTuReq = (req, field) => {
    const f = req.files?.[field]?.[0];
    return f ? `/${f.path.replace(/\\/g, '/')}` : undefined;
};

const layNoiDungChuong = async (req, res) => {
    try {
        const duLieu = await chuongService.layNoiDungChuong(parseInt(req.params.id, 10), req.nguoiDung);
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            thanh_cong: false,
            ma_loi: error.ma_loi || null,
            thong_bao: error.message
        });
    }
};

const layTrangThaiSoHuu = async (req, res) => {
    try {
        const duLieu = await chuongService.layTrangThaiSoHuuSach(
            parseInt(req.params.ma_sach, 10),
            req.nguoiDung.ma_nguoi_dung
        );
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const taoChuong = async (req, res) => {
    try {
        const duongDanAudio = layFileTuReq(req, 'audio') || null;
        const anhNen = layFileTuReq(req, 'anh_nen') || null;
        const duLieu = await chuongService.taoChuong(parseInt(req.params.ma_sach, 10), {
            ...req.body,
            duong_dan_audio: duongDanAudio,
            anh_nen: anhNen
        });
        res.status(201).json({ thanh_cong: true, thong_bao: 'Thêm chương mới thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const capNhatChuong = async (req, res) => {
    try {
        const duongDanAudio = layFileTuReq(req, 'audio');
        const anhNen = layFileTuReq(req, 'anh_nen');
        const duLieu = await chuongService.capNhatChuong(parseInt(req.params.id, 10), {
            ...req.body,
            duong_dan_audio: duongDanAudio,
            anh_nen: anhNen
        });
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật chương thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xoaChuong = async (req, res) => {
    try {
        await chuongService.xoaChuong(parseInt(req.params.id, 10));
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa chương sách.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const capNhatGiaHangLoat = async (req, res) => {
    try {
        await chuongService.capNhatGiaHangLoat(parseInt(req.params.ma_sach, 10), req.body);
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật giá thu phí hàng loạt thành công!' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = {
    layNoiDungChuong,
    layTrangThaiSoHuu,
    taoChuong,
    capNhatChuong,
    xoaChuong,
    capNhatGiaHangLoat
};