const express = require('express');
const router = express.Router();
const sachController = require('../controllers/sachController');
const upload = require('../config/upload');
const { batBuocDangNhap, xacThucTuyChon } = require('../middlewares/authMiddleware');
const { chiChoPhepAdmin } = require('../middlewares/roleMiddleware');

router.get('/', xacThucTuyChon, sachController.layDanhSachSach);
router.get('/:id', sachController.layChiTietSach);
router.post('/', batBuocDangNhap, chiChoPhepAdmin, upload.single('anh_bia'), sachController.taoSach);
router.put('/:id', batBuocDangNhap, chiChoPhepAdmin, upload.single('anh_bia'), sachController.capNhatSach);
router.post('/:id/nhap-epub', batBuocDangNhap, chiChoPhepAdmin, upload.single('file_epub'), sachController.nhapEpub);
router.delete('/:id', batBuocDangNhap, chiChoPhepAdmin, sachController.xoaSach);

module.exports = router;