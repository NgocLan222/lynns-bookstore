const express = require('express');
const router = express.Router();
const danhGiaController = require('../controllers/danhGiaController');
const { batBuocDangNhap } = require('../middlewares/authMiddleware');

// Thông báo phản hồi
router.get('/thong-bao', batBuocDangNhap, danhGiaController.layThongBao);
router.put('/thong-bao/doc-tat-ca', batBuocDangNhap, danhGiaController.docTatCaThongBao);
router.put('/thong-bao/:id/da-doc', batBuocDangNhap, danhGiaController.daDocThongBao);

// Đánh giá tổng cuốn sách
router.get('/sach/:ma_sach', danhGiaController.layDanhGia);
router.post('/', batBuocDangNhap, danhGiaController.guiDanhGia);
router.post('/:id/phan-hoi', batBuocDangNhap, danhGiaController.guiPhanHoi);
router.delete('/phan-hoi/:ma_phan_hoi', batBuocDangNhap, danhGiaController.xoaPhanHoi);

// Bình luận theo từng chương / tập
router.get('/chuong/:ma_chuong', danhGiaController.layBinhLuanChuong);
router.post('/chuong/:ma_chuong', batBuocDangNhap, danhGiaController.guiBinhLuanChuong);
router.put('/binh-luan/:ma_binh_luan', batBuocDangNhap, danhGiaController.suaBinhLuanChuong);
router.delete('/binh-luan/:ma_binh_luan', batBuocDangNhap, danhGiaController.xoaBinhLuanChuong);

router.put('/:id', batBuocDangNhap, danhGiaController.suaDanhGia);
router.delete('/:id', batBuocDangNhap, danhGiaController.xoaDanhGia);

module.exports = router;