const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/upload');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');

router.post('/dang-ky', authController.dangKy);
router.post('/dang-nhap', authController.dangNhap);
router.get('/toi', batBuocDangNhap, authController.layThongTinToi);
router.put('/ho-so', batBuocDangNhap, upload.single('anh_dai_dien'), authController.capNhatHoSo);
router.put('/doi-mat-khau', batBuocDangNhap, authController.doiMatKhau);

// Quên mật khẩu qua OTP Email
router.post('/quen-mat-khau/gui-otp', authController.guiMaQuenMatKhau);
router.post('/quen-mat-khau/xac-thuc-otp', authController.xacThucMaOTP);
router.post('/quen-mat-khau/dat-lai', authController.datLaiMatKhau);

module.exports = router;