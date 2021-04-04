import { abs, div_tt0, floor, min, mod2, round } from '@tubular/math';
import { clone, compareStrings, isEqual, last, padLeft, toNumber } from '@tubular/util';
import { getDateFromDayNumber_SGC, getDateOfNthWeekdayOfMonth_SGC, getDayOnOrAfter_SGC, LAST } from './calendar';
import { dateAndTimeFromMillis_SGC, DAY_MSEC, getDateValue, millisFromDateTime_SGC, MINUTE_MSEC, parseTimeOffset } from './common';
import { hasIntlDateTime } from './locale-data';
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;
import { updateDeltaTs } from './ut-converter';

export interface OffsetsAndZones {
  offset: string;
  offsetSeconds: number;
  dstOffset: number;
  zones: string[];
}

export interface RegionAndSubzones {
  region: string;
  subzones: string[];
}

export interface Transition {
  transitionTime: number; // in milliseconds
  utcOffset: number; // in seconds
  dstOffset: number; // in seconds
  name?: string;
  deltaOffset?: number; // in seconds, compared to previous transition utcOffset
  dstFlipped?: boolean; // true if dstOffset has changed 0 to non-0, or non-0 to 0, from previous transition
  baseOffsetChanged?: boolean;
  wallTime?: number; // in milliseconds
  wallTimeDay?: number;
}

export interface ZoneInfo {
  zoneName: string;
  currentUtcOffset: number; // in seconds
  usesDst: boolean;
  dstOffset: number; // in seconds
  displayName?: string;
  transitions: Transition[] | null;
  population?: number;
  countries?: Set<string>;
  aliasFor?: string;
}

export interface ShortZoneNameInfo {
  utcOffset: number;
  dstOffset: number;
  ianaName: string;
}

const CLOCK_TYPE_WALL = 0;
const CLOCK_TYPE_STD = 1;
// noinspection JSUnusedLocalSymbols
const CLOCK_TYPE_UTC = 2; // eslint-disable-line @typescript-eslint/no-unused-vars

const LAST_DST_YEAR = 2500;
const TIME_GAP_AFTER_LAST_TRANSITION = 172800000; // Two days

const extendedRegions = /^(America\/Argentina|America\/Indiana)\/(.+)$/;
const miscUnique = /^(CST6CDT|EET|EST5EDT|MST7MDT|PST8PDT|SystemV\/AST4ADT|SystemV\/CST6CDT|SystemV\/EST5EDT|SystemV\/MST7MDT|SystemV\/PST8PDT|SystemV\/YST9YDT|WET)$/;
const nonZones = new Set(['deltaTs', 'leapSeconds', 'version', 'years']);

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

export interface LeapSecondInfo {
  utcMillis: number;
  taiMillis: number;
  deltaTai: number;
  isNegative: boolean;
  inLeap?: boolean;
  inNegativeLeap?: boolean;
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

    if (osProbableStdOffset === undefined && sampleTime >= aBitLater)
      osProbableStdOffset = osProbableDstOffset = currentOffset;

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
        if (index > 0 && transition.utcOffset === osProbableDstOffset && osTransitions[index - 1]?.utcOffset === osProbableStdOffset)
          transition.dstOffset = osProbableDstOffset - osProbableStdOffset;
      });

      // Make sure last transition is to standard time.
      if (last(osTransitions).dstOffset !== 0)
        osTransitions.pop();
    }
  }
})();

export class Timezone {
  private static encodedTimezones: Record<string, string> = {};
  private static shortZoneNames: Record<string, ShortZoneNameInfo> = {};
  private static zonesByOffsetAndDst: Record<string, Set<string>> = {};
  private static countriesForZone: Record<string, Set<string>> = {};
  private static zonesForCountry: Record<string, Set<string>> = {};
  private static populationForZone: Record<string, number> = {};
  private static leapSeconds: LeapSecondInfo[] = [];
  private static _version: string = 'unspecified';

  static get version(): string { return this._version; }

