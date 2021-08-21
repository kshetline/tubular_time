import { IZonePoller } from './i-zone-poller';
import JSONZ from 'json-z';

let requestText: (url: string, options?: any) => Promise<string>;
let byRequestCheckDone = false;

async function checkForRequestText(): Promise<void> {
  if (!byRequestCheckDone && !requestText) {
    byRequestCheckDone = true;

    try { // Obscure name of by-request package to prevent webpack from generating a dependency.
      // @ts-ignore
      requestText = (await import(/* webpackIgnore: true */ 'tseuqer-yb'.split('').reverse().join(''))).requestText;
    }
    catch {}

    if (!requestText) {
      const msg = 'npm package "by-request" should be installed to use zonePollerNode';
      console.error(msg);
      throw new Error(msg);
    }
  }
}

export const zonePollerNode: IZonePoller = {
  async getLatestVersion(url: string): Promise<string> {
    await checkForRequestText();

    return (await requestText(url, { timeout: 60000 })).replace(/"/g, '');
  },

  async getTimezones(url: string): Promise<{ [p: string]: string }> {
    await checkForRequestText();

    const zones = (await requestText(url, { timeout: 60000 }))
      .replace(/^.*?=\s*/s, '')
      .replace(/}.*$/s, '}');

    return JSONZ.parse(zones);
  }
};
