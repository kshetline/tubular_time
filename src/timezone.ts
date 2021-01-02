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

import { div_tt0, mod2, round } from '@tubular/math';
import { isEqual, last, padLeft } from '@tubular/util';
import { getDateOfNthWeekdayOfMonth_SGC, getDayOnOrAfter_SGC, LAST } from './calendar';
import { dateAndTimeFromMillis_SGC, DAY_MSEC, millisFromDateTime_SGC, MINUTE_MSEC } from './common';

export interface RegionAndSubzones {
  region: string;
  subzones: string[];
}

export interface Transition {
  transitionTime: number; // in milliseconds
  utcOffset: number; // in seconds
  dstOffset: number; // in seconds
  name?: string;
  deltaOffset?: number; // in seconds
  dstFlipped?: boolean;
  baseOffsetChanged?: boolean;
  wallTime?: number; // in milliseconds
}

export interface ZoneInfo {
  zoneName: string;
  currentUtcOffset: number; // in seconds
  usesDst: boolean;
  dstOffset: number; // in seconds
  displayName?: string;
  transitions: Transition[] | null;
}

const CLOCK_TYPE_WALL = 0;
const CLOCK_TYPE_STD = 1;
// noinspection JSUnusedLocalSymbols
const CLOCK_TYPE_UTC = 2; // eslint-disable-line @typescript-eslint/no-unused-vars

const LAST_DST_YEAR = 2500;
const TIME_GAP_AFTER_LAST_TRANSITION = 172800000; // Two days

class Rule {
  startYear: number;
  month: number;
  dayOfMonth: number;
  dayOfWeek: number;
  atHour: number;
  atMinute: number;
  atType: number;
  save: number;

  constructor(ruleStr: string) {
    const parts = ruleStr.split(/[ :]/);

    this.startYear  = Number(parts[0]);
    this.month      = Number(parts[1]);
    this.dayOfMonth = Number(parts[2]);
    this.dayOfWeek  = Number(parts[3]);
    this.atHour     = Number(parts[4]);
    this.atMinute   = Number(parts[5]);
    this.atType     = Number(parts[6]);
    this.save       = round(Number(parts[7]) * 60);
  }

  getTransitionTime(year: number, stdOffset: number, dstOffset: number): number {
    let date: number;

    if (this.dayOfWeek >= 0 && this.dayOfMonth > 0)
      date = getDayOnOrAfter_SGC(year, this.month, this.dayOfWeek - 1, this.dayOfMonth);
    else if (this.dayOfWeek >= 0 && this.dayOfMonth < 0)
      date = getDayOnOrAfter_SGC(year, this.month, this.dayOfWeek - 1, -this.dayOfMonth);
    else if (this.dayOfWeek >= 0 && this.dayOfMonth === 0)
      date = getDateOfNthWeekdayOfMonth_SGC(year, this.month, this.dayOfWeek - 1, LAST);
    else
      date = this.dayOfMonth;

    let millis = millisFromDateTime_SGC(year, this.month, date, this.atHour, this.atMinute);

    if (this.atType === CLOCK_TYPE_WALL)
      millis -= (stdOffset + dstOffset) * 1000;
    else if (this.atType === CLOCK_TYPE_STD)
      millis -= stdOffset * 1000;

    return millis;
  }
}

let osTransitions: Transition[] = [];
let osProbableStdOffset: number;
let osProbableDstOffset: number;
let osUsesDst: boolean;
let osDstOffset: number;

