import { getDatabaseClient } from '@/app/utils';
import { notifications } from '@/db/schema';

async function clearNotifications() {
    const db = getDatabaseClient();
    if (!db) {
        console.error('DB not available');
        process.exit(1);
    }

    try {
        await db.delete(notifications);
        console.log('Successfully cleared all notifications');
    } catch (e) {
        console.error('Error clearing notifications:', e);
    }
}

clearNotifications();
