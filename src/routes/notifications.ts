import express from 'express';
import webpush from 'web-push';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import cron from 'node-cron';

const router = express.Router();

const initWebPush = () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            'mailto:kumarudayan84@gmail.com', // Using user's email
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn('VAPID keys not found. Push notifications will not work.');
    }
}

initWebPush();

// Subscribe Endpoint
router.post('/subscribe', requireAuth, async (req, res) => {
    const userId = (req.session as any).userId!;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({ error: 'Invalid subscription object' });
        return;
    }

    try {
        // Check if exists to avoid duplicates (simplified)
        const existing = await prisma.pushSubscription.findFirst({
            where: { endpoint: subscription.endpoint }
        });

        if (!existing) {
            await prisma.pushSubscription.create({
                data: {
                    userId,
                    endpoint: subscription.endpoint,
                    keys: JSON.stringify(subscription.keys)
                }
            });
        }
        res.status(201).json({ message: 'Subscribed' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Unsubscribe Endpoint
router.post('/unsubscribe', requireAuth, async (req, res) => {
    const userId = (req.session as any).userId!;
    const { endpoint } = req.body;

    if (!endpoint) {
        res.status(400).json({ error: 'Endpoint required' });
        return;
    }

    try {
        await prisma.pushSubscription.deleteMany({
            where: {
                userId,
                endpoint: endpoint
            }
        });
        res.status(200).json({ message: 'Unsubscribed' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Update Notification Settings
router.patch('/settings', requireAuth, async (req, res) => {
    const userId = (req.session as any).userId!;
    const { time } = req.body; // Expect "HH:MM" e.g. "09:00"

    if (!time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
        return;
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { notificationTime: time }
        });
        res.json({ message: 'Settings updated' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Cron Job Logic
export const startNotificationCron = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // console.log(`Checking notifications for time: ${currentTime}`);

        try {
            const users = await prisma.user.findMany({
                where: {
                    notificationTime: currentTime
                },
                include: { subscriptions: true, obligations: true }
            });

            for (const user of users) {
                if (user.subscriptions.length === 0) continue;

                // Deduplicate subscriptions by endpoint
                const uniqueSubs = new Map();
                // @ts-ignore
                user.subscriptions.forEach(sub => {
                    uniqueSubs.set(sub.endpoint, sub);
                });

                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                let overdue = 0;
                let todayCount = 0;
                let upcoming = 0;

                user.obligations.forEach(o => {
                    if (o.isCompleted) return;
                    const d = new Date(o.dueDate);
                    const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());

                    if (due < today) overdue++;
                    else if (due.getTime() === today.getTime()) todayCount++;
                    else upcoming++;
                });

                if (overdue === 0 && todayCount === 0 && upcoming === 0) continue;

                const payload = JSON.stringify({
                    title: 'Obligation Reminder',
                    body: `Status: ${todayCount} Today, ${overdue} Overdue, ${upcoming} Upcoming.`
                });

                for (const sub of uniqueSubs.values()) {
                    try {
                        const pushSub = {
                            endpoint: sub.endpoint,
                            keys: JSON.parse(sub.keys)
                        };
                        await webpush.sendNotification(pushSub, payload);
                    } catch (error: any) {
                        if (error.statusCode === 410 || error.statusCode === 404) {
                            // console.log('Subscription expired, deleting:', sub.endpoint);
                            await prisma.pushSubscription.delete({ where: { id: sub.id } }); // Delete by ID is safer if logic uses deleteMany by endpoint
                        } else {
                            console.error('Push error:', error);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Cron job error:", e);
        }
    });
};

export default router;
