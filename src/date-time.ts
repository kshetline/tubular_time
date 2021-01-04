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
import { clone, isEqual, isNumber, isObject, isString, padLeft } from '@tubular/util';
import {
  getDayNumber_SGC, getISOFormatDate, GregorianChange, handleVariableDateArgs, Calendar, YearOrDate, YMDDate
} from './calendar';
import { DateAndTime, DAY_MSEC, MINUTE_MSEC, parseISODateTime } from './common';
import { Timezone } from './timezone';
import { getStartOfWeek } from './locale-data';

export enum DateTimeField { MILLIS, SECONDS, MINUTES, HOURS, DAYS, WEEKS, MONTHS, YEARS }
export enum DateTimeRollField { AM_PM = DateTimeField.YEARS + 1, ERA, LOCAL_WEEKS }

export const UNIX_TIME_ZERO_AS_JULIAN_DAY = 2440587.5;

const localeTest = /^[a-z][a-z][-_a-z]*$/i;
const lockError = new Error('This DateTime instance is locked and immutable');
const nonIntError = new Error('Amounts for add/roll must be integers');

export class DateTime extends Calendar {
  private static defaultLocale = 'en-us';
  private static defaultTimezone = Timezone.OS_ZONE;

  private _locale = DateTime.defaultLocale;
  private _timezone = DateTime.defaultTimezone;
  private _utcTimeMillis = 0;
  private _wallTime: DateAndTime;
  private locked = false;

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

  static getDefaultLocale(): string { return DateTime.defaultLocale; }
  static setDefaultLocale(newLocale: string) { DateTime.defaultLocale = newLocale; }

  static getDefaultTimezone(): Timezone { return DateTime.defaultTimezone; }
  static setDefaultTimezone(newZone: Timezone) { DateTime.defaultTimezone = newZone; }

  constructor(initialTime?: number | string | DateAndTime | null, timezone?: Timezone | string | null, locale?: string, gregorianChange?: GregorianChange);
  constructor(initialTime?: number | string | DateAndTime | null, timezone?: Timezone | string| null, gregorianChange?: GregorianChange);
  constructor(initialTime?: number | string | DateAndTime | null, timezone?: Timezone | string| null,
              gregorianOrLocale?: string | GregorianChange, gregorianChange?: GregorianChange) {
    super(gregorianChange ?? (isString(gregorianOrLocale) && localeTest.test(gregorianOrLocale)) ? undefined : gregorianOrLocale);

    if (isString(initialTime)) {
      if (/Z$/i.test(initialTime)) {
        initialTime = initialTime.slice(0, -1);
        timezone = timezone ?? Timezone.UT_ZONE;
      }

      initialTime = parseISODateTime(initialTime);
    }

    if (isString(timezone))
      timezone = Timezone.getTimezone(timezone);

    if (timezone)
      this._timezone = timezone;

    if (!isNumber(gregorianOrLocale) && isString(gregorianOrLocale) && localeTest.test(gregorianOrLocale))
      this._locale = gregorianOrLocale;

    if (isObject(initialTime))
      this.wallTime = initialTime;
    else
      this.utcTimeMillis = (isNumber(initialTime) ? initialTime as number : Date.now());
  }

  lock(): DateTime {
    this.locked = true;
    return this;
  }

  get utcTimeMillis(): number { return this._utcTimeMillis; }
  set utcTimeMillis(newTime: number) {
    if (this.locked)
      throw lockError;

    if (this._utcTimeMillis !== newTime) {
      this._utcTimeMillis = newTime;
      this.computeWallTime();
    }
  }

  get wallTime(): DateAndTime { return clone(this._wallTime); }
  set wallTime(newTime: DateAndTime) {
    if (this.locked)
      throw lockError;

    if (!isEqual(this._wallTime, newTime)) {
      this._wallTime = clone(newTime);
      this.computeUtcTimeMillis();
      this.computeWallTime();
      this.updateWallTime();
    }
  }

  get timezone(): Timezone { return this._timezone; }
  set timezone(newZone: Timezone) {
    if (this.locked)
      throw lockError;

    if (this._timezone !== newZone) {
      this._timezone = newZone;
      this.computeWallTime();
    }
  }

