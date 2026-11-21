const { sql, poolPromise } = require('../config/db');

const taoLoi = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const layGoiNapXu = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM GoiNapXu WHERE dang_hoat_dong = 1 ORDER BY gia_tien_vnd ASC');
    return result.recordset;
};

const napXuGiaLap = async (ma_nguoi_dung, { ma_goi, trang_thai }) => {
    if (!['THANH_CONG', 'DA_HUY'].includes(trang_thai)) {
        throw taoLoi(400, 'Trạng thái thanh toán không hợp lệ.');
    }

    const pool = await poolPromise;
    const goiRes = await pool.request()
        .input('ma_goi', sql.Int, parseInt(ma_goi, 10))
        .query('SELECT * FROM GoiNapXu WHERE ma_goi = @ma_goi AND dang_hoat_dong = 1');

    const goi = goiRes.recordset[0];
    if (!goi) throw taoLoi(404, 'Gói nạp Xu không tồn tại.');

    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        let soDuMoi = null;
        if (trang_thai === 'THANH_CONG') {
            const userRes = await new sql.Request(transaction)
                .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
                .input('so_xu', sql.Int, goi.so_xu_nhan)
                .query(`
                    UPDATE NguoiDung
                    SET so_du_xu = so_du_xu + @so_xu
                    OUTPUT INSERTED.so_du_xu
                    WHERE ma_nguoi_dung = @ma_nguoi_dung
                `);
            soDuMoi = userRes.recordset[0].so_du_xu;
        }

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('bien_dong_xu', sql.Int, trang_thai === 'THANH_CONG' ? goi.so_xu_nhan : 0)
            .input('so_tien_vnd', sql.Int, goi.gia_tien_vnd)
            .input('trang_thai', sql.VarChar(20), trang_thai)
            .input('mo_ta', sql.NVarChar(255), `Nạp ${goi.ten_goi} (+${goi.so_xu_nhan} Xu)`)
            .query(`
                INSERT INTO LichSuGiaoDich (ma_nguoi_dung, loai_giao_dich, bien_dong_xu, so_tien_vnd, trang_thai, mo_ta)
                VALUES (@ma_nguoi_dung, 'NAP_XU', @bien_dong_xu, @so_tien_vnd, @trang_thai, @mo_ta)
            `);

        await transaction.commit();
        return { trang_thai, so_du_xu: soDuMoi };
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        throw error;
    }
};

const moKhoaChuongLe = async (ma_nguoi_dung, ma_chuong) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const chuongRes = await new sql.Request(transaction)
            .input('ma_chuong', sql.Int, ma_chuong)
            .query(`
                SELECT c.ma_chuong, c.so_thu_tu, c.gia_xu, c.la_mien_phi, s.tieu_de AS ten_sach
                FROM ChuongSach c INNER JOIN Sach s ON c.ma_sach = s.ma_sach
                WHERE c.ma_chuong = @ma_chuong
            `);
        const chuong = chuongRes.recordset[0];
        if (!chuong) throw taoLoi(404, 'Không tìm thấy chương.');
        if (chuong.la_mien_phi) throw taoLoi(400, 'Chương này đang miễn phí.');

        const daMoRes = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_chuong', sql.Int, ma_chuong)
            .query('SELECT 1 FROM ChuongDaMoKhoa WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_chuong = @ma_chuong');
        if (daMoRes.recordset.length > 0) throw taoLoi(400, 'Bạn đã mở khóa chương này rồi.');

        const userRes = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .query('SELECT so_du_xu FROM NguoiDung WITH (UPDLOCK) WHERE ma_nguoi_dung = @ma_nguoi_dung');
        const soDu = userRes.recordset[0].so_du_xu;

        if (soDu < chuong.gia_xu) {
            throw taoLoi(400, `Số dư không đủ (cần ${chuong.gia_xu} Xu, hiện có ${soDu} Xu).`);
        }

        const capNhatUser = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('gia_xu', sql.Int, chuong.gia_xu)
            .query('UPDATE NguoiDung SET so_du_xu = so_du_xu - @gia_xu OUTPUT INSERTED.so_du_xu WHERE ma_nguoi_dung = @ma_nguoi_dung');

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_chuong', sql.Int, ma_chuong)
            .query('INSERT INTO ChuongDaMoKhoa (ma_nguoi_dung, ma_chuong) VALUES (@ma_nguoi_dung, @ma_chuong)');

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('bien_dong_xu', sql.Int, -chuong.gia_xu)
            .input('mo_ta', sql.NVarChar(255), `Mở khóa Chương ${chuong.so_thu_tu} - ${chuong.ten_sach}`)
            .query(`
                INSERT INTO LichSuGiaoDich (ma_nguoi_dung, loai_giao_dich, bien_dong_xu, trang_thai, mo_ta)
                VALUES (@ma_nguoi_dung, 'MO_CHUONG_LE', @bien_dong_xu, 'THANH_CONG', @mo_ta)
            `);

        await transaction.commit();
        return { so_du_xu: capNhatUser.recordset[0].so_du_xu };
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        throw error;
    }
};

