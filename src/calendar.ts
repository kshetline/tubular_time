import { div_rd, div_tt0, floor, mod } from '@tubular/math';
import { isArray, isNumber, isObject, isString, padLeft } from '@tubular/util';
import { syncDateAndTime, YMDDate } from './common';

export enum CalendarType { PURE_GREGORIAN, PURE_JULIAN }
export const GREGORIAN_CHANGE_MIN_YEAR = 300;
export const GREGORIAN_CHANGE_MAX_YEAR = 3900;

export const SUNDAY    = 0;
export const MONDAY    = 1;
export const TUESDAY   = 2;
export const WEDNESDAY = 3;
export const THURSDAY  = 4;
export const FRIDAY    = 5;
export const SATURDAY  = 6;

/**
 * Constant for indicating the last occurrence of a particular day of the week (e.g. the last Tuesday) of a given month.
 */
export const LAST = 6;

/** @hidden */
const DISTANT_YEAR_PAST = -9999999;
/** @hidden */
const DISTANT_YEAR_FUTURE = 9999999;
const FIRST_GREGORIAN_DAY_SGC = -141427; // 1582-10-15

/**
 * Type allowing a year alone to be specified, a full date as a [[YMDDate]], or a full date as a numeric array in the
 * form [year, month, date].
 */
export type YearOrDate = number | YMDDate | number[];
/**
 * Type for specifying the date when a calendar switches from Julian to Gregorian, or if the calendar is purely Julian
 * or purely Gregorian. As a string, the letters 'J' or 'G' can be used.
 */
export type GregorianChange = YMDDate | CalendarType | string | number[];

function hasYearField(obj: any): boolean {
  return obj.y != null || obj.yw != null || obj.ywl != null ||
         obj.year != null || obj.yearByWeek != null || obj.yearByWeekLocale != null;
}

export function isGregorianType(obj: any): obj is GregorianChange {
  return isNumber(obj) ||
         (isArray(obj) && obj.length === 3 && obj.findIndex(n => !isNumber(n)) < 0) ||
         (isString(obj) && /^(g|j|(\d+)-(\d+)-(\d+)|\d{8})$/i.test(obj)) ||
         (isObject(obj) && hasYearField(obj));
}

const lockError = new Error('This DateTime instance is locked and immutable');

/** @hidden */
export function handleVariableDateArgs(yearOrDate: YearOrDate, month?: number, day?: number,
                                       calendar?: Calendar | 'g' | 'j', ignoreJ = false): number[] {
  let n: number;
  let j: boolean;
  let year: number;
  let dy: number;

  if (isNumber(yearOrDate))
    year = yearOrDate as number;
  else if (isArray(yearOrDate) && (<number[]> yearOrDate).length >= 3 && isNumber((<number[]> yearOrDate)[0]))
    return yearOrDate as number[];
  else if (isObject(yearOrDate)) {
    syncDateAndTime(yearOrDate as YMDDate);
    n     = (yearOrDate as YMDDate).n;
    j     = ignoreJ ? undefined : (yearOrDate as YMDDate).j;
    year  = (yearOrDate as YMDDate).y;
    dy    = (yearOrDate as YMDDate).dy;
    month = (yearOrDate as YMDDate).m;
    day   = (yearOrDate as YMDDate).d;
  }

  if (year != null) {
    if (month == null && day == null && dy != null) {
      if (calendar === 'g' || j === false)
        return handleVariableDateArgs(getDateFromDayNumberGregorian(getDayNumberGregorian(year, 1, 0) + dy));
      else if (calendar === 'j' || j === true)
        return handleVariableDateArgs(getDateFromDayNumberJulian(getDayNumberJulian(year, 1, 0) + dy));
      else if (calendar) {
        ++(calendar as any).computeWeekValues;
        const ymd = handleVariableDateArgs(calendar.getDateFromDayNumber(calendar.getDayNumber(year, 1, 0) + dy));
        --(calendar as any).computeWeekValues;
        return ymd;
      }
      else
        return handleVariableDateArgs(getDateFromDayNumber_SGC(getDayNumber_SGC(year, 1, 0) + dy));
    }
    else {
      month = month ?? 1;
      day = day ?? 1;
    }
  }
  else if (n != null) {
    if (calendar === 'g' || j === false)
      return handleVariableDateArgs(getDateFromDayNumberGregorian(n));
    else if (calendar === 'j' || j === true)
      return handleVariableDateArgs(getDateFromDayNumberJulian(n));
    else if (calendar) {
      ++(calendar as any).computeWeekValues;
      const ymd = handleVariableDateArgs(calendar.getDateFromDayNumber(n));
      --(calendar as any).computeWeekValues;
      return ymd;
    }
    else
      return handleVariableDateArgs(getDateFromDayNumber_SGC(n));
  }
  else
    throw new Error('Calendar: Invalid date arguments');

  return [year, month, day, j == null ? -1 : +j];
}

