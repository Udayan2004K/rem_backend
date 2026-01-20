"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../prisma"));
const router = express_1.default.Router();
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
    }
    try {
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma_1.default.user.create({
            data: { email, password: hashedPassword }
        });
        req.session.userId = user.id;
        res.json({ id: user.id, email: user.email });
    }
    catch (e) {
        console.error("Register error:", e);
        res.status(400).json({ error: e.message || "User already exists or failed to create" });
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma_1.default.user.findUnique({ where: { email } });
        if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        req.session.userId = user.id;
        res.json({ id: user.id, email: user.email });
    }
    catch (e) {
        res.status(500).json({ error: "Login failed" });
    }
}));
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});
router.get('/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    const user = yield prisma_1.default.user.findUnique({ where: { id: req.session.userId } });
    if (user) {
        res.json({ id: user.id, email: user.email });
    }
    else {
        res.status(401).json({ error: "User not found" });
    }
}));
exports.default = router;
