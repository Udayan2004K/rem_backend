import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';

const router = express.Router();

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword }
        });
        (req.session as any).userId = user.id;
        res.json({ id: user.id, email: user.email, notificationTime: user.notificationTime });
    } catch (e: any) {
        console.error("Register error:", e);
        res.status(400).json({ error: e.message || "User already exists or failed to create" });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.password)) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        (req.session as any).userId = user.id;
        res.json({ id: user.id, email: user.email, notificationTime: user.notificationTime });
    } catch (e: any) {
        console.error("Login error:", e);
        res.status(500).json({ error: "Login failed" });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

router.get('/me', async (req, res) => {
    if (!(req.session as any).userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    const user = await prisma.user.findUnique({ where: { id: (req.session as any).userId } });
    if (user) {
        res.json({ id: user.id, email: user.email, notificationTime: user.notificationTime });
    } else {
        res.status(401).json({ error: "User not found" });
    }
});

export default router;
