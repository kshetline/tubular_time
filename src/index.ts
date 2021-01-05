import { GregorianChange } from './calendar';
import { DateAndTime } from './common';
import { DateTime } from './date-time';
import { IZonePoller } from './i-zone-poller';
import { Timezone } from './timezone';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import timezoneLargeAlt from './timezone-large-alt';

let win: any = null;

try {
  win = window;
}
catch {}

Timezone.defineTimezones(win?.tbTime_timezone_large ?? win?.tbTime_timezone_large_alt ?? timezoneSmall);

if (win) {
  delete win.tbTime_timezone_large;
  delete win.tbTime_timezone_large_alt;
}

export {
  Calendar, CalendarType, GREGORIAN_CHANGE_MAX_YEAR, GREGORIAN_CHANGE_MIN_YEAR, SUNDAY, MONDAY, TUESDAY, WEDNESDAY,
  THURSDAY, FRIDAY, SATURDAY, LAST, YearOrDate, GregorianChange, getISOFormatDate, addDaysToDate_SGC,
  getDateFromDayNumber_SGC, getDateFromDayNumberGregorian, getDateFromDayNumberJulian, getDateOfNthWeekdayOfMonth_SGC,
  getDayNumber_SGC, getDayNumberGregorian, getDayNumberJulian, getDayOfWeek, getDayOfWeek_SGC,
  getDayOfWeekInMonthCount_SGC, getDayOnOrAfter_SGC, getDayOnOrBefore_SGC, getDaysInMonth_SGC, getDaysInYear_SGC,
  getFirstDateInMonth_SGC, getLastDateInMonth_SGC, getLastDateInMonthGregorian, getLastDateInMonthJulian,
  isJulianCalendarDate_SGC, isValidDate_SGC, isValidDateGregorian, isValidDateJulian, parseISODate
} from './calendar';
export {
  DateAndTime, MINUTE_MSEC, dateAndTimeFromMillis_SGC, DAY_MINUTES, DAY_MSEC, HOUR_MSEC, millisFromDateTime_SGC,
  parseISODateTime, parseTimeOffset, YMDDate
} from './common';
export { DateTime, DateTimeField, UNIX_TIME_ZERO_AS_JULIAN_DAY } from './date-time';
export { Timezone, Transition, ZoneInfo, RegionAndSubzones } from './timezone';
export { IZonePoller } from './i-zone-poller';
export { zonePollerBrowser } from './zone-poller-browser';
export { zonePollerNode } from './zone-poller-node';

export function initTimezoneSmall(): void {
  Timezone.defineTimezones(timezoneSmall);
}

export function initTimezoneLarge(failQuietly = false): void {
  const zones = timezoneLarge ?? win?.tbTime_timezone_large ?? win?.tbTime_tzcache_large;

  if (zones)
    Timezone.defineTimezones(zones);
  else {
    const msg = 'Large timezone definitions unavailable. Falling back to defaults.';

    console.error(msg);
    Timezone.defineTimezones(timezoneSmall);

    if (!failQuietly)
      throw new Error(msg);
  }
}

export function initTimezoneLargeAlt(failQuietly = false): void {
  const zones = timezoneLargeAlt ?? win?.tbTime_timezone_large_alt ?? win?.tbTime_tzcache_large_alt;

  if (zones)
    Timezone.defineTimezones(zones);
  else {
    const msg = 'Large-Alt timezone definitions unavailable. Falling back to defaults.';

    console.error(msg);
    Timezone.defineTimezones(timezoneSmall);

    if (!failQuietly)
      throw new Error(msg);
  }
}

let pollingInterval: any;

const zonesUrl = 'https://unpkg.com/@tubular/time/dist/data/timezone-{name}.js';

export type ZoneOptions = 'small' | 'large' | 'large-alt';

export function pollForTimezoneUpdates(zonePoller: IZonePoller | false, name: ZoneOptions = 'small', intervalDays = 1): void {
  if (pollingInterval)
    clearInterval(pollingInterval);

  if (zonePoller && name && intervalDays >= 0) {
    const url = zonesUrl.replace('{name}', name);
    const poll = () => {
      zonePoller.getTimezones(url).then(zones => {
        dispatchUpdateNotification(Timezone.defineTimezones(zones));
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

export async function getTimezones(zonePoller: IZonePoller, name: ZoneOptions = 'small'): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const listener = (result: boolean | Error): void => {
      removeZonesUpdateListener(listener);

      if (result instanceof Error)
        reject(result);
      else
        resolve(result);
    };

    addZonesUpdateListener(listener);
    pollForTimezoneUpdates(zonePoller, name, 0);
  });
}

const listeners = new Set<(result: boolean | Error) => void>();

function dispatchUpdateNotification(result: boolean | Error): void {
  listeners.forEach(listener => {
    try {
      listener(result);
    }
    catch (e) {
      console.error(e);
    }
  });
}

export function addZonesUpdateListener(listener: (result: boolean | Error) => void): void {
  listeners.add(listener);
}

export function removeZonesUpdateListener(listener: (result: boolean | Error) => void): void {
  listeners.delete(listener);
}

export function clearZonesUpdateListeners(): void {
  listeners.clear();
}

function ttime(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string | null, locale?: string, gregorianChange?: GregorianChange);
function ttime(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string| null, gregorianChange?: GregorianChange);
function ttime(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string| null,
              gregorianOrLocale?: string | GregorianChange, gregorianChange?: GregorianChange) {
  return new DateTime(initialTime, timezone, gregorianOrLocale as any, gregorianChange).lock();
}

export default ttime;
