import { div_rd, floor, max, min, mod, mod2, round } from '@tubular/math';
import { clone, forEach, isArray, isEqual, isNumber, isObject, isString, toNumber } from '@tubular/util';
import { getDayNumber_SGC, GregorianChange, handleVariableDateArgs, isGregorianType, Calendar, YearOrDate, getDateFromDayNumberGregorian } from './calendar';
import { DateAndTime, DAY_MSEC, MAX_YEAR, MIN_YEAR, MINUTE_MSEC, orderFields, parseISODateTime, parseTimeOffset, purgeAliasFields, syncDateAndTime, validateDateAndTime, YMDDate } from './common';
import { format as formatter } from './format-parse';
import { Timezone } from './timezone';
import { getMinDaysInWeek, getStartOfWeek, hasIntlDateTime, normalizeLocale } from './locale-data';

export type DateTimeArg = number | string | DateAndTime | Date | number[] | null;

export enum DateTimeField {
  BAD_FIELD = Number.NEGATIVE_INFINITY,
  FULL = -1,
  MILLI, SECOND, MINUTE, HOUR_12, HOUR, AM_PM, DAY,
  DAY_BY_WEEK, DAY_BY_WEEK_LOCALE, DAY_OF_YEAR, WEEK, WEEK_LOCALE,
  MONTH, QUARTER, YEAR, YEAR_WEEK, YEAR_WEEK_LOCALE, ERA
}

export type DateTimeFieldName = 'milli' | 'millis' | 'millisecond' | 'milliseconds' | 'second' | 'seconds' |
  'minute' | 'minutes' | 'hour12' | 'hours12' | 'hour' | 'hours' | 'ampm' | 'am_pm' | 'day' | 'days' | 'date' |
  'dayByWeek' | 'dayByWeekLocale' | 'dayOfYear' | 'week' | 'weeks' | 'weekLocale' | 'month' | 'months' |
  'quarter' | 'quarters' | 'year' | 'years' | 'yearWeek' | 'yearWeekLocale' | 'era';

const fieldNames = {
  milli: DateTimeField.MILLI,
  millis: DateTimeField.MILLI,
  millisecond: DateTimeField.MILLI,
  milliseconds: DateTimeField.MILLI,
  second: DateTimeField.SECOND,
  seconds: DateTimeField.SECOND,
  minute: DateTimeField.MINUTE,
  minutes: DateTimeField.MINUTE,
  hour12: DateTimeField.HOUR_12,
  hours12: DateTimeField.HOUR_12,
  hour: DateTimeField.HOUR,
  hours: DateTimeField.HOUR,
  ampm: DateTimeField.AM_PM,
  am_pm: DateTimeField.AM_PM,
  day: DateTimeField.DAY,
  days: DateTimeField.DAY,
  date: DateTimeField.DAY,
  dayByWeek: DateTimeField.DAY_BY_WEEK,
  dayByWeekLocale: DateTimeField.DAY_BY_WEEK_LOCALE,
  dayOfYear: DateTimeField.DAY_OF_YEAR,
  week: DateTimeField.WEEK,
  weeks: DateTimeField.WEEK,
  weekLocale: DateTimeField.WEEK_LOCALE,
  month: DateTimeField.MONTH,
  months: DateTimeField.MONTH,
  quarter: DateTimeField.QUARTER,
  quarters: DateTimeField.QUARTER,
  year: DateTimeField.YEAR,
  years: DateTimeField.YEAR,
  yearWeek: DateTimeField.YEAR_WEEK,
  yearWeekLocale: DateTimeField.YEAR_WEEK_LOCALE,
  era: DateTimeField.ERA
};

forEach(fieldNames, (key, value) => { if (key !== key.toLowerCase()) fieldNames[key.toLowerCase()] = value; });

function fieldNameToField(field: DateTimeField | DateTimeFieldName): DateTimeField {
  if (isString(field))
    return fieldNames[field.toLowerCase()] ?? DateTimeField.BAD_FIELD;
  else
    return field;
}

export const UNIX_TIME_ZERO_AS_JULIAN_DAY = 2440587.5;

const localeTest = /^[a-z][a-z][-_a-z]*$/i;
const lockError = new Error('This DateTime instance is locked and immutable');
const nonIntError = new Error('Amounts for add/roll must be integers');
// noinspection SpellCheckingInspection
const fullIsoFormat = 'Y-MM-DDTHH:mm:ss.SSSZ';
// noinspection SpellCheckingInspection
const fullAltFormat = 'Y-MM-DDTHH:mm:ss.SSSRZv';
const timeOnlyFormat = 'HH:mm:ss.SSS';

const DATELESS = Timezone.DATELESS;
const ZONELESS = Timezone.ZONELESS;

export class DateTime extends Calendar {
  private static defaultCenturyBase = 1970;
  private static defaultLocale: string | string[] = 'en-us';
  private static defaultTimezone = Timezone.OS_ZONE;
  private static defaultTimezoneExplicit = false;

