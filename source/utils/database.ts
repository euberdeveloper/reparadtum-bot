import redis from 'redis';

export enum ChatType {
    MEMBER = 'member',
    USER = 'user'
};

export class Database {
    private static readonly MEMBERS_CHATS_KEY = 'reparatumMembersChats';
    private static readonly USERS_CHATS_KEY = 'reparatumUsersChats';

    private readonly client: redis.RedisClientType;

    constructor(options: redis.RedisClientOptions) {
        this.client = redis.createClient(options) as unknown as redis.RedisClientType;
    }

    private getChatKey(chatType: ChatType): string {
        switch (chatType) {
            case ChatType.MEMBER:
                return Database.MEMBERS_CHATS_KEY;
            case ChatType.USER:
                return Database.USERS_CHATS_KEY;
        }
    }

    public async open(): Promise<void> {
        await this.client.connect();
    }

    public async pushChat(chatId: number, chatType: ChatType): Promise<void> {
        await this.client.sAdd(this.getChatKey(chatType), String(chatId));
    }

    public async removeChat(chatId: number, chatType: ChatType): Promise<void> {
        await this.client.sRem(this.getChatKey(chatType), String(chatId));
    }

    public async resetChats(chatType: ChatType): Promise<void> {
        await this.client.del(this.getChatKey(chatType));
    }

    public async importChats(chats: number[], chatType: ChatType): Promise<void> {
        for (const chatId of chats) {
            await this.pushChat(chatId, chatType);
        }
    }

    public async getChats(chatType: ChatType): Promise<number[]> {
        const chatIds = await this.client.sMembers(this.getChatKey(chatType));
        return chatIds.map(id => +id);
    }

    public async close(): Promise<void> {
        await this.client.quit();
    }
}
