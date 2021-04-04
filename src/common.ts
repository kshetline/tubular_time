import { div_rd, floor, mod } from '@tubular/math';
import { getDateFromDayNumber_SGC, getDayNumber_SGC } from './calendar';
import { isNumber, toNumber } from '@tubular/util';

export const MIN_YEAR = -271820;
export const MAX_YEAR = 275759;

/**
 * Specifies a calendar date by year, month, and day. Optionally provides day number and boolean flag indicating Julian
 * or Gregorian.
 */
export interface YMDDate {
  /** Year as signed integer (0 = 1 BCE, -1 = 2 BCE, etc.). */
  y?: number;
  year?: number;
  /** Quarter as 1-4. */
  q?: number;
  quarter?: number;
  /** Month as 1-12. */
  m?: number;
  month?: number;
  /** Day of month. */
  d?: number;
  day?: number;
  /** Day of week as 0-6 for Sunday-Saturday. */
  dow?: number;
  dayOfWeek?: number;
  /** Day of week month index, 1-5, e.g. 2 for 2nd Tuesday of the month. */
  dowmi?: number;
  dayOfWeekMonthIndex?: number;
  /** Day of year. */
  dy?: number;
  dayOfYear?: number;
  /** Day number where 1970-01-01 = 0. */
  n?: number;
  epochDay?: number;
  /** true if this is a Julian calendar date, false for Gregorian. */
  j?: boolean;
  isJulian?: boolean;
  /** ISO year for week of year. */
  yw?: number;
  yearByWeek?: number;
  /** ISO week of year. */
  w?: number;
  week?: number;
  /** ISO day or week. */
  dw?: number;
  dayByWeek?: number;
  /** Locale year for week of year. */
  ywl?: number;
  yearByWeekLocale?: number;
  /** Locale week of year. */
  wl?: number;
  weekLocale?: number;
  /** Locale day or week. */
  dwl?: number;
  dayByWeekLocale?: number;
  /** Error, if any. */
  error?: string;
}

export interface DateAndTime extends YMDDate {
  hrs?: number;
  hour?: number;
  min?: number;
  minute?: number;
  sec?: number;
  second?: number;
  millis?: number;
  utcOffset?: number;
  dstOffset?: number;
  occurrence?: number;
  deltaTai?: number;

  /** Julian days, ephemeris. */
  jde?: number;
  /** Julian days, UT. */
  jdu?: number;
  /** Terrestrial Time (aka TDT, Dynamic Time) in milliseconds from 1970-01-01 TT. */
  tt?: number;
}

const altFields = [
  ['y', 'year'], ['q', 'quarter'], ['m', 'month'], ['d', 'day'], ['dow', 'dayOfWeek'], ['dowmi', 'dayOfWeekMonthIndex'],
  ['dy', 'dayOfYear'], ['n', 'epochDay'],
  ['j', 'isJulian'], ['yw', 'yearByWeek'], ['w', 'week'], ['dw', 'dayByWeek'],
  ['ywl', 'yearByWeekLocale'], ['wl', 'weekLocale'], ['dwl', 'dayByWeekLocale'],
  ['hrs', 'hour'], ['min', 'minute'], ['sec', 'second']
];

const fieldOrder = [
  'y', 'q', 'm', 'd', 'dow', 'dowmi', 'dy', 'n', 'j',
  'year', 'quarter', 'month', 'day', 'dayOfWeek', 'dayOfWeekMonthIndex', 'dayOfYear', 'epochDay', 'isJulian',
  'yw', 'w', 'dw',
  'yearByWeek', 'week', 'dayByWeek',
  'ywl', 'wl', 'dwl',
  'yearByWeekLocale', 'weekLocale', 'dayByWeekLocale',
  'hrs', 'min', 'sec',
  'hour', 'minute', 'second', 'millis',
  'utcOffset', 'dstOffset', 'occurrence', 'deltaTai',
  'jde', 'jdu', 'tt',
  'error'
];

export function syncDateAndTime<T extends YMDDate | DateAndTime>(obj: T): T {
  for (const [key1, key2] of altFields) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(key1))
      obj[key2] = obj[key1];
    // eslint-disable-next-line no-prototype-builtins
    else if (obj.hasOwnProperty(key2))
      obj[key1] = obj[key2];
  }

  return obj;
}

