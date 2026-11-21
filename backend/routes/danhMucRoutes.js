const express = require('express');
const router = express.Router();
const danhMucController = require('../controllers/danhMucController');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');
const { chiChoPhepAdmin } = require('../middlewares/roleMiddleware');

router.get('/the-loai', danhMucController.layTheLoai);
router.post('/the-loai', batBuocDangNhap, chiChoPhepAdmin, danhMucController.taoTheLoai);
router.get('/tac-gia', danhMucController.layTacGia);
router.post('/tac-gia', batBuocDangNhap, chiChoPhepAdmin, danhMucController.taoTacGia);

module.exports = router;