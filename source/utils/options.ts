import * as dotenv from 'dotenv';
import * as path from 'node:path';

// @ts-ignore
import packageJson from '@packageJson' assert { type: 'json' };

dotenv.config({
    path: path.join(process.cwd(), '.env')
});

const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = process.env.REDIS_PORT ?? 6379;

export default {
    redis: {
        host: redisHost,
        port: redisPort,
        url: `redis://${redisHost}:${redisPort}`
    },
    scrapingCron: process.env.SCRAPING_CRON ?? '* * * * *',
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN as string,
        adminUsernames: process.env.TELEGRAM_ADMIN_USERNAMES ? process.env.TELEGRAM_ADMIN_USERNAMES.split(',').map((username) => username.trim()) : []
    },
    version: packageJson.version as string
};
