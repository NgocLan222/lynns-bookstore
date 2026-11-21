const viXuService = require('../services/viXuService');

const layGoiNap = async (req, res) => {
    try {
        const duLieu = await viXuService.layGoiNapXu();
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const napXu = async (req, res) => {
    try {
        const duLieu = await viXuService.napXuGiaLap(req.nguoiDung.ma_nguoi_dung, req.body);
        res.json({
            thanh_cong: true,
            thong_bao: duLieu.trang_thai === 'THANH_CONG' ? 'Nạp Xu thành công!' : 'Đã hủy giao dịch nạp Xu.',
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const moKhoaLe = async (req, res) => {
    try {
        const duLieu = await viXuService.moKhoaChuongLe(
            req.nguoiDung.ma_nguoi_dung,
            parseInt(req.body.ma_chuong, 10)
        );
        res.json({ thanh_cong: true, thong_bao: 'Mở khóa chương thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const moKhoaHangLoat = async (req, res) => {
    try {
        const { ma_sach, danh_sach_ma_chuong } = req.body;
        const duLieu = await viXuService.moKhoaChuongHangLoat(
            req.nguoiDung.ma_nguoi_dung,
            parseInt(ma_sach, 10),
            danh_sach_ma_chuong
        );
        res.json({
            thanh_cong: true,
            thong_bao: `Đã mở khóa thành công ${duLieu.so_chuong_da_mo} chương!`,
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const muaTronQuyen = async (req, res) => {
    try {
        const duLieu = await viXuService.muaTronQuyen(
            req.nguoiDung.ma_nguoi_dung,
            parseInt(req.body.ma_sach, 10)
        );
        res.json({ thanh_cong: true, thong_bao: 'Mua trọn quyển thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layLichSu = async (req, res) => {
    try {
        const duLieu = await viXuService.layLichSuGiaoDich(req.nguoiDung.ma_nguoi_dung);
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = { layGoiNap, napXu, moKhoaLe, moKhoaHangLoat, muaTronQuyen, layLichSu };