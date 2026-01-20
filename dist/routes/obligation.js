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
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.session.userId;
    // Explicitly fetching all to compute status manually
    const obligations = yield prisma_1.default.obligation.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' }
    });
    const now = new Date();
    // Reset time to midnight for accurate comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result = obligations.map((o) => {
        const d = new Date(o.dueDate);
        const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        let status;
        if (due < today)
            status = 'OVERDUE';
        else if (due.getTime() === today.getTime())
            status = 'TODAY';
        else
            status = 'UPCOMING';
        return Object.assign(Object.assign({}, o), { status });
    });
    res.json(result);
}));
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, dueDate } = req.body;
    const userId = req.session.userId;
    if (!title || !dueDate) {
        res.status(400).json({ error: "Title and dueDate required" });
        return;
    }
    try {
        const obligation = yield prisma_1.default.obligation.create({
            data: {
                title,
                dueDate: new Date(dueDate),
                userId
            }
        });
        res.json(obligation);
    }
    catch (e) {
        res.status(500).json({ error: "Failed to create obligation" });
    }
}));
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
        yield prisma_1.default.obligation.delete({
            where: { id: id, userId }
        });
        res.json({ message: "Deleted" });
    }
    catch (e) {
        res.status(500).json({ error: "Failed to delete" });
    }
}));
exports.default = router;