/**
 * Determine if a given date falls during the Julian calendar or the Gregorian calendar, given the standard
 * Gregorian change date of 1582-10-15.
 *
 * @param {YearOrDate} yearOrDate
 * @param {number} month
 * @param {number} day
 * @returns True if the date is Julian.
 */
export function isJulianCalendarDate_SGC(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
  let year, j: number; [year, month, day, j] = handleVariableDateArgs(yearOrDate, month, day);

  return (j === 1 || year < 1582 || (year === 1582 && (month < 10 || month === 10 && day < 15)));
}

/**
 * Gets the day number for the given date, relative to 1970-01-01, using the standard Gregorian change date 1582-10-15.
 * @param yearOrDate
 * @param month
 * @param day
 * @returns Day number.
 */
export function getDayNumber_SGC(yearOrDate: YearOrDate, month?: number, day?: number): number {
  let year, j: number; [year, month, day, j] = handleVariableDateArgs(yearOrDate, month, day);

  while (month <  1) { month += 12; --year; }
  while (month > 12) { month -= 12; ++year; }

  if (j === 1 || (j !== 0 && isJulianCalendarDate_SGC(year, month, day)))
    return getDayNumberJulian(year, month, day);
  else
    return getDayNumberGregorian(year, month, day);
}

/**
 * Gets the day number for the given Gregorian calendar date, relative to 1970-01-01.
 * @param yearOrDate
 * @param month
 * @param day
 * @returns Day number.
 */
export function getDayNumberGregorian(yearOrDate: YearOrDate, month?: number, day?: number): number {
  let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, 'g');

  while (month <  1) { month += 12; --year; }
  while (month > 12) { month -= 12; ++year; }

  return 367 * year - div_rd(7 * (year + div_tt0(month + 9, 12)), 4) - div_tt0(3 * (div_tt0(year + div_tt0(month - 9, 7), 100) + 1), 4) +
    div_tt0(275 * month, 9) + day - 719559;
}

/**
 * Gets the day number for the given Julian calendar date, relative to 1970-01-01 Gregorian.
 * @param yearOrDate
 * @param month
 * @param day
 * @returns Day number.
 */
export function getDayNumberJulian(yearOrDate: YearOrDate, month?: number, day?: number): number {
  let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, 'j');

  while (month <  1) { month += 12; --year; }
  while (month > 12) { month -= 12; ++year; }

  return 367 * year - div_rd(7 * (year + div_tt0(month + 9, 12)), 4) + div_tt0(275 * month, 9) + day - 719561;
}

// noinspection JSUnusedLocalSymbols
/**
 * Always returns 1. This function exists only to parallel getFirstDateInMonth, which isn't always 1 when the
 * Gregorian change date is not fixed.
 * @returns First date of calender month.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getFirstDateInMonth_SGC(year: number, month: number): number {
  return 1;
}

/**
 * The last date of the given calendar month, using the standard Gregorian change date 1582-10-15, e.g. 31 for
 * any January, 28 for non-leap-year February, 29 for leap-year February, etc.
 * @param year
 * @param month
 * @returns Last date of calendar month.
 */
export function getLastDateInMonth_SGC(year: number, month: number): number {
  if (month === 9 || month === 4 || month === 6 || month === 11)
    return 30;
  else if (month !== 2)
    return 31; // Works for pseudo-months 0 and 13 as well.
  else if (year % 4 === 0 && (year < 1583 || year % 100 !== 0 || year % 400 === 0))
    return 29;
  else
    return 28;
}

/**
 * The last date of the given Gregorian calendar month.
 * @param year
 * @param month
 * @returns Last date of calendar month.
 */
export function getLastDateInMonthGregorian(year: number, month: number): number {
  if (month === 9 || month === 4 || month === 6 || month === 11)
    return 30;
  else if (month !== 2)
    return 31; // Works for pseudo-months 0 and 13 as well.
  else if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
    return 29;
  else
    return 28;
}

/**
 * The last date of the given Gregorian calendar month.
 * @param year
 * @param month
 * @returns Last date of calendar month.
 */
export function getLastDateInMonthJulian(year: number, month: number): number {
  if (month === 9 || month === 4 || month === 6 || month === 11)
    return 30;
  else if (month !== 2)
    return 31; // Works for pseudo-months 0 and 13 as well.
  else if (year % 4 === 0)
    return 29;
  else
    return 28;
}

/**
 * Returns the number of days in the given calendar month. Since this
 * function is for the standard Gregorian change date of 1582-10-15,
 * it returns 21 for 1582/10, otherwise it returns the same value as
 * [[getLastDateInMonth_SGC]].
 * @param year
 * @param month
 * @returns Total number of days in the given month.
 */
export function getDaysInMonth_SGC(year: number, month: number): number {
  if (year === 1582 && month === 10)
    return 21;
  else if (month === 9 || month === 4 || month === 6 || month === 11)
    return 30;
  else if (month !== 2)
    return 31; // Works for pseudo-months 0 and 13 as well.
  else
    return getDayNumber_SGC(year, 3, 1) - getDayNumber_SGC(year, 2, 1);
}