// Create a transition table (if necessary) for the OS timezone so that it can be handled like other timezones.
// It might also be discovered, of course, that the OS timezone is a simple fixed offset from UTC.
(function (): void {
  const date = new Date(1901, 0, 1, 12, 0, 0, 0); // Sample around local noon so it's unlikely we'll sample right at a transition.
  let lastSampleTime = date.getTime();
  const now = Date.now();
  const MONTH_MSEC = 30 * DAY_MSEC;
  const aBitLater = now + MONTH_MSEC * 12 * 2;
  const muchLater = now + MONTH_MSEC * 12 * 50;
  let lastOffset = -date.getTimezoneOffset() * 60;

  osTransitions.push({ transitionTime: Number.MIN_SAFE_INTEGER, utcOffset: lastOffset, dstOffset: 0 });

  while (date.getTime() < muchLater) {
    const sampleTime = lastSampleTime + MONTH_MSEC;

    date.setTime(sampleTime);

    const currentOffset = -date.getTimezoneOffset() * 60;

    if (osProbableStdOffset === undefined && sampleTime >= aBitLater) {
      osProbableStdOffset = osProbableDstOffset = currentOffset;
    }

    if (currentOffset !== lastOffset) {
      if (sampleTime >= aBitLater) {
        osProbableStdOffset = Math.min(osProbableStdOffset, currentOffset);
        osProbableDstOffset = Math.max(osProbableDstOffset, currentOffset);
      }

      let low = lastSampleTime;
      let high = sampleTime;

      while (high - low > MINUTE_MSEC) {
        const mid = Math.floor((high + low) / 2 / MINUTE_MSEC) * MINUTE_MSEC;
        date.setTime(mid);
        const sampleOffset = -date.getTimezoneOffset() * 60;

        if (sampleOffset === lastOffset)
          low = mid;
        else
          high = mid;
      }

      osTransitions.push({ transitionTime: high, utcOffset: currentOffset, dstOffset: 0 });
      lastOffset = currentOffset;
    }

    lastSampleTime = sampleTime;
  }

  if (osTransitions.length < 2) {
    osTransitions = null;
    osUsesDst = false;
    osDstOffset = 0;
  }
  else {
    osUsesDst = (osProbableDstOffset > osProbableStdOffset);
    osDstOffset = osProbableDstOffset - osProbableStdOffset; // Not the full UTC offset during DST, just the difference from Standard Time.

    // If the OS timezone isn't historical, but instead projects DST rules indefinitely backward in time, we might have accidentally
    // captured a DST offset for the first transition, something that will wrongly make DST look like the starting base UTC offset.
    if (osUsesDst) {
      if (osTransitions[0].utcOffset === osProbableDstOffset && osTransitions[1].utcOffset === osProbableStdOffset) {
        osTransitions.splice(0, 1);
        osTransitions[0].transitionTime = Number.MIN_SAFE_INTEGER;
      }

      osTransitions.forEach((transition: Transition, index: number) => {
        if (index > 0 && transition.utcOffset === osProbableDstOffset && osTransitions[index - 1].utcOffset === osProbableStdOffset)
          transition.dstOffset = osProbableDstOffset - osProbableStdOffset;
      });

      // Make sure last transition is to standard time.
      if (last(osTransitions).dstOffset !== 0)
        osTransitions.pop();
    }
  }
})();

export class Timezone {
  private static encodedTimezones: {[id: string]: string} = {};

  static OS_ZONE = new Timezone({ zoneName: 'OS', currentUtcOffset: osProbableStdOffset, usesDst: osUsesDst,
                            dstOffset: osDstOffset, transitions: osTransitions });

  static UT_ZONE = new Timezone({ zoneName: 'UT', currentUtcOffset: 0, usesDst: false,
                            dstOffset: 0, transitions: null });

  private static zoneLookup: { [id: string]: Timezone } = {};

  private readonly _zoneName: string;
  private readonly _utcOffset: number;
  private readonly _usesDst: boolean;
  private readonly _dstOffset: number;
  private readonly displayName: string;
  private readonly transitions: Transition[] | null;
  private _error: string;

  private static extendedRegions = /(America\/Argentina|America\/Indiana)\/(.+)/;
  private static miscUnique = /"CST6CDT|EET|EST5EDT|MST7MDT|PST8PDT|SystemV\/AST4ADT|SystemV\/CST6CDT|SystemV\/EST5EDT|SystemV\/MST7MDT|SystemV\/PST8PDT|SystemV\/YST9YDT|WET/;

  static defineTimezones(encodedTimezones: {[id: string]: string}): boolean {
    const changed = !isEqual(this.encodedTimezones, encodedTimezones);

    this.encodedTimezones = Object.assign({}, encodedTimezones ?? {});

    if (changed)
      this.zoneLookup = {};

    return changed;
  }

  static getAvailableTimezones(): string[] {
    const zones: string[] = [];

    for (const zone of Object.keys(this.encodedTimezones))
      zones.push(zone);

    zones.sort();

    return zones;
  }

  static getRegionsAndSubzones(): RegionAndSubzones[] {
    let hasMisc = false;
    const zoneHash: { [id: string]: string[] } = {};

    for (const zone of Object.keys(this.encodedTimezones)) {
      let region: string;
      let locale: string;
      let matches = this.extendedRegions.exec(zone);

      if (!matches)
        matches = /(.+?)\/(.+)/.exec(zone);

      if (!matches) {
        region = zone;
        locale = null;
      }
      else {
        region = matches[1];
        locale = matches[2].replace(/_/g, ' ');
      }

      if (locale == null || this.miscUnique.test(zone)) {
        region = '~'; // Force miscellaneous zones to sort to end of region list.
        locale = zone;
        hasMisc = true;
      }

      let locales = zoneHash[region];

      if (!locales) {
        locales = [];
        zoneHash[region] = locales;
      }

      locales.push(locale);
    }

    const regions: string[] = [];

    for (const region of Object.keys(zoneHash))
      regions.push(region);

    regions.sort();

    if (hasMisc) {
      regions[regions.length - 1] = 'MISC';
      zoneHash.MISC = zoneHash['~'];
      delete zoneHash['~'];
    }

    const regionAndSubzones: RegionAndSubzones[] = [];

    for (const region of regions) {
      const locales = zoneHash[region];

      locales.sort();
      regionAndSubzones.push({ region: region, subzones: locales });
    }

    return regionAndSubzones;
  }