  get locale(): string { return this._locale; }
  set locale(newLocale: string) {
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
    if (this.locked)
      throw lockError;
    else if (amount === 0)
      return;
    else if (amount !== floor(amount))
      throw nonIntError;

    let updateFromWall = false;
    let normalized: YMDDate;

    switch (field) {
      case DateTimeField.MILLIS:
        this._utcTimeMillis += amount;
        break;

      case DateTimeField.SECONDS:
        this._utcTimeMillis += amount * 1000;
        break;

      case DateTimeField.MINUTES:
        this._utcTimeMillis += amount * 60_000;
        break;

      case DateTimeField.HOURS:
        this._utcTimeMillis += amount * 3_600_000;
        break;

      case DateTimeField.DAYS:
        this._utcTimeMillis += amount * 86_400_000;
        break;

      case DateTimeField.WEEKS:
        this._utcTimeMillis += amount * 604_800_000;
        break;

      case DateTimeField.MONTHS:
        // eslint-disable-next-line no-case-declarations
        const m = this._wallTime.m;
        updateFromWall = true;
        this._wallTime.m = mod(m - 1 + amount, 12) + 1;
        this._wallTime.y += div_rd(m - 1 + amount, 12);
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        break;

      case DateTimeField.YEARS:
        updateFromWall = true;
        this._wallTime.y += amount;
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        break;
    }

    if (updateFromWall) {
      delete this._wallTime.occurrence;
      delete this._wallTime.utcOffset;
      this.computeUtcTimeMillis();
      this.updateWallTime();
    }

    this.computeWallTime();

    return this;
  }

  roll(field: DateTimeField | DateTimeRollField, amount: number, minYear = -9999, maxYear = 9999): DateTime {
    if (this.locked)
      throw lockError;
    else if (amount === 0)
      return this;
    else if (amount !== floor(amount))
      throw nonIntError;

    let normalized: YMDDate;

    switch (field) {
      case DateTimeField.MILLIS:
        this._wallTime.millis = mod(this._wallTime.millis + amount, 1000);
        break;

      case DateTimeField.SECONDS:
        this._wallTime.sec = mod(this._wallTime.sec + amount, 60);
        break;

      case DateTimeField.MINUTES:
        this._wallTime.min = mod(this._wallTime.min + amount, 60);
        break;

      case DateTimeField.HOURS:
        {
          const hoursInDay = floor(this.getSecondsInDay() / 3600);
          this._wallTime.hrs = mod(this._wallTime.hrs + amount, hoursInDay);
        }
        break;

      case DateTimeField.DAYS:
        {
          const missing = this.getMissingDateRange();
          const daysInMonth = this.getLastDateInMonth();
          this._wallTime.d = mod(this._wallTime.d + amount - 1, daysInMonth) + 1;

          if (missing && (missing[0] <= this._wallTime.d && this._wallTime.d <= missing[1]))
            this._wallTime.d = amount < 0 ? missing[0] - 1 : missing[1] + 1;

          this._wallTime.d = min(max(this._wallTime.d, this.getFirstDateInMonth()), daysInMonth);
          delete this._wallTime.utcOffset;
        }
        break;

      case DateTimeField.WEEKS:
        {
          const weeksInYear = this.getWeeksInYear(this._wallTime.yw);

          this._wallTime.w = mod(this._wallTime.w + amount - 1, weeksInYear) + 1;
          delete this._wallTime.y;
          delete this._wallTime.utcOffset;
        }
        break;

      case DateTimeField.MONTHS:
        this._wallTime.m = mod(this._wallTime.m + amount - 1, 12) + 1;
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete this._wallTime.utcOffset;
        break;

      case DateTimeField.YEARS:
        this._wallTime.y = mod(this._wallTime.y - minYear + amount, maxYear - minYear + 1) + minYear;
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete this._wallTime.utcOffset;
        break;

      case DateTimeRollField.AM_PM:
      // Normally straight-forward, but this can get weird if the AM/PM roll crosses a Daylight Saving Time change.
      {
        const targetHour = mod(this._wallTime.hrs + 12, 24);
        const result = this.roll(DateTimeField.HOURS, 12 * (amount % 2));

        if (result._wallTime.hrs === targetHour)
          return result;
        else if (mod2(result._wallTime.hrs - targetHour, 24) < 0)
          return this.add(DateTimeField.HOURS, 1);
        else
          return this.add(DateTimeField.HOURS, -1);
      }

      case DateTimeRollField.ERA:
        if (amount % 2 === 0)
          return this;

        this._wallTime.y = -this._wallTime.y + 1;
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete this._wallTime.utcOffset;
        break;
    }

    delete this._wallTime.occurrence;
    this.computeUtcTimeMillis();
    this.updateWallTime();
    this.computeWallTime();

    return this;
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

      if (this.getWallTimeForMillis(earlier).d === normalized.d)
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
      if (this.getMinutesInDay(date) <= 0)
        date.d *= -1;
    }

