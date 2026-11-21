const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('../config/db');
const { taoToken } = require('../utils/jwtHelper');
const { guiEmailOTP } = require('../utils/emailHelper');

const taoLoi = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const dangKy = async ({ ten_dang_nhap, email, mat_khau, ho_ten }) => {
    if (!ten_dang_nhap || !email || !mat_khau || !ho_ten) {
        throw taoLoi(400, 'Vui lòng điền đầy đủ thông tin đăng ký.');
    }
    if (mat_khau.length < 6) {
        throw taoLoi(400, 'Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const pool = await poolPromise;
    const kiemTra = await pool.request()
        .input('ten_dang_nhap', sql.VarChar(50), ten_dang_nhap.trim())
        .input('email', sql.VarChar(100), email.trim())
        .query('SELECT ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = @ten_dang_nhap OR email = @email');

    if (kiemTra.recordset.length > 0) {
        throw taoLoi(409, 'Tên đăng nhập hoặc Email đã được sử dụng.');
    }

    const mat_khau_hash = await bcrypt.hash(mat_khau, 10);
    const themMoi = await pool.request()
        .input('ten_dang_nhap', sql.VarChar(50), ten_dang_nhap.trim())
        .input('email', sql.VarChar(100), email.trim())
        .input('mat_khau_hash', sql.VarChar(255), mat_khau_hash)
        .input('ho_ten', sql.NVarChar(100), ho_ten.trim())
        .query(`
            INSERT INTO NguoiDung (ten_dang_nhap, email, mat_khau_hash, ho_ten)
            OUTPUT INSERTED.ma_nguoi_dung, INSERTED.ten_dang_nhap, INSERTED.email, INSERTED.ho_ten, INSERTED.vai_tro, INSERTED.so_du_xu
            VALUES (@ten_dang_nhap, @email, @mat_khau_hash, @ho_ten)
        `);

    const nguoiDung = themMoi.recordset[0];
    const token = taoToken({ ma_nguoi_dung: nguoiDung.ma_nguoi_dung, vai_tro: nguoiDung.vai_tro });
    return { token, nguoi_dung: nguoiDung };
};

const dangNhap = async ({ tai_khoan, mat_khau }) => {
    if (!tai_khoan || !mat_khau) {
        throw taoLoi(400, 'Vui lòng nhập tên đăng nhập/email và mật khẩu.');
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('tai_khoan', sql.VarChar(100), tai_khoan.trim())
        .query('SELECT * FROM NguoiDung WHERE ten_dang_nhap = @tai_khoan OR email = @tai_khoan');

    const user = result.recordset[0];
    if (!user) {
        throw taoLoi(401, 'Tài khoản hoặc mật khẩu không chính xác.');
    }
    if (user.trang_thai === 'BI_KHOA') {
        throw taoLoi(403, 'Tài khoản của bạn đã bị khóa.');
    }

    const khopMatKhau = await bcrypt.compare(mat_khau, user.mat_khau_hash);
    if (!khopMatKhau) {
        throw taoLoi(401, 'Tài khoản hoặc mật khẩu không chính xác.');
    }

    const token = taoToken({ ma_nguoi_dung: user.ma_nguoi_dung, vai_tro: user.vai_tro });
    const { mat_khau_hash, ...thongTinAnToan } = user;
    return { token, nguoi_dung: thongTinAnToan };
};

const doiMatKhau = async (ma_nguoi_dung, { mat_khau_cu, mat_khau_moi }) => {
    if (!mat_khau_cu || !mat_khau_moi || mat_khau_moi.length < 6) {
        throw taoLoi(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT mat_khau_hash FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');

    const khop = await bcrypt.compare(mat_khau_cu, result.recordset[0].mat_khau_hash);
    if (!khop) {
        throw taoLoi(400, 'Mật khẩu hiện tại không đúng.');
    }

    const hashMoi = await bcrypt.hash(mat_khau_moi, 10);
    await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('mat_khau_hash', sql.VarChar(255), hashMoi)
        .query('UPDATE NguoiDung SET mat_khau_hash = @mat_khau_hash WHERE ma_nguoi_dung = @ma_nguoi_dung');
};

const capNhatHoSo = async (ma_nguoi_dung, { ho_ten, anh_dai_dien }) => {
    if (!ho_ten || !ho_ten.trim()) {
        throw taoLoi(400, 'Tên hiển thị không được để trống.');
    }

    const pool = await poolPromise;
    const cuRes = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT anh_dai_dien FROM NguoiDung WHERE ma_nguoi_dung = @ma_nguoi_dung');

    const anhMoi = anh_dai_dien !== undefined ? anh_dai_dien : cuRes.recordset[0]?.anh_dai_dien;

    const result = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .input('ho_ten', sql.NVarChar(100), ho_ten.trim())
        .input('anh_dai_dien', sql.VarChar(255), anhMoi || null)
        .query(`
            UPDATE NguoiDung
            SET ho_ten = @ho_ten, anh_dai_dien = @anh_dai_dien
            OUTPUT INSERTED.ma_nguoi_dung, INSERTED.ten_dang_nhap, INSERTED.email, INSERTED.ho_ten, INSERTED.anh_dai_dien, INSERTED.vai_tro, INSERTED.so_du_xu, INSERTED.trang_thai
            WHERE ma_nguoi_dung = @ma_nguoi_dung
        `);

    return result.recordset[0];
};

// Bước 1 Quên mật khẩu: Sinh mã OTP 6 số (hiệu lực 5 phút) và gửi qua Email thật
const guiMaQuenMatKhau = async ({ email }) => {
    if (!email || !email.trim()) {
        throw taoLoi(400, 'Vui lòng nhập địa chỉ email đã đăng ký.');
    }

    const emailChuan = email.trim().toLowerCase();
    const pool = await poolPromise;

    const userRes = await pool.request()
        .input('email', sql.VarChar(100), emailChuan)
        .query('SELECT ma_nguoi_dung, email, ho_ten, trang_thai FROM NguoiDung WHERE LOWER(email) = @email');

    const user = userRes.recordset[0];
    if (!user) {
        throw taoLoi(404, 'Không tìm thấy tài khoản nào liên kết với email này.');
    }
    if (user.trang_thai === 'BI_KHOA') {
        throw taoLoi(403, 'Tài khoản này hiện đang bị khóa.');
    }

    const maCode = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.request()
        .input('email', sql.VarChar(100), user.email)
        .query('UPDATE MaXacThucOTP SET da_su_dung = 1 WHERE email = @email AND da_su_dung = 0');

    const insertRes = await pool.request()
        .input('email', sql.VarChar(100), user.email)
        .input('ma_code', sql.VarChar(10), maCode)
        .query(`
            INSERT INTO MaXacThucOTP (email, ma_code, het_han)
            OUTPUT INSERTED.ma_otp
            VALUES (@email, @ma_code, DATEADD(MINUTE, 5, GETDATE()))
        `);

    const maOtpVuaTao = insertRes.recordset[0].ma_otp;

    try {
        await guiEmailOTP(user.email, user.ho_ten, maCode);
    } catch (mailError) {
        await pool.request()
            .input('ma_otp', sql.Int, maOtpVuaTao)
            .query('UPDATE MaXacThucOTP SET da_su_dung = 1 WHERE ma_otp = @ma_otp');
        throw taoLoi(500, `Không thể gửi email xác thực: ${mailError.message}`);
    }
};

// Bước 2 Quên mật khẩu: Kiểm tra mã OTP (chặn hết hạn và chặn nhập sai quá 5 lần)
const xacThucMaOTP = async ({ email, ma_code }) => {
    if (!email || !ma_code || !ma_code.trim()) {
        throw taoLoi(400, 'Vui lòng nhập đầy đủ email và mã OTP 6 chữ số.');
    }

    const pool = await poolPromise;
    const otpRes = await pool.request()
        .input('email', sql.VarChar(100), email.trim().toLowerCase())
        .query(`
            SELECT TOP 1 ma_otp, ma_code, so_lan_sai,
                   CASE WHEN het_han < GETDATE() THEN 1 ELSE 0 END AS da_het_han
            FROM MaXacThucOTP
            WHERE LOWER(email) = @email AND da_su_dung = 0
            ORDER BY ma_otp DESC
        `);

    const record = otpRes.recordset[0];
    if (!record) {
        throw taoLoi(400, 'Không tìm thấy mã OTP hợp lệ. Vui lòng yêu cầu gửi lại mã mới.');
    }
    if (record.da_het_han) {
        await pool.request()
            .input('ma_otp', sql.Int, record.ma_otp)
            .query('UPDATE MaXacThucOTP SET da_su_dung = 1 WHERE ma_otp = @ma_otp');
        throw taoLoi(400, 'Mã OTP đã hết hạn (quá 5 phút). Vui lòng bấm gửi lại mã mới.');
    }
    if (record.so_lan_sai >= 5) {
        await pool.request()
            .input('ma_otp', sql.Int, record.ma_otp)
            .query('UPDATE MaXacThucOTP SET da_su_dung = 1 WHERE ma_otp = @ma_otp');
        throw taoLoi(400, 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị vô hiệu hóa.');
    }

    if (record.ma_code !== ma_code.trim()) {
        const lanSaiMoi = record.so_lan_sai + 1;
        await pool.request()
            .input('ma_otp', sql.Int, record.ma_otp)
            .input('so_lan_sai', sql.Int, lanSaiMoi)
            .input('huy', sql.Bit, lanSaiMoi >= 5 ? 1 : 0)
            .query('UPDATE MaXacThucOTP SET so_lan_sai = @so_lan_sai, da_su_dung = @huy WHERE ma_otp = @ma_otp');

        const conLai = Math.max(0, 5 - lanSaiMoi);
        throw taoLoi(
            400,
            conLai > 0
                ? `Mã OTP không chính xác (còn ${conLai} lần thử).`
                : 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.'
        );
    }

    return { hop_le: true };
};

// Bước 3 Quên mật khẩu: Đổi mật khẩu mới và hủy mã OTP đã dùng
const datLaiMatKhauQuaOTP = async ({ email, ma_code, mat_khau_moi }) => {
    if (!mat_khau_moi || mat_khau_moi.length < 6) {
        throw taoLoi(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    await xacThucMaOTP({ email, ma_code });

    const pool = await poolPromise;
    const emailChuan = email.trim().toLowerCase();
    const hashMoi = await bcrypt.hash(mat_khau_moi, 10);

    await pool.request()
        .input('email', sql.VarChar(100), emailChuan)
        .input('mat_khau_hash', sql.VarChar(255), hashMoi)
        .query('UPDATE NguoiDung SET mat_khau_hash = @mat_khau_hash WHERE LOWER(email) = @email');

    await pool.request()
        .input('email', sql.VarChar(100), emailChuan)
        .query('UPDATE MaXacThucOTP SET da_su_dung = 1 WHERE LOWER(email) = @email AND da_su_dung = 0');
};

module.exports = {
    dangKy,
    dangNhap,
    doiMatKhau,
    capNhatHoSo,
    guiMaQuenMatKhau,
    xacThucMaOTP,
    datLaiMatKhauQuaOTP
};