const AdmZip = require('adm-zip');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const { sql, poolPromise } = require('../config/db');

const REGEX_CHUONG_CHINH = /^(chương\s+(mở\s+đầu|[0-9ivxlcdm]+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)|chapter\s+[0-9ivxlcdm]+|hồi\s+[0-9ivxlcdm]+|phần\s+(mở\s+đầu|[0-9ivxlcdm]+|thứ\s+\S+))(\s*[:.\-–—]\s*.*)?$/i;
const REGEX_MUC_LA_MA = /^([IVXLCDM]+)\.\s+\S+/;
const REGEX_DONG_MUC_LUC = /\.{2,}\s*\d+\s*$/;

const layDanhSachKhoiNoiDung = ($) => {
    let container = $('body');
    while (container.children().length === 1) {
        const conDuyNhat = container.children().first();
        const tag = (conDuyNhat.prop('tagName') || '').toLowerCase();
        if (['div', 'section', 'article', 'main'].includes(tag)) {
            container = conDuyNhat;
        } else {
            break;
        }
    }
    return container.children().toArray();
};

const tachChuongTuMotTaiLieu = (htmlGoc, tieuDeMacDinh) => {
    const $ = cheerio.load(htmlGoc);
    $('script, style, link').remove();

    const khoiElements = layDanhSachKhoiNoiDung($);

    const soChuongChinh = khoiElements.filter((el) => {
        const txt = $(el).text().replace(/\s+/g, ' ').trim();
        return txt.length > 0 && txt.length <= 150 && !REGEX_DONG_MUC_LUC.test(txt) && REGEX_CHUONG_CHINH.test(txt);
    }).length;

    const coHeadingChuan = khoiElements.filter((el) => {
        const tag = (el.tagName || '').toLowerCase();
        const txt = $(el).text().replace(/\s+/g, ' ').trim();
        return (tag === 'h1' || tag === 'h2') && txt.length > 0 && txt.length <= 150;
    }).length >= 2;

    // Xác định cấp độ ngắt chương: ưu tiên từ khóa "Chương X" trước, tránh cắt nhầm vào mục I, II, III bên trong
    const laDiemNgat = (el) => {
        const tag = (el.tagName || '').toLowerCase();
        const txt = $(el).text().replace(/\s+/g, ' ').trim();
        if (!txt || txt.length > 150 || REGEX_DONG_MUC_LUC.test(txt)) return false;

        if (soChuongChinh >= 2) {
            return REGEX_CHUONG_CHINH.test(txt);
        }
        if (coHeadingChuan) {
            return tag === 'h1' || tag === 'h2';
        }
        return REGEX_CHUONG_CHINH.test(txt) || REGEX_MUC_LA_MA.test(txt);
    };

    const ketQua = [];
    let tieuDeHienTai = tieuDeMacDinh || 'Chương mở đầu';
    let bufferHtml = [];
    let bufferTextLen = 0;

    for (let i = 0; i < khoiElements.length; i++) {
        const el = khoiElements[i];
        const txt = $(el).text().replace(/\s+/g, ' ').trim();

        if (laDiemNgat(el)) {
            if (bufferTextLen >= 200) {
                ketQua.push({
                    tieu_de: tieuDeHienTai,
                    noi_dung: bufferHtml.join('\n')
                });
                bufferHtml = [];
                bufferTextLen = 0;
            }

            let tieuDeMoi = txt;

            // Nếu dòng tiêu đề chỉ có nhãn ngắn như "Chương 1" và dòng kế tiếp là tên chương, tự ghép lại
            if (tieuDeMoi.length <= 25 && !tieuDeMoi.includes(':') && i + 1 < khoiElements.length) {
                const elKeTiep = khoiElements[i + 1];
                const txtKeTiep = $(elKeTiep).text().replace(/\s+/g, ' ').trim();
                const laTieuDePhu =
                    txtKeTiep.length > 3 &&
                    txtKeTiep.length <= 180 &&
                    !laDiemNgat(elKeTiep) &&
                    !REGEX_MUC_LA_MA.test(txtKeTiep) &&
                    !/^\d+\.\s/.test(txtKeTiep);

                if (laTieuDePhu) {
                    tieuDeMoi = `${tieuDeMoi}: ${txtKeTiep}`;
                    i += 1;
                }
            }

            tieuDeHienTai = tieuDeMoi;
        } else {
            const outerHtml = $.html(el);
            if (outerHtml) {
                bufferHtml.push(outerHtml);
                bufferTextLen += txt.length;
            }
        }
    }

    if (bufferTextLen >= 80) {
        ketQua.push({
            tieu_de: tieuDeHienTai,
            noi_dung: bufferHtml.join('\n')
        });
    }

    if (ketQua.length >= 2) {
        return ketQua;
    }

    // Dự phòng: cắt theo định mức ~2.500 từ nếu tài liệu viết liền không chia chương
    const tongSoTu = $('body').text().trim().split(/\s+/).length;
    if (tongSoTu > 3000 && khoiElements.length > 1) {
        const ketQuaChiaPhan = [];
        let nhomHtml = [];
        let demTu = 0;

        for (const el of khoiElements) {
            const outerHtml = $.html(el);
            const soTuKhoi = $(el).text().trim().split(/\s+/).filter(Boolean).length;
            if (demTu + soTuKhoi > 2500 && nhomHtml.length > 0) {
                ketQuaChiaPhan.push({
                    tieu_de: `Phần ${ketQuaChiaPhan.length + 1}`,
                    noi_dung: nhomHtml.join('\n')
                });
                nhomHtml = [];
                demTu = 0;
            }
            if (outerHtml) {
                nhomHtml.push(outerHtml);
                demTu += soTuKhoi;
            }
        }

        if (nhomHtml.length > 0) {
            ketQuaChiaPhan.push({
                tieu_de: `Phần ${ketQuaChiaPhan.length + 1}`,
                noi_dung: nhomHtml.join('\n')
            });
        }

        if (ketQuaChiaPhan.length >= 2) {
            return ketQuaChiaPhan;
        }
    }

    const vanBanThuan = $('body').text().trim();
    if (vanBanThuan.length < 80) return [];

    return [{
        tieu_de: tieuDeMacDinh || 'Chương 1',
        noi_dung: ($('body').html() || '').trim()
    }];
};