    return calendar;
  }

  toString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += ' ' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + ':' + padLeft(wt.sec, 2, '0') +
         '.' + padLeft(wt.millis, 3, '0') + (wt.occurrence === 2 ? '\u2082' : ' ') + // Subscript 2
         Timezone.formatUtcOffset(wt.utcOffset) + Timezone.getDstSymbol(wt.dstOffset);

    return s;
  }

  toYMDhmString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += ' ' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + Timezone.getDstSymbol(wt.dstOffset);

    return s;
  }

  toIsoString(maxLength?: number): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += 'T' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + ':' + padLeft(wt.sec, 2, '0') +
         '.' + padLeft(wt.millis, 3, '0') + Timezone.formatUtcOffset(wt.utcOffset);

    if (maxLength != null)
      s = s.substr(0, maxLength);

    return s;
  }

  toHoursAndMinutesString(includeDst = false): string {
    const wt = this._wallTime;

    return padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') +
            (includeDst ? Timezone.getDstSymbol(wt.dstOffset) : '');
  }

  private computeUtcTimeMillis(): void {
    let millis = (this._wallTime.millis ?? 0) +
                 (this._wallTime.sec ?? 0) * 1000 +
                 (this._wallTime.min ?? 0) * 60000 +
                 (this._wallTime.hrs ?? 0) * 3600000 +
                 this.getDayNumber(this._wallTime) * 86400000;

    if (this._wallTime.utcOffset != null)
      millis -= this._wallTime.utcOffset * 1000;
    else
      millis -= this._timezone.getOffsetForWallTime(millis) * 1000;

    if (this._wallTime.occurrence === 1) {
      const transition = this.timezone.findTransitionByUtc(millis);

      if (transition !== null && transition.deltaOffset < 0 && millis < transition.transitionTime - transition.deltaOffset * 1000)
        millis += transition.deltaOffset * 1000;
    }

    this._utcTimeMillis = millis;
  }

  private computeWallTime(): void {
    this._wallTime = this.getWallTimeForMillis(this._utcTimeMillis);
  }

  getWallTimeForMillis(millis: number): DateAndTime {
    let ticks = millis + this._timezone.getOffset(millis) * 1000;
    const wallTimeMillis = ticks;
    const wallTime = this.getDateFromDayNumber(div_rd(ticks, 86400000)) as DateAndTime;

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

    return wallTime;
  }

  private updateWallTime(): void {
    const offsets = this._timezone.getOffsets(this._utcTimeMillis);

    this._wallTime.utcOffset = offsets[0];
    this._wallTime.dstOffset = offsets[1];
    this._wallTime.n = this.getDayNumber(this._wallTime);
    const date = this.getDateFromDayNumber(this._wallTime.n);
    [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [date.y, date.m, date.d];
    [this._wallTime.yw, this._wallTime.w, this._wallTime.dw] = this.getYearWeekAndWeekday(this._wallTime);
    this._wallTime.dy = this._wallTime.n - this.getDayNumber(this._wallTime.y, 1, 1) + 1;
    this._wallTime.j = this.isJulianCalendarDate(this._wallTime);
  }

  setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): void {
    if (this.locked)
      throw lockError;

    super.setGregorianChange(gcYearOrDate, gcMonth, gcDate);

    if (this._timezone)
      this.computeWallTime();
  }

  getDayNumber(yearOrDate: YearOrDate, month?: number, day?: number): number {
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
}