const moKhoaChuongHangLoat = async (ma_nguoi_dung, ma_sach, danh_sach_ma_chuong) => {
    if (!Array.isArray(danh_sach_ma_chuong) || danh_sach_ma_chuong.length === 0) {
        throw taoLoi(400, 'Vui lòng chọn ít nhất một chương.');
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    const ids = danh_sach_ma_chuong.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    try {
        await transaction.begin();

        // Chỉ tính tiền các chương thu phí và độc giả chưa sở hữu
        const chuongCanMoRes = await new sql.Request(transaction)
            .input('ma_sach', sql.Int, ma_sach)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .query(`
                SELECT c.ma_chuong, c.gia_xu, s.tieu_de AS ten_sach
                FROM ChuongSach c
                INNER JOIN Sach s ON c.ma_sach = s.ma_sach
                WHERE c.ma_sach = @ma_sach
                  AND c.ma_chuong IN (${ids.join(',')})
                  AND c.la_mien_phi = 0
                  AND NOT EXISTS (
                      SELECT 1 FROM ChuongDaMoKhoa cdm
                      WHERE cdm.ma_nguoi_dung = @ma_nguoi_dung AND cdm.ma_chuong = c.ma_chuong
                  )
            `);

        const danhSachHopLe = chuongCanMoRes.recordset;
        if (danhSachHopLe.length === 0) {
            throw taoLoi(400, 'Tất cả chương đã chọn đều miễn phí hoặc đã được mở khóa.');
        }

        const tongXu = danhSachHopLe.reduce((tong, c) => tong + c.gia_xu, 0);
        const tenSach = danhSachHopLe[0].ten_sach;

        const userRes = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .query('SELECT so_du_xu FROM NguoiDung WITH (UPDLOCK) WHERE ma_nguoi_dung = @ma_nguoi_dung');
        const soDu = userRes.recordset[0].so_du_xu;

        if (soDu < tongXu) {
            throw taoLoi(400, `Số dư không đủ (cần ${tongXu} Xu cho ${danhSachHopLe.length} chương, hiện có ${soDu} Xu).`);
        }

        const capNhatUser = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('tong_xu', sql.Int, tongXu)
            .query('UPDATE NguoiDung SET so_du_xu = so_du_xu - @tong_xu OUTPUT INSERTED.so_du_xu WHERE ma_nguoi_dung = @ma_nguoi_dung');

        for (const c of danhSachHopLe) {
            await new sql.Request(transaction)
                .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
                .input('ma_chuong', sql.Int, c.ma_chuong)
                .query('INSERT INTO ChuongDaMoKhoa (ma_nguoi_dung, ma_chuong) VALUES (@ma_nguoi_dung, @ma_chuong)');
        }

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('bien_dong_xu', sql.Int, -tongXu)
            .input('mo_ta', sql.NVarChar(255), `Mở khóa hàng loạt ${danhSachHopLe.length} chương - ${tenSach}`)
            .query(`
                INSERT INTO LichSuGiaoDich (ma_nguoi_dung, loai_giao_dich, bien_dong_xu, trang_thai, mo_ta)
                VALUES (@ma_nguoi_dung, 'MO_CHUONG_HANG_LOAT', @bien_dong_xu, 'THANH_CONG', @mo_ta)
            `);

        await transaction.commit();
        return { so_du_xu: capNhatUser.recordset[0].so_du_xu, so_chuong_da_mo: danhSachHopLe.length };
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        throw error;
    }
};

const muaTronQuyen = async (ma_nguoi_dung, ma_sach) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const sachRes = await new sql.Request(transaction)
            .input('ma_sach', sql.Int, ma_sach)
            .query('SELECT ma_sach, tieu_de, hinh_thuc_ban, gia_tron_quyen_xu FROM Sach WHERE ma_sach = @ma_sach');
        const sach = sachRes.recordset[0];
        if (!sach) throw taoLoi(404, 'Không tìm thấy đầu sách.');
        if (sach.hinh_thuc_ban !== 'TRON_QUYEN') throw taoLoi(400, 'Sách này không bán theo hình thức trọn quyển.');

        const daMuaRes = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, ma_sach)
            .query('SELECT 1 FROM SachDaMua WHERE ma_nguoi_dung = @ma_nguoi_dung AND ma_sach = @ma_sach');
        if (daMuaRes.recordset.length > 0) throw taoLoi(400, 'Bạn đã sở hữu cuốn sách này rồi.');

        const userRes = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .query('SELECT so_du_xu FROM NguoiDung WITH (UPDLOCK) WHERE ma_nguoi_dung = @ma_nguoi_dung');
        const soDu = userRes.recordset[0].so_du_xu;

        if (soDu < sach.gia_tron_quyen_xu) {
            throw taoLoi(400, `Số dư không đủ (cần ${sach.gia_tron_quyen_xu} Xu, hiện có ${soDu} Xu).`);
        }

        const capNhatUser = await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('gia', sql.Int, sach.gia_tron_quyen_xu)
            .query('UPDATE NguoiDung SET so_du_xu = so_du_xu - @gia OUTPUT INSERTED.so_du_xu WHERE ma_nguoi_dung = @ma_nguoi_dung');

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_sach', sql.Int, ma_sach)
            .query('INSERT INTO SachDaMua (ma_nguoi_dung, ma_sach) VALUES (@ma_nguoi_dung, @ma_sach)');

        await new sql.Request(transaction)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('bien_dong_xu', sql.Int, -sach.gia_tron_quyen_xu)
            .input('mo_ta', sql.NVarChar(255), `Mua trọn quyển: ${sach.tieu_de}`)
            .query(`
                INSERT INTO LichSuGiaoDich (ma_nguoi_dung, loai_giao_dich, bien_dong_xu, trang_thai, mo_ta)
                VALUES (@ma_nguoi_dung, 'MUA_TRON_QUYEN', @bien_dong_xu, 'THANH_CONG', @mo_ta)
            `);

        await transaction.commit();
        return { so_du_xu: capNhatUser.recordset[0].so_du_xu };
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        throw error;
    }
};

const layLichSuGiaoDich = async (ma_nguoi_dung) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
        .query('SELECT * FROM LichSuGiaoDich WHERE ma_nguoi_dung = @ma_nguoi_dung ORDER BY ngay_tao DESC');
    return result.recordset;
};

module.exports = {
    layGoiNapXu,
    napXuGiaLap,
    moKhoaChuongLe,
    moKhoaChuongHangLoat,
    muaTronQuyen,
    layLichSuGiaoDich
};