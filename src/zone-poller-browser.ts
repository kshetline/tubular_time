import { IZonePoller } from './i-zone-poller';

export const zonePollerBrowser: IZonePoller = {
  getTimezones(url: string): Promise<{ [p: string]: string }> {
    return new Promise<{[p: string]: string}>((resolve, reject) => {
      const head = document.querySelector('head');
      const script = document.createElement('script');
      const w = window as any;

      head.appendChild(script);
      script.onload = () => {
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
      script.onerror = () => {
        script.remove();
        reject(new Error('Failed to load timezone definitions from ' + url));
      };
      script.src = url;
    });
  }
};
