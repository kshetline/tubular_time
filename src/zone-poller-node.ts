import { IZonePoller } from './i-zone-poller';

let requestText: (url: string) => Promise<any>;

try {
  requestText = require('by-request').requestText;
}
catch {}

export const zonePollerNode: IZonePoller = {
  async getTimezones(url: string): Promise<{ [p: string]: string }> {
    const zones = (await requestText(url)).replace(/^.*?=\s*/, '');

    return JSON.parse(zones);
  }
};
