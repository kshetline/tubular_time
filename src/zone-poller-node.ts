import { IZonePoller } from './i-zone-poller';
import { requestText } from 'by-request';

export const zonePollerNode: IZonePoller = {
  async getTimezones(url: string): Promise<{ [p: string]: string }> {
    try {
      const zones = (await requestText(url)).replace(/^.*?=\s*/, '');

      return JSON.parse(zones);
    }
    catch (e) {
      return e;
    }
  }
};
