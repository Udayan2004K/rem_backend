import express from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    const userId = (req.session as any).userId!;

    // Recurring Logic Check
    try {
        const recurringObligations = await prisma.obligation.findMany({
            where: { userId, isRecurring: true },
            orderBy: { dueDate: 'desc' }
        });

        // Map distinct titles to their latest date
        const distinct = new Map();
        for (const o of recurringObligations) {
            if (!distinct.has(o.title)) {
                distinct.set(o.title, o);
            }
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const todayDate = new Date(todayStr);

        for (const [title, latest] of distinct) {
            const latestDate = new Date(latest.dueDate);
            const latestStr = latestDate.toISOString().split('T')[0];

            // If the latest recurring task is in the past (yesterday or earlier), create one for today
            if (latestStr < todayStr) {
                await prisma.obligation.create({
                    data: {
                        title: latest.title,
                        dueDate: todayDate,
                        userId,
                        isRecurring: true,
                        isCompleted: false
                    }
                });
            }
        }
    } catch (e) {
        console.error("Auto-recurring check failed:", e);
        // Continue to fetch items anyway
    }

    // Explicitly fetching all to compute status manually
    const obligations = await prisma.obligation.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' }
    });

    const now = new Date();
    // Reset time to midnight for accurate comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const result = obligations.map((o: any) => {
        const d = new Date(o.dueDate);
        const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        let status: 'OVERDUE' | 'TODAY' | 'UPCOMING';
        if (due < today) status = 'OVERDUE';
        else if (due.getTime() === today.getTime()) status = 'TODAY';
        else status = 'UPCOMING';

        return { ...o, status };
    });

    res.json(result);
});

router.post('/', requireAuth, async (req, res) => {
    const { title, dueDate, isRecurring } = req.body;
    const userId = (req.session as any).userId!;

    if (!title || !dueDate) {
        res.status(400).json({ error: "Title and dueDate required" });
        return;
    }

    try {
        const obligation = await prisma.obligation.create({
            data: {
                title,
                dueDate: new Date(dueDate),
                userId,
                isRecurring: !!isRecurring
            }
        });
        res.json(obligation);
    } catch (e) {
        res.status(500).json({ error: "Failed to create obligation" });
    }
});

router.patch('/:id/toggle', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = (req.session as any).userId!;

    try {
        const obligation = await prisma.obligation.findFirst({
            where: { id: id as string, userId }
        });

        if (!obligation) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        const updated = await prisma.obligation.update({
            where: { id: id as string },
            data: { isCompleted: !obligation.isCompleted }
        });

        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: "Failed to update" });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = (req.session as any).userId!;
    try {
        const result = await prisma.obligation.deleteMany({
            where: {
                id: id as string,
                userId
            }
        });

        if (result.count === 0) {
            res.status(404).json({ error: "Obligation not found or unauthorized" });
            return;
        }

        res.json({ message: "Deleted" });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

export default router;