/**
 * This typically returns 365, or 366 for a leap year, but for the year
 * 1582 it returns 355.
 * @param year
 * @returns Total number of days in the given year.
 */
export function getDaysInYear_SGC(year: number): number {
  return getDayNumber_SGC(year + 1, 1, 1) - getDayNumber_SGC(year, 1, 1);
}

/**
 * Get day of week for a given 1970-01-01-based day number.
 * @param dayNum 1970-01-01-based day number.
 * @return Day of week as 0-6: 0 for Sunday, 1 for Monday... 6 for Saturday.
 */
export function getDayOfWeek(dayNum: number): number {
  return mod(dayNum + 4, 7);
}

/**
 * Get day of week for a given date, assuming standard Gregorian change.
 * @param yearOrDateOrDayNum 1970-01-01-based day number (month and date must be left undefined) - OR -
 *                           YMDDate form y/m/d - OR - [y, m, d].
 * @param month
 * @param day
 * @return Day of week as 0-6: 0 for Sunday, 1 for Monday... 6 for Saturday.
 */
export function getDayOfWeek_SGC(yearOrDateOrDayNum: YearOrDate, month?: number, day?: number): number {
  if (isNumber(yearOrDateOrDayNum) && month == null)
    return mod((yearOrDateOrDayNum as number) + 4, 7);
  else
    return getDayOfWeek(getDayNumber_SGC(yearOrDateOrDayNum, month, day));
}

/**
 * Get the date of the index-th day of the week of a given month, e.g. the date of the
 * first Wednesday or the third Monday or the last Friday of the month.
 * @param year Year.
 * @param month Month.
 * @param dayOfTheWeek The day of the week (e.g. 0 for Sunday, 2 for Tuesday, 6 for Saturday) for
 *                     which you wish to find the date.
 * @param index A value of 1-5, or LAST (6), for the occurrence of the specified day of the week.
 * @return 0 if the described day does not exist (e.g. there is no fifth Monday in the given month) or
 *         the date of the specified day.
 */
export function getDateOfNthWeekdayOfMonth_SGC(year: number, month: number, dayOfTheWeek: number, index: number): number {
  const last: boolean = (index >= LAST);
  const day = 1;
  let dayNum: number = getDayNumber_SGC(year, month, day);
  const dayOfWeek = getDayOfWeek(dayNum);
  let ymd: YMDDate;
  let lastDay = 0;

  if (dayOfWeek === dayOfTheWeek && index === 1)
    return day;

  dayNum += mod(dayOfTheWeek - dayOfWeek, 7);
  ymd = getDateFromDayNumber_SGC(dayNum);

  while (ymd.m === month) {
    lastDay = ymd.d;

    if (--index === 0)
      return lastDay;

    dayNum += 7;
    ymd = getDateFromDayNumber_SGC(dayNum);
  }

  if (last)
    return lastDay;
  else
    return 0;
}

export function getDayOfWeekInMonthCount_SGC(year: number, month: number, dayOfTheWeek: number): number {
  const firstDay = getDayNumber_SGC(year, month, getDateOfNthWeekdayOfMonth_SGC(year, month, dayOfTheWeek, 1));
  const nextMonth = getDayNumber_SGC(year, month + 1, 1);

  return (nextMonth - firstDay - 1) / 7 + 1;
}

export function getDayOnOrAfter_SGC(year: number, month: number, dayOfTheWeek: number, minDate: number): number {
  const dayNum = getDayNumber_SGC(year, month, minDate);
  const dayOfWeek = getDayOfWeek(dayNum);
  const delta = mod(dayOfTheWeek - dayOfWeek, 7);

  if (year === 1582 && month === 10) {
    const ymd = getDateFromDayNumber_SGC(dayNum + delta);

    if (ymd.y !== year || ymd.m !== month)
      minDate = 0;
    else
      minDate = ymd.d;
  }
  else {
    minDate += delta;

    if (minDate > getLastDateInMonth_SGC(year, month))
      minDate = 0;
  }

  return minDate;
}

export function getDayOnOrBefore_SGC(year: number, month: number, dayOfTheWeek: number, maxDate: number): number {
  const dayNum = getDayNumber_SGC(year, month, maxDate);
  const dayOfWeek = getDayOfWeek(dayNum);
  const delta = mod(dayOfWeek - dayOfTheWeek, 7);

  if (year === 1582 && month === 10) {
    const ymd = getDateFromDayNumber_SGC(dayNum - delta);

    if (ymd.y !== year || ymd.m !== month)
      maxDate = 0;
    else
      maxDate = ymd.d;
  }
  else {
    maxDate -= delta;

    if (maxDate < 0)
      maxDate = 0;
  }

  return maxDate;
}