const nhapChuongTuEpub = async (ma_sach, duongDanFileEpub) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    let daBatDauTransaction = false;

    try {
        const zip = new AdmZip(duongDanFileEpub);

        const containerEntry = zip.getEntry('META-INF/container.xml');
        if (!containerEntry) throw new Error('Tệp EPUB không đúng chuẩn (thiếu container.xml).');

        const $container = cheerio.load(containerEntry.getData().toString('utf8'), { xmlMode: true });
        const opfPath = $container('rootfile').attr('full-path');
        const opfEntry = zip.getEntry(opfPath);
        if (!opfEntry) throw new Error('Không tìm thấy tệp mục lục OPF trong EPUB.');

        const opfDir = path.posix.dirname(opfPath);
        const $opf = cheerio.load(opfEntry.getData().toString('utf8'), { xmlMode: true });

        const manifest = {};
        $opf('manifest item').each((_, el) => {
            const id = $opf(el).attr('id');
            const href = decodeURIComponent($opf(el).attr('href') || '');
            const mediaType = $opf(el).attr('media-type');
            if (id && href) {
                manifest[id] = { href, mediaType };
            }
        });

        const cacMucSpine = [];
        $opf('spine itemref').each((_, el) => {
            const idref = $opf(el).attr('idref');
            const item = manifest[idref];
            if (!item || !item.mediaType.includes('html')) return;

            const fullPath = opfDir === '.' ? item.href : path.posix.join(opfDir, item.href);
            const entry = zip.getEntry(fullPath);
            if (!entry) return;

            const rawHtml = entry.getData().toString('utf8');
            const $html = cheerio.load(rawHtml);
            $html('script, style, link').remove();

            const tieuDe = $html('h1, h2, h3').first().text().trim() || $html('title').text().trim();
            const noiDungHtml = ($html('body').html() || '').trim();
            const vanBanThuan = $html('body').text().trim();

            if (vanBanThuan.length >= 80) {
                cacMucSpine.push({
                    tieu_de: tieuDe || `Chương ${cacMucSpine.length + 1}`,
                    noi_dung: noiDungHtml
                });
            }
        });

        const danhSachChuong = [];
        for (const muc of cacMucSpine) {
            const cacPhanCon = tachChuongTuMotTaiLieu(muc.noi_dung, muc.tieu_de);
            danhSachChuong.push(...cacPhanCon);
        }

        if (danhSachChuong.length === 0) {
            throw new Error('Không trích xuất được nội dung chữ nào (tệp có thể là bản scan hình ảnh hoặc bị khóa DRM).');
        }

        await transaction.begin();
        daBatDauTransaction = true;

        const maxSttRes = await new sql.Request(transaction)
            .input('ma_sach', sql.Int, ma_sach)
            .query('SELECT ISNULL(MAX(so_thu_tu), 0) AS max_stt FROM ChuongSach WHERE ma_sach = @ma_sach');
        let sttHienTai = maxSttRes.recordset[0].max_stt;

        for (const chuong of danhSachChuong) {
            sttHienTai += 1;
            await new sql.Request(transaction)
                .input('ma_sach', sql.Int, ma_sach)
                .input('so_thu_tu', sql.Int, sttHienTai)
                .input('tieu_de', sql.NVarChar(255), chuong.tieu_de.slice(0, 250))
                .input('noi_dung', sql.NVarChar(sql.MAX), chuong.noi_dung)
                .query(`
                    INSERT INTO ChuongSach (ma_sach, so_thu_tu, tieu_de, noi_dung, la_mien_phi, gia_xu)
                    VALUES (@ma_sach, @so_thu_tu, @tieu_de, @noi_dung, 1, 0)
                `);
        }

        await transaction.commit();
        return { so_chuong_da_them: danhSachChuong.length };
    } catch (error) {
        if (daBatDauTransaction) {
            await transaction.rollback();
        }
        error.statusCode = 400;
        throw error;
    } finally {
        if (fs.existsSync(duongDanFileEpub)) {
            fs.unlinkSync(duongDanFileEpub);
        }
    }
};

module.exports = { nhapChuongTuEpub };