export function purgeAliasFields<T extends YMDDate | DateAndTime>(obj: T, keepLongForm = false): T {
  for (const [short, long] of altFields)
    delete obj[keepLongForm ? short : long];

  return obj;
}

export function orderFields<T extends YMDDate | DateAndTime>(obj: T): T {
  for (const key of fieldOrder) {
    const value = obj[key];

    delete obj[key];

    if (value != null)
      obj[key] = value;
  }

  return obj;
}

export function validateDateAndTime(obj: YMDDate | DateAndTime): void {
  const dt = obj as DateAndTime;

  Object.keys(obj).forEach(key => {
    if (key !== 'j' && key !== 'isJulian') {
      const value = obj[key];

      if (value != null) {
        if (!isNumber(value) && /^(jde|jdu|tt)$/.test(key))
          throw new Error(`${key} must be a numeric value (${value})`);
        else if (!isNumber(value) || value !== floor(value))
          throw new Error(`${key} must be an integer value (${value})`);
      }
    }
  });

  if (obj.y == null && obj.year == null && obj.yw == null && obj.yearByWeek == null &&
      obj.ywl == null && obj.yearByWeekLocale == null && obj.n == null && obj.epochDay == null &&
      dt.hrs == null && dt.hour == null && dt.jde && dt.jdu && dt.tt)
    throw new Error('A year value, an epoch day, an hour value, a Julian day, or a TT must be specified');
}

export const MINUTE_MSEC =    60_000;
export const HOUR_MSEC   =  3_600_000;
export const DAY_MSEC    = 86_400_000;

export const DAY_SEC    = 86_400;

export const DAY_MINUTES = 1440;

export function millisFromDateTime_SGC(year: number, month: number, day: number, hour: number, minute: number, second?: number, millis?: number): number {
  millis = millis || 0;
  second = second || 0;

  return millis +
         second * 1000 +
         minute * MINUTE_MSEC +
         hour * HOUR_MSEC +
         getDayNumber_SGC(year, month, day) * DAY_MSEC;
}

export function dateAndTimeFromMillis_SGC(ticks: number): DateAndTime {
  const wallTime = getDateFromDayNumber_SGC(div_rd(ticks, DAY_MSEC)) as DateAndTime;

  wallTime.millis = mod(ticks, 1000);
  ticks = div_rd(ticks, 1000);
  wallTime.sec = mod(ticks, 60);
  ticks = div_rd(ticks, 60);
  wallTime.min = mod(ticks, 60);
  ticks = div_rd(ticks, 60);
  wallTime.hrs = mod(ticks, 24);
  wallTime.utcOffset = 0;
  wallTime.dstOffset = 0;
  wallTime.occurrence = 1;

  return syncDateAndTime(wallTime);
}

const invalidDateTime = new Error('Invalid ISO date/time');

