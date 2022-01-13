import {IApplicationContext, IConfig, IPlugin} from "@znetstar/attic-common/lib/Server";
import {IEvent, IRPC } from "@znetstar/attic-common";

export type AtticUAEventsRPCType = IRPC&{
    gtag: (opts: GAOptions, ...args: any) => Promise<unknown>;
};

export type AtticUAConfigType = IConfig&{
    uaEventsTrackingCode?: string;
    sendUAEventsTo?: string[];
};

export type GAOptions = {
    pageUrl: string;
    headers?: { [name: string]: string }
    uaTrackingCode?: string
}

export type AtticUAEventsApplicationContext = IApplicationContext&{
    config: AtticUAConfigType;
    rpcServer: { methods: AtticUAEventsRPCType }
    gtag: (opts: GAOptions, ...args: any) => Promise<unknown>;
}

export class AtticServerGoogleAnalyticsEvents implements IPlugin {
    public uaEventsTrackingCode: string;
    constructor(
      public applicationContext: AtticUAEventsApplicationContext,
      uaEventsTrackingCode?: string
    ) {
        this.uaEventsTrackingCode = uaEventsTrackingCode || this.config.uaEventsTrackingCode || process.env.UA_EVENTS_TRACKING_CODE as string;
    }

    public get config(): AtticUAConfigType { return this.applicationContext.config as AtticUAConfigType; }

    public async gtag(opts: GAOptions, ...args: any[]): Promise<unknown> {
        const  page = await this.browser.newPage();
        await page.goto(opts.pageUrl);
        const  ua = opts.uaTrackingCode || this.uaEventsTrackingCode;
        await page.addScriptTag({
            url: 'https://www.googletagmanager.com/gtag/js?id='+(
                ua
            )
        });
        await page.addScriptTag({
           content: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
    
              gtag('config', '${ua}');
            `
        });

        await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), 1e3) });

        const resp: any = await page.evaluate((args: any) => {
            // @ts-ignore
            return gtag.apply(void(0), args);
        }, args);

        await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), 1e3) });

        return resp;
    }

    browser: any;

    public async init(): Promise<void> {
      const ctx = this.applicationContext;
      this.browser = await require('playwright').chromium.launch({ headless: false });

      ctx.gtag = ctx.rpcServer.methods.gtag = this.gtag;
    }

    public get name(): string {
        return '@znetstar/attic-server-google-analytics-events';
    }
}

export default AtticServerGoogleAnalyticsEvents;