export function addDaysToDate_SGC(deltaDays: number, yearOrDate: YearOrDate, month?: number, day?: number): YMDDate {
  return getDateFromDayNumber_SGC(getDayNumber_SGC(yearOrDate, month, day) + deltaDays);
}

export function getDateFromDayNumber_SGC(dayNum: number): YMDDate {
  if (dayNum >= FIRST_GREGORIAN_DAY_SGC)
    return getDateFromDayNumberGregorian(dayNum);
  else
    return getDateFromDayNumberJulian(dayNum);
}

export function getDateFromDayNumberGregorian(dayNum: number): YMDDate {
  let year: number;
  let month: number;
  let day: number;
  let dayOfYear: number;
  let lastDay: number;

  year = Math.floor((dayNum + 719528) / 365.2425);

  while (dayNum < getDayNumberGregorian(year, 1, 1))
    --year;

  while (dayNum >= getDayNumberGregorian(year + 1, 1, 1))
    ++year;

  day = dayOfYear = dayNum - getDayNumberGregorian(year, 1, 1) + 1;

  for (month = 1; day > (lastDay = getLastDateInMonthGregorian(year, month)); ++month)
    day -= lastDay;

  return syncDateAndTime({ y: year, m: month, d: day, dy: dayOfYear, n: dayNum, j: false });
}

export function getDateFromDayNumberJulian(dayNum: number): YMDDate {
  let year: number;
  let month: number;
  let day: number;
  let lastDay: number;

  year = Math.floor((dayNum + 719530) / 365.25);

  while (dayNum < getDayNumberJulian(year, 1, 1))
    --year;

  while (dayNum >= getDayNumberJulian(year + 1, 1, 1))
    ++year;

  day = dayNum - getDayNumberJulian(year, 1, 1) + 1;

  for (month = 1; day > (lastDay = getLastDateInMonthJulian(year, month)); ++month)
    day -= lastDay;

  return syncDateAndTime({ y: year, m: month, d: day, n: dayNum, j: true });
}

export function isValidDate_SGC(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
  const [y, m, d, j] = handleVariableDateArgs(yearOrDate, month, day);
  let ymd: YMDDate;
  const n = getDayNumber_SGC({ y, m, d, j: j < 0 ? null : !!j });

  if (j < 0)
    ymd = getDateFromDayNumber_SGC(n);
  else if (j === 0)
    ymd = getDateFromDayNumberGregorian(n);
  else
    ymd = getDateFromDayNumberJulian(n);

  return (y === ymd.y && m === ymd.m && d === ymd.d);
}

export function isValidDateGregorian(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
  let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, 'g');
  const ymd: YMDDate = getDateFromDayNumberGregorian(getDayNumberGregorian(year, month, day));

  return (year === ymd.y && month === ymd.m && day === ymd.d);
}

export function isValidDateJulian(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
  let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, 'j');
  const ymd: YMDDate = getDateFromDayNumberJulian(getDayNumberJulian(year, month, day));

  return (year === ymd.y && month === ymd.m && day === ymd.d);
}

export function getISOFormatDate(yearOrDate: YearOrDate, month?: number, day?: number): string {
  let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day);

  const yyyy = (year < 0 ? '-' : '') + padLeft(Math.abs(year), 4, '0');
  const mm   = padLeft(month, 2, '0');
  const dd   = padLeft(day, 2, '0');

  return yyyy + '-' + mm + '-' + dd;
}

export function parseISODate(date: string): YMDDate {
  let sign = 1;

  date = date.trim();

  if (date.startsWith('-')) {
    sign = -1;
    date = date.substring(1).trim();
  }

  let $ = /^(\d+)-(\d{1,2}(?=\D))(?:-(\d+))?$/.exec(date);

  if (!$)
    $ = /^(\d{1,5})$/.exec(date);

  if (!$)
    $ = /^(\d{4,})(\d\d)(\d\d)$/.exec(date);

  if (!$)
    throw new Error('Invalid ISO date');

  return syncDateAndTime({ y: Number($[1]) * sign, m: Number($[2] ?? 1), d: Number($[3] ?? 1) });
}

export class Calendar {
  private gcYear  = 1582;
  private gcMonth = 10;
  private gcDate  = 15;
  private firstGregorianDay: number = FIRST_GREGORIAN_DAY_SGC;
  private firstDateInGCChangeMonth = 1;
  private lengthOfGCChangeMonth = 21;
  private lastJulianYear: number = Number.MIN_SAFE_INTEGER;
  private lastJulianMonth: number = Number.MIN_SAFE_INTEGER;
  private lastJulianDate = 4;

  protected _locked = false;

