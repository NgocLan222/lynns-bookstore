const sachService = require('../services/sachService');
const epubService = require('../services/epubService');

const layDanhSachSach = async (req, res) => {
    try {
        const laAdmin = req.nguoiDung && req.nguoiDung.vai_tro === 'admin';
        const duLieu = await sachService.layDanhSachSach({
            ...req.query,
            bao_gom_an: laAdmin && req.query.bao_gom_an === 'true'
        });
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layChiTietSach = async (req, res) => {
    try {
        const duLieu = await sachService.layChiTietSach(parseInt(req.params.id, 10));
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const taoSach = async (req, res) => {
    try {
        const anhBia = req.file ? `/${req.file.path.replace(/\\/g, '/')}` : null;
        const duLieu = await sachService.taoSach({ ...req.body, anh_bia: anhBia });
        res.status(201).json({ thanh_cong: true, thong_bao: 'Tạo đầu sách thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const capNhatSach = async (req, res) => {
    try {
        const anhBia = req.file ? `/${req.file.path.replace(/\\/g, '/')}` : undefined;
        const duLieu = await sachService.capNhatSach(parseInt(req.params.id, 10), { ...req.body, anh_bia: anhBia });
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật sách thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const nhapEpub = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ thanh_cong: false, thong_bao: 'Vui lòng chọn tệp .epub để tải lên.' });
        }
        const ketQua = await epubService.nhapChuongTuEpub(parseInt(req.params.id, 10), req.file.path);
        res.json({
            thanh_cong: true,
            thong_bao: `Đã trích xuất và thêm thành công ${ketQua.so_chuong_da_them} chương!`,
            du_lieu: ketQua
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ thanh_cong: false, thong_bao: error.message });
    }
};
const xoaSach = async (req, res) => {
    try {
        await sachService.xoaSach(parseInt(req.params.id, 10));
        res.json({ thanh_cong: true, thong_bao: 'Đã xóa tác phẩm thành công.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = { layDanhSachSach, layChiTietSach, taoSach, capNhatSach, nhapEpub, xoaSach };