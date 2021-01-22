/*
  Copyright © 2017-2020 Kerry Shetline, kerry@shetline.com

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

import { div_rd, floor, max, min, mod, mod2, round } from '@tubular/math';
import { clone, isArray, isEqual, isNumber, isObject, isString } from '@tubular/util';
import { getDayNumber_SGC, GregorianChange, handleVariableDateArgs, isGregorianType, Calendar, YearOrDate } from './calendar';
import { DateAndTime, DAY_MSEC, MINUTE_MSEC, parseISODateTime, purgeAliasFields, syncDateAndTime, validateDateAndTime, YMDDate } from './common';
import { format as formatter } from './format-parse';
import { Timezone } from './timezone';
import { getMinDaysInWeek, getStartOfWeek } from './locale-data';

export enum DateTimeField {
  MILLIS, SECONDS, MINUTES, HOUR_12, HOUR, AM_PM, DAY, DATE = DAY,
  DAY_OF_WEEK, DAY_OF_WEEK_LOCALE, DAY_OF_YEAR, WEEK, WEEK_LOCALE,
  MONTH, YEAR, YEAR_WEEK, YEAR_WEEK_LOCALE, ERA
}

export const UNIX_TIME_ZERO_AS_JULIAN_DAY = 2440587.5;

const localeTest = /^[a-z][a-z][-_a-z]*$/i;
const lockError = new Error('This DateTime instance is locked and immutable');
const nonIntError = new Error('Amounts for add/roll must be integers');
// noinspection SpellCheckingInspection
const fullIsoFormat = 'yyyy-MM-DDTHH:mm:ss.SSSZ';
// noinspection SpellCheckingInspection
const fullAltFormat = 'yyyy-MM-DDTHH:mm:ss.SSSRZv';
const timeOnlyFormat = 'HH:mm:ss.SSS';

export class DateTime extends Calendar {
  private static defaultCenturyBase = 1970;
  private static defaultLocale: string | string[] = 'en-us';
  private static defaultTimezone = Timezone.OS_ZONE;

  private _locale = DateTime.defaultLocale;
  private _timezone = DateTime.defaultTimezone;
  private _utcTimeMillis = 0;
  private _wallTime: DateAndTime;

  static julianDay(millis: number): number {
    return millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY;
  }

  static millisFromJulianDay(jd: number): number {
    return round(DAY_MSEC * (jd - UNIX_TIME_ZERO_AS_JULIAN_DAY));
  }

  static julianDay_SGC(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
    return getDayNumber_SGC(year, month, day) + UNIX_TIME_ZERO_AS_JULIAN_DAY +
             (hour + (minute + second / 60.0) / 60.0) / 24.0;
  }

  static getDefaultCenturyBase(): number { return DateTime.defaultCenturyBase; }
  static setDefaultCenturyBase(newBase: number) { DateTime.defaultCenturyBase = newBase; }

  static getDefaultLocale(): string | string[] { return DateTime.defaultLocale; }
  static setDefaultLocale(newLocale: string | string[]) { DateTime.defaultLocale = newLocale; }

  static getDefaultTimezone(): Timezone { return DateTime.defaultTimezone; }
  static setDefaultTimezone(newZone: Timezone | string) {
    if (isString(newZone))
      newZone = Timezone.from(newZone);

    DateTime.defaultTimezone = newZone;
  }

  static INVALID_DATE = new DateTime(NaN).lock();

  constructor(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string | null, locale?: string | string[], gregorianChange?: GregorianChange);
  constructor(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string| null, gregorianChange?: GregorianChange);
  constructor(initialTime?: number | string | DateAndTime | Date | null, timezone?: Timezone | string| null,
              gregorianOrLocale?: string| string[] | GregorianChange, gregorianChange?: GregorianChange) {
    super(gregorianChange ?? (isGregorianType(gregorianOrLocale) ? gregorianOrLocale : undefined));

    if (isString(initialTime)) {
      const $ = /(Z|\b[_/a-z]+)$/i.exec(initialTime);
      let zone: string;
      const origTime = initialTime;

      if ($) {
        zone = $[1];

        initialTime = initialTime.slice(0, -zone.length).trim();

        if (/^(Z|UT|UTC|GMT)$/i.test(zone))
          zone = 'UT';

        timezone = timezone ?? Timezone.from(zone);

        if (timezone instanceof Timezone && timezone.error) {
          const szni = Timezone.getShortZoneNameInfo(zone);

          if (szni) {
            timezone = Timezone.from(szni.ianaName);
            initialTime += ' ' + Timezone.formatUtcOffset(szni.utcOffset);
          }
          else {
            timezone = undefined;
            zone = undefined;
            initialTime = origTime;
          }
        }
      }

      if (initialTime) {
        try {
          initialTime = parseISODateTime(initialTime);

          if (initialTime.y == null) {
            timezone = Timezone.DATELESS;
            initialTime.y = 1970;
            initialTime.m = 1;
            initialTime.d = 1;
          }
        }
        catch {
          initialTime = Date.parse(initialTime + (zone ? ' ' + zone : ''));
        }
      }
      else
        initialTime = null;
    }

    if (isString(timezone))
      timezone = Timezone.from(timezone);

    if (timezone)
      this._timezone = timezone;

    if (!isNumber(gregorianOrLocale) && isString(gregorianOrLocale) && localeTest.test(gregorianOrLocale))
      this._locale = gregorianOrLocale;

    if (initialTime instanceof Date)
      this.utcTimeMillis = +initialTime;
    else if (isObject(initialTime)) {
      if (!timezone && initialTime!.utcOffset != null && initialTime!.utcOffset !== 0)
        this._timezone = Timezone.from(Timezone.formatUtcOffset(initialTime!.utcOffset));

      this.wallTime = initialTime;
    }
    else
      this.utcTimeMillis = (isNumber(initialTime) ? initialTime as number : Date.now());
  }

  lock = () => this._lock();
  protected _lock(doLock = true): DateTime {
    super._lock(doLock);
    return this;
  }

  clone(cloneLock = true): DateTime {
    const copy = new DateTime(this._utcTimeMillis, this._timezone, this._locale);

    if (this.isPureJulian())
      copy.setPureJulian(true);
    else if (this.isPureGregorian())
      copy.setPureGregorian(true);
    else
      copy.setGregorianChange(this.getGregorianChange());

    if (cloneLock && this.locked)
      copy.lock();

    return copy;
  }

  get valid(): boolean { return this._utcTimeMillis != null && !isNaN(this._utcTimeMillis); }

  get utcTimeMillis(): number { return this._utcTimeMillis; }
  set utcTimeMillis(newTime: number) {
    if (this.locked)
      throw lockError;

    if (this._utcTimeMillis !== newTime || !this.wallTime) {
      this._utcTimeMillis = newTime;
      this.updateWallTimeFromCurrentMillis();
    }
  }

  get wallTime(): DateAndTime { return clone(this._wallTime); }
  set wallTime(newTime: DateAndTime) {
    if (this.locked)
      throw lockError;

    if (!isEqual(this._wallTime, newTime)) {
      validateDateAndTime(newTime);
      this._wallTime = clone(newTime);
      this.updateUtcMillisFromWallTime();
      this.updateWallTimeFromCurrentMillis();
    }
  }

  get timezone(): Timezone { return this._timezone; }
  set timezone(newZone: Timezone) {
    if (this.locked)
      throw lockError;

    if (isString(newZone))
      newZone = Timezone.from(newZone);

    if (this._timezone !== newZone) {
      this._timezone = newZone;
      this.updateWallTimeFromCurrentMillis();
    }
  }

  tz(newZone: Timezone | string, keepLocalTime = false): DateTime {
    if (isString(newZone))
      newZone = Timezone.from(newZone);

    const result = this.clone();
    const wallTime = result.wallTime; // copy

    result.timezone = newZone;

    if (keepLocalTime) {
      delete wallTime.utcOffset;
      delete wallTime.occurrence;
      result.wallTime = wallTime;
    }

    return result;
  }

  toLocale(newLocale: string | string[]): DateTime {
    const result = this.clone();
    result.locale = newLocale;
    return result;
  }

  get locale(): string | string[] { return this._locale; }
  set locale(newLocale: string | string[]) {
    if (this.locked)
      throw lockError;

    if (this._locale !== newLocale)
      this._locale = newLocale;
  }

  get utcOffsetSeconds(): number {
    return this._timezone.getOffset(this._utcTimeMillis);
  }

  get utcOffsetMinutes(): number {
    return round(this._timezone.getOffset(this._utcTimeMillis) / 60);
  }

  get dstOffsetSeconds(): number {
    return this._timezone.getOffsets(this._utcTimeMillis)[1];
  }

  get dstOffsetMinutes(): number {
    return round(this._timezone.getOffsets(this._utcTimeMillis)[1] / 60);
  }

  getTimezoneDisplayName(): string {
    return this._timezone.getDisplayName(this._utcTimeMillis);
  }

  add(field: DateTimeField, amount: number): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (amount === 0)
      return result._lock(this.locked);
    else if (amount !== floor(amount))
      throw nonIntError;

    let updateFromWall = false;
    let normalized: YMDDate;
    const wallTime = result._wallTime;

    switch (field) {
      case DateTimeField.MILLIS:
        result._utcTimeMillis += amount;
        break;

      case DateTimeField.SECONDS:
        result._utcTimeMillis += amount * 1000;
        break;

      case DateTimeField.MINUTES:
        result._utcTimeMillis += amount * 60_000;
        break;

      case DateTimeField.HOUR:
        result._utcTimeMillis += amount * 3_600_000;
        break;

      case DateTimeField.DAY:
        result._utcTimeMillis += amount * 86_400_000;
        break;

      case DateTimeField.WEEK:
        result._utcTimeMillis += amount * 604_800_000;
        break;

      case DateTimeField.MONTH:
        // eslint-disable-next-line no-case-declarations
        const m = wallTime.m;
        updateFromWall = true;
        wallTime.m = mod(m - 1 + amount, 12) + 1;
        wallTime.y += div_rd(m - 1 + amount, 12);
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        break;

      case DateTimeField.YEAR:
        updateFromWall = true;
        wallTime.y += amount;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        break;

      default:
        throw new Error(`${DateTimeField[field]} is not a valid add() field`);
    }

    if (updateFromWall) {
      delete wallTime.occurrence;
      delete wallTime.utcOffset;
      result.updateUtcMillisFromWallTime();
    }

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  roll(field: DateTimeField, amount: number, minYear = 1900, maxYear = 2099): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (amount === 0)
      return result._lock(this.locked);
    else if (amount !== floor(amount))
      throw nonIntError;

    let normalized: YMDDate;
    const wallTime = result._wallTime;

    switch (field) {
      case DateTimeField.MILLIS:
        wallTime.millis = mod(wallTime.millis + amount, 1000);
        break;

      case DateTimeField.SECONDS:
        wallTime.sec = mod(wallTime.sec + amount, 60);
        break;

      case DateTimeField.MINUTES:
        wallTime.min = mod(wallTime.min + amount, 60);
        break;

      case DateTimeField.HOUR:
        {
          const hoursInDay = floor(result.getSecondsInDay() / 3600);
          wallTime.hrs = mod(wallTime.hrs + amount, hoursInDay);
        }
        break;

      case DateTimeField.AM_PM:
      // Normally straight-forward, but this can get weird if the AM/PM roll crosses a Daylight Saving Time change.
      {
        const targetHour = mod(wallTime.hrs + 12, 24);

        result.roll(DateTimeField.HOUR, 12 * (amount % 2));

        if (result._wallTime.hrs === targetHour)
          return result._lock(this.locked);
        else if (mod2(result._wallTime.hrs - targetHour, 24) < 0)
          return result.add(DateTimeField.HOUR, 1)._lock(this.locked);
        else
          return result.add(DateTimeField.HOUR, -1)._lock(this.locked);
      }

      case DateTimeField.DAY:
        {
          const missing = result.getMissingDateRange();
          const daysInMonth = result.getLastDateInMonth();

          wallTime.d = mod(wallTime.d + amount - 1, daysInMonth) + 1;

          if (missing && (missing[0] <= wallTime.d && wallTime.d <= missing[1]))
            wallTime.d = amount < 0 ? missing[0] - 1 : missing[1] + 1;

          wallTime.d = min(max(wallTime.d, result.getFirstDateInMonth()), daysInMonth);
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.DAY_OF_WEEK:
        wallTime.dw = mod(wallTime.dw + amount - 1, 7) + 1;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_WEEK_LOCALE:
        wallTime.dwl = mod(wallTime.dwl + amount - 1, 7) + 1;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_YEAR:
        wallTime.dy = mod(wallTime.dy + amount - 1, this.getDaysInYear(wallTime.y)) + 1;
        delete wallTime.m;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK:
        {
          const weeksInYear = result.getWeeksInYear(wallTime.yw, 1, 4);

          wallTime.w = mod(wallTime.w + amount - 1, weeksInYear) + 1;
          delete wallTime.y;
          delete wallTime.ywl;
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.WEEK_LOCALE:
        {
          const weeksInYear = result.getWeeksInYear(wallTime.ywl,
            getStartOfWeek(this.locale), getMinDaysInWeek(this.locale));

          wallTime.wl = mod(wallTime.wl + amount - 1, weeksInYear) + 1;
          delete wallTime.y;
          delete wallTime.yw;
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.MONTH:
        wallTime.m = mod(wallTime.m + amount - 1, 12) + 1;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR:
        wallTime.y = mod(wallTime.y - minYear + amount, maxYear - minYear + 1) + minYear;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK:
        wallTime.yw = mod(wallTime.yw - minYear + amount, maxYear - minYear + 1) + minYear;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        wallTime.ywl = mod(wallTime.ywl - minYear + amount, maxYear - minYear + 1) + minYear;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.ERA:
        if (amount % 2 === 0)
          return result._lock(this.locked);

        wallTime.y = -wallTime.y + 1;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;
    }

    delete wallTime.occurrence;
    result.updateUtcMillisFromWallTime();
    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  set(field: DateTimeField, value: number, loose = false): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (value !== floor(value))
      throw nonIntError;

    let normalized: YMDDate;
    const wallTime = result._wallTime;
    let min = 0;
    let max = 59;

    switch (field) {
      case DateTimeField.MILLIS:
        max = 999;
        wallTime.millis = value;
        break;

      case DateTimeField.SECONDS:
        wallTime.sec = value;
        break;

      case DateTimeField.MINUTES:
        wallTime.min = value;
        break;

      case DateTimeField.HOUR:
        max = 23;
        wallTime.hrs = value;
        break;

      case DateTimeField.HOUR_12:
        min = 1;
        max = 12;

        if (wallTime.hrs < 12)
          wallTime.hrs = (value === 12 ? 0 : value);
        else
          wallTime.hrs = (value === 12 ? 12 : value + 12);
        break;

      case DateTimeField.AM_PM:
        max = 1;
        if (value === 0 && wallTime.hrs >= 12)
          wallTime.hrs -= 12;
        else if (value === 1 && wallTime.hrs < 12)
          wallTime.hrs += 12;
        break;

      case DateTimeField.DATE:
        min = loose ? 0 : 1;
        max = loose ? 32 : this.getLastDateInMonth();
        wallTime.d = value;
        if (!loose) {
          const missing = this.getMissingDateRange();

          if (missing && (missing[0] <= value && value <= missing[1]))
            throw new Error(`${value} is an invalid date in the month ${wallTime.m}/${wallTime.y}`);
        }
        break;

      case DateTimeField.DAY_OF_WEEK:
        min = loose ? 0 : 1;
        max = loose ? 8 : 7;
        wallTime.dw = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_WEEK_LOCALE:
        min = loose ? 0 : 1;
        max = loose ? 8 : 7;
        wallTime.dwl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_YEAR:
        min = loose ? 0 : 1;
        max = loose ? 367 : this.getDaysInYear(wallTime.y);
        wallTime.dy = value;
        delete wallTime.m;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK:
        min = loose ? 0 : 1;
        max = loose ? 54 : this.getWeeksInYear(wallTime.yw, 1, 4);
        wallTime.w = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK_LOCALE:
        min = loose ? 0 : 1;
        max = loose ? 54 : result.getWeeksInYear(wallTime.ywl, getStartOfWeek(this.locale), getMinDaysInWeek(this.locale));
        wallTime.wl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.MONTH:
        min = loose ? 0 : 1;
        max = loose ? 13 : 12;
        wallTime.m = value;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR:
        min = -271820;
        max = 275759;
        wallTime.y = value;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK:
        min = -271820;
        max = 275759;
        wallTime.yw = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        min = -271820;
        max = 275759;
        wallTime.ywl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.ERA:
        max = 1;

        if ((value === 0 && wallTime.y > 0) || (value === 1 && wallTime.y <= 0)) {
          wallTime.y = -wallTime.y + 1;
          normalized = result.normalizeDate(wallTime);
          [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
          delete wallTime.utcOffset;
          break;
        }
    }

    if (value < min || value > max)
      throw new Error(`${DateTimeField[field]} (${value}) must be in the range [${min}, ${max}]`);

    delete wallTime.occurrence;
    result.updateUtcMillisFromWallTime();
    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (yearOrDate == null) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

    let dayMillis = this.getDayNumber(year, month, day) * DAY_MSEC;

    dayMillis -= this.timezone.getOffsetForWallTime(dayMillis) * 1000;

    // There are weird turning-back-the-clock situations where there are two midnights
    // during a single day. Make sure we're getting the earlier midnight unless the
    // earlier midnight doesn't match the day of the month requested.
    const transition = this.timezone.findTransitionByUtc(dayMillis);

    if (transition !== null && transition.deltaOffset < 0 && dayMillis < transition.transitionTime - transition.deltaOffset * 1000) {
      const earlier = dayMillis + transition.deltaOffset * 1000;
      // The date doesn't have to be normalized when calling this function -- that is, we can
      // ask for the start of January 32 to mean February 1. Now, however, we need a normalized
      // date to select the correct midnight.
      const normalized = this.normalizeDate(year, month, day);

      if (this.getTimeOfDayFieldsFromMillis(earlier).d === normalized.d)
        dayMillis = earlier;
    }

    return dayMillis;
  }

  getSecondsInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (yearOrDate == null) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

    return (this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / 1000;
  }

  getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (yearOrDate == null) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

    return round((this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / MINUTE_MSEC);
  }

  getCalendarMonth(year: number, month: number, startingDayOfWeek?: number): YMDDate[];
  getCalendarMonth(startingDayOfWeek?: number): YMDDate[];
  getCalendarMonth(yearOrStartingDay?: number, month?: number, startingDayOfWeek?: number): YMDDate[] {
    let year: number;

    if (month == null)
      [year, month, startingDayOfWeek] = [this._wallTime.y,  this._wallTime.m, yearOrStartingDay];
    else
      year = yearOrStartingDay;

    const calendar = super.getCalendarMonth(year, month, startingDayOfWeek || getStartOfWeek(this.locale));

    for (const date of calendar) {
      if (this.getMinutesInDay(date) <= 0) {
        date.d *= -1;
        date.day = date.d;
      }
    }

    return calendar;
  }

  format(fmt = fullIsoFormat, localeOverride?: string): string {
    return formatter(this, fmt, localeOverride);
  }

  toString(): string {
    return 'DateTime<' + this.format(this.timezone === Timezone.DATELESS ? timeOnlyFormat : fullAltFormat) + '>';
  }

  toYMDhmString(): string {
    return formatter(this, 'YYYY-MM-DD HH:mm:ssv', 'en-US');
  }

  toIsoString(maxLength?: number): string {
    let s = this.format(undefined, 'en-US');

    if (maxLength != null)
      s = s.substr(0, maxLength);

    return s;
  }

  toHoursAndMinutesString(includeDst = false): string {
    return this.format('HH:mm' + (includeDst ? 'v' : ''), 'en-US');
  }

  private updateUtcMillisFromWallTime(): void {
    this._utcTimeMillis = this.computeUtcMillisFromWallTimeAux(this._wallTime);
  }

  public computeUtcMillisFromWallTime(wallTime: DateAndTime): number {
    return this.computeUtcMillisFromWallTimeAux(clone(wallTime));
  }

  private computeUtcMillisFromWallTimeAux(wallTime: DateAndTime): number {
    purgeAliasFields(this._wallTime);

    let millis = (wallTime.millis ?? 0) +
                 (wallTime.sec ?? 0) * 1000 +
                 (wallTime.min ?? 0) * 60000 +
                 (wallTime.hrs ?? 0) * 3600000 +
                 this.getDayNumber(wallTime) * 86400000;

    if (wallTime.utcOffset != null)
      millis -= wallTime.utcOffset * 1000;
    else
      millis -= this._timezone.getOffsetForWallTime(millis) * 1000;

    if (wallTime.occurrence === 1) {
      const transition = this.timezone.findTransitionByUtc(millis);

      if (transition !== null && transition.deltaOffset < 0 && millis < transition.transitionTime - transition.deltaOffset * 1000)
        millis += transition.deltaOffset * 1000;
    }

    return millis;
  }

  private updateWallTimeFromCurrentMillis(): void {
    this._wallTime = this.getTimeOfDayFieldsFromMillis(this._utcTimeMillis);
  }

  getTimeOfDayFieldsFromMillis(millis: number): DateAndTime {
    if (millis == null || isNaN(millis))
      return syncDateAndTime({ y: NaN, m: NaN, d: NaN, n: NaN });

    let ticks = millis + this._timezone.getOffset(millis) * 1000;
    const wallTimeMillis = ticks;
    const wallTime = this.getDateFromDayNumber(div_rd(ticks, 86400000), 1, 4) as DateAndTime;

    wallTime.millis = mod(ticks, 1000);
    ticks = div_rd(ticks, 1000);
    wallTime.sec = mod(ticks, 60);
    ticks = div_rd(ticks, 60);
    wallTime.min = mod(ticks, 60);
    ticks = div_rd(ticks, 60);
    wallTime.hrs = mod(ticks, 24);
    const offsets = this._timezone.getOffsets(millis);
    wallTime.utcOffset = offsets[0];
    wallTime.dstOffset = offsets[1];
    wallTime.occurrence = 1;

    const transition = this.timezone.findTransitionByWallTime(wallTimeMillis);

    if (transition && millis >= transition.transitionTime && millis < transition.transitionTime - transition.deltaOffset * 1000)
      wallTime.occurrence = 2;

    wallTime.n = this.getDayNumber(wallTime);
    const date = this.getDateFromDayNumber(wallTime.n);
    [wallTime.y, wallTime.m, wallTime.d] = [date.y, date.m, date.d];
    [wallTime.yw, wallTime.w, wallTime.dw] = this.getYearWeekAndWeekday(wallTime, 1, 4);
    [wallTime.ywl, wallTime.wl, wallTime.dwl] =
      this.getYearWeekAndWeekday(wallTime, getStartOfWeek(this.locale), getMinDaysInWeek(this.locale));
    wallTime.dy = wallTime.n - this.getDayNumber(wallTime.y, 1, 1) + 1;
    wallTime.j = this.isJulianCalendarDate(wallTime);
    syncDateAndTime(wallTime);

    return wallTime;
  }

  setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): void {
    super.setGregorianChange(gcYearOrDate, gcMonth, gcDate);

    if (this._timezone)
      this.updateWallTimeFromCurrentMillis();
  }

  getDayNumber(yearOrDate: YearOrDate, month?: number, day?: number): number {
    if (isObject(yearOrDate) && !isArray(yearOrDate)) {
      month = getStartOfWeek(this.locale);
      day = getMinDaysInWeek(this.locale);
    }

    return super.getDayNumber(yearOrDate ?? this._wallTime, month, day);
  }

  getFirstDateInMonth(year?: number, month?: number): number {
    return super.getFirstDateInMonth(year ?? this._wallTime.y, month ?? this._wallTime.m);
  }

  getLastDateInMonth(year?: number, month?: number): number {
    return super.getLastDateInMonth(year ?? this._wallTime.y, month ?? this._wallTime.m);
  }

  getDaysInMonth(year?: number, month?: number): number {
    return super.getDaysInMonth(year ?? this._wallTime.y, month ?? this._wallTime.m);
  }

  getDaysInYear(year?: number): number {
    return super.getDaysInYear(year ?? this._wallTime.y);
  }

  getDayOfWeek(yearOrDateOrDayNum?: YearOrDate, month?: number, day?: number): number {
    return super.getDayOfWeek(yearOrDateOrDayNum ?? this._wallTime, month, day);
  }

  getDateOfNthWeekdayOfMonth(year: number, month: number, dayOfTheWeek: number, index: number): number;
  getDateOfNthWeekdayOfMonth(dayOfTheWeek: number, index: number): number;
  getDateOfNthWeekdayOfMonth(...args: number[]): number {
    if (args.length >= 4)
      return super.getDateOfNthWeekdayOfMonth(args[0], args[1], args[2], args[3]);
    else
      return super.getDateOfNthWeekdayOfMonth(this._wallTime.y, this._wallTime.m, args[0], args[1]);
  }

  getDayOfWeekInMonthCount(year: number, month: number, dayOfTheWeek: number): number;
  getDayOfWeekInMonthCount(dayOfTheWeek: number): number;
  getDayOfWeekInMonthCount(...args: number[]): number {
    if (args.length >= 3)
      return super.getDayOfWeekInMonthCount(args[0], args[1], args[2]);
    else
      return super.getDayOfWeekInMonthCount(this._wallTime.y, this._wallTime.m, args[0]);
  }

  getDayOnOrAfter(year: number, month: number, dayOfTheWeek: number, minDate: number): number;
  getDayOnOrAfter(dayOfTheWeek: number, minDate: number): number;
  getDayOnOrAfter(...args: number[]): number {
    if (args.length >= 4)
      return super.getDayOnOrAfter(args[0], args[1], args[2], args[3]);
    else
      return super.getDayOnOrAfter(this._wallTime.y, this._wallTime.m, args[0], args[1]);
  }

  getDayOnOrBefore(year: number, month: number, dayOfTheWeek: number, maxDate: number): number;
  getDayOnOrBefore(dayOfTheWeek: number, minDate: number): number;
  getDayOnOrBefore(...args: number[]): number {
    if (args.length >= 4)
      return super.getDayOnOrBefore(args[0], args[1], args[2], args[3]);
    else
      return super.getDayOnOrBefore(this._wallTime.y, this._wallTime.m, args[0], args[1]);
  }

  addDaysToDate(deltaDays: number, yearOrDate: YearOrDate, month?: number, day?: number): YMDDate;
  addDaysToDate(deltaDays: number): YMDDate;
  addDaysToDate(deltaDays: number, yearOrDate?: YearOrDate, month?: number, day?: number): YMDDate {
    if (yearOrDate == null)
      return super.addDaysToDate(deltaDays, this._wallTime);
    else
      return super.addDaysToDate(deltaDays, yearOrDate, month, day);
  }

  getMissingDateRange(year: number, month: number): number[] | null;
  getMissingDateRange(): number[] | null;
  getMissingDateRange(...args: number[]): number[] | null {
    if (args.length >= 2)
      return super.getMissingDateRange(args[0], args[1]);
    else
      return super.getMissingDateRange(this._wallTime.y, this._wallTime.m);
  }

  getStartDateOfFirstWeekOfYear(year: number, startingDayOfWeek?: number, minDaysInCalendarYear?: number): YMDDate {
    startingDayOfWeek = startingDayOfWeek ?? getStartOfWeek(this.locale) ?? 1;
    minDaysInCalendarYear = minDaysInCalendarYear ?? getMinDaysInWeek(this.locale) ?? 4;

    return super.getStartDateOfFirstWeekOfYear(year, startingDayOfWeek, minDaysInCalendarYear);
  }

  getWeeksInYear(year: number, startingDayOfWeek = 1, minDaysInCalendarYear = 4): number {
    startingDayOfWeek = startingDayOfWeek ?? getStartOfWeek(this.locale) ?? 1;
    minDaysInCalendarYear = minDaysInCalendarYear ?? getMinDaysInWeek(this.locale) ?? 4;

    return super.getWeeksInYear(year, startingDayOfWeek, minDaysInCalendarYear);
  }

  getYearWeekAndWeekday(year: number, month: number, day: number,
    startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

  getYearWeekAndWeekday(date: YearOrDate | number,
    startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

  getYearWeekAndWeekday(yearOrDate: YearOrDate, monthOrSDW: number, dayOrMDiCY,
                      startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[] {
    const sow = getStartOfWeek(this.locale) ?? 1;
    const min = getMinDaysInWeek(this.locale) ?? 4;

    if (isObject(yearOrDate)) {
      monthOrSDW = monthOrSDW ?? sow;
      dayOrMDiCY = dayOrMDiCY ?? min;
    }
    else {
      startingDayOfWeek = startingDayOfWeek ?? sow;
      minDaysInCalendarYear = minDaysInCalendarYear ?? min;
    }

    return super.getYearWeekAndWeekday(yearOrDate as any, monthOrSDW, dayOrMDiCY, startingDayOfWeek, minDaysInCalendarYear);
  }
}
