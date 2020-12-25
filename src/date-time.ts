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

import { div_rd, mod, round } from '@tubular/math';
import { padLeft } from '@tubular/util';
import clone from 'lodash/clone';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';
import {
  getDayNumber_SGC, getISOFormatDate, GregorianChange, handleVariableDateArgs, Calendar, SUNDAY, YearOrDate, YMDDate
} from './calendar';
import { DateAndTime, DAY_MSEC, MINUTE_MSEC } from './common';
import { Timezone } from './timezone';

export enum DateTimeField { MILLIS, SECONDS, MINUTES, HOURS, DAYS, MONTHS, YEARS }

export const UNIX_TIME_ZERO_AS_JULIAN_DAY = 2440587.5;

export class DateTime extends Calendar {
  private _utcTimeMillis = 0;
  private _wallTime: DateAndTime;
  private _timezone = Timezone.OS_ZONE;

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

  constructor(initialTime?: number | DateAndTime | null, timezone?: Timezone | null, gregorianChange?: GregorianChange) {
    super(gregorianChange);

    if (timezone)
      this._timezone = timezone;

    if (isObject(initialTime)) {
      this.wallTime = clone(initialTime as DateAndTime);
      this.computeUtcTimeMillis();
    }
    else {
      this._utcTimeMillis = (isNumber(initialTime) ? initialTime as number : Date.now());
      this.computeWallTime();
    }
  }

  get utcTimeMillis(): number {
    return this._utcTimeMillis;
  }

  set utcTimeMillis(newTime: number) {
    this._utcTimeMillis = newTime;
    this.computeWallTime();
  }

  get wallTime(): DateAndTime {
    return clone(this._wallTime);
  }

  set wallTime(newTime: DateAndTime) {
    this._wallTime = clone(newTime);

    if (this._wallTime.millis == null)
      this._wallTime.millis = 0;

    this.computeUtcTimeMillis();
    this.computeWallTime();
    this.updateWallTime();
  }

  get timezone(): Timezone { return this._timezone; }

  set timezone(newZone: Timezone) {
    if (this._timezone !== newZone) {
      this._timezone = newZone;
      this.computeWallTime();
    }
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

  add(field: DateTimeField, amount: number): void {
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
        this._utcTimeMillis += amount * 60000;
        break;

      case DateTimeField.HOURS:
        this._utcTimeMillis += amount * 3600000;
        break;

      case DateTimeField.DAYS:
        this._utcTimeMillis += amount * 86400000;
        break;

      case DateTimeField.MONTHS:
        // eslint-disable-next-line no-case-declarations
        const m = this._wallTime.m;
        updateFromWall = true;
        this._wallTime.m = mod(m - 1 + amount, 12) + 1;
        this._wallTime.y += div_rd(m - 1 + amount, 12);
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        this._wallTime.occurrence = 1;
        break;

      case DateTimeField.YEARS:
        updateFromWall = true;
        this._wallTime.y += amount;
        normalized = this.normalizeDate(this._wallTime);
        [this._wallTime.y, this._wallTime.m, this._wallTime.d] = [normalized.y, normalized.m, normalized.d];
        this._wallTime.occurrence = 1;
        break;
    }

    if (updateFromWall) {
      this._wallTime.n = this.getDayNumber(this._wallTime);
      this._wallTime.j = this.isJulianCalendarDate(this._wallTime);
      this.computeUtcTimeMillis();
      this.updateWallTime();
    }
    else
      this.computeWallTime();
  }

  getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (isUndefined(yearOrDate)) {
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

    if (isUndefined(yearOrDate)) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

    return (this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / 1000;
  }

  getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (isUndefined(yearOrDate)) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

    return round((this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / MINUTE_MSEC);
  }

  getCalendarMonth(yearOrStartingDay: number, month?: number, startingDayOfWeek?: number): YMDDate[] {
    let year: number;

    if (isUndefined(month))
      [year, month, startingDayOfWeek] = [this._wallTime.y,  this._wallTime.m, yearOrStartingDay];
    else
      year = yearOrStartingDay;

    const calendar = super.getCalendarMonth(year, month, startingDayOfWeek || SUNDAY);

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

  toIsoString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += 'T' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + ':' + padLeft(wt.sec, 2, '0') +
         '.' + padLeft(wt.millis, 3, '0') + Timezone.formatUtcOffset(wt.utcOffset);

    return s;
  }

  toHoursAndMinutesString(includeDst = false): string {
    const wt = this._wallTime;

    return padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') +
            (includeDst ? Timezone.getDstSymbol(wt.dstOffset) : '');
  }

  private computeUtcTimeMillis(): void {
    let millis = this._wallTime.millis +
                 this._wallTime.sec * 1000 +
                 this._wallTime.min * 60000 +
                 this._wallTime.hrs * 3600000 +
                 this.getDayNumber(this._wallTime) * 86400000;

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
  }

  setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): void {
    super.setGregorianChange(gcYearOrDate, gcMonth, gcDate);

    if (this._timezone)
      this.computeWallTime();
  }
}
