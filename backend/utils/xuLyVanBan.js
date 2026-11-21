const cheerio = require('cheerio');

const catNoiDungDocThu = (noiDungHtml, gioiHanTu = 3000) => {
    if (!noiDungHtml) return { noiDungCat: '', biCat: false };

    const $ = cheerio.load(noiDungHtml, null, false);
    const cacKhoi = $('p, div, h1, h2, h3, h4, li, blockquote');

    if (cacKhoi.length === 0) {
        const danhSachTu = noiDungHtml.trim().split(/\s+/);
        if (danhSachTu.length <= gioiHanTu) {
            return { noiDungCat: noiDungHtml, biCat: false };
        }
        return {
            noiDungCat: danhSachTu.slice(0, gioiHanTu).join(' ') + '...',
            biCat: true
        };
    }

    let tongTu = 0;
    let ketQuaHtml = '';
    let biCat = false;

    cacKhoi.each((_, el) => {
        if (biCat) return false;
        const text = $(el).text().trim();
        const soTuKhoi = text ? text.split(/\s+/).length : 0;

        if (tongTu + soTuKhoi <= gioiHanTu) {
            ketQuaHtml += $.html(el);
            tongTu += soTuKhoi;
        } else {
            const soTuConLai = gioiHanTu - tongTu;
            if (soTuConLai > 0 && text) {
                const trichDoan = text.split(/\s+/).slice(0, soTuConLai).join(' ');
                ketQuaHtml += `<p>${trichDoan}...</p>`;
            }
            biCat = true;
            return false;
        }
    });

    return { noiDungCat: ketQuaHtml, biCat };
};

module.exports = { catNoiDungDocThu };