export function parseISODateTime(date: string, allowLeapSecond = false): DateAndTime {
  date = date.trim();

  let time: DateAndTime;
  let $ = /^([-+]?\d+)-(\d{1,2}(?=\D|$))(?:-(\d{1,2}))?/.exec(date);

  if ($ || ($ = /^([-+]?\d{1,5}(?=[^-+:.Ww\d]|$))/.exec(date)) || ($ = /^([-+]?\d{4,})(\d\d)(\d\d)/.exec(date)))
    time = { y: toNumber($[1]), m: Number($[2] ?? 1), d: Number($[3] ?? 1) };
  else if (($ = /^([-+]?\d+)-(W)(\d+)(?:-(\d))?/i.exec(date)) || ($ = /^([-+]?\d{4,})(W)(\d\d)(\d)?/i.exec(date))) {
    if ($[2] === 'W')
      time = { yw: toNumber($[1]), w: Number($[3]), dw: Number($[4] ?? 1) };
    else
      time = { ywl: toNumber($[1]), wl: Number($[3]), dwl: Number($[4] ?? 1) };
  }
  else if (($ = /^(\d+)-(\d+)/.exec(date)) || ($ = /^(\d{4})(\d{3})/.exec(date))) {
    time = { y: toNumber($[1]), dy: Number($[2]) };
  }
  else {
    $ = [''] as RegExpExecArray; // Keep trying to parse as time-only string
    time = {};
  }

  date = date.substr($[0].length).trim().replace(/^T\s*/i, '');

  if (!date)
    Object.assign(time, { hrs: 0, min: 0, sec: 0 });
  else if (($ = /^(\d{1,2})(?::(\d{1,2}))(?::(?:(\d{1,2})(?:[.,](\d+))?))?(?=\D|$)/.exec(date)) ||
           ($ = /^(\d\d)(?:(\d\d)(?:(\d\d)(?:[.,](\d+))?)?)?(?=\D|$)/.exec(date))) {
    Object.assign(time, {
      hrs: Number($[1]), min: Number($[2] ?? 0),
      sec: Number($[3] ?? 0), millis: Number(($[4] ?? '0').padEnd(3, '0').substr(0, 3)) });

    if ($[4] == null && time.millis === 0)
      delete time.millis;

    date = date.substr($[0].length).trim();
  }

  $ = /^([-+]\d\d(\d{4}|\d\d|:\d\d(:\d\d)?)?)$/i.exec(date);

  if ($)
    time.utcOffset = parseTimeOffset($[1]);
  else if (date)
    throw invalidDateTime;

  const y = time.y ?? time.yw ?? time.ywl ?? 0;
  const m = time.m ?? 1;
  const w = time.w ?? time.wl ?? 1;
  const d = time.d ?? 1;

  if (y < MIN_YEAR || y > MAX_YEAR)
    throw new Error(`Invalid year: ${y}`);
  else if (m > 13)
    throw new Error(`Invalid month: ${m}`);
  else if (w > 53)
    throw new Error(`Invalid week: ${w}`);
  else if (d > 32)
    throw new Error(`Invalid day of month: ${d}`);
  else if (time.hrs > 23)
    throw new Error(`Invalid hour: ${time.hrs}`);
  else if (time.min > 59)
    throw new Error(`Invalid minute: ${time.min}`);
  else if (time.sec > 59 + +allowLeapSecond)
    throw new Error(`Invalid second: ${time.sec}`);
  else if (time.utcOffset && (time.utcOffset < -57600 || time.utcOffset > 57600))
    throw new Error(`Invalid UTC offset: ${$[1]}`);

  if (time.m != null)
    time.q = floor((time.m - 1) / 3) + 1;

  return syncDateAndTime(time);
}

export function parseTimeOffset(offset: string, roundToMinutes = false): number {
  let sign = 1;

  if (offset.startsWith('-')) {
    sign = -1;
    offset = offset.substr(1);
  }
  else if (offset.startsWith('+'))
    offset = offset.substr(1);

  const parts = offset.includes(':') ?
    offset.split(':') :
    offset.match(/../g);
  let offsetSeconds = 60 * (60 * Number(parts[0]) + Number(parts[1] ?? 0));

  if (parts[2]) {
    const seconds = Number(parts[2]);

    if (roundToMinutes)
      offsetSeconds += (seconds < 30 ? 0 : 60);
    else
      offsetSeconds += seconds;
  }

  return sign * offsetSeconds;
}

export function convertDigits(n: string): string {
  return n.replace(/[\u0660-\u0669]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0630)) // Arabic digits
    .replace(/[\u06F0-\u06F9]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x06C0)) // Urdu/Persian digits
    .replace(/[\u0966-\u096F]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0936)) // Devanagari digits
    .replace(/[\u09E6-\u09EF]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x09B6)) // Bengali digits
    .replace(/[\u0F20-\u0F29]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0EF0)) // Tibetan digits
    .replace(/[\u1040-\u1049]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x1010)); // Myanmar digits
}

export function getDatePart(format: Intl.DateTimeFormat, date: number, partName: string): string;
export function getDatePart(fields: Intl.DateTimeFormatPart[], partName: string): string;
export function getDatePart(source: Intl.DateTimeFormat | Intl.DateTimeFormatPart[],
                            dateOrPart: number | string, partName?: string): string {
  const parts = (source instanceof Intl.DateTimeFormat ? source.formatToParts(dateOrPart as number) : source);
  partName = partName ?? dateOrPart as string;
  const part = parts.find(part => part.type === partName);

  if (part)
    return part.value;
  else
    return '???';
}

export function getDateValue(format: Intl.DateTimeFormat, date: number, partName: string): number;
export function getDateValue(fields: Intl.DateTimeFormatPart[], partName: string): number;
export function getDateValue(source: Intl.DateTimeFormat | Intl.DateTimeFormatPart[],
                            dateOrPart: number | string, partName?: string): number {
  return toNumber(convertDigits(getDatePart(source as any, dateOrPart as any, partName)));
}
