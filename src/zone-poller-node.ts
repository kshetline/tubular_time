import { IZonePoller } from './i-zone-poller';

let requestText: (url: string) => Promise<string>;

export const zonePollerNode: IZonePoller = {
  async getTimezones(url: string): Promise<{ [p: string]: string }> {
    if (!requestText) {
      try { // Obscure name of by-request package to prevent webpack from generating a dependency.
        // @ts-ignore
        requestText = (await import(/* webpackIgnore: true */ 'tseuqer-yb'.split('').reverse().join(''))).requestText;
      }
      catch {}
    }

    if (!requestText) {
      const msg = 'npm package "by-request" should be installed to use zonePollerNode';
      console.error(msg);
      throw new Error(msg);
    }

    const zones = (await requestText(url)).replace(/^.*?=\s*/, '');

    return JSON.parse(zones);
  }
};
