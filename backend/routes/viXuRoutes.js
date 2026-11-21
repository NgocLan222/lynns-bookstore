const express = require('express');
const router = express.Router();
const viXuController = require('../controllers/viXuController');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');

router.get('/goi-nap', viXuController.layGoiNap);
router.post('/nap-xu', batBuocDangNhap, viXuController.napXu);
router.post('/mo-khoa-le', batBuocDangNhap, viXuController.moKhoaLe);
router.post('/mo-khoa-hang-loat', batBuocDangNhap, viXuController.moKhoaHangLoat);
router.post('/mua-tron-quyen', batBuocDangNhap, viXuController.muaTronQuyen);
router.get('/lich-su', batBuocDangNhap, viXuController.layLichSu);

module.exports = router;