  static getTimezone(name: string, longitude?: number): Timezone {
    if (!name)
      return this.OS_ZONE;

    const cached = this.zoneLookup[name];

    if (cached)
      return cached;

    let zone: Timezone;
    const matches: string[] = /LMT|OS|(?:(UT)(?:([-+])(\d\d):(\d\d))?)|(?:.+\/.+)|\w+/.exec(name);

    if (matches === null || matches.length === 0)
      throw new Error('Unrecognized format for timezone name "' + name + '"');
    else  if (matches[0] === 'LMT') {
      longitude = (!longitude ? 0 : longitude);

      zone = new Timezone({ zoneName: 'LMT', currentUtcOffset: Math.round(mod2(longitude, 360) * 4) * 60,
                             usesDst: false, dstOffset: 0, transitions: null });
    }
    else if (matches[0] === 'OS') {
      zone = this.OS_ZONE;
    }
    else if (matches.length > 1 && matches[1] === 'UT') {
      let offset = 0;

      if (matches.length === 5 && matches[3] && matches[4])
        offset = (parseInt(matches[3], 10) * 60 + parseInt(matches[4], 10)) * 60 * (matches[2] === '-' ? -1 : 1);

      zone = new Timezone({ zoneName: name, currentUtcOffset: offset,
                            usesDst: false, dstOffset: 0, transitions: null });
    }
    else if (this.encodedTimezones[name]) {
      let encodedTimezone = this.encodedTimezones[name];

      if (encodedTimezone.indexOf(';') < 0) // If no semicolon, must be a link to a duplicate timezone.
        encodedTimezone = this.encodedTimezones[encodedTimezone];

      zone = new Timezone(this.parseEncodedTimezone(name, encodedTimezone));
    }
    else {
      // Create a timezone equivalent to the OS zone, except with the requested name and an attached error condition.
      zone = new Timezone({ zoneName: name, currentUtcOffset: osProbableStdOffset, usesDst: osUsesDst,
                      dstOffset: osDstOffset, transitions: osTransitions });
      zone._error = 'Unrecognized timezone';
    }

    if (name !== 'LMT') // Don't cache LMT because of variable longitude-dependent offsets for the same name.
      this.zoneLookup[name] = zone;

    return zone;
  }

  private static parseTimeOffset(offset: string): number {
    let sign = 1;

    if (offset.startsWith('-')) {
      sign = -1;
      offset = offset.substr(1);
    }
    else if (offset.startsWith('+'))
      offset = offset.substr(1);

    if (offset === '0')
      return 0;
    else if (offset === '1')
      return 3600;
    else {
      let offsetSeconds = 60 * (60 * Number(offset.substr(0, 2)) + Number(offset.substr(2, 2)));

      if (offset.length === 6)
        offsetSeconds += Number(offset.substr(4, 2));

      return sign * offsetSeconds;
    }
  }

  private static fromBase60(x: string): number {
    let sign = 1;
    let result = 0;
    let inFractionalPart = false;
    let power = 1;

    if (x.startsWith('-')) {
      sign = -1;
      x = x.substr(1);
    }
    else if (x.startsWith('+'))
      x = x.substr(1);

    for (let i = 0; i < x.length; ++i) {
      let digit = x.charCodeAt(i);

      if (digit === 46) { // "decimal" point (sexagesimal point, in this case)
        inFractionalPart = true;
        continue;
      }
      else if (digit > 96) // a-z -> 10-35
        digit -= 87;
      else if (digit > 64) // A-X -> 36-60
        digit -= 29;
      else // 0-9
        digit -= 48;

      if (inFractionalPart) {
        power /= 60;
        result += power * digit;
      }
      else {
        result *= 60;
        result += digit;
      }
    }

    return result * sign;
  }

