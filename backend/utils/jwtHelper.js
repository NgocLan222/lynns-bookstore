const jwt = require('jsonwebtoken');

const taoToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const giaiMaToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { taoToken, giaiMaToken };