  private _error: string;
  private _locale: string | string[] = DateTime.defaultLocale;
  private _timezone = DateTime.defaultTimezone;
  private _utcTimeMillis = 0;
  private _wallTime: DateAndTime;

  static INVALID_DATE = new DateTime(NaN, 'UTC').lock();

  static julianDay(millis: number): number {
    return millis / DAY_MSEC + UNIX_TIME_ZERO_AS_JULIAN_DAY;
  }

  static millisFromJulianDay(jd: number): number {
    return round(DAY_MSEC * (jd - UNIX_TIME_ZERO_AS_JULIAN_DAY));
  }

  static julianDay_SGC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
    return getDayNumber_SGC(year, month, day) + UNIX_TIME_ZERO_AS_JULIAN_DAY +
             (hour + (minute + second / 60.0) / 60.0) / 24.0;
  }

  static getDefaultCenturyBase(): number { return DateTime.defaultCenturyBase; }
  static setDefaultCenturyBase(newBase: number): void { DateTime.defaultCenturyBase = newBase; }

  static getDefaultLocale(): string | string[] { return DateTime.defaultLocale; }
  static setDefaultLocale(newLocale: string | string[]): void { DateTime.defaultLocale = newLocale; }

  static getDefaultTimezone(): Timezone { return DateTime.defaultTimezone; }
  static setDefaultTimezone(newZone: Timezone | string): void {
    if (isString(newZone))
      newZone = Timezone.from(newZone);

    this.defaultTimezone = newZone;
    this.defaultTimezoneExplicit = true;
  }

  static isDateTime(obj: any): obj is DateTime { return obj instanceof DateTime; }

  static compare(d1: DateTime, d2: DateTime | string | number | Date,
                 resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): number {
    resolution = fieldNameToField(resolution);

    if (isString(d2) || isNumber(d2) || d2 instanceof Date)
      d2 = new DateTime(d2, d1.timezone, d1.locale, d1.getGregorianChange());

    if (d1.type !== d2.type)
      throw new Error(`Mismatched DateTime types ${d1.type}/${d2.type}`);
    else if (d1._timezone === DATELESS && resolution > DateTimeField.HOUR)
      throw new Error(`Resolution ${DateTimeField[resolution]} not valid for time-only values`);

    if (resolution === DateTimeField.FULL || resolution === DateTimeField.MILLI)
      return d1._utcTimeMillis - d2._utcTimeMillis;

    const divisor = [1, 1000, 60_000, undefined, 3_600_000][resolution];

    if (divisor != null)
      return floor(d1._utcTimeMillis / divisor) - floor(d2._utcTimeMillis / divisor);
    else if (resolution === DateTimeField.DAY)
      return floor(d1._wallTime.n) - floor(d2._wallTime.n);
    else if (resolution === DateTimeField.MONTH)
      return (d1.wallTime.y !== d2.wallTime.y ? d1.wallTime.y - d2.wallTime.y : d1.wallTime.m - d2.wallTime.m);
    else if (resolution === DateTimeField.YEAR)
      return d1.wallTime.y - d2.wallTime.y;

    throw new Error(`Resolution ${DateTimeField[resolution]} not valid`);
  }

  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, gregorianChange?: GregorianChange);
  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, locale?: string | string[], gregorianChange?: GregorianChange);
  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null,
              gregorianOrLocale?: string| string[] | GregorianChange, gregorianChange?: GregorianChange) {
    super(gregorianChange ?? (isGregorianType(gregorianOrLocale) ? gregorianOrLocale : undefined));

    if (!DateTime.defaultTimezoneExplicit && !timezone) {
      if (hasIntlDateTime && Timezone.guess() !== 'OS')
        this._timezone = DateTime.defaultTimezone = Timezone.from(Timezone.guess());

      if (this._timezone.error)
        this._timezone = Timezone.OS_ZONE;
      else
        DateTime.defaultTimezoneExplicit = true;
    }

    if (isArray(initialTime)) {
      const t = {} as DateAndTime;
      [t.y, t.m, t.d, t.hrs, t.min, t.sec, t.millis] = initialTime;
      forEach((initialTime = t) as any, (key, value) => value === undefined ? delete t[key] : null);
    }

    if (isEqual(initialTime, {}))
      initialTime = null;

    let parseZone: Timezone;
    let occurrence = 0;

    if (isString(initialTime)) {
      if (initialTime!.includes('₂'))
        occurrence = 2;

      initialTime = initialTime!.replace(/[­‐‑‒–—]/g, '-').replace(/\s+/g, ' ').replace(/₂/g, '').trim();
      let $ = /^\/Date\((\d+)([-+]\d\d\d\d)?\)\/$/i.exec(initialTime);

      if ($) {
        const offset = $[2] ? parseTimeOffset($[2]) * 1000 : 0;

        initialTime = new Date(toNumber($[1]) + offset).toISOString().slice(0, -1) + ($[2] ?? '');
      }

      const saveTime = initialTime;
      let zone: string;

      $ = /(Z|\b[_/a-z]+)$/i.exec(initialTime);

      if ($) {
        zone = $[1];

        initialTime = initialTime.slice(0, -zone.length).trim() || null;

        if (/^(Z|UT|UTC|GMT)$/i.test(zone))
          zone = 'UT';

        parseZone = Timezone.has(zone) ? Timezone.from(zone) : null;

        if (!parseZone || (parseZone instanceof Timezone && parseZone.error)) {
          const szni = Timezone.hasShortName(zone) ? Timezone.getShortZoneNameInfo(zone) : null;

          if (szni) {
            if (szni.ianaName && Timezone.has(szni.ianaName))
              parseZone = Timezone.from(szni.ianaName);

            if (initialTime)
              initialTime += ' ' + Timezone.formatUtcOffset(szni.utcOffset);
          }
          else if ($.index === 0) {
            initialTime = saveTime;
            parseZone = null;
          }
          else {
            this._error = `Bad timezone: ${zone}`;
            this._utcTimeMillis = null;

            return;
          }
        }
      }

      if (initialTime) {
        try {
          initialTime = parseISODateTime(initialTime);

          if (initialTime.y == null && initialTime.yw == null && initialTime.ywl == null && initialTime.n == null) {
            parseZone = DATELESS;
            delete initialTime.utcOffset;
            timezone = null;
          }
          else if (occurrence)
            initialTime.occurrence = occurrence;

          if (initialTime.utcOffset && !timezone) {
            if (parseZone)
              timezone = parseZone;

            parseZone = new Timezone({
              dstOffset: 0,
              transitions: null,
              usesDst: false,
              zoneName: 'UT' + Timezone.formatUtcOffset(initialTime.utcOffset),
              currentUtcOffset: initialTime.utcOffset });
          }
        }
        catch (e) {
          initialTime = Date.parse(initialTime + (zone ? ' ' + zone : ''));

          if (isNaN(initialTime)) {
            this._error = e.message;
            this._utcTimeMillis = null;

            return;
          }
        }
      }
      else
        initialTime = null;
    }

    if (isString(timezone))
      timezone = Timezone.from(timezone);

    if (timezone?.error) {
      this._error = `Bad timezone: ${timezone!.zoneName}`;
      this._utcTimeMillis = null;

      return;
    }

    if (parseZone)
      this._timezone = parseZone;
    else if (timezone)
      this._timezone = timezone;

    if (!isNumber(gregorianOrLocale) &&
        ((isString(gregorianOrLocale) && localeTest.test(gregorianOrLocale)) ||
         (isArray(gregorianOrLocale) && isString(gregorianOrLocale[0]))))
      this._locale = normalizeLocale(gregorianOrLocale as string | string[]);

    if (initialTime instanceof Date)
      this.utcTimeMillis = +initialTime;
    else if (isObject(initialTime)) {
      if (!parseZone && !timezone && (initialTime as any).utcOffset != null && (initialTime as any).utcOffset !== 0)
        this._timezone = Timezone.from(Timezone.formatUtcOffset((initialTime as any).utcOffset));

      try {
        this.wallTime = initialTime as DateAndTime;
      }
      catch (e) {
        this._error = e.message;
        this._utcTimeMillis = null;

        return;
      }
    }
    else
      this.utcTimeMillis = (isNumber(initialTime) ? initialTime as number : Date.now());

    if (parseZone && timezone)
      this.timezone = timezone;
  }

  lock = (): DateTime => this._lock();
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

  get type(): 'ZONELESS' | 'DATELESS' | 'DATETIME' {
    if (this._timezone === ZONELESS)
      return 'ZONELESS';
    else if (this._timezone === DATELESS)
      return 'DATELESS';
    else
      return 'DATETIME';
  }

  get valid(): boolean { return this._utcTimeMillis != null && !isNaN(this._utcTimeMillis); }
  get error(): string { return this._error || ((!this.valid && 'general error') || undefined); }

  get utcTimeMillis(): number { return this._utcTimeMillis; }
  set utcTimeMillis(newTime: number) {
    if (this.locked)
      throw lockError;

    if (this._utcTimeMillis !== newTime || !this.wallTime) {
      this._utcTimeMillis = newTime;
      this.updateWallTimeFromCurrentMillis();
    }
  }

  get utcTimeSeconds(): number { return floor(this._utcTimeMillis / 1000); }
  set utcTimeSeconds(newTime: number) { this.utcTimeMillis = newTime * 1000; }

  toDate(): Date {
    return new Date(this._utcTimeMillis);
  }

  private getWallTime(purge?: boolean): DateAndTime {
    if (!this.valid)
      return { error: this.error };

    const w = clone(this._wallTime);

    if (this._timezone === DATELESS)
      ['y', 'year', 'q', 'quarter', 'm', 'month', 'd', 'day', 'dy', 'dayOfYear', 'dow', 'dayOfWeek',
       'dowmi', 'dayOfWeekMonthIndex', 'n', 'epochDay', 'j', 'isJulian',
       'yw', 'yearByWeek', 'w', 'week', 'dw', 'dayByWeek',
       'ywl', 'yearByWeekLocale', 'wl', 'weekLocale', 'dwl', 'dayByWeekLocale',
       'utcOffset', 'dstOffset', 'occurrence'].forEach(key => delete w[key]);

    if (purge != null)
      purgeAliasFields(w, purge);

    return w;
  }

  get wallTime(): DateAndTime { return this.getWallTime(); }
  set wallTime(newTime: DateAndTime) {
    if (this.locked)
      throw lockError;

    newTime = syncDateAndTime(clone(newTime));
    delete newTime.error;
    validateDateAndTime(newTime);

    if (!isEqual(this._wallTime, newTime)) {
      if (newTime.y == null && newTime.yw == null && newTime.ywl == null && newTime.n == null) {
        newTime.y = 1970;
        newTime.m = 1;
        newTime.d = 1;
        this._timezone = DATELESS;
      }
      else if (this._timezone === DATELESS && (newTime.y != null || newTime.yw != null || newTime.ywl != null || newTime.n != null))
        this._timezone = ZONELESS;

      this._wallTime = newTime;
      this.updateUtcMillisFromWallTime();
      this.updateWallTimeFromCurrentMillis(this._wallTime.d);
    }
  }

  get wallTimeShort(): DateAndTime { return this.getWallTime(false); }
  get wallTimeLong(): DateAndTime { return this.getWallTime(true); }

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
    if (isString(newZone)) {
      const zone = Timezone.from(newZone);

      if (zone.error) {
        const szni = Timezone.getShortZoneNameInfo(newZone);

        if (szni)
          newZone = Timezone.from(szni.ianaName);
        else
          throw new Error(`Bad timezone: ${newZone}`);
      }
      else
        newZone = zone;
    }

    const result = this.clone(false);
    const wallTime = result.wallTime; // copy

    result.timezone = newZone;

    if (keepLocalTime) {
      delete wallTime.utcOffset;
      delete wallTime.occurrence;
      result.wallTime = wallTime;
    }

    return result._lock(this.locked);
  }

  utc(keepLocalTime = false): DateTime {
    return this.tz(Timezone.UT_ZONE, keepLocalTime);
  }

  local(keepLocalTime = false): DateTime {
    return this.tz(Timezone.guess(), keepLocalTime);
  }

  toLocale(newLocale: string | string[]): DateTime {
    const result = this.clone();
    result._locale = newLocale;
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

  isDST(): boolean {
    return this.dstOffsetSeconds !== 0;
  }

  getTimezoneDisplayName(): string {
    return this._timezone.getDisplayName(this._utcTimeMillis);
  }

  private checkDateless(field: DateTimeField): void {
    if (this._timezone === DATELESS)
      throw new Error(`${DateTimeField[field]} cannot be used with a dateless time value`);
  }

  add(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = false): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (!this.valid)
      throw new Error('Cannot perform add()/subtract() on invalid DateTime');
    else if (amount === 0)
      return result._lock(this.locked);
    else if (amount !== floor(amount))
      throw nonIntError;

    let updateFromWall = false;
    let normalized: YMDDate;
    const wallTime = result._wallTime;
    const fieldN = fieldNameToField(field);

    switch (fieldN) {
      case DateTimeField.MILLI:
        result._utcTimeMillis += amount;
        break;

      case DateTimeField.SECOND:
        result._utcTimeMillis += amount * 1000;
        break;

      case DateTimeField.MINUTE:
        result._utcTimeMillis += amount * 60_000;
        break;

      case DateTimeField.HOUR:
        result._utcTimeMillis += amount * 3_600_000;
        break;

      case DateTimeField.DAY:
        this.checkDateless(fieldN);

        if (variableDays) {
          updateFromWall = true;
          wallTime.n += amount;
          delete wallTime.y;
          delete wallTime.yw;
          delete wallTime.ywl;
        }
        else
          result._utcTimeMillis += amount * 86_400_000;
        break;

      case DateTimeField.WEEK:
        this.checkDateless(fieldN);
        result._utcTimeMillis += amount * 604_800_000;
        break;

      case DateTimeField.QUARTER:
        amount *= 3;

      // eslint-disable-next-line no-fallthrough
      case DateTimeField.MONTH:
        this.checkDateless(fieldN);
        // eslint-disable-next-line no-case-declarations
        const m = wallTime.m;
        updateFromWall = true;
        wallTime.m = mod(m - 1 + amount, 12) + 1;
        wallTime.y += div_rd(m - 1 + amount, 12);
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.n;
        break;

      case DateTimeField.YEAR:
        this.checkDateless(fieldN);
        updateFromWall = true;
        wallTime.y += amount;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.n;
        break;

      default:
        throw new Error(`${isString(field) ? `"${field}"` : DateTimeField[field]} is not a valid add()/subtract() field`);
    }

    if (updateFromWall) {
      delete wallTime.dy;
      delete wallTime.occurrence;
      delete wallTime.utcOffset;
      delete wallTime.j;
      result.updateUtcMillisFromWallTime();
    }

    if (this._timezone === DATELESS)
      this._utcTimeMillis = mod(this._utcTimeMillis, 86400000);

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  subtract(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = false): DateTime {
    return this.add(field, -amount, variableDays);
  }

  roll(field: DateTimeField | DateTimeFieldName, amount: number, minYear = 1900, maxYear = 2099): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (!this.valid)
      throw new Error('Cannot perform roll() on invalid DateTime');
    else if (amount === 0)
      return result._lock(this.locked);
    else if (amount !== floor(amount))
      throw nonIntError;

    let normalized: YMDDate;
    const wallTime = result._wallTime;
    const fieldN = fieldNameToField(field);
    let clearOccurrence = true;

    switch (fieldN) {
      case DateTimeField.MILLI:
        wallTime.millis = mod(wallTime.millis + amount, 1000);
        break;

      case DateTimeField.SECOND:
        wallTime.sec = mod(wallTime.sec + amount, 60);
        break;

      case DateTimeField.MINUTE:
        wallTime.min = mod(wallTime.min + amount, 60);
        break;

      case DateTimeField.HOUR:
        {
          const hoursInDay = floor(result.getSecondsInDay() / 3600);
          wallTime.hrs = mod(wallTime.hrs + amount, hoursInDay);

          if (amount > 0 && (wallTime.occurrence ?? 1) === 1) {
            clearOccurrence = false;
            wallTime.occurrence = 2;
          }
          else if (amount < 0 && (wallTime.occurrence ?? 1) > 1) {
            clearOccurrence = false;
            wallTime.occurrence = 1;
          }
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
        this.checkDateless(fieldN);
        {
          const missing = result.getMissingDateRange();
          const daysInMonth = result.getLastDateInMonth();

          wallTime.d = mod(wallTime.d + amount - 1, daysInMonth) + 1;

          if (missing && (missing[0] <= wallTime.d && wallTime.d <= missing[1]))
            wallTime.d = amount < 0 ? missing[0] - 1 : missing[1] + 1;

          wallTime.d = min(max(wallTime.d, result.getFirstDateInMonth()), daysInMonth);
          delete wallTime.dy;
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.DAY_BY_WEEK:
        this.checkDateless(fieldN);
        wallTime.dw = mod(wallTime.dw + amount - 1, 7) + 1;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_BY_WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.dwl = mod(wallTime.dwl + amount - 1, 7) + 1;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_YEAR:
        this.checkDateless(fieldN);
        wallTime.dy = mod(wallTime.dy + amount - 1, this.getDaysInYear(wallTime.y)) + 1;
        delete wallTime.m;
        delete wallTime.d;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK:
        this.checkDateless(fieldN);
        {
          const weeksInYear = result.getWeeksInYear(wallTime.yw, 1, 4);

          wallTime.w = mod(wallTime.w + amount - 1, weeksInYear) + 1;
          delete wallTime.y;
          delete wallTime.ywl;
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.WEEK_LOCALE:
        this.checkDateless(fieldN);
        {
          const weeksInYear = result.getWeeksInYear(wallTime.ywl,
            getStartOfWeek(this.locale), getMinDaysInWeek(this.locale));

          wallTime.wl = mod(wallTime.wl + amount - 1, weeksInYear) + 1;
          delete wallTime.y;
          delete wallTime.yw;
          delete wallTime.utcOffset;
        }
        break;

      case DateTimeField.QUARTER:
        amount *= 3;

      // eslint-disable-next-line no-fallthrough
      case DateTimeField.MONTH:
        this.checkDateless(fieldN);
        wallTime.m = mod(wallTime.m + amount - 1, 12) + 1;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.dy;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR:
        this.checkDateless(fieldN);
        wallTime.y = mod(wallTime.y - minYear + amount, maxYear - minYear + 1) + minYear;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.dy;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK:
        this.checkDateless(fieldN);
        wallTime.yw = mod(wallTime.yw - minYear + amount, maxYear - minYear + 1) + minYear;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.ywl = mod(wallTime.ywl - minYear + amount, maxYear - minYear + 1) + minYear;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.ERA:
        this.checkDateless(fieldN);

        if (amount % 2 === 0)
          return result._lock(this.locked);

        wallTime.y = -wallTime.y + 1;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.utcOffset;
        break;

      default:
        throw new Error(`${isString(field) ? `"${field}"` : DateTimeField[field]} is not a valid roll() field`);
    }

    delete wallTime.n;
    delete wallTime.j;

    if (clearOccurrence)
      delete wallTime.occurrence;

    result.updateUtcMillisFromWallTime();

    if (this._timezone === DATELESS)
      this._utcTimeMillis = mod(this._utcTimeMillis, 86400000);

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  set(field: DateTimeField | DateTimeFieldName, value: number, loose = false): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (!this.valid)
      throw new Error('Cannot perform set() on invalid DateTime');
    else if (value !== floor(value))
      throw nonIntError;

    let normalized: YMDDate;
    const wallTime = result._wallTime;
    let min = 0;
    let max = 59;
    const fieldN = fieldNameToField(field);

    switch (fieldN) {
      case DateTimeField.MILLI:
        max = 999;
        wallTime.millis = value;
        break;

      case DateTimeField.SECOND:
        wallTime.sec = value;
        break;

      case DateTimeField.MINUTE:
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

      case DateTimeField.DAY:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 32 : this.getLastDateInMonth();
        wallTime.d = value;
        delete wallTime.dy;

        if (!loose) {
          const missing = this.getMissingDateRange();

          if (missing && (missing[0] <= value && value <= missing[1]))
            throw new Error(`${value} is an invalid date in the month ${wallTime.m}/${wallTime.y}`);
        }
        break;

      case DateTimeField.DAY_BY_WEEK:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 8 : 7;
        wallTime.dw = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_BY_WEEK_LOCALE:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 8 : 7;
        wallTime.dwl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.DAY_OF_YEAR:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 367 : this.getDaysInYear(wallTime.y);
        wallTime.dy = value;
        delete wallTime.m;
        delete wallTime.d;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 54 : this.getWeeksInYear(wallTime.yw, 1, 4);
        wallTime.w = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.WEEK_LOCALE:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 54 : result.getWeeksInYear(wallTime.ywl, getStartOfWeek(this.locale), getMinDaysInWeek(this.locale));
        wallTime.wl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.MONTH:
        this.checkDateless(fieldN);
        min = loose ? 0 : 1;
        max = loose ? 13 : 12;
        wallTime.m = value;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.dy;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR:
        this.checkDateless(fieldN);
        min = MIN_YEAR;
        max = MAX_YEAR;
        wallTime.y = value;
        normalized = result.normalizeDate(wallTime);
        [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
        delete wallTime.dy;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK:
        this.checkDateless(fieldN);
        min = MIN_YEAR;
        max = MAX_YEAR;
        wallTime.yw = value;
        delete wallTime.y;
        delete wallTime.ywl;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        this.checkDateless(fieldN);
        min = MIN_YEAR;
        max = MAX_YEAR;
        wallTime.ywl = value;
        delete wallTime.y;
        delete wallTime.yw;
        delete wallTime.utcOffset;
        break;

      case DateTimeField.ERA:
        this.checkDateless(fieldN);
        max = 1;

        if ((value === 0 && wallTime.y > 0) || (value === 1 && wallTime.y <= 0)) {
          wallTime.y = -wallTime.y + 1;
          normalized = result.normalizeDate(wallTime);
          [wallTime.y, wallTime.m, wallTime.d] = [normalized.y, normalized.m, normalized.d];
          delete wallTime.dy;
          delete wallTime.utcOffset;
        }
        break;

      default:
        throw new Error(`${isString(field) ? `"${field}"` : DateTimeField[field]} is not a valid set() field`);
    }

    if (value < min || value > max)
      throw new Error(`${DateTimeField[fieldN]} (${value}) must be in the range [${min}, ${max}]`);

    delete wallTime.n;
    delete wallTime.j;
    delete wallTime.occurrence;
    result.updateUtcMillisFromWallTime();

    if (this._timezone === DATELESS)
      this._utcTimeMillis = mod(this._utcTimeMillis, 86400000);

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  startOf(field: DateTimeField | DateTimeFieldName): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (!this.valid)
      throw new Error('Cannot perform startOf() on invalid DateTime');

    const wallTime = result._wallTime;
    const fieldN = fieldNameToField(field);

    switch (fieldN) {
      case DateTimeField.SECOND:
        wallTime.millis = 0;
        break;

      case DateTimeField.MINUTE:
        wallTime.millis = wallTime.sec = 0;
        break;

      case DateTimeField.HOUR:
        wallTime.millis = wallTime.sec = wallTime.min = 0;
        break;

      case DateTimeField.DAY:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        break;

      case DateTimeField.WEEK:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.dw = 1;
        delete wallTime.y;
        delete wallTime.ywl;
        break;

      case DateTimeField.WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.dwl = 1;
        delete wallTime.y;
        delete wallTime.yw;
        break;

      case DateTimeField.MONTH:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.d = 1;
        break;

      case DateTimeField.QUARTER:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.d = 1;
        wallTime.m = floor((wallTime.m - 1) / 3) * 3 + 1;
        break;

      case DateTimeField.YEAR:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.d = wallTime.m = 1;
        break;

      case DateTimeField.YEAR_WEEK:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.dw = wallTime.w = 1;
        delete wallTime.y;
        delete wallTime.ywl;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.millis = wallTime.sec = wallTime.min = wallTime.hrs = 0;
        wallTime.dwl = wallTime.wl = 1;
        delete wallTime.y;
        delete wallTime.yw;
        break;

      default:
        throw new Error(`${isString(field) ? `"${field}"` : DateTimeField[field]} is not a valid startOf() field`);
    }

    delete wallTime.n;
    delete wallTime.j;
    delete wallTime.utcOffset;
    delete wallTime.occurrence;
    result.updateUtcMillisFromWallTime();

    if (this._timezone === DATELESS)
      this._utcTimeMillis = mod(this._utcTimeMillis, 86400000);

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  endOf(field: DateTimeField | DateTimeFieldName): DateTime {
    const result = this.locked ? this.clone(false) : this;

    if (!this.valid)
      throw new Error('Cannot perform startOf() on invalid DateTime');

    const wallTime = result._wallTime;
    const fieldN = fieldNameToField(field);

    switch (fieldN) {
      case DateTimeField.SECOND:
        wallTime.millis = 999;
        break;

      case DateTimeField.MINUTE:
        wallTime.millis = 999;
        wallTime.sec = 59;
        break;

      case DateTimeField.HOUR:
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        break;

      case DateTimeField.DAY:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        break;

      case DateTimeField.WEEK:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.dw = 7;
        delete wallTime.y;
        delete wallTime.ywl;
        break;

      case DateTimeField.WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.dwl = 7;
        delete wallTime.y;
        delete wallTime.yw;
        break;

      case DateTimeField.MONTH:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.d = this.getLastDateInMonth(wallTime.y, wallTime.m);
        break;

      case DateTimeField.QUARTER:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.m = floor((wallTime.m - 1) / 3) * 3 + 3;
        wallTime.d = this.getLastDateInMonth(wallTime.y, wallTime.m);
        break;

      case DateTimeField.YEAR:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.d = 31;
        wallTime.m = 12;
        break;

      case DateTimeField.YEAR_WEEK:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.dw = 7;
        wallTime.w = this.getWeeksInYear(wallTime.yw);
        delete wallTime.y;
        delete wallTime.ywl;
        break;

      case DateTimeField.YEAR_WEEK_LOCALE:
        this.checkDateless(fieldN);
        wallTime.millis = 999;
        wallTime.sec = wallTime.min = 59;
        wallTime.hrs = 23;
        wallTime.dwl = 7;
        wallTime.wl = this.getWeeksInYear(wallTime.ywl, null, null);
        delete wallTime.y;
        delete wallTime.yw;
        break;

      default:
        throw new Error(`${isString(field) ? `"${field}"` : DateTimeField[field]} is not a valid startOf() field`);
    }

    delete wallTime.n;
    delete wallTime.j;
    delete wallTime.utcOffset;
    delete wallTime.occurrence;
    result.updateUtcMillisFromWallTime();

    if (this._timezone === DATELESS)
      this._utcTimeMillis = mod(this._utcTimeMillis, 86400000);

    result.updateWallTimeFromCurrentMillis();

    return result._lock(this.locked);
  }

  compare(other: DateTime | string | number | Date,
          resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): number {
    return DateTime.compare(this, other, resolution);
  }

  isBefore(other: DateTime | string | number | Date,
           resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(other, resolution) < 0;
  }

  isSameOrBefore(other: DateTime | string | number | Date,
                 resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(other, resolution) <= 0;
  }

  isSame(other: DateTime | string | number | Date,
         resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(other, resolution) === 0;
  }

  isSameOrAfter(other: DateTime | string | number | Date,
                resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(other, resolution) >= 0;
  }

  isAfter(other: DateTime | string | number | Date,
          resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(other, resolution) > 0;
  }

  isBetween(low: DateTime | string | number | Date, high: DateTime | string | number | Date,
            resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): boolean {
    return this.compare(low, resolution) > 0 && this.compare(high, resolution) < 0;
  }

  getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (yearOrDate == null) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this);

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
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this);

    return (this.getStartOfDayMillis(year, month, day + 1) - this.getStartOfDayMillis(year, month, day)) / 1000;
  }

  getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number {
    let year: number;

    if (yearOrDate == null) {
      [year, month, day] = [this._wallTime.y, this._wallTime.m, this._wallTime.d];
    }
    else
      [year, month, day] = handleVariableDateArgs(yearOrDate, month, day, this);

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
    return `DateTime<${this.format(this.timezone === DATELESS ? timeOnlyFormat : fullAltFormat)}${this._wallTime.j ? 'J' : ''}>`;
  }

  toYMDhmString(): string {
    return formatter(this, 'Y-MM-DD HH:mmv', 'en-US');
  }

  toIsoString(maxLength?: number): string {
    let s = this.format(undefined, 'en-US');

    if (maxLength != null) {
      if (/^[-+]/.test(s))
        ++maxLength;

      s = s.substr(0, maxLength);
    }

    return s;
  }

  toHoursAndMinutesString(includeDst = false): string {
    return this.format('HH:mm' + (includeDst ? 'v' : ''), 'en-US');
  }

  private updateUtcMillisFromWallTime(): void {
    const wallTime = purgeAliasFields(clone(this._wallTime));

    this._utcTimeMillis = this.computeUtcMillisFromWallTimeAux(wallTime);
  }

  computeUtcMillisFromWallTime(wallTime: DateAndTime): number {
    return this.computeUtcMillisFromWallTimeAux(syncDateAndTime(clone(wallTime)));
  }

  private computeUtcMillisFromWallTimeAux(wallTime: DateAndTime): number {
    if (wallTime.y != null) {
      if (wallTime.m != null || wallTime.d != null) {
        wallTime.m = wallTime.m ?? 1;
        wallTime.d = wallTime.d ?? 1;
      }
      else if (wallTime.dy != null) {
        ++this.computeWeekValues;
        ({ m: wallTime.m, d: wallTime.d } = this.getDateFromDayNumber(this.getDayNumber(wallTime.y, 1, 0) + wallTime.dy));
        --this.computeWeekValues;
      }
      else
        wallTime.m = wallTime.d = 1;
    }
    else if (wallTime.yw != null) {
      wallTime.w = wallTime.w ?? 1;
      wallTime.dw = wallTime.dw ?? 1;
    }
    else if (wallTime.ywl != null) {
      wallTime.wl = wallTime.wl ?? 1;
      wallTime.dwl = wallTime.dwl ?? 1;
    }

    const dayNum = wallTime.n ?? this.getDayNumber(wallTime);
    let millis = (wallTime.millis ?? 0) +
                 (wallTime.sec ?? 0) * 1000 +
                 (wallTime.min ?? 0) * 60000 +
                 (wallTime.hrs ?? 0) * 3600000 +
                 dayNum * 86400000;

    if (wallTime.utcOffset != null)
      millis -= wallTime.utcOffset * 1000;
    else
      millis -= this._timezone.getOffsetForWallTime(millis) * 1000;

    if ((wallTime.occurrence ?? 1) < 2) {
      const transition = this.timezone.findTransitionByUtc(millis);
      let day = wallTime.d;

      if (wallTime.j)
        day = getDateFromDayNumberGregorian(dayNum).d;

      if (transition !== null && transition.deltaOffset < 0 && transition.wallTimeDay === day &&
          millis < transition.transitionTime - transition.deltaOffset * 1000)
        millis += transition.deltaOffset * 1000;
    }

    return millis;
  }

  private updateWallTimeFromCurrentMillis(day = 0): void {
    if (isNaN(this._utcTimeMillis) || this._utcTimeMillis < Number.MIN_SAFE_INTEGER || this._utcTimeMillis > Number.MAX_SAFE_INTEGER) {
      this._error = `Invalid core millisecond time value: ${this._utcTimeMillis}`;
      this._utcTimeMillis = null;

      return;
    }

    this._wallTime = orderFields(this.getTimeOfDayFieldsFromMillis(this._utcTimeMillis, day));
    this._error = undefined;

    if (this._wallTime.y < MIN_YEAR || this._wallTime.y > MAX_YEAR) {
      this._error = `Invalid year: ${this._wallTime.y}`;
      this._utcTimeMillis = null;
    }
    else {
      let field: string = '';
      let badValue = 0;

      forEach<any>(this._wallTime, (key, value) => {
        if (isNumber(value) && (isNaN(value) || !isFinite(value)) && key.length > field.length) {
          field = key;
          badValue = value;
        }
      });

      if (field) {
        this._error = `Invalid ${field}: ${badValue}`;
        this._utcTimeMillis = null;
      }
    }
  }

  getTimeOfDayFieldsFromMillis(millis: number, day = 0): DateAndTime {
    if (millis == null || isNaN(millis))
      return syncDateAndTime({ y: NaN, m: NaN, d: NaN, n: NaN });

    let ticks = millis + this._timezone.getOffset(millis, day) * 1000;
    const wallTimeMillis = ticks;
    const wallTime = this.getDateFromDayNumber(div_rd(ticks, 86400000), 1, 4) as DateAndTime;

    wallTime.millis = mod(ticks, 1000) || 0; // The `|| 0` cleans up negative zeros.
    ticks = div_rd(ticks, 1000);
    wallTime.sec = mod(ticks, 60) || 0;
    ticks = div_rd(ticks, 60);
    wallTime.min = mod(ticks, 60) || 0;
    ticks = div_rd(ticks, 60);
    wallTime.hrs = mod(ticks, 24) || 0;
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
    wallTime.dow = this.getDayOfWeek(wallTime);
    wallTime.dowmi = this.getDayOfWeekInMonthIndex(wallTime.y, wallTime.m, wallTime.d);
    wallTime.q = floor((wallTime.m - 1) / 3) + 1;
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

  isLeapYear(year?: number): boolean {
    return this.isValidDate(year ?? this._wallTime.y, 2, 29);
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

  getDayOfWeekInMonthIndex(year: number, month: number, day: number): number;
  getDayOfWeekInMonthIndex(date: YMDDate | number[]): number;
  getDayOfWeekInMonthIndex(): number;
  getDayOfWeekInMonthIndex(...args: any): number {
    if (args.length > 0)
      return super.getDayOfWeekInMonthIndex(args[0], args[1], args[2]);
    else
      return super.getDayOfWeekInMonthIndex(this._wallTime.y, this._wallTime.m, this._wallTime.d);
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
