/*
  Copyright © 2017 Kerry Shetline, kerry@shetline.com

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

import {
  getDayNumber_SGC, getISOFormatDate, GregorianChange, handleVariableDateArgs, KsCalendar, YearOrDate, YMDDate
} from './ks-calendar';
import * as _ from 'lodash';
import { div_rd, mod, round } from 'ks-math';
import { padLeft } from 'ks-util';
import { KsTimeZone } from './ks-timezone';
import { DateAndTime, DAY_MSEC, MINUTE_MSEC } from './ks-date-time-zone-common';

export enum DateTimeField { MILLIS, SECONDS, MINUTES, HOURS, DAYS, MONTHS, YEARS }

export const UNIX_TIME_ZERO_AS_JULIAN_DAY = 2440587.5;

export class KsDateTime extends KsCalendar {
  private _utcTimeMillis = 0;
  private _wallTime: DateAndTime;
  private _timeZone = KsTimeZone.OS_ZONE;

  public static julianDay(millis: number): number {
    return millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY;
  }

  public static millisFromJulianDay(jd: number): number {
    return round(DAY_MSEC * (jd - UNIX_TIME_ZERO_AS_JULIAN_DAY));
  }

  public static julianDay_SGC(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
    return getDayNumber_SGC(year, month, day) + UNIX_TIME_ZERO_AS_JULIAN_DAY +
             (hour + (minute + second / 60.0) / 60.0) / 24.0;
  }

  constructor(initialTime?: number | DateAndTime | null, timeZone?: KsTimeZone | null, gregorianChange?: GregorianChange) {
    super(gregorianChange);

    if (timeZone)
      this._timeZone = timeZone;

    if (_.isObject(initialTime)) {
      this.wallTime = _.clone(<DateAndTime> initialTime);
      this.computeUtcTimeMillis();
    }
    else {
      this._utcTimeMillis = (_.isNumber(initialTime) ? <number> initialTime : Date.now());
      this.computeWallTime();
    }
  }

  public get utcTimeMillis(): number {
    return this._utcTimeMillis;
  }

  public set utcTimeMillis(newTime: number) {
    this._utcTimeMillis = newTime;
    this.computeWallTime();
  }

  public get wallTime(): DateAndTime {
    return _.clone(this._wallTime);
  }

  public set wallTime(newTime: DateAndTime) {
    this._wallTime = _.clone(newTime);

    if (_.isNil(this._wallTime.millis))
      this._wallTime.millis = 0;

    this.computeUtcTimeMillis();
    this.computeWallTime();
    this.updateWallTime();
  }

  public get timeZone(): KsTimeZone { return this._timeZone; }

  public set timeZone(newZone: KsTimeZone) {
    if (this._timeZone !== newZone) {
      this._timeZone = newZone;
      this.computeWallTime();
    }
  }

  public get utcOffsetMinutes(): number {
    return this._timeZone.getOffset(this._utcTimeMillis);
  }

  public get dstOffsetMinutes(): number {
    return this._timeZone.getOffsets(this._utcTimeMillis)[1];
  }

  public getTimeZoneDisplayName(): string {
    return this._timeZone.getDisplayName(this._utcTimeMillis);
  }

  public add(field: DateTimeField, amount: number): void {
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

  public getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number {
      let year: number;

      if (_.isUndefined(yearOrDate)) {
        [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
      }
      else
        [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

      let dayMillis = this.getDayNumber(year, month, day) * DAY_MSEC;

      dayMillis -= this.timeZone.getOffsetForWallTime(dayMillis) * MINUTE_MSEC;

      // There are weird turning-back-the-clock situations where there are two midnights
      // during a single day. Make sure we're getting the earlier midnight unless the
      // earlier midnight doesn't match the day of the month requested.
      const transition = this.timeZone.findTransitionByUtc(dayMillis);

      if (transition !== null && transition.deltaOffset < 0 && dayMillis < transition.transitionTime - transition.deltaOffset * 60000) {
        const earlier = dayMillis + transition.deltaOffset * 60000;
        // The date doesn't have to be normalized when calling this function -- that is, we can
        // ask for the start of January 32 to mean February 1. Now, however, we need a normalized
        // date to select the correct midnight.
        const normalized = this.normalizeDate(year, month, day);

        if (this.getWallTimeForMillis(earlier).d === normalized.d)
          dayMillis = earlier;
      }

      return dayMillis;
  }

  public getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number {
      let year: number;

      if (_.isUndefined(yearOrDate)) {
        [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
      }
      else
        [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

      return (this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / MINUTE_MSEC;
  }

  public getCalendarMonth(yearOrStartingDay: number, month?: number, startingDayOfWeek?: number): YMDDate[] {
    let year: number;

    if (_.isUndefined(month))
      [year, month, startingDayOfWeek] = [this._wallTime.y,  this._wallTime.m, yearOrStartingDay];
    else
      year = yearOrStartingDay;

    const calendar = super.getCalendarMonth(year, month, startingDayOfWeek);

    for (const date of calendar) {
      if (this.getMinutesInDay(date) <= 0)
        date.d *= -1;
    }

    return calendar;
  }

  public toString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += ' ' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + ':' + padLeft(wt.sec, 2, '0') +
         '.' + padLeft(wt.millis, 3, '0') + (wt.occurrence === 2 ? '\u2082' : ' ') + // Subscript 2
         KsTimeZone.formatUtcOffset(wt.utcOffset) + KsTimeZone.getDstSymbol(wt.dstOffset);

    return s;
  }

  public toYMDhmString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += ' ' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + KsTimeZone.getDstSymbol(wt.dstOffset);

    return s;
  }

  public toIsoString(): string {
    const wt = this._wallTime;
    let s = getISOFormatDate(wt);

    s += 'T' + padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') + ':' + padLeft(wt.sec, 2, '0') +
         '.' + padLeft(wt.millis, 3, '0') + KsTimeZone.formatUtcOffset(wt.utcOffset);

    return s;
  }

  public toHoursAndMinutesString(includeDst = false): string {
    const wt = this._wallTime;

    return padLeft(wt.hrs, 2, '0') + ':' + padLeft(wt.min, 2, '0') +
            (includeDst ? KsTimeZone.getDstSymbol(wt.dstOffset) : '');
  }

  private computeUtcTimeMillis(): void {
    let millis = this._wallTime.millis +
                 this._wallTime.sec * 1000 +
                 this._wallTime.min * 60000 +
                 this._wallTime.hrs * 3600000 +
                 this.getDayNumber(this._wallTime) * 86400000;

    millis -= this._timeZone.getOffsetForWallTime(millis) * 60000;

    if (this._wallTime.occurrence === 1) {
      const transition = this.timeZone.findTransitionByUtc(millis);

      if (transition !== null && transition.deltaOffset < 0 && millis < transition.transitionTime - transition.deltaOffset * 60000)
        millis += transition.deltaOffset * 60000;
    }

    this._utcTimeMillis = millis;
  }

  private computeWallTime(): void {
    this._wallTime = this.getWallTimeForMillis(this._utcTimeMillis);
  }

  public getWallTimeForMillis(millis: number): DateAndTime {
    let ticks = millis + this._timeZone.getOffset(millis) * 60000;
    const wallTimeMillis = ticks;
    const wallTime = <DateAndTime> this.getDateFromDayNumber(div_rd(ticks, 86400000));

    wallTime.millis = mod(ticks, 1000);
    ticks = div_rd(ticks, 1000);
    wallTime.sec = mod(ticks, 60);
    ticks = div_rd(ticks, 60);
    wallTime.min = mod(ticks, 60);
    ticks = div_rd(ticks, 60);
    wallTime.hrs = mod(ticks, 24);
    const offsets = this._timeZone.getOffsets(millis);
    wallTime.utcOffset = offsets[0];
    wallTime.dstOffset = offsets[1];
    wallTime.occurrence = 1;

    const transition = this.timeZone.findTransitionByWallTime(wallTimeMillis);

    if (transition && millis >= transition.transitionTime && millis < transition.transitionTime - transition.deltaOffset * 60000)
      wallTime.occurrence = 2;

    return wallTime;
  }

  private updateWallTime(): void {
    const offsets = this._timeZone.getOffsets(this._utcTimeMillis);

    this._wallTime.utcOffset = offsets[0];
    this._wallTime.dstOffset = offsets[1];
  }

  public setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): void {
    super.setGregorianChange(gcYearOrDate, gcMonth, gcDate);

    if (this._timeZone)
      this.computeWallTime();
  }
}
