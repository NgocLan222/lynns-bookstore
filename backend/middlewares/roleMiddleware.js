const chiChoPhepAdmin = (req, res, next) => {
    if (!req.nguoiDung || req.nguoiDung.vai_tro !== 'admin') {
        return res.status(403).json({
            thanh_cong: false,
            thong_bao: 'Bạn không có quyền Quản trị viên để thực hiện thao tác này.'
        });
    }
    next();
};

module.exports = { chiChoPhepAdmin };