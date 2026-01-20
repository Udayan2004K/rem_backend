"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
