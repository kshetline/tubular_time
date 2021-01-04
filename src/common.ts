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

import { div_rd, mod } from '@tubular/math';
import { getDateFromDayNumber_SGC, getDayNumber_SGC, YMDDate } from './calendar';
import { toNumber } from '@tubular/util';

export interface DateAndTime extends YMDDate {
  hrs: number;
  min: number;
  sec: number;
  millis?: number;
  utcOffset?: number;
  dstOffset?: number;
  occurrence?: number;
}

export const MINUTE_MSEC =    60000;
export const HOUR_MSEC   =  3600000;
export const DAY_MSEC    = 86400000;

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
  const wallTime = getDateFromDayNumber_SGC(div_rd(ticks, 86400000)) as DateAndTime;

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

  return wallTime;
}

const invalidDateTime = new Error('Invalid ISO date/time');

export function parseISODateTime(date: string): DateAndTime {
  date = date.trim();

  let time: DateAndTime;
  let $ = /^([-+]?\d+)-(\d{1,2})-(\d{1,2})/.exec(date);

  if ($ || ($ = /^([-+]?\d{4,})(\d\d)(\d\d)/.exec(date)))
    time = { y: toNumber($[1]), m: Number($[2]), d: Number($[3]) } as DateAndTime;
  else if (($ = /^([-+]?\d+)-W(\d+)-(\d)/i.exec(date)) || ($ = /^([-+]?\d{4,})W(\d\d)(\d)/i.exec(date)))
    time = { yw: toNumber($[1]), w: Number($[2]), dw: Number($[3]) } as DateAndTime;
  else if (($ = /^(\d+)-(\d+)/.exec(date)) || ($ = /^(\d{4})(\d){3}/.exec(date))) {
    time = { y: toNumber($[1]), dy: Number($[2]) } as DateAndTime;
  }
  else
    throw invalidDateTime;

  date = date.substr($[0].length).trim();

  if (!date)
    $ = [] as RegExpExecArray;
  else if (!($ = /(?:T\s*)?(\d{1,2}):(\d{1,2})(?::(?:(\d{1,2})(?:\.(\d+))?))?(?:\s*([-+](?:\d\d\d\d|\d\d:\d\d)))?$/i.exec(date)) &&
           !($ = /(?:T\s*)?(\d{4})(\d\d)(\d\d)(?:\.(\d+))?/i.exec(date)))
    throw invalidDateTime;

  Object.assign(time, {
    hrs: Number($[1] ?? 0), min: Number($[2] ?? 0),
    sec: Number($[3] ?? 0), millis: Number(($[4] ?? '0').padEnd(3, '0').substr(0, 3)) });

  if ($[4] == null && time.millis === 0)
    delete time.millis;

  if ($[5])
    time.utcOffset = parseTimeOffset($[5]);

  return time;
}

export function parseTimeOffset(offset: string): number {
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

  if (parts[2])
    offsetSeconds += Number(parts[2]);

  return sign * offsetSeconds;
}