  private static parseEncodedTimezone(name: string, etz: string): ZoneInfo {
    let transitions: Transition[] = [];
    const sections = etz.split(';');
    let parts = sections[0].split(' ');
    const baseUtcOffset = this.parseTimeOffset(parts[0]);
    const currentUtcOffset = this.parseTimeOffset(parts[1]);
    const dstOffset = round(Number(parts[2]) * 60);
    let displayName;
    let lastStdName;
    let lastDstName;

    transitions.push({ transitionTime: Number.MIN_SAFE_INTEGER, utcOffset: baseUtcOffset, dstOffset: 0 });

    if (sections.length > 1) {
      const offsets = sections[1].split(' ');
      const utcOffsets: number[] = [];
      const dstOffsets: number[] = [];
      const names: string[] = [];

      for (let i = 0; i < offsets.length; ++i) {
        const offset = offsets[i];

        parts = offset.split('/');
        utcOffsets[i] = round(this.fromBase60(parts[0]) * 60);
        dstOffsets[i] = round(this.fromBase60(parts[1]) * 60);

        if (parts.length > 2)
          names[i] = parts[2];
        else
          names[i] = null;
      }

      transitions[0].name = names[0];

      if (sections.length > 3) {
        const offsetIndices = sections[2];
        const transitionTimes = sections[3].split(' ');
        let lastTTime = 0;

        for (let i = 0; i < offsetIndices.length; ++i) {
          const offsetIndex = this.fromBase60(offsetIndices.substr(i, 1));
          const ttime = lastTTime + round(this.fromBase60(transitionTimes[i]) * 60);

          transitions.push({ transitionTime: ttime * 1000, utcOffset: utcOffsets[offsetIndex], dstOffset: dstOffsets[offsetIndex], name: names[offsetIndex] });
          lastTTime = ttime;

          if (dstOffsets[offsetIndex] !== 0)
            lastDstName = names[offsetIndex];
          else
            lastStdName = names[offsetIndex];
        }

        if (sections.length > 4) {
          // Extend transitions table with rules-based Daylight Saving Time changes.
          lastTTime *= 1000;

          const rules = sections[4].split(',');
          const stdRule = new Rule(rules[0]);
          const dstRule = new Rule(rules[1]);
          const startYear = dateAndTimeFromMillis_SGC(lastTTime).y - 1;

          for (let year = startYear; year < LAST_DST_YEAR; ++year) {
            const stdTime = stdRule.getTransitionTime(year, currentUtcOffset, dstOffset);
            const dstTime = dstRule.getTransitionTime(year, currentUtcOffset, 0);
            const firstRule = (dstTime < stdTime ? dstRule : stdRule);
            const firstTime = (dstTime < stdTime ? dstTime : stdTime);
            const secondRule = (dstTime > stdTime ? dstRule : stdRule);
            const secondTime = (dstTime > stdTime ? dstTime : stdTime);

            if (firstTime > lastTTime + TIME_GAP_AFTER_LAST_TRANSITION && year >= firstRule.startYear)
              transitions.push({ transitionTime: firstTime, utcOffset: currentUtcOffset + firstRule.save, dstOffset: firstRule.save,
                                 name: firstRule.save ? lastDstName : lastStdName });

            if (secondTime > lastTTime + TIME_GAP_AFTER_LAST_TRANSITION && year >= secondRule.startYear)
              transitions.push({ transitionTime: secondTime, utcOffset: currentUtcOffset + secondRule.save, dstOffset: secondRule.save,
                                 name: secondRule.save ? lastDstName : lastStdName });
          }

          // Make sure last transition isn't DST
          if (transitions[transitions.length - 1].dstOffset !== 0)
            transitions.length -= 1;
        }
      }
    }

    if (transitions.length === 1) {
      displayName = transitions[0].name;
      transitions = null;
    }

    return {
      zoneName: name,
      currentUtcOffset: currentUtcOffset,
      usesDst: dstOffset !== 0,
      dstOffset: dstOffset,
      displayName: displayName,
      transitions: transitions
    };
  }

  static formatUtcOffset(offsetSeconds: number, noColons = false): string {
    if (offsetSeconds == null)
      return '?';

    let result = offsetSeconds < 0 ? '-' : '+';
    const colon = noColons ? '' : ':';

    offsetSeconds = Math.abs(offsetSeconds);

    const hours = div_tt0(offsetSeconds, 3600);
    offsetSeconds -= hours * 3600;
    const minutes = div_tt0(offsetSeconds, 60);
    offsetSeconds -= minutes * 60;

    result += padLeft(hours, 2, '0') + colon + padLeft(minutes, 2, '0');

    if (offsetSeconds !== 0)
      result += colon + padLeft(offsetSeconds, 2, '0');

    return result;
  }

