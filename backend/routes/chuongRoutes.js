const express = require('express');
const router = express.Router();
const chuongController = require('../controllers/chuongController');
const upload = require('../config/upload');
const { batBuocDangNhap, xacThucTuyChon } = require('../middlewares/authMiddleware');
const { chiChoPhepAdmin } = require('../middlewares/roleMiddleware');

const uploadTapVaNen = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'anh_nen', maxCount: 1 }
]);

router.get('/:id', xacThucTuyChon, chuongController.layNoiDungChuong);
router.get('/sach/:ma_sach/so-huu', batBuocDangNhap, chuongController.layTrangThaiSoHuu);

router.post('/sach/:ma_sach', batBuocDangNhap, chiChoPhepAdmin, uploadTapVaNen, chuongController.taoChuong);
router.put('/sach/:ma_sach/gia-hang-loat', batBuocDangNhap, chiChoPhepAdmin, chuongController.capNhatGiaHangLoat);
router.put('/:id', batBuocDangNhap, chiChoPhepAdmin, uploadTapVaNen, chuongController.capNhatChuong);
router.delete('/:id', batBuocDangNhap, chiChoPhepAdmin, chuongController.xoaChuong);

module.exports = router;