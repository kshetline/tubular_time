/*
  Copyright © 2017-2021 Kerry Shetline, kerry@shetline.com

  MIT license: https://opensource.org/licenses/MIT

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
  persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { DAY_MSEC } from './common';
import { DateTime, DateTimeArg } from './date-time';
import { IZonePoller } from './i-zone-poller';
import { Timezone } from './timezone';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import timezoneLargeAlt from './timezone-large-alt';
import { parse } from './format-parse';
import { forEach, isString, toNumber } from '@tubular/util';
import { CalendarType, DayOfWeek, Month, LAST } from './calendar';
import { getDeltaTAtJulianDate, tdtToUt, utToTdt } from './ut-converter';

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
  Calendar, CalendarType, dateAndTimeFromMillis_SGC, DayOfWeek, Month,
  GREGORIAN_CHANGE_MAX_YEAR, GREGORIAN_CHANGE_MIN_YEAR,
  SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, LAST,
  YearOrDate, GregorianChange, getISOFormatDate, addDaysToDate_SGC,
  getDateFromDayNumber_SGC, getDateFromDayNumberGregorian, getDateFromDayNumberJulian, getDateOfNthWeekdayOfMonth_SGC,
  getDayNumber_SGC, getDayNumberGregorian, getDayNumberJulian, getDayOfWeek, getDayOfWeek_SGC,
  getDayOfWeekInMonthCount_SGC, getDayOnOrAfter_SGC, getDayOnOrBefore_SGC, getDaysInMonth_SGC, getDaysInYear_SGC,
  getFirstDateInMonth_SGC, getLastDateInMonth_SGC, getLastDateInMonthGregorian, getLastDateInMonthJulian,
  isJulianCalendarDate_SGC, isValidDate_SGC, isValidDateGregorian, isValidDateJulian, millisFromDateTime_SGC,
  parseISODate
} from './calendar';
export { DateAndTime, MINUTE_MSEC, DAY_MINUTES, DAY_MSEC, HOUR_MSEC, parseISODateTime, parseTimeOffset, YMDDate
} from './common';
export { DateTime, DateTimeField, DateTimeFieldName, Discontinuity } from './date-time';
export { getDeltaTAtJulianDate, utToTdt, tdtToUt } from './ut-converter';
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
    const poll = (): void => {
      zonePoller.getTimezones(url).then(zones => {
        dispatchUpdateNotification(Timezone.defineTimezones(zones));
      })
        .catch(err => dispatchUpdateNotification(err instanceof Error ? err : new Error(err)));
    };

    poll();

    if (intervalDays > 0) {
      pollingInterval = setInterval(poll, Math.max(intervalDays * DAY_MSEC, 3600000));

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

export function isDateTime(obj: any): obj is DateTime { return obj instanceof DateTime; }

export function isDate(obj: any): obj is Date { return obj instanceof Date; }

export function unix(seconds: number, zone?:  Timezone | string | null): DateTime {
  return new DateTime(Math.round(seconds * 1000), zone).lock();
}

export function max(...dates: DateTime[]): DateTime {
  let result = dates[0];

  for (let i = 1; i < dates.length; ++i) {
    if (DateTime.milliCompare(dates[i], result) > 0)
      result = dates[i];
  }

  return result;
}

export function min(...dates: DateTime[]): DateTime {
  let result = dates[0];

  for (let i = 1; i < dates.length; ++i) {
    if (DateTime.milliCompare(dates[i], result) < 0)
      result = dates[i];
  }

  return result;
}

export function sort(dates: DateTime[], descending = false): DateTime[] {
  if (dates)
    dates.sort((a, b) => DateTime.compare(a, b) * (descending ? -1 : 1));

  return dates;
}

export function ttime(initialTime?: DateTimeArg, format?: string, locale?: string | string[]): DateTime {
  if (!format || !isString(initialTime))
    return new DateTime(initialTime, null, locale).lock();
  else
    return parse(initialTime, format, null, locale)?.lock();
}

ttime.addZonesUpdateListener = addZonesUpdateListener;
ttime.clearZonesUpdateListeners = clearZonesUpdateListeners;
ttime.getTimezones = getTimezones;
ttime.initTimezoneSmall = initTimezoneSmall;
ttime.initTimezoneLarge = initTimezoneLarge;
ttime.initTimezoneLargeAlt = initTimezoneLargeAlt;
ttime.isDateTime = isDateTime;
ttime.isDate = isDate;
ttime.max = max;
ttime.min = min;
ttime.unix = unix;
ttime.parse = parse;
ttime.pollForTimezoneUpdates = pollForTimezoneUpdates;
ttime.removeZonesUpdateListener = removeZonesUpdateListener;
ttime.sort = sort;

ttime.DATETIME_LOCAL         = 'Y-MM-DD[T]HH:mm';
ttime.DATETIME_LOCAL_SECONDS = 'Y-MM-DD[T]HH:mm:ss';
ttime.DATETIME_LOCAL_MS      = 'Y-MM-DD[T]HH:mm:ss.SSS';
ttime.DATE                   = 'Y-MM-DD';
ttime.TIME                   = 'HH:mm';
ttime.TIME_SECONDS           = 'HH:mm:ss';
ttime.TIME_MS                = 'HH:mm:ss.SSS';
ttime.WEEK                   = 'GGGG-[W]WW';
ttime.WEEK_AND_DAY           = 'GGGG-[W]WW-E';
ttime.WEEK_LOCALE            = 'gggg-[w]ww';
ttime.WEEK_AND_DAY_LOCALE    = 'gggg-[w]ww-e';
ttime.MONTH                  = 'Y-MM';

ttime.PURE_JULIAN    = CalendarType.PURE_JULIAN;
ttime.PURE_GREGORIAN = CalendarType.PURE_GREGORIAN;

ttime.getDefaultCenturyBase = DateTime.getDefaultCenturyBase;
ttime.setDefaultCenturyBase = DateTime.setDefaultCenturyBase;
ttime.getDefaultLocale      = DateTime.getDefaultLocale;
ttime.setDefaultLocale      = DateTime.setDefaultLocale;
ttime.getDefaultTimezone    = DateTime.getDefaultTimezone;
ttime.setDefaultTimezone    = DateTime.setDefaultTimezone;
ttime.julianDay             = DateTime.julianDay;
ttime.millisFromJulianDay   = DateTime.millisFromJulianDay;
ttime.julianDay_SGC         = DateTime.julianDay_SGC;

ttime.getDeltaTAtJulianDate = getDeltaTAtJulianDate;
ttime.tdtToUt               = tdtToUt;
ttime.utToTdt               = utToTdt;

forEach(DayOfWeek, (key, value) => { if (toNumber(key, -1) < 0) ttime[key] = value; });
forEach(Month, (key, value) => { if (toNumber(key, -1) < 0) ttime[key] = value; });
ttime.LAST = LAST;

Object.freeze(ttime);
initTimezoneSmall();

export default ttime;
