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

import { DateTime, DateTimeArg } from './date-time';
import { IZonePoller } from './i-zone-poller';
import { Timezone } from './timezone';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import timezoneLargeAlt from './timezone-large-alt';
import { parse } from './format-parse';
import { isString } from '@tubular/util';

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

export const julianDay = DateTime.julianDay;
export const millisFromJulianDay = DateTime.millisFromJulianDay;
export const julianDay_SGC = DateTime.julianDay_SGC;

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

export function isDateTime(obj: any): obj is DateTime { return obj instanceof DateTime; }

export function isDate(obj: any): obj is Date { return obj instanceof Date; }

export function unix(seconds: number, zone?:  Timezone | string | null): DateTime {
  return new DateTime(Math.round(seconds * 1000), zone).lock();
}

function ttime(initialTime?: DateTimeArg, format?: string, locale?: string | string[]): DateTime {
  if (!format || !isString(initialTime))
    return new DateTime(initialTime, null, locale).lock();
  else
    return parse(initialTime, format, null, locale)?.lock();
}

ttime.isDateTime = isDateTime;
ttime.isDate = isDate;
ttime.unix = unix;

export default ttime;
