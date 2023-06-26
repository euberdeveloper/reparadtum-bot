import { Logger } from 'euberlog';

import { Database } from '@/utils/database.js';
import { Bot } from '@/utils/bot.js';

import OPTIONS from '@/utils/options.js';

const logger = new Logger('main');

(async function () {
    logger.info('Starting...');

    const database = new Database({
        url: OPTIONS.redis.url
    });
    await database.open();
    logger.debug('Database instance created');

    const bot = new Bot(OPTIONS.telegram.botToken, database);
    logger.debug('Bot instance created');

    logger.success('Bot started succesfully!!!');
})();