  static OS_ZONE = new Timezone({ zoneName: 'OS', currentUtcOffset: osProbableStdOffset, usesDst: osUsesDst,
                            dstOffset: osDstOffset, transitions: osTransitions });

  static UT_ZONE = new Timezone({ zoneName: 'UT', currentUtcOffset: 0, usesDst: false,
                            dstOffset: 0, transitions: null });

  static TAI_ZONE = new Timezone({ zoneName: 'TAI', currentUtcOffset: 0, usesDst: false,
                            dstOffset: 0, transitions: null });

  static ZONELESS = new Timezone({ zoneName: 'ZONELESS', currentUtcOffset: 0, usesDst: false,
                            dstOffset: 0, transitions: null });

  static DATELESS = new Timezone({ zoneName: 'DATELESS', currentUtcOffset: 0, usesDst: false,
                            dstOffset: 0, transitions: null });

  private static offsetsAndZones: OffsetsAndZones[];
  private static regionAndSubzones: RegionAndSubzones[];
  private static zoneLookup: Record<string, Timezone> = {};

  private readonly _zoneName: string;
  private readonly _utcOffset: number;
  private readonly _usesDst: boolean;
  private readonly _dstOffset: number;
  private readonly displayName: string;
  private readonly transitions: Transition[] | null;

  private readonly _aliasFor: string;
  private readonly _countries = new Set<string>();
  private readonly _population: number;

  private _error: string;

  static defineTimezones(encodedTimezones: Record<string, string>): boolean {
    const changed = !isEqual(this.encodedTimezones, encodedTimezones);

    if (encodedTimezones.version)
      this._version = encodedTimezones.version;
    else
      this._version = 'unspecified';

    this.encodedTimezones = Object.assign({}, encodedTimezones ?? {});
    this.extractZoneInfo();
    this.extractDeltaTs();
    this.extractLeapSeconds();

    if (changed) {
      this.offsetsAndZones = undefined;
      this.regionAndSubzones = undefined;
      this.zoneLookup = {};
    }

    return changed;
  }

  static getAvailableTimezones(): string[] {
    const zones: string[] = [];

    for (const zone of Object.keys(this.encodedTimezones))
      zones.push(zone);

    zones.sort();

    return zones;
  }

  static getOffsetsAndZones(): OffsetsAndZones[] {
    if (this.offsetsAndZones)
      return this.offsetsAndZones;

    const zoneHash: Record<string, string[]> = {};

    for (const zone of Object.keys(this.encodedTimezones)) {
      if (!zone.includes('/') || zone.startsWith('Etc/') || miscUnique.test(zone))
        continue;

      let etz = this.encodedTimezones[zone];

      if (!etz.includes(';')) {
        const $ = /^!([^,]*)$/.exec(etz) || /^(?:.*,)?(.*)$/.exec(etz);

        etz = this.encodedTimezones[$[1]] ?? '';
      }

      const sections = etz.split(/[ ;]/);

      if (sections.length < 3)
        continue;

      const offset = sections[1].split(/([-+]?\d\d)/g).filter(s => !!s).join(':') +
        this.getDstSymbol(toNumber(sections[2]) * 60);

      let zones = zoneHash[offset];

      if (!zones) {
        zones = [];
        zoneHash[offset] = zones;
      }

      zones.push(zone.replace(/_/g, ' '));
    }

    const offsets: string[] = [];
    const toNum = (s: string): number => toNumber(s.replace(/[^-+\d]/g, ''));

    for (const offset of Object.keys(zoneHash))
      offsets.push(offset);

    offsets.sort((a, b) => toNum(a) - toNum(b));

    this.offsetsAndZones = [];

    for (const offset of offsets) {
      const zones = zoneHash[offset];

      zones.sort();
      // noinspection NonAsciiCharacters
      this.offsetsAndZones.push({
        offset,
        offsetSeconds: parseTimeOffset(offset.replace(/[^-+\d]/g, '')),
        dstOffset: { '^': 1800, '§': 3600, '#': 7200, '\u2744': -3600, '~': 999 }[offset.substr(offset.length - 1)] || 0,
        zones });
    }

    return this.offsetsAndZones;
  }

