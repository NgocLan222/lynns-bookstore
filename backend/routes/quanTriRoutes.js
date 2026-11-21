const express = require('express');
const router = express.Router();
const quanTriController = require('../controllers/quanTriController');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');
const { chiChoPhepAdmin } = require('../middlewares/roleMiddleware');

router.use(batBuocDangNhap, chiChoPhepAdmin);

router.get('/thong-ke', quanTriController.layThongKe);
router.get('/nguoi-dung', quanTriController.layNguoiDung);
router.post('/nguoi-dung/tao-admin', quanTriController.taoAdmin);
router.put('/nguoi-dung/:id/trang-thai', quanTriController.doiTrangThaiNguoiDung);

module.exports = router;