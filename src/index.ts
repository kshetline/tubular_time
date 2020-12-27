import { IZonePoller } from './i-zone-poller';
import { Timezone } from './timezone';
import { timezoneSmall } from './timezone-small';
import * as timezoneLarge from './timezone-large';
import * as timezoneLargeAlt from './timezone-large-alt';

let win: any = null;

try {
  win = window;
}
catch {}

export {
  Calendar, CalendarType, GREGORIAN_CHANGE_MAX_YEAR, GREGORIAN_CHANGE_MIN_YEAR, SUNDAY, MONDAY, TUESDAY, WEDNESDAY,
  THURSDAY, FRIDAY, SATURDAY, LAST, YMDDate, YearOrDate, GregorianChange, getISOFormatDate, addDaysToDate_SGC,
  getDateFromDayNumber_SGC, getDateFromDayNumberGregorian, getDateFromDayNumberJulian, getDateOfNthWeekdayOfMonth_SGC,
  getDayNumber_SGC, getDayNumberGregorian, getDayNumberJulian, getDayOfWeek, getDayOfWeek_SGC,
  getDayOfWeekInMonthCount_SGC, getDayOnOrAfter_SGC, getDayOnOrBefore_SGC, getDaysInMonth_SGC, getDaysInYear_SGC,
  getFirstDateInMonth_SGC, getLastDateInMonth_SGC, getLastDateInMonthGregorian, getLastDateInMonthJulian,
  isJulianCalendarDate_SGC, isValidDate_SGC, isValidDateGregorian, isValidDateJulian, parseISODate
} from './calendar';
export { DateTime, DateTimeField, UNIX_TIME_ZERO_AS_JULIAN_DAY } from './date-time';
export {
  DateAndTime, MINUTE_MSEC, dateAndTimeFromMillis_SGC, DAY_MINUTES, DAY_MSEC, HOUR_MSEC, millisFromDateTime_SGC,
  parseISODateTime, parseTimeOffset
} from './common';
export { Timezone, Transition, ZoneInfo, RegionAndSubzones } from './timezone';
export { zonePollerBrowser } from './zone-poller-browser';
export { zonePollerNode } from './zone-poller-node';

export function initTimezoneSmall(): void {
  Timezone.defineTimezones(timezoneSmall);
}

export function initTimezoneLarge(): void {
  const zones = timezoneLarge?.timezoneLarge ?? win?.tbTime_timezone_large ?? win?.tmTime_tzcache_large;

  if (zones)
    Timezone.defineTimezones(zones);
  else
    throw new Error('Large timezone set unavailable');
}

export function initTimezoneLargeAlt(): void {
  const zones = timezoneLargeAlt?.timezoneLargeAlt ?? win?.tbTime_timezone_large_alt ?? win?.tmTime_tzcache_large_alt;

  if (zones)
    Timezone.defineTimezones(zones);
  else
    throw new Error('Large-Alt timezone set unavailable');
}

let pollingInterval: any;

const zonesUrl = 'https://unpkg.com/@tubular/time/dist/data/timezone-{name}.js';

export type ZoneOptions = 'small' | 'large' | 'large-alt';

export function pollForTimezoneUpdates(zonePoller: IZonePoller | false, name: ZoneOptions = 'small', intervalDays = 1): void {
  if (pollingInterval)
    clearInterval(pollingInterval);

  if (zonePoller && name && intervalDays >= 0) {
    const url = zonesUrl.replace('{name}', name);
    console.log(url);
    const poll = () => {
      zonePoller.getTimezones(url).then(zones => {
        Timezone.defineTimezones(zones);
        dispatchUpdateNotification(true);
      })
        .catch(err => dispatchUpdateNotification(err instanceof Error ? err : new Error(err)));
    };

    poll();

    if (intervalDays > 0) {
      pollingInterval = setInterval(poll, intervalDays * 86400000);

      // Using unref prevents the interval alone from keeping a process alive
      if (pollingInterval.unref)
        pollingInterval.unref();
    }
  }
}

export async function getTimezones(zonePoller: IZonePoller, name: ZoneOptions = 'small'): Promise<true> {
  return new Promise<true>((resolve, reject) => {
    const listener = (result: true | Error): void => {
      removeZonesUpdateListener(listener);

      if (result instanceof Error)
        reject(result);
      else
        resolve(true);
    };

    addZonesUpdateListener(listener);
    pollForTimezoneUpdates(zonePoller, name, 0);
  });
}

const listeners = new Set<(result: true | Error) => void>();

function dispatchUpdateNotification(result: true | Error): void {
  listeners.forEach(listener => {
    try {
      listener(result);
    }
    catch (e) {}
  });
}

export function addZonesUpdateListener(listener: (result: true | Error) => void): void {
  listeners.add(listener);
}

export function removeZonesUpdateListener(listener: (result: true | Error) => void): void {
  listeners.delete(listener);
}

export function clearZonesUpdateListeners(): void {
  listeners.clear();
}

initTimezoneSmall();
