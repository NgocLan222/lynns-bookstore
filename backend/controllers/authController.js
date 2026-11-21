const authService = require('../services/authService');

const dangKy = async (req, res) => {
    try {
        const duLieu = await authService.dangKy(req.body);
        res.status(201).json({ thanh_cong: true, thong_bao: 'Đăng ký thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const dangNhap = async (req, res) => {
    try {
        const duLieu = await authService.dangNhap(req.body);
        res.json({ thanh_cong: true, thong_bao: 'Đăng nhập thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const layThongTinToi = (req, res) => {
    res.json({ thanh_cong: true, du_lieu: req.nguoiDung });
};

const doiMatKhau = async (req, res) => {
    try {
        await authService.doiMatKhau(req.nguoiDung.ma_nguoi_dung, req.body);
        res.json({ thanh_cong: true, thong_bao: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const capNhatHoSo = async (req, res) => {
    try {
        const anhDaiDien = req.file ? `/${req.file.path.replace(/\\/g, '/')}` : undefined;
        const duLieu = await authService.capNhatHoSo(req.nguoiDung.ma_nguoi_dung, {
            ho_ten: req.body.ho_ten,
            anh_dai_dien: anhDaiDien
        });
        res.json({ thanh_cong: true, thong_bao: 'Cập nhật hồ sơ thành công!', du_lieu: duLieu });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const guiMaQuenMatKhau = async (req, res) => {
    try {
        await authService.guiMaQuenMatKhau(req.body);
        res.json({
            thanh_cong: true,
            thong_bao: 'Mã xác nhận OTP 6 chữ số đã được gửi tới email của bạn!'
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const xacThucMaOTP = async (req, res) => {
    try {
        await authService.xacThucMaOTP(req.body);
        res.json({ thanh_cong: true, thong_bao: 'Xác thực OTP thành công! Hãy nhập mật khẩu mới.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

const datLaiMatKhau = async (req, res) => {
    try {
        await authService.datLaiMatKhauQuaOTP(req.body);
        res.json({ thanh_cong: true, thong_bao: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ thanh_cong: false, thong_bao: error.message });
    }
};

module.exports = {
    dangKy,
    dangNhap,
    layThongTinToi,
    doiMatKhau,
    capNhatHoSo,
    guiMaQuenMatKhau,
    xacThucMaOTP,
    datLaiMatKhau
};