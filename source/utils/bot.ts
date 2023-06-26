import { Telegraf, Scenes, session } from 'telegraf';
import { Logger } from 'euberlog';

import { ChatType, Database } from '@/utils/database.js';
import options from '@/utils/options.js';

const logger = new Logger('bot');

interface ReportSceneState {
    data: {
        who: string;
        where: string;
        what: string;
    }
}

export class Bot {
    private static readonly REPORT_SCENE_ID = 'report';

    private readonly bot: Telegraf;
    private readonly database: Database;

    private readonly reportScene = new Scenes.WizardScene(Bot.REPORT_SCENE_ID, async context => {
        await context.reply(
            'Where are you? (e.g. <i>in front of the main entrance of the university</i>)',
            { parse_mode: 'HTML' }
        );
        const wizardState = context.wizard.state as ReportSceneState;
        wizardState.data = {
            who: (context.chat as any).username,
            where: '',
            what: ''
        };
        return context.wizard.next();
    }, async context => {
        if (!context.message) {
            await context.reply('Please, answer the message with text, where are you?');
            return context.wizard.back();
        }

        const wizardState = context.wizard.state as ReportSceneState;
        wizardState.data.where = (context.message as any).text;
        await context.reply(
            'What is the problem with your bike? (e.g. flat tire, broken chain, etc.)',
            { parse_mode: 'HTML' }
        );
        return context.wizard.next();
    }, async context => {
        if (!context.message) {
            await context.reply('Please, answer the message with text, what is the problem?');
            return context.wizard.back();
        }

        const wizardState = context.wizard.state as ReportSceneState;
        wizardState.data.what = (context.message as any).text;
        await context.reply(
            'Thank you for your report, we will take care of it as soon as possible!',
            { parse_mode: 'HTML' }
        );
        await this.forwardReport(wizardState);
        return context.scene.leave();
    });

    constructor(botToken: string, database: Database) {
        this.database = database;
        this.bot = new Telegraf(botToken);
        this.init();
    }

    private init(): void {
        const welcomeText = `Welcome, I am the bot of ReparadTUM!`;
        const commandsText = `
Commands:
● <b>/report</b> will help you report a problem
● <b>/author</b> will show you information about the author and the source code
● <b>/version</b> will show you the bot version
● <b>/help</b> will show you this message again
        `;

        const helpText = `${welcomeText}
        
${commandsText}`;

        const stage = new Scenes.Stage([this.reportScene as any]);
        this.bot.use(session());
        this.bot.use(stage.middleware() as any);

        this.bot.start(async ctx => {
            logger.debug('Start command', ctx.chat);
            const chatType = this.checkIsAdmin((ctx.chat as any).username) ? ChatType.MEMBER : ChatType.USER;
            await this.database.pushChat(ctx.chat.id, chatType);
            return ctx.reply(helpText, { parse_mode: 'HTML' });
        });
        this.bot.command('stop', async ctx => {
            logger.debug('Stop command', ctx.chat);
            await this.database.removeChat(ctx.chat.id, ChatType.MEMBER);
            return ctx.reply(
                'You have been deregistered. If you want to start receiving notifications again, use the <b>/start</b> command',
                { parse_mode: 'HTML' }
            );
        });
        this.bot.command('report', async ctx => {
            logger.debug('Report command', ctx.chat);
            await (ctx as any).scene.enter(Bot.REPORT_SCENE_ID);
        });
        this.bot.command('author', async ctx => {
            logger.debug('Author command', ctx.chat);
            return ctx.reply(
                'The author of this bot is <i>Eugenio Berretta</i>, the bot is open source and visible at <i>https://github.com/euberdeveloper/frankreich-deutschland-interrail-bot</i>.',
                { parse_mode: 'HTML' }
            );
        });
        this.bot.command('version', async ctx => {
            logger.debug('Version command', ctx.chat);
            return ctx.reply(`The version of this bot is <b>${options.version}</b>`, { parse_mode: 'HTML' });
        });
        this.bot.command('backup', async ctx => {
            logger.debug('Backup command', ctx.chat);
            const chatContext: any = ctx.chat;
            if (this.checkIsAdmin(chatContext.username)) {
                const chats = {
                    members: await this.database.getChats(ChatType.MEMBER),
                    users: await this.database.getChats(ChatType.USER)
                };
                const formattedTimestamp = new Date().toISOString().replaceAll(':', '_');
                return ctx.replyWithDocument({
                    source: Buffer.from(JSON.stringify(chats)),
                    filename: `chats_${formattedTimestamp}.json`
                });
            }
            else {
                return ctx.reply('You are not allowed to use this command');
            }
        });
        this.bot.help(async ctx => {
            logger.debug('Help command', ctx.chat);
            return ctx.reply(helpText, { parse_mode: 'HTML' });
        });
        void this.bot.launch();
    }

    private checkIsAdmin(chatUsername: string): boolean {
        return options.telegram.adminUsernames.includes(chatUsername);
    }

    public async sendMessageToChat(message: string, chatId: number): Promise<void> {
        try {
            await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error(`Error sending message to chat ${chatId}`, error);
        }
    }

    public async broadcastMessage(message: string, chatType: ChatType): Promise<void> {
        const chattIds = await this.database.getChats(chatType);
        const tasks = chattIds.map(async chatId => this.sendMessageToChat(message, chatId));
        await Promise.all(tasks);
    }

    public async forwardReport({ data: { who, what, where } }: ReportSceneState): Promise<void> {
        const message = `A new report from <b>@${who}</b>:
        What: <b>${what}</b>
        Where: <b>${where}</b>`;
        await this.broadcastMessage(message, ChatType.MEMBER);
    }

    public close(): void {
        this.bot.stop();
    }
}
