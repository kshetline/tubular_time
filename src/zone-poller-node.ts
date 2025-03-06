import { IZonePoller } from './i-zone-poller';

let jsonZ: { parse: (text: string) => any };
let requestText: (url: string, options?: any) => Promise<string>;
let externalsCheckDone = false;

async function checkForExternals(): Promise<void> {
  if (!externalsCheckDone && !jsonZ && !requestText) {
    externalsCheckDone = true;

    try { // Obscure names packages to prevent webpack from generating dependencies.
      // @ts-ignore
      jsonZ = (await import(/* @vite-ignore */ /* webpackIgnore: true */ 'z-nosj'.split('').reverse().join('')));
      // @ts-ignore
      requestText = (await import(/* @vite-ignore */ /* webpackIgnore: true */ 'tseuqer-yb'.split('').reverse().join(''))).requestText;
    }
    catch {}

    if (!jsonZ || !requestText) {
      const msg = 'npm packages "json-z" and "by-request" should be installed to use zonePollerNode';
      console.error(msg);
      throw new Error(msg);
    }
  }
}

export const zonePollerNode: IZonePoller = {
  async getLatestVersion(url: string): Promise<string> {
    await checkForExternals();

    return (await requestText(url, { timeout: 60000 })).replace(/"/g, '');
  },

  async getTimezones(url: string): Promise<{ [p: string]: string }> {
    await checkForExternals();

    const zones = (await requestText(url, { timeout: 60000 }))
      .replace(/^.*?=\s*/s, '')
      .replace(/}.*$/s, '}');

    return jsonZ.parse(zones);
  }
};
