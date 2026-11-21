const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let thuMuc = 'uploads/khac';
        if (file.fieldname === 'anh_bia' || file.fieldname === 'anh_nen') thuMuc = 'uploads/anh-bia';
        else if (file.fieldname === 'audio') thuMuc = 'uploads/audio';
        else if (file.fieldname === 'file_epub') thuMuc = 'uploads/temp';

        fs.mkdirSync(thuMuc, { recursive: true });
        cb(null, thuMuc);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const tenFile = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, tenFile);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ((file.fieldname === 'anh_bia' || file.fieldname === 'anh_nen') && !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return cb(new Error('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.'));
    }
    if (file.fieldname === 'audio' && !['.mp3', '.m4a', '.wav'].includes(ext)) {
        return cb(new Error('Tệp âm thanh chỉ hỗ trợ MP3, M4A hoặc WAV.'));
    }
    if (file.fieldname === 'file_epub' && ext !== '.epub') {
        return cb(new Error('Chỉ chấp nhận tệp định dạng .epub.'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
});

module.exports = upload;