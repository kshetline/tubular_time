import { IZonePoller } from './i-zone-poller';

export const zonePollerBrowser: IZonePoller = {
  getLatestVersion(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const head = document.querySelector('head');
      const script = document.createElement('script');
      const callbackName = 'tt_zp_callback_' + (1000000 + Math.floor(Math.random() * 9000000));
      let version: Error | string = '';

      window[callbackName] = (data: any): void => {
        if (typeof data === 'string')
          version = data;
        else
          version = new Error('Invalid data for tz version from ' + url);
      };

      head.appendChild(script);
      script.onload = (): void => {
        script.remove();
        window[callbackName] = undefined;

        if (version instanceof Error)
          reject(version);
        else
          resolve(version);
      };
      script.onerror = (): void => {
        script.remove();
        reject(new Error('Failed to retrieve latest tz version from ' + url));
      };
      script.src = `${url}?callback=${callbackName}`;
    });
  },

  getTimezones(url: string): Promise<{ [p: string]: string }> {
    return new Promise<Record<string, string>>((resolve, reject) => {
      const head = document.querySelector('head');
      const script = document.createElement('script');
      const w = window as any;

      head.appendChild(script);
      script.onload = (): void => {
        const zoneData = w.tbTime_timezone_small || w.tbTime_timezone_large || w.tbTime_timezone_large_alt;

        script.remove();
        w.tbTime_tzcache_small = w.tbTime_timezone_small ?? w.tbTime_tzcache_small;
        delete w.tbTime_timezone_small;
        w.tbTime_tzcache_large = w.tbTime_timezone_large ?? w.tbTime_tzcache_large;
        delete w.tbTime_timezone_large;
        w.tbTime_tzcache_large_alt = w.tbTime_timezone_large_alt ?? w.tbTime_tzcache_large_alt;
        delete w.tbTime_timezone_large_alt;
        resolve(zoneData);
      };
      script.onerror = (): void => {
        script.remove();
        reject(new Error('Failed to load timezone definitions from ' + url));
      };
      script.src = url;
    });
  }
};