  static getDstSymbol(dstOffsetSeconds: number): string {
    if (dstOffsetSeconds == null)
      return '';

    switch (dstOffsetSeconds) {
      case     0: return '';
      case  1800: return '^';
      case  3600: return '§';
      case  7200: return '#';
      default:  return (dstOffsetSeconds < 0 ? '\u2744' : '~'); // Snowflake character for negative/winter DST
    }
  }

  constructor(zoneInfo: ZoneInfo) {
    this._zoneName       = zoneInfo.zoneName;
    this._utcOffset      = zoneInfo.currentUtcOffset;
    this._usesDst        = zoneInfo.usesDst;
    this._dstOffset      = zoneInfo.dstOffset;
    this.displayName     = zoneInfo.displayName;
    this.transitions     = zoneInfo.transitions;

    if (this.transitions && this.transitions.length > 0) {
      let lastOffset = this.transitions[0].utcOffset;
      let lastBaseOffset = lastOffset;
      let lastDst = false; // The first transition should never be DST.
      let baseOffset;
      let isDst;

      for (const transition of this.transitions) {
        isDst = (transition.dstOffset !== 0);
        baseOffset = transition.utcOffset - transition.dstOffset;

        transition.deltaOffset = transition.utcOffset - lastOffset;
        transition.dstFlipped = (isDst !== lastDst);
        transition.baseOffsetChanged = (baseOffset !== lastBaseOffset);
        transition.wallTime = transition.transitionTime + transition.utcOffset * 1000;

        lastOffset = transition.utcOffset;
        lastDst = isDst;
        lastBaseOffset = baseOffset;
      }
    }
  }

  get zoneName(): string { return this._zoneName; }
  get utcOffset(): number { return this._utcOffset; }
  get usesDst(): boolean { return this._usesDst; }
  get dstOffset(): number { return this._dstOffset; }
  get error(): string { return this._error; }

  getOffset(utcTime: number): number {
    if (!this.transitions || this.transitions.length === 0)
      return this._utcOffset;
    else {
      const transition = this.findTransitionByUtc(utcTime);

      return transition.utcOffset;
    }
  }

  getDisplayName(utcTime: number): string {
    let name: string;

    if (!this.transitions || this.transitions.length === 0) {
      name = this.displayName;

      if (!name)
        name = Timezone.formatUtcOffset(this.utcOffset);
    }
    else {
      const transition = this.findTransitionByUtc(utcTime);

      name = transition.name;

      if (!name)
        name = Timezone.formatUtcOffset(transition.utcOffset);
    }

    let match = /^[+-]\d\d$/.exec(name);

    if (match)
      name = match[0] + ':00';
    else {
      match = /^([+-]\d\d)(\d\d)$/.exec(name);

      if (match)
        name = match[1] + ':' + match[2];
      else {
        match = /^([+-]\d\d)(\d\d)(\d\d)$/.exec(name);

        if (match)
          name = match[1] + ':' + match[2] + ':' + match[3];
      }
    }

    return name;
  }

  getOffsetForWallTime(wallTime: number): number {
    if (!this.transitions || this.transitions.length === 0)
      return this._utcOffset;
    else {
      const transition = this.findTransitionByWallTime(wallTime);

      return transition.utcOffset;
    }
  }

  getFormattedOffset(utcTime: number, noColons = false): string {
    return Timezone.formatUtcOffset(this.getOffset(utcTime), noColons);
  }

  getOffsets(utcTime: number): number[] {
    if (!this.transitions || this.transitions.length === 0)
      return [this._utcOffset, this._dstOffset];
    else {
      const transition = this.findTransitionByUtc(utcTime);

      return [transition.utcOffset, transition.dstOffset];
    }
  }

  isDuringDst(utcTime: number): boolean {
    if (!this.transitions || this.transitions.length === 0)
      return false;
    else {
      const transition = this.findTransitionByUtc(utcTime);

      return (transition.dstOffset !== 0);
    }
  }

  findTransitionByUtc(utcTime: number): Transition | null {
    if (!this.transitions || this.transitions.length === 0)
      return null;

    for (let i = 0; i < this.transitions.length - 1; ++i) {
      if (this.transitions[i].transitionTime <= utcTime && utcTime < this.transitions[i + 1].transitionTime)
        return this.transitions[i];
    }

    return last(this.transitions);
  }

  findTransitionByWallTime(wallTime: number): Transition | null {
    if (!this.transitions || this.transitions.length === 0)
      return null;

    for (let i = 0; i < this.transitions.length - 1; ++i) {
      if (this.transitions[i].wallTime <= wallTime && wallTime < this.transitions[i + 1].wallTime)
        return this.transitions[i];
    }

    return last(this.transitions);
  }
}
