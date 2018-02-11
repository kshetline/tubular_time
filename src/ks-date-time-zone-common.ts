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

import { getDateFromDayNumber_SGC, getDayNumber_SGC, YMDDate } from './ks-calendar';
import { div_rd, mod } from 'ks-math';

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
  const wallTime = <DateAndTime> getDateFromDayNumber_SGC(div_rd(ticks, 86400000));

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
