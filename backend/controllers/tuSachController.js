const tuSachService = require('../services/tuSachService');

const layTuSach = async (req, res) => {
    try {
        const duLieu = await tuSachService.layTuSachCaNhan(req.nguoiDung.ma_nguoi_dung);
        res.json({ thanh_cong: true, du_lieu: duLieu });
    } catch (error) {
        res.status(500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const luuTienDo = async (req, res) => {
    try {
        await tuSachService.capNhatTienDo(req.nguoiDung.ma_nguoi_dung, req.body);
        res.json({ thanh_cong: true });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const doiYeuThich = async (req, res) => {
    try {
        const duLieu = await tuSachService.batTatYeuThich(
            req.nguoiDung.ma_nguoi_dung,
            parseInt(req.params.ma_sach, 10)
        );
        res.json({
            thanh_cong: true,
            thong_bao: duLieu.yeu_thich ? 'Đã thêm vào danh sách yêu thích.' : 'Đã bỏ khỏi danh sách yêu thích.',
            du_lieu: duLieu
        });
    } catch (error) {
        res.status(400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = { layTuSach, luuTienDo, doiYeuThich };