  constructor(gcYearOrDateOrType?: YearOrDate | CalendarType | string, gcMonth?: number, gcDate?: number) {
    if (gcYearOrDateOrType === CalendarType.PURE_GREGORIAN)
      this.setGregorianChange(DISTANT_YEAR_PAST, 0, 0);
    else if (gcYearOrDateOrType === CalendarType.PURE_JULIAN)
      this.setGregorianChange(DISTANT_YEAR_FUTURE, 0, 0);
    else if (arguments.length === 0 || gcYearOrDateOrType == null)
      this.setGregorianChange(1582, 10, 15);
    else
      this.setGregorianChange(gcYearOrDateOrType as YearOrDate | string, gcMonth, gcDate);
  }

  lock = (): Calendar => this._lock();
  protected _lock(doLock = true): Calendar {
    this._locked = this._locked || doLock;
    return this;
  }

  get locked(): boolean { return this._locked; }

  setPureGregorian(pureGregorian: boolean): void {
    if (this.locked)
      throw lockError;

    if (pureGregorian)
      this.setGregorianChange(DISTANT_YEAR_PAST, 0, 0);
    else
      this.setGregorianChange(1582, 10, 15);
  }

  isPureGregorian(): boolean {
    return (this.gcYear <= DISTANT_YEAR_PAST);
  }

  setPureJulian(pureJulian: boolean): void {
    if (this.locked)
      throw lockError;

    if (pureJulian)
      this.setGregorianChange(DISTANT_YEAR_FUTURE, 0, 0);
    else
      this.setGregorianChange(1582, 10, 15);
  }

  isPureJulian(): boolean {
    return (this.gcYear >= DISTANT_YEAR_FUTURE);
  }

  setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): void {
    if (this.locked)
      throw lockError;

    if (gcYearOrDate === 'g' || gcYearOrDate === 'G') {
      this.setPureGregorian(true);

      return;
    }
    else if (gcYearOrDate === 'j' || gcYearOrDate === 'J') {
      this.setPureJulian(true);

      return;
    }
    else if (isString(gcYearOrDate))
      gcYearOrDate = parseISODate(gcYearOrDate as string);
    else if (isObject(gcYearOrDate) && !isArray(gcYearOrDate) && (gcYearOrDate.y == null ||
             gcYearOrDate.m == null || gcYearOrDate.d == null || gcYearOrDate.j))
      throw new Error('Gregorian change date must be an explicit non-Julian y-m-d date');

    let gcYear; [gcYear, gcMonth, gcDate] = handleVariableDateArgs(gcYearOrDate as YearOrDate, gcMonth, gcDate, this);

    if (gcYear < GREGORIAN_CHANGE_MIN_YEAR) {
      if ((gcMonth !== 0 || gcDate !== 0) && gcYear > DISTANT_YEAR_PAST)
        throw new Error('Calendar: Gregorian change year cannot be less than ' + GREGORIAN_CHANGE_MIN_YEAR);

      this.firstGregorianDay = Number.MIN_SAFE_INTEGER;
      this.gcYear = DISTANT_YEAR_PAST;
    }
    else if (gcYear > GREGORIAN_CHANGE_MAX_YEAR) {
      if ((gcMonth !== 0 || gcDate !== 0) && gcYear < DISTANT_YEAR_FUTURE)
        throw new Error('Calendar: Gregorian change year cannot be greater than ' + GREGORIAN_CHANGE_MAX_YEAR);

      this.firstGregorianDay = Number.MAX_SAFE_INTEGER;
      this.gcYear = DISTANT_YEAR_FUTURE;
    }
    else if (!isValidDateGregorian(gcYear, gcMonth, gcDate))
      throw new Error('Calendar: Invalid Gregorian date: ' + getISOFormatDate(gcYear, gcMonth, gcDate));

    this.gcYear  = gcYear;
    this.gcMonth = gcMonth;
    this.gcDate  = gcDate;
    this.firstGregorianDay = getDayNumberGregorian(gcYear, gcMonth, gcDate);

    const lastJDay: YMDDate = getDateFromDayNumberJulian(this.firstGregorianDay - 1);

    this.lastJulianDate = lastJDay.d;
    this.lengthOfGCChangeMonth = getLastDateInMonthGregorian(gcYear, gcMonth);

    if (lastJDay.y === gcYear && lastJDay.m === gcMonth) {
      this.lastJulianYear = Number.MIN_SAFE_INTEGER; // Number.MIN_SAFE_INTEGER used to indicate mixed Julian/Gregorian transition month
      this.lastJulianMonth = Number.MIN_SAFE_INTEGER;
      this.firstDateInGCChangeMonth = 1;
      this.lengthOfGCChangeMonth -= gcDate - this.lastJulianDate - 1;
    }
    else {
      this.lastJulianYear = lastJDay.y;
      this.lastJulianMonth = lastJDay.m;
      this.firstDateInGCChangeMonth = gcDate;
      this.lengthOfGCChangeMonth -= gcDate - 1;
    }
  }

  getGregorianChange(): YMDDate {
    return syncDateAndTime({ y: this.gcYear, m: this.gcMonth, d: this.gcDate, n: this.firstGregorianDay, j: false });
  }

  isJulianCalendarDate(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
    let year, j: number; [year, month, day, j] = handleVariableDateArgs(yearOrDate, month, day, this);

    return (j === 1 || year < this.gcYear || (year === this.gcYear && (month < this.gcMonth ||
            month === this.gcMonth && day < this.gcDate)));
  }

  getDayNumber(yearOrDate: YearOrDate, month?: number, day?: number): number {
    // Note: month/day can be used internally to pass startOfWeek/minDaysInWeek.
    if (isObject(yearOrDate) && !isArray(yearOrDate)) {
      syncDateAndTime(yearOrDate);

      if (yearOrDate.y == null && (yearOrDate.yw != null || yearOrDate.ywl != null)) {
        const localeWeek = (yearOrDate.ywl != null);
        const year = yearOrDate.ywl ?? yearOrDate.yw;
        const startOfWeek = (localeWeek && month != null ? month : 1);
        const minDaysInWeek = (localeWeek && day != null ? day : 4);
        const week = (localeWeek ? yearOrDate.wl : yearOrDate.w) ?? 1;
        const dayOfWeek = (localeWeek ? yearOrDate.dwl : yearOrDate.dw) ?? 1;
        ++this.computeWeekValues;

        const w = this.getStartDateOfFirstWeekOfYear(year, startOfWeek, minDaysInWeek);
        const dayNum = w.n + (week - 1) * 7 + dayOfWeek - 1;

        yearOrDate = this.getDateFromDayNumber(dayNum);
        --this.computeWeekValues;
      }
      else if (yearOrDate.y != null && yearOrDate.m == null && yearOrDate.dy != null)
        yearOrDate = this.addDaysToDate(yearOrDate.dy - 1, { y: yearOrDate.y, m: 1, d: 1 });
    }

    let year, j: number; [year, month, day, j] = handleVariableDateArgs(yearOrDate, month, day, this);

    while (month <  1) { month += 12; --year; }
    while (month > 12) { month -= 12; ++year; }

    if (j < 0) {
      if (year === this.lastJulianYear && month === this.lastJulianMonth) {
        if (day > this.lastJulianDate)
          day = this.lastJulianDate;
      }
      else if (year === this.gcYear && month === this.gcMonth && (day > this.lastJulianDate ||
               (this.lastJulianMonth !== this.gcMonth && this.lastJulianMonth > 0)) && day < this.gcDate) {
        day = this.gcDate;
      }
    }

    if (j === 1 || (j !== 0 && this.isJulianCalendarDate(year, month, day)))
      return getDayNumberJulian(year, month, day);
    else
      return getDayNumberGregorian(year, month, day);
  }

  protected computeWeekValues = 0; // To prevent infinite recursion, compute week values only when this is 0.

  getDateFromDayNumber(dayNum: number, startingDayOfWeek?: number, minDaysInCalendarYear?: number): YMDDate {
    let result: YMDDate;

    if (dayNum >= this.firstGregorianDay)
      result = getDateFromDayNumberGregorian(dayNum);
    else
      result = getDateFromDayNumberJulian(dayNum);

    if (this.computeWeekValues === 0)
      [result.yw, result.w, result.dw] = this.getYearWeekAndWeekday(result, startingDayOfWeek, minDaysInCalendarYear);

    return syncDateAndTime(result);
  }

  getFirstDateInMonth(year: number, month: number): number {
    if (year === this.gcYear && month === this.gcMonth)
      return this.firstDateInGCChangeMonth;
    else
      return 1;
  }

  getLastDateInMonth(year: number, month: number): number {
    if (month === 0) {
      month = 12;
      --year;
    }
    else if (month === 13) {
      month = 1;
      ++year;
    }

    if (year === this.lastJulianYear && month === this.lastJulianMonth)
      return this.lastJulianDate;
    else if (month === 9 || month === 4 || month === 6 || month === 11)
      return 30;
    else if (month !== 2)
      return 31;
    else if (year % 4 === 0 && (year < this.gcYear || (year === this.gcYear && this.gcMonth > 2) || year % 100 !== 0 || year % 400 === 0))
      return 29;
    else
      return 28;
  }

  getDaysInMonth(year: number, month: number): number {
    if (month === 0) {
      month = 12;
      --year;
    }
    else if (month === 13) {
      month = 1;
      ++year;
    }

    if (year === this.gcYear && month === this.gcMonth)
      return this.lengthOfGCChangeMonth;
    else if (year === this.lastJulianYear && month === this.lastJulianMonth)
      return this.lastJulianDate;
    else if (month === 9 || month === 4 || month === 6 || month === 11)
      return 30;
    else if (month !== 2)
      return 31;
    else
      return this.getDayNumber(year, 3, 1) - this.getDayNumber(year, 2, 1);
  }

  getDaysInYear(year: number): number {
    return this.getDayNumber(year + 1, 1, 1) - this.getDayNumber(year, 1, 1);
  }

  getDayOfWeek(yearOrDateOrDayNum: YearOrDate, month?: number, day?: number): number {
    if (isNumber(yearOrDateOrDayNum) && month == null)
      return getDayOfWeek(yearOrDateOrDayNum as number);
    else
      return getDayOfWeek(this.getDayNumber(yearOrDateOrDayNum, month, day));
  }

  /**
   * @description Get the date of the index-th day of the week of a given month, e.g. the date of the
   * first Wednesday or the third Monday or the last Friday of the month.
   *
   * @param {number} year - Year.
   * @param {number} month - Month.
   * @param {number} dayOfTheWeek - The day of the week (e.g. 0 for Sunday, 2 for Tuesday, 6 for Saturday) for
   *                                which you wish to find the date.
   * @param {number} index - A value of 1-5, or LAST (6), for the occurrence of the specified day of the week.
   *
   * @return {number} 0 if the described day does not exist (e.g. there is no fifth Monday in the given month) or
   *                  the date of the specified day.
   */
  getDateOfNthWeekdayOfMonth(year: number, month: number, dayOfTheWeek: number, index: number): number {
    const last: boolean = (index >= LAST);
    const day = 1;
    let dayNum: number = this.getDayNumber(year, month, day);
    const dayOfWeek = getDayOfWeek(dayNum);
    let ymd: YMDDate;
    let lastDay = 0;

    if (dayOfWeek === dayOfTheWeek && index === 1)
      return day;

    dayNum += mod(dayOfTheWeek - dayOfWeek, 7);
    ymd = this.getDateFromDayNumber(dayNum);

    while (ymd.m === month) {
      lastDay = ymd.d;

      if (--index === 0)
        return lastDay;

      dayNum += 7;
      ymd = this.getDateFromDayNumber(dayNum);
    }

    if (last)
      return lastDay;
    else
      return 0;
  }

  getDayOfWeekInMonthCount(year: number, month: number, dayOfTheWeek: number): number {
    const firstDay = this.getDayNumber(year, month, this.getDateOfNthWeekdayOfMonth(year, month, dayOfTheWeek, 1));
    const nextMonth = this.getDayNumber(year, month + 1, 1);

    return div_tt0(nextMonth - firstDay - 1, 7) + 1;
  }

  getDayOfWeekInMonthIndex(yearOrDate: YearOrDate, month?: number, day?: number): number {
    let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this);
    const firstDay = this.getDayNumber(year, month, 1);
    const dayNumber = this.getDayNumber(year, month, day);

    return div_rd(dayNumber - firstDay, 7) + 1;
  }

  getDayOnOrAfter(year: number, month: number, dayOfTheWeek: number, minDate: number): number {
    const dayNum = this.getDayNumber(year, month, minDate);
    const dayOfWeek = getDayOfWeek(dayNum);
    const delta = mod(dayOfTheWeek - dayOfWeek, 7);

    if (year === this.gcYear && month === this.gcDate) {
      const ymd = this.getDateFromDayNumber(dayNum + delta);

      if (ymd.y !== year || ymd.m !== month)
        minDate = 0;
      else
        minDate = ymd.d;
    }
    else {
      minDate += delta;

      if (minDate > this.getLastDateInMonth(year, month))
        minDate = 0;
    }

    return minDate;
  }

  getDayOnOrBefore(year: number, month: number, dayOfTheWeek: number, maxDate: number): number {
    const dayNum = this.getDayNumber(year, month, maxDate);
    const dayOfWeek = getDayOfWeek(dayNum);
    const delta = mod(dayOfWeek - dayOfTheWeek, 7);

    if (year === this.gcYear && month === this.gcDate) {
      const ymd = this.getDateFromDayNumber(dayNum - delta);

      if (ymd.y !== year || ymd.m !== month)
        maxDate = 0;
      else
        maxDate = ymd.d;
    }
    else {
      maxDate -= delta;

      if (maxDate < 0)
        maxDate = 0;
    }

    return maxDate;
  }

  addDaysToDate(deltaDays: number, yearOrDate: YearOrDate, month?: number, day?: number): YMDDate {
    return this.getDateFromDayNumber(this.getDayNumber(yearOrDate, month, day) + deltaDays);
  }

  getCalendarMonth(year: number, month: number, startingDayOfWeek?: number): YMDDate[] {
    startingDayOfWeek = startingDayOfWeek ?? SUNDAY;

    const dates: YMDDate[] = [];
    let dateOffset;
    let dayNum = this.getDayNumber(year, month, this.getFirstDateInMonth(year, month));
    let ymd: YMDDate;
    let currMonth;

    // Step back (if necessary) to the nearest prior day matching the requested starting day of the week.
    dateOffset = mod(startingDayOfWeek - getDayOfWeek(dayNum), -7); // First time I recall ever wanting to use a negative modulus.
    dayNum += dateOffset; // dateOffset will be 0 or negative

    ymd = this.getDateFromDayNumber(dayNum, startingDayOfWeek);

    // This loop will fill in a calendar month's full set of dates in such a way as to obtain dates which
    // should be shown from previous and subsequent months, while also skipping over Julian-to-Gregorian
    // calendar switch-over dates.
    do {
      dates.push(ymd);
      ++dayNum;
      ++dateOffset;
      ymd = this.getDateFromDayNumber(dayNum);
      currMonth = ymd.m;
      // We've reached the end of the calendar when we're at a positive date offset, in a different month
      // than the requested month, and the day of week is back to the first day of the week of the calendar.
      // The first date to meet these criteria is just past the end of the calendar, and is not added to it.
    } while (dateOffset < 1 || currMonth === month || getDayOfWeek(dayNum) !== startingDayOfWeek);

    return dates;
  }

  isValidDate(yearOrDate: YearOrDate, month?: number, day?: number): boolean {
    let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this, true);
    const ymd = this.getDateFromDayNumber(this.getDayNumber(year, month, day));

    return (year === ymd.y && month === ymd.m && day === ymd.d);
  }

  normalizeDate(yearOrDate: YearOrDate, month?: number, day?: number): YMDDate {
    let year: number; [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this, true);

    if (month < 1) {
      month += 12;
      year -= 1;
    }
    else if (month > 12) {
      month -= 12;
      year += 1;
    }

    if (!this.isValidDate(year, month, day)) {
      let d;

      if (day < (d = this.getFirstDateInMonth(year, month)))
        day = d;
      else if (day > (d = this.getLastDateInMonth(year, month)))
        day = d;
      else {
        const range = this.getMissingDateRange(year, month);

        if (range != null)
          day = range[1] + 1;
        else
          day = d;
      }
    }

    return syncDateAndTime({ y: year, m: month, d: day });
  }

  getMissingDateRange(year: number, month: number): number[] | null {
    if (year === this.lastJulianYear && month === this.lastJulianMonth) {
      const lastDate = getLastDateInMonthJulian(year, month);

      if (lastDate > this.lastJulianDate)
        return [this.lastJulianDate + 1, lastDate];
    }
    else if (year === this.gcYear && month === this.gcMonth && this.gcDate > 1 && this.gcDate > this.lastJulianDate + 1)
      return [this.lastJulianDate + 1, this.gcDate - 1];

    return null;
  }

  getStartDateOfFirstWeekOfYear(year: number, startingDayOfWeek = 1, minDaysInCalendarYear = 4): YMDDate {
    let day = 1;

    // 7 is a special case, where start week is first full week *after* January 1st.
    if (minDaysInCalendarYear === 7) {
      ++day;
      --minDaysInCalendarYear;
    }

    const daysIntoWeek = mod(this.getDayOfWeek(year, 1, day) - startingDayOfWeek, 7);

    return this.addDaysToDate(-daysIntoWeek + (daysIntoWeek > 7 - minDaysInCalendarYear ? 7 : 0), year, 1, day);
  }

  getWeeksInYear(year: number, startingDayOfWeek = 1, minDaysInCalendarYear = 4): number {
    const w1 = this.getStartDateOfFirstWeekOfYear(year, startingDayOfWeek, minDaysInCalendarYear);
    const w2 = this.getStartDateOfFirstWeekOfYear(year + 1, startingDayOfWeek, minDaysInCalendarYear);

    return (w2.n - w1.n) / 7;
  }

  getYearWeekAndWeekday(year: number, month: number, day: number,
    startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

  getYearWeekAndWeekday(date: YearOrDate | number,
    startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

  getYearWeekAndWeekday(yearOrDate: YearOrDate, monthOrSDW: number, dayOrMDiCY,
                      startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[] {
    const [year, month, day] = handleVariableDateArgs(yearOrDate, monthOrSDW, dayOrMDiCY, this, true);

    if (isObject(yearOrDate)) {
      startingDayOfWeek = monthOrSDW;
      minDaysInCalendarYear = dayOrMDiCY;
    }

    startingDayOfWeek = startingDayOfWeek ?? 1;
    minDaysInCalendarYear = minDaysInCalendarYear ?? 4;
    ++this.computeWeekValues;

    let resultYear = year;
    let w = this.getStartDateOfFirstWeekOfYear(year, startingDayOfWeek, minDaysInCalendarYear);
    const w2 = this.getStartDateOfFirstWeekOfYear(year + 1, startingDayOfWeek, minDaysInCalendarYear);
    const dayNum = this.getDayNumber(year, month, day);

    if (w.n > dayNum) {
      w = this.getStartDateOfFirstWeekOfYear(year - 1, startingDayOfWeek, minDaysInCalendarYear);
      --resultYear;
    }
    else if (w2.n <= dayNum) {
      w = w2;
      ++resultYear;
    }

    --this.computeWeekValues;

    return [resultYear, floor((dayNum - w.n) / 7) + 1, mod(dayNum - w.n, 7) + 1];
  }
}
