const danhMucService = require('../services/danhMucService');

const layTheLoai = async (req, res) => {
    try {
        const { hinh_thuc_ban, loai_sach } = req.query;
        const duLieu = (hinh_thuc_ban || loai_sach)
            ? await danhMucService.layTheLoaiTheoKhuVuc({ hinh_thuc_ban, loai_sach })
            : await danhMucService.layTatCaTheLoai();
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const taoTheLoai = async (req, res) => {
    try {
        const duLieu = await danhMucService.taoTheLoai(req.body);
        res.status(201).json({ thanh_cong: true, thong_bao: 'Thêm thể loại thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layTacGia = async (req, res) => {
    try {
        const duLieu = await danhMucService.layTatCaTacGia();
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const taoTacGia = async (req, res) => {
    try {
        const duLieu = await danhMucService.taoTacGia(req.body);
        res.status(201).json({ thanh_cong: true, thong_bao: 'Thêm tác giả thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = { layTheLoai, taoTheLoai, layTacGia, taoTacGia };