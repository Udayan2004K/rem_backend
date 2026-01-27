import app from './app';

import { startNotificationCron } from './routes/notifications';

const PORT = process.env.PORT || 3001;

// Start Cron Jobs
startNotificationCron();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setInterval(() => { }, 1000); // Keep process alive hack
});