  static getRegionsAndSubzones(): RegionAndSubzones[] {
    if (this.regionAndSubzones)
      return this.regionAndSubzones;

    let hasMisc = false;
    const zoneHash: Record<string, string[]> = {};

    for (const zone of Object.keys(this.encodedTimezones)) {
      let region: string;
      let locale: string;
      const $ = extendedRegions.exec(zone) ?? /^(.+?)\/(.+)$/.exec(zone);

      if (!$) {
        region = zone;
        locale = null;
      }
      else {
        region = $[1];
        locale = $[2].replace(/_/g, ' ');
      }

      if (locale == null || miscUnique.test(zone)) {
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

    this.regionAndSubzones = [];

    for (const region of regions) {
      const locales = zoneHash[region];

      locales.sort();
      this.regionAndSubzones.push({ region, subzones: locales });
    }

    return this.regionAndSubzones;
  }

  private static _guess: string;

  static guess(recheck = false, testCountry?: string, testZone?: string): string {
    if (!this._guess || recheck) {
      if (hasIntlDateTime && !testCountry && !testZone)
        this._guess = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'OS';
      else {
        let country = testCountry;

        if (!country) {
          try {
            if (typeof process !== 'undefined')
              country = (process.env?.LANG ?? process.env?.LC_CTYPE ?? '').split(/[-._]/)[1]?.toUpperCase();
          }
          catch {}
        }

        if (!country) {
          try {
            if (typeof navigator !== 'undefined')
              country = (navigator.language ?? '').split(/[-._]/)[1]?.toUpperCase();
          }
          catch {}
        }

        const osZone = testZone ? Timezone.from(testZone) : this.OS_ZONE;
        const zoneKey = this.formatUtcOffset(osZone.utcOffset, true) + ';' + floor(osZone.dstOffset / 60);
        const candidateZones = Array.from(this.zonesByOffsetAndDst[zoneKey] ?? [])
          .filter(zone => !country || this.doesZoneMatchCountry(zone, country))
          .map(zone => ({ zone, rating: osZone.matchRating(Timezone.from(zone)), pop: this.populationForZone[zone] }))
          .sort((a, b) => b.rating !== a.rating ? b.rating - a.rating : b.pop - a.pop);

        this._guess = candidateZones[0]?.zone ?? 'OS';
      }
    }

    return this._guess;
  }

  static has(name: string): boolean {
    return !!this.zoneLookup[name] || !!this.encodedTimezones[name] || /^(GMT|OS|UTC?|ZONELESS|DATELESS|TAI)$/.test(name);
  }

  static from(name: string): Timezone {
    return Timezone.getTimezone(name);
  }

  static getTimezone(name?: string, longitude?: number): Timezone {
    if (!name)
      return this.OS_ZONE;
    else if (name.toUpperCase() === 'TAI')
      return this.TAI_ZONE;

    const cached = this.zoneLookup[name];

    if (cached)
      return cached;

    let zone: Timezone;
    const $: string[] = /LMT|OS|(?:(GMT|UTC?)?([-+]\d\d(\d{4}|\d\d|:\d\d(:\d\d)?))?)|(?:.+\/.+)|\w+/.exec(name);

    if ($ === null || $.length === 0)
      throw new Error('Unrecognized format for timezone name "' + name + '"');
    else  if ($[0] === 'LMT') {
      longitude = (!longitude ? 0 : longitude);

      zone = new Timezone({ zoneName: 'LMT', currentUtcOffset: Math.round(mod2(longitude, 360) * 4) * 60,
                             usesDst: false, dstOffset: 0, transitions: null });
    }
    else if ($[0] === 'OS')
      zone = this.OS_ZONE;
    else if ($.length > 1 && (/GMT|UTC?/.test($[1]) || $[2])) {
      let offset = 0;

      if (!$[1])
        name = 'UT' + name;

      if ($[2])
        offset = parseTimeOffset($[2]);

      zone = new Timezone({ zoneName: name, currentUtcOffset: offset,
                            usesDst: false, dstOffset: 0, transitions: null });
    }
    else if (this.encodedTimezones[name]) {
      let encodedTimezone = this.encodedTimezones[name];
      let aliasFor: string = null;
      let popAndC: string = null;

      if (!encodedTimezone.includes(';')) { // If no semicolon, must be a link to a (close) duplicate timezone.
        const $ = /^!(.*,)?(.*)$/.exec(encodedTimezone);

        // Not an alias timezone, just similar, with possibly different population and country info?
        if ($) {
          popAndC = $[1];
          encodedTimezone = $[2];
        }
        else
          aliasFor = encodedTimezone;

        encodedTimezone = this.encodedTimezones[encodedTimezone];
      }

      zone = new Timezone(this.parseEncodedTimezone(name, encodedTimezone, aliasFor, popAndC));
    }
    else {
      // Create a timezone equivalent to the OS zone, except with the requested name and an attached error condition.
      zone = new Timezone({ zoneName: name, currentUtcOffset: osProbableStdOffset, usesDst: osUsesDst,
                      dstOffset: osDstOffset, transitions: osTransitions });
      zone._error = 'Unrecognized timezone';
    }

    if (name !== 'LMT' && !zone._error) // Don't cache LMT because of variable longitude-dependent offsets for the same name.
      this.zoneLookup[name] = zone;

    return zone;
  }

  static hasShortName(name: string): boolean {
    return !!this.shortZoneNames[name];
  }

  static getShortZoneNameInfo(shortName: string): ShortZoneNameInfo {
    return clone(this.shortZoneNames[shortName]);
  }

  static getPopulation(zoneName: string): number {
    return this.populationForZone[zoneName] ?? 0;
  }

  static getCountries(zoneName: string): Set<string> {
    return new Set(this.countriesForZone[zoneName] ?? []);
  }

  static doesZoneMatchCountry(zoneName: string, country: string): boolean {
    return this.getCountries(zoneName).has(country.toUpperCase());
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

  private static extractTimezoneTransitionsFromIntl(zone: string, endYear: number): Transition[] {
    const transitions: Transition[] = [];
    const timeOptions = { timeZone: zone, hourCycle: 'h23',
                          year: 'numeric', month: 'numeric', day: 'numeric',
                          hour: 'numeric', minute: 'numeric', second: 'numeric' } as DateTimeFormatOptions;
    const zoneDTF = new Intl.DateTimeFormat('en', timeOptions);
    let lastSampleTime = millisFromDateTime_SGC(1901, 1, 1, 0, 0, 0, 0);
    let hour: number;

    do {
      lastSampleTime += 3600000;
      hour = getDateValue(zoneDTF, lastSampleTime, 'hour');
    } while (hour !== 0 && hour !== 1);

    lastSampleTime += 43200000;

    const getUtcOffset = (millis: number): number => {
      const fields = zoneDTF.formatToParts(millis);
      return floor((millisFromDateTime_SGC(
        getDateValue(fields, 'year'), getDateValue(fields, 'month'), getDateValue(fields, 'day'),
        getDateValue(fields, 'hour'), getDateValue(fields, 'minute'), getDateValue(fields, 'second')) - millis) / 1000);
    };

    const MONTH_MSEC = 30 * DAY_MSEC;
    const aBitLater = lastSampleTime + MONTH_MSEC * 12 * 2;
    const muchLater = millisFromDateTime_SGC(endYear + 1, 1, 1, 0, 0, 0, 0);
    let lastOffset = getUtcOffset(lastSampleTime);
    let probableStdOffset: number;
    let probableDstOffset: number;

    while (lastSampleTime < muchLater) {
      const sampleTime = lastSampleTime + MONTH_MSEC;
      const currentOffset = getUtcOffset(sampleTime);

      if (probableStdOffset === undefined && sampleTime >= aBitLater)
        probableStdOffset = probableDstOffset = currentOffset;

      if (currentOffset !== lastOffset) {
        if (sampleTime >= aBitLater) {
          probableStdOffset = Math.min(probableStdOffset, currentOffset);
          probableDstOffset = Math.max(probableDstOffset, currentOffset);
        }

        let low = lastSampleTime;
        let high = sampleTime;

        while (high - low > MINUTE_MSEC) {
          const mid = Math.floor((high + low) / 2 / MINUTE_MSEC) * MINUTE_MSEC;
          const sampleOffset = getUtcOffset(mid);

          if (sampleOffset === lastOffset)
            low = mid;
          else
            high = mid;
        }

        transitions.push({ transitionTime: high, utcOffset: currentOffset, dstOffset: 0 });
        lastOffset = currentOffset;
      }

      lastSampleTime = sampleTime;
    }

    if (transitions.length < 2 || probableDstOffset <= probableStdOffset)
      return [];

    // If the timezone isn't historical, but instead projects DST rules indefinitely backward in time, we might have accidentally
    // captured a DST offset for the first transition, something that will wrongly make DST look like the starting base UTC offset.
    if (transitions[0].utcOffset === probableDstOffset && transitions[1].utcOffset === probableStdOffset) {
      transitions.splice(0, 1);
      transitions[0].transitionTime = Number.MIN_SAFE_INTEGER;
    }

    transitions.forEach((transition: Transition, index: number) => {
      if (transition.utcOffset === probableDstOffset && transitions[index - 1]?.utcOffset === probableStdOffset)
        transition.dstOffset = probableDstOffset - probableStdOffset;
    });

    return transitions;
  }

  private static applyTransitionRules(transitions: Transition[], startYear: number, endYear: number,
                                      currentUtcOffset: number, stdRule: Rule, dstRule: Rule, lastTTime: number,
                                      dstOffset: number, dstName: string, stdName: string, backfill = false): void {
    for (let year = startYear; year < endYear; ++year) {
      const stdTime = stdRule.getTransitionTime(year, currentUtcOffset, dstOffset);
      const dstTime = dstRule.getTransitionTime(year, currentUtcOffset, 0);
      const firstRule = (dstTime < stdTime ? dstRule : stdRule);
      const firstTime = (dstTime < stdTime ? dstTime : stdTime);
      const secondRule = (dstTime > stdTime ? dstRule : stdRule);
      const secondTime = (dstTime > stdTime ? dstTime : stdTime);

      if (firstTime > lastTTime + TIME_GAP_AFTER_LAST_TRANSITION && (backfill || year >= firstRule.startYear))
        transitions.push({ transitionTime: firstTime, utcOffset: currentUtcOffset + firstRule.save, dstOffset: firstRule.save,
                           name: firstRule.save ? dstName : stdName });

      if (secondTime > lastTTime + TIME_GAP_AFTER_LAST_TRANSITION && (backfill || year >= secondRule.startYear))
        transitions.push({ transitionTime: secondTime, utcOffset: currentUtcOffset + secondRule.save, dstOffset: secondRule.save,
                           name: secondRule.save ? dstName : stdName });
    }
  }

  private static countriesStringToSet(s: string): Set<string> {
    return s.includes(' ') ?
      new Set(s.split(/\s+/)) :
      new Set(s.split(/(\w\w)/).filter(s => !!s));
  }

  private static parseEncodedTimezone(name: string, etz: string, aliasFor?: string, popAndC?: string): ZoneInfo {
    let transitions: Transition[] = [];
    const sections = etz.split(';');
    let parts = sections[0].split(' ');
    const baseUtcOffset = this.parseTimeOffset(parts[0]);
    const currentUtcOffset = this.parseTimeOffset(parts[1]);
    const dstOffset = round(Number(parts[2]) * 60);
    let displayName;
    let lastStdName;
    let lastDstName;
    let firstTTime = Number.MIN_SAFE_INTEGER;
    let population = 0;
    let countries = '';

    transitions.push({ transitionTime: Number.MIN_SAFE_INTEGER, utcOffset: baseUtcOffset, dstOffset: 0 });

    if (sections.length > 5) {
      if (!popAndC)
        popAndC = sections[5] + ',' + (sections[6] ?? '');

      sections.length = 5;

      while (!last(sections))
        --sections.length;
    }

    if (popAndC) {
      const parts = popAndC.split(',');

      population = toNumber(parts[0]);
      countries = parts[1] ?? '';
    }

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

          if (i === 0)
            firstTTime = ttime;

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

          this.applyTransitionRules(transitions, startYear, LAST_DST_YEAR, currentUtcOffset, stdRule, dstRule,
            lastTTime, dstOffset, lastDstName, lastStdName);

          // Make sure last transition isn't DST
          if (transitions[transitions.length - 1].dstOffset !== 0)
            transitions.length -= 1;

          const firstExplicitTransitionYear = dateAndTimeFromMillis_SGC(firstTTime * 1000).y;

          // Backfill transitions table with Intl-extracted transitions or rules-based Daylight Saving Time changes.
          if (firstExplicitTransitionYear > 2000 && transitions.length > 1) {
            const insertTransitions: Transition[] = this.extractTimezoneTransitionsFromIntl(name, firstExplicitTransitionYear);
            let fromRules = false;

            if (insertTransitions.length === 0 && currentUtcOffset === baseUtcOffset) {
              fromRules = true;
              this.applyTransitionRules(insertTransitions, 1925, firstExplicitTransitionYear + 1, currentUtcOffset,
                stdRule, dstRule, Number.MIN_SAFE_INTEGER + 1, dstOffset, lastDstName, lastStdName, true);
            }

            if (insertTransitions.length > 0) {
              // Make sure first added transition isn't to standard time.
              if (fromRules && insertTransitions.length > 1 && insertTransitions[0].dstOffset === 0 &&
                  insertTransitions[0].dstOffset !== 0)
                insertTransitions.splice(0, 1);

              // Make sure first added transition IS to standard time, and doesn't overlap already-created transitions.
              while (insertTransitions.length > 0 && last(insertTransitions).dstOffset !== 0 ||
                     last(insertTransitions).transitionTime >= transitions[1].transitionTime)
                insertTransitions.splice(insertTransitions.length - 1, 1);

              if (insertTransitions[0].transitionTime === transitions[0].transitionTime)
                insertTransitions.splice(0, 1);

              transitions.splice(1, 0, ...insertTransitions);
            }
          }
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
      transitions: transitions,
      population,
      countries: this.countriesStringToSet(countries),
      aliasFor
    };
  }

  private static extractZoneInfo(): void {
    this.shortZoneNames = {};
    this.zonesByOffsetAndDst = {};
    this.countriesForZone = {};
    this.zonesForCountry = {};
    this.populationForZone = {};

    const preferredZones = new Set([
      'Australia/ACT', 'Australia/Adelaide', 'Asia/Tokyo', 'Asia/Hong_Kong',
      'Asia/Jakarta', 'Asia/Novosibirsk', 'Asia/Calcutta', 'Asia/Karachi', 'Europe/Moscow',
      'Africa/Cairo', 'Europe/Paris', 'Europe/London', 'Atlantic/Azores', 'America/Scoresbysund',
      'America/Godthab', 'America/St_Johns', 'America/Halifax', 'America/New_York', 'America/Chicago',
      'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Adak',
      'Pacific/Apia'
    ]);
    const sortKey = (key: string): string => preferredZones.has(key) ? '!' + key : key;
    const keys = Object.keys(this.encodedTimezones)
      .filter(key => !nonZones.has(key) && !key.startsWith('_'))
      .sort((a, b) => compareStrings(sortKey(a), sortKey(b)));

    keys.forEach(ianaName => {
      let etz = this.encodedTimezones[ianaName];
      let popAndC: string;

      if (!etz.includes(';')) {
        const $ = /^!(.*,)?(.*)$/.exec(etz);

        if ($) {
          popAndC = $[1];
          etz = this.encodedTimezones[$[2]];
        }
        else
          return; // Simple alias, do not process
      }

      const sections = etz.split(';');
      let parts = sections[0].split(' ');
      const currentUtcOffset = this.parseTimeOffset(parts[1]);
      const currentDstOffset = round(Number(parts[2]) * 60);

      if (sections.length > 1) {
        const baseOffset = sections[0].split(' ');
        const offsetKey = (baseOffset.length > 2 ? baseOffset[1] + ';' + baseOffset[2] : null);
        const offsets = sections[1].split(' ');

        for (let i = 0; i < offsets.length; ++i) {
          const offset = offsets[i];

          parts = offset.split('/');

          if (parts.length > 2) {
            const name = parts[2];
            const info = this.shortZoneNames[name];
            const utcOffset = round(this.fromBase60(parts[0]) * 60);
            const dstOffset = round(this.fromBase60(parts[1]) * 60);

            if ((!info || ianaName.startsWith('America/') && !info.ianaName.startsWith('America/')) &&
                utcOffset - dstOffset === currentUtcOffset &&
                (!dstOffset || (dstOffset && dstOffset === currentDstOffset))) {
              this.shortZoneNames[name] = { utcOffset, dstOffset, ianaName };
            }
          }

          if (!popAndC && sections.length > 5)
            popAndC = sections[5] + ',' + (sections[6] ?? '');

          if (offsetKey) {
            let zones = this.zonesByOffsetAndDst[offsetKey];

            if (!zones)
              this.zonesByOffsetAndDst[offsetKey] = zones = new Set();

            zones.add(ianaName);
          }

          if (popAndC) {
            const parts = popAndC.split(',');
            const countries = this.countriesStringToSet(parts[1] ?? '');

            if (countries.size > 0)
              this.countriesForZone[ianaName] = countries;

            this.populationForZone[ianaName] = toNumber(parts[0]);
            countries.forEach(country => {
              let zones = this.zonesForCountry[country];

              if (!zones)
                this.zonesForCountry[country] = zones = new Set();

              zones.add(ianaName);
            });
          }
        }
      }
    });
  }

  private static extractDeltaTs(): void {
    const deltaTs = this.encodedTimezones?.deltaTs;

    if (deltaTs)
      updateDeltaTs(deltaTs.split(/\s+/).map(dt => toNumber(dt)));
    else
      updateDeltaTs();
  }

  private static extractLeapSeconds(): void {
    this.leapSeconds = [];

    const leaps = this.encodedTimezones?.leapSeconds;

    if (!leaps)
      return;

    let deltaTai = 0;

    this.leapSeconds.push({
      utcMillis: Number.MIN_SAFE_INTEGER,
      taiMillis: Number.MIN_SAFE_INTEGER + 10000,
      deltaTai: 0,
      isNegative: false
    });

    // Proleptic extension of leap seconds back to 1958, per Tony Finch, https://fanf.livejournal.com/69586.html.
    const leapSecondDays = [-3837, -3106, -2376, -1826, -1280, -915, -549, -184, 181, 546];

    leapSecondDays.push(...leaps.split(/\s+/).map(day => toNumber(day)));

    leapSecondDays.forEach((day, index) => {
      deltaTai += (index > 9 && day < 0 ? -1 : 1);

      const utcMillis = (index < 10 ? day : abs(day)) * DAY_MSEC;

      this.leapSeconds.push({
        utcMillis,
        taiMillis: utcMillis + deltaTai * 1000,
        deltaTai,
        isNegative: index > 9 && day < 0
      });
    });
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
      default: return (dstOffsetSeconds < 0 ? '\u2744' : '~'); // Snowflake character for negative/winter DST
    }
  }

  constructor(zoneInfo: ZoneInfo) {
    this._zoneName   = zoneInfo.zoneName;
    this._utcOffset  = zoneInfo.currentUtcOffset;
    this._usesDst    = zoneInfo.usesDst;
    this._dstOffset  = zoneInfo.dstOffset;
    this.displayName = zoneInfo.displayName;
    this.transitions = clone(zoneInfo.transitions);
    this._aliasFor = zoneInfo.aliasFor;
    this._population = zoneInfo.population ?? 0;
    this._countries = zoneInfo.countries ?? new Set();

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
        transition.wallTimeDay = getDateFromDayNumber_SGC(floor(transition.wallTime / 86400000)).d;
        Object.freeze(transition);

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
  get error(): string | undefined { return this._error; }
  get aliasFor(): string | undefined { return this._aliasFor; }
  get countries(): Set<string> { return new Set(this._countries); }
  get population(): number { return this._population; }

  getOffset(utcTime: number, day = 0): number {
    if (!this.transitions || this.transitions.length === 0)
      return this._utcOffset;
    else {
      let transition = this.findTransitionByUtc(utcTime);

      if (day !== 0 && transition.wallTimeDay !== day)
        transition = this.findTransitionByUtc(utcTime - 1);

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

  supportsCountry(country: string): boolean {
    return this._countries.has(country.toUpperCase());
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

  static findDeltaTaiFromUtc(utcTime: number): LeapSecondInfo {
    if (!this.leapSeconds || this.leapSeconds.length === 0)
      return null;

    for (let i = this.leapSeconds.length - 1; i >= 0; --i) {
      let leapInfo = this.leapSeconds[i];
      const next = this.leapSeconds[i + 1];

      if (utcTime >= leapInfo.utcMillis) {
        leapInfo = clone(leapInfo);
        leapInfo.inLeap = (next && !next.isNegative && utcTime >= next.utcMillis - 1000);
        leapInfo.inNegativeLeap = (next && next.isNegative && utcTime >= next.utcMillis - 1000);

        return leapInfo;
      }
    }

    return Object.assign({ inLeap: false }, this.leapSeconds[0]);
  }

  static findDeltaTaiFromTai(taiTime: number): LeapSecondInfo {
    if (!this.leapSeconds || this.leapSeconds.length === 0)
      return null;

    for (let i = this.leapSeconds.length - 1; i >= 0; --i) {
      let leapInfo = this.leapSeconds[i];
      const next = this.leapSeconds[i + 1];

      if (taiTime >= leapInfo.taiMillis) {
        leapInfo = clone(leapInfo);
        leapInfo.inLeap = (next && !next.isNegative && taiTime >= next.taiMillis - 1000);

        return leapInfo;
      }
    }

    return Object.assign({ inLeap: false }, this.leapSeconds[0]);
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

  private matchRating(other: Timezone): number {
    if (other === this)
      return Number.MAX_SAFE_INTEGER;
    else if (other.utcOffset !== this.utcOffset || other.dstOffset !== this.dstOffset)
      return 0;
    else if ((this.transitions == null && other.transitions == null) ||
             (this.transitions.length < 25 && isEqual(this.transitions, other.transitions)))
      return Number.MAX_SAFE_INTEGER;

    let thisIndex = this.transitions.length - 1;
    let otherIndex = other.transitions.length - 1;

    while (this.transitions[thisIndex].transitionTime > other.transitions[otherIndex].transitionTime) --thisIndex;
    while (other.transitions[otherIndex].transitionTime > this.transitions[thisIndex].transitionTime) --otherIndex;

    for (let i = 0; i < thisIndex && i < otherIndex; ++i) {
      const tt = this.transitions[thisIndex - 1];
      const to = other.transitions[otherIndex - 1];

      if (tt.transitionTime !== to.transitionTime ||
          tt.utcOffset !== to.utcOffset ||
          tt.dstOffset !== to.dstOffset ||
          tt.baseOffsetChanged !== to.baseOffsetChanged)
        return i;
    }

    return thisIndex === otherIndex ? Number.MAX_SAFE_INTEGER : min(thisIndex, otherIndex);
  }
}
