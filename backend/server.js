const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { poolPromise } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const danhMucRoutes = require('./routes/danhMucRoutes');
const sachRoutes = require('./routes/sachRoutes');
const chuongRoutes = require('./routes/chuongRoutes');
const viXuRoutes = require('./routes/viXuRoutes');
const tuSachRoutes = require('./routes/tuSachRoutes');
const danhGiaRoutes = require('./routes/danhGiaRoutes');
const quanTriRoutes = require('./routes/quanTriRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/danh-muc', danhMucRoutes);
app.use('/api/sach', sachRoutes);
app.use('/api/chuong', chuongRoutes);
app.use('/api/vi-xu', viXuRoutes);
app.use('/api/tu-sach', tuSachRoutes);
app.use('/api/danh-gia', danhGiaRoutes);
app.use('/api/quan-tri', quanTriRoutes);

app.use((err, req, res, next) => {
    res.status(err.statusCode || 400).json({
        thanh_cong: false,
        thong_bao: err.message || 'Đã xảy ra lỗi trên máy chủ.'
    });
});

const khoiTaoCauTrucBoSung = async () => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF COL_LENGTH('ChuongSach', 'anh_nen') IS NULL
            BEGIN
                ALTER TABLE ChuongSach ADD anh_nen VARCHAR(255) NULL;
            END

            IF COL_LENGTH('DanhGia', 'ngay_cap_nhat') IS NULL
            BEGIN
                ALTER TABLE DanhGia ADD ngay_cap_nhat DATETIME NULL;
            END

            IF OBJECT_ID('PhanHoiDanhGia', 'U') IS NULL
            BEGIN
                CREATE TABLE PhanHoiDanhGia (
                    ma_phan_hoi INT IDENTITY(1,1) PRIMARY KEY,
                    ma_danh_gia INT NOT NULL,
                    ma_nguoi_dung INT NOT NULL,
                    noi_dung NVARCHAR(MAX) NOT NULL,
                    ngay_tao DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_PhanHoiDG_DanhGia FOREIGN KEY (ma_danh_gia) REFERENCES DanhGia(ma_danh_gia) ON DELETE CASCADE,
                    CONSTRAINT FK_PhanHoiDG_NguoiDung FOREIGN KEY (ma_nguoi_dung) REFERENCES NguoiDung(ma_nguoi_dung)
                );
            END

            IF OBJECT_ID('BinhLuanChuong', 'U') IS NULL
            BEGIN
                CREATE TABLE BinhLuanChuong (
                    ma_binh_luan INT IDENTITY(1,1) PRIMARY KEY,
                    ma_chuong INT NOT NULL,
                    ma_nguoi_dung INT NOT NULL,
                    ma_binh_luan_cha INT NULL,
                    noi_dung NVARCHAR(MAX) NOT NULL,
                    ngay_tao DATETIME DEFAULT GETDATE(),
                    ngay_cap_nhat DATETIME NULL,
                    CONSTRAINT FK_BinhLuanChuong_Chuong FOREIGN KEY (ma_chuong) REFERENCES ChuongSach(ma_chuong) ON DELETE CASCADE,
                    CONSTRAINT FK_BinhLuanChuong_NguoiDung FOREIGN KEY (ma_nguoi_dung) REFERENCES NguoiDung(ma_nguoi_dung)
                );
            END

            IF OBJECT_ID('ThongBao', 'U') IS NULL
            BEGIN
                CREATE TABLE ThongBao (
                    ma_thong_bao INT IDENTITY(1,1) PRIMARY KEY,
                    ma_nguoi_nhan INT NOT NULL,
                    ma_nguoi_gui INT NOT NULL,
                    noi_dung NVARCHAR(500) NOT NULL,
                    duong_dan VARCHAR(255) NOT NULL,
                    da_doc BIT DEFAULT 0,
                    ngay_tao DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_ThongBao_NguoiNhan FOREIGN KEY (ma_nguoi_nhan) REFERENCES NguoiDung(ma_nguoi_dung),
                    CONSTRAINT FK_ThongBao_NguoiGui FOREIGN KEY (ma_nguoi_gui) REFERENCES NguoiDung(ma_nguoi_dung)
                );
            END

            IF OBJECT_ID('MaXacThucOTP', 'U') IS NULL
            BEGIN
                CREATE TABLE MaXacThucOTP (
                    ma_otp INT IDENTITY(1,1) PRIMARY KEY,
                    email VARCHAR(100) NOT NULL,
                    ma_code VARCHAR(10) NOT NULL,
                    het_han DATETIME NOT NULL,
                    so_lan_sai INT DEFAULT 0,
                    da_su_dung BIT DEFAULT 0,
                    ngay_tao DATETIME DEFAULT GETDATE()
                );
            END
        `);
    } catch (error) {
        console.error('Lỗi khởi tạo cấu trúc bổ sung:', error.message);
    }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await khoiTaoCauTrucBoSung();
    console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
});