import { Bot } from 'grammy';
export declare const bot: Bot<import("grammy").Context, import("grammy").Api<import("grammy").RawApi>> | null;
export declare function getWebhookCallback(): ((req: {
    body: import("@grammyjs/types").Update;
    header: (header: string) => string | undefined;
}, res: {
    end: (cb?: () => void) => /*elided*/ any;
    set: (field: string, value?: string | string[]) => /*elided*/ any;
    send: (json: string) => /*elided*/ any;
    status: (code: number) => /*elided*/ any;
}) => Promise<void>) | null;
//# sourceMappingURL=index.d.ts.map