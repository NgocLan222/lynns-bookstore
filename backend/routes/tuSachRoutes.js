const express = require('express');
const router = express.Router();
const tuSachController = require('../controllers/tuSachController');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');

router.get('/', batBuocDangNhap, tuSachController.layTuSach);
router.post('/tien-do', batBuocDangNhap, tuSachController.luuTienDo);
router.post('/yeu-thich/:ma_sach', batBuocDangNhap, tuSachController.doiYeuThich);

module.exports = router;