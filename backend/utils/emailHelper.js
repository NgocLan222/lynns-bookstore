const nodemailer = require('nodemailer');

const guiEmailOTP = async (emailNhan, hoTen, maOTP) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        const err = new Error('Máy chủ chưa cấu hình EMAIL_USER và EMAIL_APP_PASSWORD trong tệp .env.');
        err.statusCode = 500;
        throw err;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });

    const mailOptions = {
        from: `"Lynn's Bookstore" <${process.env.EMAIL_USER}>`,
        to: emailNhan,
        subject: `[Lynn's Bookstore] Mã xác nhận đặt lại mật khẩu: ${maOTP}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #bae6fd; border-radius: 16px; background: #f8fafc;">
                <h2 style="color: #0284c7; margin: 0 0 12px;">Lynn's Bookstore</h2>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                    Xin chào <strong>${hoTen || 'Độc giả'}</strong>,
                </p>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                    Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác thực OTP dưới đây:
                </p>
                <div style="margin: 22px 0; padding: 16px; text-align: center; background: #e0f2fe; border-radius: 12px; border: 1px dashed #38bdf8;">
                    <span style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #0369a1;">${maOTP}</span>
                </div>
                <p style="color: #64748b; font-size: 13.5px; line-height: 1.5;">
                    • Mã OTP có hiệu lực trong vòng <strong>5 phút</strong> và chỉ sử dụng một lần.<br/>
                    • Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.
                </p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { guiEmailOTP };