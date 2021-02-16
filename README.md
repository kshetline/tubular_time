# @tubular/time

Not all days are 24 hours. Some are 23 hours, or 25, or even 23.5 or 24.5 or 47 hours. How about a Thursday followed directly by a Saturday, giving Friday the slip? Or a September only 19 days long? This is a date/time library that handles both the day-to-day situations (so to speak) and the weird ones too.

## Key features<!-- omit in toc -->

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond simply parsing and formatting using timezones, including an accessible listing of all available timezones and live updates of timezone definitions.
* Handles Local Mean Time, derived from longitude, to a resolution of one (time) minute.
* Supports and recognizes negative Daylight Saving Time.
* Many features available using a familiar Moment.js-style API.
* Extensive date/time manipulation and calculation capabilities.
* Astronomical time functions.
* Internationalization via JavaScript’s `Intl` Internationalization API, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Suitable for tree shaking and Angular optimization.
* Full TypeScript typing support.

<img src="https://shetline.com/readme/tubular-time/2.4.0/montage.jpg" alt="October 1582">

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, <https://skyviewcafe.com>, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone data that reaches roughly five years into the past and five years into the future, expanded into the past and future using Daylight Saving Time rules and/or values extracted from `Intl.DateTimeFormat`. Unlike the `Intl` API, the full list of available timezones is exposed, allowing the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. These definitions can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

- [Installation](#installation)
  - [Via npm](#via-npm)
  - [Via `<script>` tag](#via-script-tag)
- [Basic usage](#basic-usage)
  - [Creating immutable `DateTime` instances with `ttime()`](#creating-immutable-datetime-instances-with-ttime)
- [Formatting output](#formatting-output)
- [Format string tokens](#format-string-tokens)
- [Moment.js-style localized formats](#momentjs-style-localized-formats)
- [@tubular/time `Intl.DateTimeFormat` shorthand string formats](#tubulartime-intldatetimeformat-shorthand-string-formats)
- [Pre-defined formats](#pre-defined-formats)
  - [Examples](#examples)
- [Parsing with a format string, optional locale, with formatted output](#parsing-with-a-format-string-optional-locale-with-formatted-output)
- [Converting timezones](#converting-timezones)
- [Converting locales](#converting-locales)
- [Defining and updating timezones](#defining-and-updating-timezones)
  - [Live timezone updates](#live-timezone-updates)
- [The `YMDDate` and `DateAndTime` objects](#the-ymddate-and-dateandtime-objects)
- [Reading individual `DateTime` fields](#reading-individual-datetime-fields)
- [Modifying `DateTime` values](#modifying-datetime-values)
  - [Using `add` (and `subtract`)](#using-add-and-subtract)
  - [Using `roll()`](#using-roll)
  - [Using `set()`](#using-set)
  - [Using `startOf()` and `endOf()`](#using-startof-and-endof)
- [Time value](#time-value)
- [Timezone offsets from UTC](#timezone-offsets-from-utc)
- [Validation](#validation)
- [Comparison and sorting](#comparison-and-sorting)
  - [Sorting an array of dates](#sorting-an-array-of-dates)
  - [min/max functions](#minmax-functions)
- [Monthly calendar generation](#monthly-calendar-generation)
- [Dealing with weird months](#dealing-with-weird-months)
  - [Another way to drop a day](#another-way-to-drop-a-day)
- [Dealing with weird days](#dealing-with-weird-days)
  - [Typical Daylight Saving Time examples](#typical-daylight-saving-time-examples)
  - [Examples of big UTC shifts due to moving the International Dateline](#examples-of-big-utc-shifts-due-to-moving-the-international-dateline)
- [Global default settings](#global-default-settings)
- [The `DateTime` class](#the-datetime-class)
  - [Constructor](#constructor)
  - [Locking and cloning](#locking-and-cloning)
  - [`DateTime` astronomical time functions](#datetime-astronomical-time-functions)
  - [Other `DateTime` constants, methods, getters/setters](#other-datetime-constants-methods-getterssetters)
    - [Static constant](#static-constant)
    - [Static methods](#static-methods)
    - [Getters](#getters)
    - [Getter/setters](#gettersetters)
  - [Other `DateTime` methods](#other-datetime-methods)

## Installation

### Via npm

`npm install @tubular/time`

`import { ttime, DateTime, Timezone`...`} from '@tubular/time';`

...or...

`const { ttime, DateTime, Timezone`...`} = require('@tubular/time');`

Documentation examples will assume **@tubular/time** has been imported as above.

### Via `<script>` tag

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```

The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The package will be available via the global variable `tbTime`. `tbTime.ttime` is the default function, and other functions, classes, and constants will also be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, `tbTime.TIME_MS`, etc.

## Basic usage

While there are a wide range of functions and classes available from **@tubular/time**, the workhorse is the `ttime()` function, which produces immutable instances of the `DateTime` class.

`function ttime(initialTime?: number | string | DateAndTime | Date | number[] | null, format?: string, locale?: string | string[]): DateTime`

### Creating immutable `DateTime` instances with `ttime()`

`DateTime` instances can be created in many ways. The simplest way is to create a current-time instance, done by passing no arguments at all. Dates and times can also be expressed as strings, objects, and arrays of numbers.

|  |  | .toString() |
|---|---|---|
| `ttime()` | Current time | `DateTime<2021‑01‑28T03:29:12.040 ‑05:00>` |
| `ttime('1969‑07‑12T20:17')`<br>`ttime('1969‑07‑12T20:17Z')`<br>`ttime('20210704T0945-03')`<br>`ttime('2021‑W04‑4')` | DateTime from an ISO-8601 date/time string.<br>The trailing `Z` causes the time to be parsed as UTC. Without it, your default timezone is assumed. | `DateTime<1969‑07‑12T20:17:00.000 ‑04:00§>`<br>`DateTime<1969-07-12T20:17:00.000 +00:00>`<br>`DateTime<2021-07-04T09:45:00.000 -03:00>`<br>`DateTime<2021-01-28T00:00:00.000 -05:00>`
| `ttime('2021-w05-5')` | DateTime from an ISO-8601-like date/time variant for locale-based week numbering | `DateTime<2021-01-28T00:00:00.000 -05:00>` |
| `ttime('2017‑03‑02 14:45 Europe/Paris')` | From an ISO-8601 date/time (variant with space instead of `T`) and IANA timezone | `DateTime<2017-03-02T14:45:00.000 +01:00>` |
| `ttime('20:17:15')` | Dateless time from an ISO-8601 time string | `DateTime<20:17:15.000>` |
| `ttime(1200848400000)` | From millisecond timestamp | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ y: 2008, m: 1, d: 20, hrs: 12, min: 0 })` | From `DateAndTime` object, short-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ year: 2008, month: 1, day: 20, hour: 12, minute: 0 })` | From `DateAndTime` object, long-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime([2013, 12, 11, 10, 9, 8, 765])` | From numeric array: year, month, day, (hour (0-23), minute, second, millisecond), in that order. | `DateTime<2013-12-11T10:09:08.765 -05:00>` |
| `ttime(new Date(2008, 0, 20, 12, 0))` | From JavaScript `Date` object | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime('Feb 26 2021 11:00:00 GMT‑0500')` | ECMA-262 string<br>(Parsing performed by JavaScript `Date('`*time_string*`')`) | `DateTime<2021-02-26T11:00:00.000 ‑05:00>` |
| `ttime.unix(1318781876.721)` | From Unix timestamp | `DateTime<2011-10-16T12:17:56.721 -04:00§>` |
| `ttime.unix(1318781876.721, 'UTC')` | From Unix timestamp, with timezone | `DateTime<2011-10-16T16:17:56.721 +00:00>` |

When dealing Daylight Saving Time, and days when clocks are turned backward, some hour/minute combinations are repeated. The time might be 1:59, go back to 1:00, then forward again to 1:59, and only after hitting 1:59 for this second time during the day, move forward to 2:00.

By default, any ambiguous time is treated as the earlier time, the first occurrence of that time during a day. You can, however, use either an explicit UTC offset, or a subscript 2 (₂), to indicate the later time.

`ttime('11/7/2021 1:25 AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000 -06:00§>`

`ttime('11/7/2021 1:25₂ AM America/Denver', 'MM/DD/YYYY h:m a z').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000₂-07:00>`

`ttime('2021-11-07 01:25 -07:00 America/Denver').toString()` →<br>
`DateTime<2021-11-07T01:25:00.000₂-07:00>`

## Formatting output

Dates and times can be formatted in a many ways, using a broad selection of format tokens, described in the table below.

For the greatest adherence to localized formats for dates and times, you can use the I*XX* format strings, which call directly upon `Intl.DateTimeFormat` (if available) to create localized dates, times, and combined dates/times.

You can also produce more customized, flexible formatting, specifying the order, positioning, and style (text vs. number, fully spelled out or abbreviated, with or without leading zeros) of each date/time field, with embedded punctuation and text as desired.

For example:

`ttime().format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Wed Feb 3, 2021 AD at 8:59 PM EST`

`ttime().toLocale('de').format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Mi 02 3, 2021 n. Chr. at 9:43 PM GMT-5`

Please note that, as most unaccented Latin letters are interpreted as special formatting characters, when using those characters as literal text they should be surrounded with square brackets, as with the word “at” above.

## Format string tokens

| | Token | Output |
|-------|------:|-------|
| Era | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinction between narrow and abbreviated). |
| | NNNN | Before Christ, Anno Domini<br><br>Long-form era.
| | n | BC<br><br>Abbreviated era, only shows BC, not AD. When AD, leading space before `n` token is removed. |
| Year | YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits |
| | YYYY | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. |
| | YY | 70 71 ... 29 30 |
| | Y | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. |
| | y | 1 2 ... 2020 ...<br>Era year, for use with BC/AD, never 0 or negative. |
| Week year (ISO) | GGGG | 1970 1971 ... 2029 2030, `+` sign shown when over 9999. |
| | GG | 70 71 ... 29 30 |
| Week year (locale) | gggg | 1970 1971 ... 2029 2030, `+` sign shown when over 9999. |
| | gg | 70 71 ... 29 30 |
| Quarter | Qo | 1st 2nd 3rd 4th |
| | Q | 1 2 3 4 |
| Month | MMMM | January February ... November December |
| | MMM | Jan Feb ... Nov Dec |
| | MM | 01 02 ... 11 12 |
| | M | 1 2 ... 11 12 |
| | Mo | 1st 2nd ... 11th 12th |
| Week (ISO) | WW | 01 02 ... 52 53 |
| | W | 1 2 ... 52 53 |
| Week (locale) | ww | 01 02 ... 52 53 |
| | w | 1 2 ... 52 53 |
| Day of month | DD | 01 02 ... 30 31 |
| | D | 1 2 ... 30 31 |
| | Do | 1st 2nd ... 30th 31st |
| Day of year | DDDD | 001 002 ... 364 365 366 |
| | DDD | 1 2 ... 364 365 366 |
| Day of week | dddd | Sunday Monday ... Friday Saturday |
| | ddd | Sun Mon ... Fri Sat |
| | dd | Su Mo ... Fr Sa |
| | d | 0 1 ... 5 6 |
| | do | 0th 1st ... 5th 6th |
| Day of Week (ISO) | E | 1 2 ... 6 7 |
| Day of Week (locale) | e | 1 2 ... 6 7<br><br>Note: this is 1-based, not 0-based, as in Moment.js |
| Hour | HH | 00-23 |
| | H | 0-23 |
| | hh | 01-12, for use with AM/PM |
| | h | 1-12, for use with AM/PM |
| | KK | 00-11, for use with AM/PM |
| | K | 0-11, for use with AM/PM |
| | kk | 01-24 |
| | k | 1-24 |
| Day period | A | AM PM |
| | a | am pm |
| Minute | mm | 00-59 |
| | m | 0-59 |
| Second | ss | 00-59
| | s | 0-59 |
| Fractional seconds | S | 0-9 (tenths of a second) |
| | SS | 00-99 (hundredths of a second) |
| | SSS | 000-999 (milliseconds) |
| | SSSS... | Additional zeros after milliseconds. |
| Timezone | ZZZ | America/New_York, Europe/Paris, etc.<br><br>IANA timezone, if available. |
| | zzz | Australian Central Standard Time, Pacific Daylight Time, etc.<br><br>Long form names, only for output &mdash; cannot be parsed. |
| | ZZ | -0700 -0600 ... +0600 +0700
| | zz,&nbsp;z | EST, CDT, MST, PDT, AEST, etc.<br><br>Please note that timezones in this format are not internationalized, and are not unambiguous when parsed. |
| | Z | -07:00 -06:00 ... +06:00 +07:00
| Unix timestamp | X | 1360013296 |
| Unix millisecond timestamp | x | 1360013296123 |
| Daylight Saving Time indicator | V | § # ^ ~ ❄<br><br>Symbol indicating DST is in effect.<br>This is typically §, meaning the clock has been turned forward one hour.<br># means two hours forward, ^ means half an hour, ~ is any other forward amount.<br>❄ is negative DST, i.e. “Winter Time”.<br>Renders one blank space when DST is not in effect. |
| | v | Same as above, but no blank space when DST is not in effect. |
| Occurrence indicator | R | 1:00 , 1:01 ... 1:58 , 1:59 , 1:00₂, 1:01₂ ... 1:58₂, 1:59₂, 2:00 , 2:01<br><br>A subscript 2 (₂) that denotes the second occurrence of the same clock time during a day when clocks are turned back for Daylight Saving Time. |
| | r | Same as above, but no blank space when subscript isn’t needed. |

**Moment.js formats not supported by @tubular/time:** DDDo, Wo, wo, yo

**@tubular/time formats not supported by Moment.js:** KK, K, kk, k, ZZZ, V, v, R, r, n, I*XX* (IFF, IFL, IFM... IxM, IxS)

## Moment.js-style localized formats

| | Token | Output |
| -------|------:|------- |
| Month name, day of month, day of week, year, time | LLLL | Thursday, September 4, 1986 8:30 PM |
| | llll | Thu, Sep 4, 1986 8:30 PM |
| Month name, day of month, year, time | LLL | September 4, 1986 8:30 PM |
| | lll | Sep 4, 1986 8:30 PM |
| Month name, day of month, year | LL | September 4, 1986 |
| | ll | Sep 4, 1986 |
| Month numeral, day of month, year | L | 09/04/1986 |
| | l | 9/4/1986 |
| Time with seconds | LTS | 8:30:25 PM |
| Time | LT | 8:30 PM |

## @tubular/time `Intl.DateTimeFormat` shorthand string formats

These start with a capital letter `I`, followed by one letter for the date format, which corresponds to the `dateStyle` option of `Intl.DateTimeFormat`, and one letter for the time format, corresponding to the `timeStyle` option.

The capital letters `F`, `L`, `M`, and `S` correspond to the option values `'full'`, `'long'`, `'medium'`, and `'short'`. `ILS` thus specifies a long style date and a short style time. `IL` is a long style date alone, without time. `IxS` a short style time without a date.

## Pre-defined formats

```javascript
ttime.DATETIME_LOCAL         = 'Y-MM-DD[T]HH:mm';
ttime.DATETIME_LOCAL_SECONDS = 'Y-MM-DD[T]HH:mm:ss';
ttime.DATETIME_LOCAL_MS      = 'Y-MM-DD[T]HH:mm:ss.SSS';
ttime.DATE                   = 'Y-MM-DD';
ttime.TIME                   = 'HH:mm';
ttime.TIME_SECONDS           = 'HH:mm:ss';
ttime.TIME_MS                = 'HH:mm:ss.SSS';
ttime.WEEK                   = 'GGGG-[W]WW';
ttime.WEEK_AND_DAY           = 'GGGG-[W]WW-E';
ttime.WEEK_LOCALE            = 'gggg-[w]ww';
ttime.WEEK_AND_DAY_LOCALE    = 'gggg-[w]ww-e';
ttime.MONTH                  = 'Y-MM';
```

### Examples

| Format | Output |
|---|---|
| IFF | `Thursday, September 4, 1986 at 8:30:00 PM Eastern Daylight Time` |
| ILM | `September 4, 1986 at 8:30:00 PM` |
| IS | `9/4/86` |
| IxL | `8:30:00 PM EDT` |

## Parsing with a format string, optional locale, with formatted output

| | .format('IMM') |
|---|---|
| `ttime('02/03/32', 'MM-DD-YY')` | `Feb 3, 2032, 12:00:00 AM` |
| `ttime('02/03/32', 'DD-MM-YY')` | `Mar 2, 2032, 12:00:00 AM` |
| `ttime('02/03/32 4:30 pm', 'DD-MM-YY hh:mm a', 'fr')` | `2 mars 2032 à 16:30:00` |
| `ttime('02/03/32', 'DD-MM-YYYY')` | `Mar 2, 0032, 12:00:00 AM` |
| `ttime('2032-03-02T16:30', null, 'ru')` | `2 мар. 2032 г., 16:30:00` |
| `ttime('2032-03-02T16:30', null, 'ar-sa')` | `٠٢‏/٠٣‏/٢٠٣٢ ٤:٣٠:٠٠ م` |
| `ttime('2032-03-02T16:30', null, 'zh-cn')` | `2032年3月2日 下午4:30:00` |

## Converting timezones

`ttime('2005-10-10 16:30 America/Los_Angeles').tz('Europe/Warsaw').toString()` →<br>
`DateTime<2005-10-11T01:30:00.000 +02:00>`

Please note that if you pass a second argument of `true`, the timezone is changed, _but the wall time stays the same._ This same option to preserve wall time is available for the `utc()` and `local()` methods, where the option boolean value will be the one and only argument.

`ttime('2005-10-10 16:30 America/Los_Angeles').tz('Europe/Warsaw', true).toString()` →<br>
`DateTime<2005-10-10T16:30:00.000 +02:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').utc().toString()` →<br>
`DateTime<2005-10-10T23:30:00.000 +00:00>`

`ttime('2005-10-10 16:30 America/Los_Angeles').local().toString()` →<br>
`DateTime<2005-10-10T19:30:00.000 +04:00>`

## Converting locales

`ttime('7. helmikuuta 2021', 'IL', 'fi').toLocale('de').format('IL')` →<br>
`7. Februar 2021`

## Defining and updating timezones

These functions define the size and behavior of the IANA timezone definitions used by **@tubular/time**:

```typescript
ttime.initTimezoneSmall();
ttime.initTimezoneLarge();
ttime.initTimezoneLargeAlt();
```

By default, **@tubular/time** is set up using `initTimezoneSmall()`. This covers explicitly-defined timezone information for roughly the release date of the version of **@tubular/time** you’re using, +/- five years, supplemented by rules-based extensions (i.e. knowing that for a particular timezone, say, “DST starts on the last Sunday of March and ends on the last Sunday of October”), and further supplemented by information extracted from `Intl`, when available.

With proper tree-shaking, the code footprint of **@tubular/time** should be less than 150K when using the small timezone definitions.

Using `initTimezoneLarge()` provides the full IANA timezone database. Using this will increase code size by about 280K, presuming that your build process is smart enough to have otherwise excluded unused code in the first place.

`initTimezoneLargeAlt()` provides a slight variant of the full IANA timezone database, and is also roughly 280K. This rounds all timezone offsets to full minutes, and move a few very-old historical changes by a few hours so that only time-of-day ever goes backward, never the calendar date. It’s generally more than enough trouble for software to cope with missing and/or repeated hours during a day. `initTimezoneLargeAlt()` makes sure the date/time can't be, say, the 19th of the month, then the 18th, and then the 19th again, as happens with the unmodified America/Juneau timezone in October of 1867.

For browser-based inclusion of timezone definitions, if not relying on a tool like **webpack** to handle such issues for you, you can also include full timezone definitions this way:

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large.js"></script>
```

...or...

```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
```

Either of these should appear _before_ the script tag that loads **@tubular/time** itself.

### Live timezone updates

Timezone definitions can be updated live as well. Different polling methods are needed for Node.js code or browser-hosted code, since both environments access web resources in very different ways (and browsers have CORS issues, which Node.js does not).

To be informed when a live timezone update takes place, add and remove update listeners using these functions:

```typescript
function addZonesUpdateListener(listener: (result: boolean | Error) => void): void;
function removeZonesUpdateListener(listener: (result: boolean | Error) => void): void;
function clearZonesUpdateListeners(): void
```

The result is `true` if an update was successful, and caused a change in timezone definitions, `false` if successful, but no changes occurred, or an instance of `Error`, indicating a error (probably an HTTP failure) occurred.

For example:

```typescript
  const listener = result => console.log(result); // Keep in a variable if removal is needed later

  ttime.addZonesUpdateListener(listener);

  // Later on in the code...

  ttime.removeZonesUpdateListener(listener);
```

Why use a listener? Because might want to recalculate previously calculated times which have possibly have changed due to timezone definition changes. For example, you have a video meeting scheduled for 10:00 in a client’s timezone, which, when you first schedule it, was 15:00 in your timezone. Between the time you scheduled the meeting, however, and when the meeting actually takes place, the switch to Daylight Saving Time is cancelled for the client’s timezone. If you still intend to talk to your client at 10:00 their time, you have to meet at 16:00 your time instead.

To poll for regular updates, use:

```typescript
function pollForTimezoneUpdates(zonePoller: IZonePoller | false, name: ZoneOptions = 'small', intervalDays = 1): void;
```

* `zonePoller`: Either `zonePollerBrowser` (from `tbTime.zonePollerBrowser`) or  `zonePollerNode` (via `import` or `require`, from `'@tubular/time'`). If you use the boolean value `false`, polling ceases.
* `name`: One of `'small'`, `'large'`, or `'large-alt'`. Defaults to `'small'`.
* `intervalDays`: Frequency of polling, in days. Defaults to 1 day. Fastest allowed rate is once per hour (~0.04167 days).

You can also do a one-off request:

```typescript
function getTimezones(zonePoller: IZonePoller | false, name: ZoneOptions = 'small'): Promise<boolean>;
```

`zonePoller` and `name` are the same as above. Any periodic polling done by `pollForTimezoneUpdates()` is canceled. You can get a response via registered listeners, but this function also returns a `Promise`. The promise either resolves to a boolean value, or is rejected with an `Error`.

## The `YMDDate` and `DateAndTime` objects

`YMDate`:

```json5
{
  y: 2021, // short for year
  q: 1, // short for quarter
  m: 2, // short for month
  d: 4, // short for day
  dow: 4, // short for dayOfWeek (output only)
  dowmi: 1, // dayOfWeekMonthIndex (output only)
  dy: 35, // short for dayOfYear
  n: 18662, // short for epochDay
  j: false, // short for isJulian

  year: 2021,
  quarter: 1, // quarter of the year 1-4
  month: 2,
  day: 4,
  dayOfWeek: 4, // Day of week as 0-6 for Sunday-Saturday (output only)
  dayOfWeekMonthIndex: 1, // Day of week month index, 1-5, e.g. 2 for 2nd Tuesday of the month (output only)
  dayOfYear: 35,
  epochDay: 18662, // days since January, 1 1970
  isJulian: false, // true if a Julian calendar date instead of a Gregorian date

  yw: 2021, // short for yearByWeek
  w: 5, // short for week
  dw: 4, // short for dayByWeek
  yearByWeek: 2021, // year that accompanies an ISO year/week/day-of-week style date
  week: 5, // week that accompanies an ISO year/week/day-of-week style date
  dayByWeek: 4, // day that accompanies an ISO year/week/day-of-week style date

  ywl: 2021, // short for yearByWeekLocale
  wl: 6, // short for weekLocale
  dwl: 5, // short for dayByWeekLocale
  yearByWeekLocale: 2021, // year that accompanies an locale-specific year/week/day-of-week style date
  weekLocale: 6, // week that accompanies an locale-specific year/week/day-of-week style date
  dayByWeekLocale: 5, // day that accompanies an locale-specific year/week/day-of-week style date

  error: 'Error description if applicable, otherwise undefined'
}
```

`DateAndTime`, which extends the `YMDDate` interface:

```json5
{
  hrs: 0, // short for hour
  min: 18, // short for minute
  sec: 32, // short for second
  hour: 0,
  minute: 18,
  second: 32,
  millis: 125, // 0-999 milliseconds part of time

  utcOffset: -18000, // offset (in seconds) from UTC, negative west from 0°, including DST offset when applicable
  dstOffset: 0, // DST offset, in minutes - usually positive, but can be negative (output only)
  occurrence: 1, // usually 1, but can be 2 for the second occurrence of the same wall clock time during a single day, caused by clock being turned back for DST
}
```

When using a `YMDDate` or `DateAndTime` object to create a `DateTime` instance, you need only set a minimal number of fields to specify the date and/or time you are trying to specify. You can use either short or long names for fields (if you use both, the short form takes priority).

At minimum, you must specify a date or a time. If you only specify a date, the time will be treated as midnight at the start of that date. If you only specify a time, you can create a special dateless time instance. You can also, of course, specify both date and time together.

In specifying a date, the date fields have the following priority:

* `n` / `epochDay`: Number of days before/after epoch day 0, which is January 1, 1970.
* `y` / `year`: A normal calendar year. Along with the year, you can specify:
  * Nothing more, in which case the date is treated as January 1 of that year.
  * `m` / `month`: The month (a normal 1-12 month, not the weird 0-11 month the JavaScript `Date` uses!).
    * If nothing more is given, the date is treated as the first of the month.
    * `d` / `day`: The date of the month.
  * `dy` / `dayOfYear`: The 1-based number of days into the year, such that 32 means February 1.
* `yw` / `yearByWeek`: An ISO week-based calendar year, where each week starts on Monday. This year is the same as the normal calendar year for most of the calendar year, except for, possibly, a few days at the beginning and end of the year. Week 1 is the first week that contains January 4. Along with this style of year, you can specify:
    * Nothing more, in which case the date is treated as the first day of the first week of the year.
    * `w` / `week`: The 1-based week number.
      * If nothing more, the date is treated as the first day of the given week.
      * `dw` / `dayByWeek`: The 1-based day of the given week.
* `ywl` / `yearByWeekLocale`, etc: These fields work the same as `yw` / `yearByWeek`, etc., except that they apply to locale-specific rules for the day of the week on which each week starts, and for the definition of the first week of the year.

In specifying a time, the minimum needed is a 0-23 value for `hrs` / `hour`. All other unspecified time fields will be treated as 0.

As discussed earlier when parsing strings, ambiguous times due to Daylight Saving Time default to the earlier of two times. You can, however, use `occurrence: 2` to explicitly specify the later time. An explicit `utcOffset` can also accomplish this disambiguation.

## Reading individual `DateTime` fields

As an output from a `DateTime` instance, such as what you get from `ttime().wallTime`, all `DateAndTime` fields will be filled in with synchronized values. `ttime().wallTime.hour` provides the hour value, `ttime().wallTime.utcOffset` provides the UTC offset in seconds for the given time, etc.

`ttime().wallTimeShort` returns a `DateAndTime` object with all available short-form field names, and `ttime().wallTimeLong` only long-form field names.

## Modifying `DateTime` values

There are six main methods for modifying a `DateTime` value:

* `add(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `subtract(field: DateTimeField | DateTimeFieldName, amount: number, variableDays = true): DateTime`
* `roll(field: DateTimeField | DateTimeFieldName, amount: number, minYear = 1900, maxYear = 2099)`
* `set(field: DateTimeField | DateTimeFieldName, value: number, loose = false): DateTime`
* `startOf(field: DateTimeField | DateTimeFieldName): DateTime`
* `endOf(field: DateTimeField | DateTimeFieldName): DateTime`

> Before going further, it needs to be mentioned that `DateTime` instances can be either locked, and thus immutable, or unlocked. Instances generated using `ttime(`...`)` are locked. Instances created using [the `DateTime` constructor](#the-datetime-class) (covered later in this document) are created unlocked, but can be locked after creation.

When you use the add/subtract/roll/set methods on a locked instance, a new modified and locked instance is returned. When used on an unlocked instance, these methods modify the instance itself is modified, and a reference to that same instance is returned.

### Using `add` (and `subtract`)

The `add()` method is the main method here. `subtract()` is nothing more than a convenience method that negates the amount being added, and then calls `add()`, so I will speak of this going forward in terms of the `add()` method.

An example of using `add()`:

`ttime().add('year', 1)` or `ttime().add(DateTimeField.YEAR, 1)`

The above produces a date one year later than the current time. In most cases, this means that the resulting date has the same month and date, but in the case of a leap day:

`ttime('2024-02-29').add('year', 1)..toIsoString(10)` → `2025-02-28`

...the date is pinned to 28 so that an invalid date is not created. Similarly, when adding months, invalid dates are prevented:

`ttime('2021-01-31').add(DateTimeField.MONTH, 1).toIsoString(10)` → `2021-02-28`

You can `add` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`, as provided by the `DateTimeField` enum, or their string equivalents (`'milli'`, `'millis'`, `'millisecond'`, `'milliseconds'`... `'day'`, `'days'`, `'date'`, `'month'`, `'months'`, etc.)

For fields `MILLI` through `HOUR`, fixed units of time, multiplied by the `amount` you pass, are applied. When dealing with months, quarters, and years, the variable lengths of months, quarters, and years apply.

`DAY` amounts can be handled either way, as variable in length (due to possible effects of Daylight Saving Time), or fixed units of 24 hours. The default for `variableDays` is `true`.

DST can alter the duration of days, typically adding or subtracting an hour, but other amounts of change are possible (like the half-hour shift used by Australia’s Lord Howe Island), so adding days can possibly cause the hour (and even minute) fields to change:

`ttime('2021-02-28T07:00 Europe/London', false).add('days', 100).toIsoString()` →<br>
`2021-06-08T08:00:00.000+01:00` (note shift from 7:00 to 8:00)

`ttime('2021-02-28T07:00 Australia/Lord_Howe, false').add('days', 100).toIsoString()` →<br>
`2021-06-08T06:30:00.000+10:30` (note shift from 7:00 to 6:30)

By default, however, hour and minute fields remain unchanged.

`ttime('2021-02-28T07:00 Australia/Lord_Howe').add('days', 100).toIsoString()` →<br>
`2021-06-08T07:00:00.000+10:30`

Even with the default behavior, however, it is still possible hours and minutes my change, in just the same way adding one month to January 31 does not yield February 31. When clocks are turned forward, some times of day simply do not exist, so a result might have to be adjusted to a valid hour and minute in some cases.

`ttime('2000-04-27T00:30 Africa/Cairo').add('day', 1).toString()` →<br>
`DateTime<2000-04-28T01:30:00.000 +03:00§>` (clock turned forward at midnight to 1:00)

### Using `roll()`

You can use the `roll()` method to “spin” through values for each date/time field. This can be used for a user interface where you select a field and use up/down arrows to change the value, and the value changes in a wrap-around fashion, like ...58 → 59 → 00 → 01..., etc.

While seconds and minutes wrap at 59, and dates wrap at the length of the current month, there’s no natural wrapping boundaries for years. The wrap-range defaults to 1900-2099, but you can pass optional arguments to change this range (this only effects years, not other units).

You can `roll` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

For the purpose of the `roll()` method, `AM_PM` and `ERA` are treated as numeric values. AM and BC are 0, PM and AD are 1. If you roll by an odd number, the value is changed. If you roll by an even value, the value will be unchanged.

Examples of using `role()`:

`ttime('1690-09-15').roll('month', 5).toIsoString(10)` → `1690-05-15`<br>
`ttime('1690-09-15').roll('era', 1).format('MMM D, y N')` → `Sep 15, 1690 BC`<br>
`ttime('10:15').roll('ampm', 1).format('h:mm A')` → `10:15 PM`

### Using `set()`

This method sets date/time fields to explicit values. In the default mode, you can only use valid values for each particular field. In the `loose` mode, some leeway is given, such as allowing the date to be set to 31 when the month is September (resulting in October 1), or allowing the month to be set to 0 (meaning December of the previous year) or 13 (January of the next year). Using these loose values means, of course, that other fields besides the one field being set might change.

You can `set` using the following fields: `MILLI`, `SECOND`, `MINUTE`, `HOUR`, `AM_PM`, `DAY`, `DAY_OF_WEEK`, `DAY_OF_WEEK_LOCALE`, `DAY_OF_YEAR`, `WEEK`, `WEEK_LOCALE`, `MONTH`, `YEAR`, `YEAR_WEEK`, `YEAR_WEEK_LOCALE`, `ERA`.

Examples of using `set()`:

`ttime('1690-09-15').set('month', 5).toIsoString(10)` → `1690-02-15`<br>
`ttime('1690-09-15').set('month', 13, true).toIsoString(10)` → `1691-01-15`

### Using `startOf()` and `endOf()`

These functions transform a `DateTime` to the beginning or end of a given unit of time.

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.MINUTE).toIsoString(23)` →<br>
`2300-05-05T04:08:00.000`

`ttime('2300-05-05T04:08:10.909').startOf('hour').toIsoString(23)` →<br>
`2300-05-05T04:00:00.000`

`ttime('2300-05-05T04:08:10.909').startOf(DateTimeField.WEEK).format(ttime.WEEK_AND_DAY)` →<br>
`2300-W18-1`

`ttime('2300-05-05T04:08:10.909').startOf('year').toIsoString(23)` →<br>
`2300-01-01T00:00:00.000`

`ttime('2300-05-05T04:08:10.909').endOf('day').toIsoString(23)` →<br>
`2300-05-05T23:59:59.999`

`ttime('2300-05-05T04:08:10.909').endOf(DateTimeField.MONTH).toIsoString(23)` →<br>
`2300-05-31T23:59:59.999`

## Time value

In milliseconds:

`ttime().utcTimeMillis`

In seconds:

`ttime().utcTimeSeconds`

As native JavaScript `Date` object:

`ttime().toDate()`

## Timezone offsets from UTC

Offset from UTC for a given `DateTime` in seconds, negative for timezones west of the Prime Meridian, including any change due to Daylight Saving Time when applicable:

`ttime().utcOffsetSeconds`

Offset from UTC for a given `DateTime` in minutes:

`ttime().utcOffsetMinutes`

Change in seconds from a timezone’s standard UTC offset due to Daylight Saving Time. This will be 0 when DST is not in effect, or always 0 if DST is never in effect. While usually a positive number, some timezones (like Europe/Dublin) employ negative DST during the winter:

`ttime().dstOffsetSeconds`

Change in minutes from a timezone’s standard UTC offset due to Daylight Saving Time:

`ttime().dstOffsetMinutes`

Returns `true` when a moment in time is during DST, `false` otherwise:

`ttime().isDST()`

## Validation

When an invalid `DateTime` instance is created, the `valid` property returns `false`, and the `error` property (which is otherwise `undefined`) returns a description of the error.

`ttime('1234-56-78').valid` → `false`<br>
`ttime('1234-56-78').error` → `'Invalid month: 56'`

Parsing of date and times specified as strings is somewhat loose. When no format string is provided, dates are parsed according to ISO-8601, with leniency about leading zeros when delimiters are used. Pseudo-months 0 and 13 are accepted, as are days of the month from 0 to 32, regardless of the length of a given month. Years can be in the range -271820 to 275759.

When parsing using a format string, especially formats where months are numeric, not textual, strict matching of delimiters is not required. For example, even though proper output formatting is done with dots, for input dashes as well as dots are acceptable:

`ttime('2021-02-08', null, 'de').format('IS')` → `08.02.21`<br>
`ttime('08.02.21', 'IS', 'de').format('IS')` → `08.02.21`<br>
`ttime('008-2-21', 'IS', 'de').format('IS')` → `08.02.21`

Except in compact, delimiter-free ISO formats like `20210208`, leading zeros are never required. Extra, unexpected leading zeros are generally ignored, although an ISO date month should have no more than two digits, and when a two-digit year is expected, a 3-digit year such as 021 will be treated as 21 AD, not 2021.

_Future releases may offer options for stricter parsing._

## Comparison and sorting

You can test whether moments in time expressed as `DateTime` instances are before, after, or the same as each other. By default, this comparison is exact to the milliseconds. You can, however, pass an optional unit of time for the resolution of the comparison.

`ttime('2020-08-31').isBefore('2020-09-01')` → `true`<br>
`ttime('2020-08-31').isBefore('2020-09-01', 'year')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03')` → `false`<br>
`ttime('2020-08-31').isSameOrBefore('2020-08-03', 'month')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43')` → `true`<br>
`ttime('2020-08-31 07:45').isAfter('2020-08-31 07:43', 'hour')` → `true`

The full list of functions for these comparisons is as follows: `isBefore`, `isSameOrBefore`, `isSame`, `isSameOrAfter`, `isAfter`.

You can also check if a `DateTime` instance is chronologically, non-inclusively between two other `DateTime` instances:

`ttime().isBetween('1776-06-04', '1809-02-12')` → `false`

There are two general comparison functions that, when comparing two `DateTime` instances, return a negative number if the first is less than the second, 0 if the two are equal at the given resolution, or a positive number if the first instance is greater than the second. This is the style of comparison function that works with JavaScript `sort`.

`ttime().compare('1776-06-04')` → `7721460952408`<br>
`ttime().compare(ttime(), 'minute')` → `0`<br>
`ttime().compare('3776-06-04')` → `-55392442920503`<br>
`DateTime.compare(ttime('1776-06-04'), ttime('1809-02-12'))` → `-1031616000000`

### Sorting an array of dates

`ttime.sort(dates: DateTime[], descending = false): DateTime[]`

This sort modifies the array which is passed in, and returns that same array.

### min/max functions

`ttime.min(...dates: DateTime[]): DateTime`<br>
`ttime.max(...dates: DateTime[]): DateTime`

## Monthly calendar generation

The `DateTime` method `getCalendarMonth()` returns an array of `YMDDate` objects, the zeroth date object being on the locale-specific first day of the week (possible from the preceding month), with multiple-of-7 length of dates to represent a full month. As an example, filtered down to just the day-of-month for visual clarity:

`ttime().getCalendarMonth().map(date => date.m === 2 ? date.d : '-')` →

```json5
[
  '-', 1,   2,   3,   4,   5,   6,
  7,   8,   9,   10,  11,  12,  13,
  14,  15,  16,  17,  18,  19,  20,
  21,  22,  23,  24,  25,  26,  27,
  28, '-',  '-', '-', '-', '-', '-'
]
```

For the above example, the current date was February 11, 2021, so the calendar was generated for that month. The locale was `'en-us'`, so each week starts on Sunday.

## Dealing with weird months

The utility of the `getCalendarMonth()` method is more evident with when viewing the calendar generated for October 1582, when (by default) the Julian calendar ends, and the Gregorian calendar begins:

`ttime('1582-10-01', null, 'fr').getCalendarMonth().map(date => date.d)` →

```json5
[
   1,  2,  3,  4, 15, 16, 17,
  18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31
]
```

By using the locale `'fr'`, the calendar generated above starts on Monday instead of Sunday. Notice how the 4th of the month is immediately followed by the 15th.

One of the latest switches to the Gregorian calendar was enacted by Russia in 1918. The month of February didn’t even start with the 1st, but started on the 14th:

`new DateTime('1918-02', null, '1918-02-14').getCalendarMonth(1).map(date => date.m === 2 ? date.d : '-')`

```json5
[
  '-', '-', '-', 14, 15,  16,  17,
  18,  19,  20,  21, 22,  23,  24,
  25,  26,  27,  28, '-', '-', '-'
]
```

Here are some things, then, to consider that might defy ordinary expectations about how calendar months work:

* A month does not necessary start on the 1st.
* A month might be missing days in the middle.
* Because of the previous possibilities, the last numeric date of the month (in the above example, 28) is not necessary the same thing as the number of days in the month (in the example above, only 15 days).
* There are timezone changes that eliminate both a day number *and* a day of the week.

The `getCalendarMonth()` method shows all of the effects together, but there are separate functions to examine each separate issue. These methods are available on both the `DateTime` class, and the `Calendar` class. Arguments which are optional when using the `DateTime` class are required when using the `Calendar` class, because instances of the `Calendar` class have no internal year, month, or day values available as defaults.

Total numbers of days in month, as affected by leap years and Julian/Gregorian switch-over. If a day is missing due to a timezone issue, that day is still counted as a day in the month, albeit a special 0-length day.

```typescript
getDaysInMonth(year?: number, month?: number): number;
```

The range of dates excluded due to Julian/Gregorian switch-over only. If no days are exclude, the result is `null`. If days are excluded, a two-element array is returned. `result[0]` is the first day dropped, `result[1]` is the last day dropped.

```typescript
getMissingDateRange(year?: number, month?: number): number[] | null;
```

The first date in a month. Usually 1, of course, but possible different, as in the previous example for Russia, February 1918.

```typescript
getFirstDateInMonth(year?: number, month?: number): number;
```

The last date in a month. Usually 28, 29, 30, or 31. This method is provided mainly because this number can be different from the `getDaysInMonth()` value.

```typescript
getLastDateInMonth(year?: number, month?: number): number;
```

### Another way to drop a day

In December 2011, the nation of Samoa jumped over the International Dateline (or, since no major tectonic shifts occurred, perhaps it’s better to say the International Dateline jumped over Samoa). The timezone was changed from UTC-10:00 to UTC+14:00. As a result, Friday, December 31, 2011 did not exist for Samoans. Thursday was followed by Saturday, a type of discontinuity that doesn’t happen with days dropped by switching from the Julian to the Gregorian calendar.

**@tubular/time** handles this by treating that Friday as a day that exists, but is 0 seconds long. The `getCalendarMonth()` method makes this apparent by rendering the day-of-the-month for that day as a negative number.

`new DateTime('2011-12', 'Pacific/Apia').getCalendarMonth().map(date => date.m ===12 ? date.d : '-')` →

```json5
[
  '-', '-', '-', '-', 1,  2,  3, 
  4,   5,   6,   7,   8,  9,  10,
  11,  12,  13,  14,  15, 16, 17,
  18,  19,  20,  21,  22, 23, 24,
  25,  26,  27,  28,  29, -30, 31
]
```

Here’s what that month looks like, as rendered by the drop-time date picker at skyviewcafe.com:

<img src="https://shetline.com/readme/tubular-time/2.4.0/apia_dec_2011_cal.jpg" width=185 height=150 alt="Apia Dec 2011">

The following section about weird days provides another method for detecting days like the missing Friday above.

## Dealing with weird days

A day is, of course, *usually* 24 hours long, which is also 1440 minutes, or 86400 seconds. Two things can change the length of a day, however:

* Daylight Saving Time rules, which typically subtract or add one hour, but DST changes are not always one hour.
* Changes in a timezone’s base offset from UTC, such as the Samoa example above. The biggest of these changes have been timezones which have gone back and forth over the International Dateline, resulting in days as short as 0 hours, and days as long as 47 hours (1969-09-30, Pacific/Kwajalein).

These two methods tell you how long a particular day is, in either seconds or minutes:

```typescript
getSecondsInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number;

getMinutesInDay(yearOrDate?: YearOrDate, month?: number, day?: number): number;
```

It is possible, but highly unlikely (no timezone is currently defined this way, or is ever likely to be), for `getSecondsInDay()` to return a non-integer value. `getMinutesInDay()` is always rounded to the nearest integer minute. This will nearly always be a precisely correct value, with the exception of some very early timezone changes away from local mean time.

This next method provides a description of any discontinuity in time during a day caused by Daylight Saving Time or other changes in UTC offset. It provides the wall-clock time when a clock change starts, the number of milliseconds applied to that time to turn the clock either forward or backward, and the ending wall-clock time. The notation “24:00:00” refers to midnight of the next day. If there is no discontinuity, as with most days, the method returns `null`.

```typescript
getDiscontinuityDuringDay(yearOrDate?: YearOrDate, month?: number, day?: number): Discontinuity | null;
```

### Typical Daylight Saving Time examples

`new DateTime('2021-03-14', 'America/New_York').getDiscontinuityDuringDay()` →<br>
`{ start: '02:00:00', end: '03:00:00', delta: 3600000 } // spring forward!`

`new DateTime('2021-07-01', 'America/New_York').getDiscontinuityDuringDay()`) → `null`

`new DateTime('2021-11-07', 'America/New_York').getDiscontinuityDuringDay()` →<br>
`{ start: '02:00:00', end: '01:00:00', delta: -3600000 } // fall back!`

### Examples of big UTC shifts due to moving the International Dateline

`// As soon as it’s midnight on the 30th, it’s instantly midnight on the 31st, erasing 24 hours:`<br>
`new DateTime('2011-12-30', 'Pacific/Apia').getDiscontinuityDuringDay()`) →<br>
`{ start: '00:00:00', end: '24:00:00', delta: 86400000 }`

`// As soon as it’s midnight on the 31th, turn back to 1AM on the 30th, adding 23 hours to the day:`<br>
`new DateTime('1969-09-30', 'Pacific/Kwajalein').getDiscontinuityDuringDay()` →<br>
`{ start: '24:00:00', end: '01:00:00', delta: -82800000 }`

Here's a skyviewcafe.com image for that extra-long day in the Marshall Islands, with two sunrises, two sunsets, and 24 hours, 6 minutes worth of daylight packed into a 47-hour day:

<img src="https://shetline.com/readme/tubular-time/2.4.0/mhl_sep_30_1969.jpg" width=215 height=195 alt="Marshall Islands, September 30, 1969">

## Global default settings

These methods get or set the first year of the one hundred-year range that will be using to interpret two-digit year numbers. Defaults to 1970, meaning that 00-69 will be treated as 2000-2069, and 70-99 will be treated as 1970-1999.

`ttime.getDefaultCenturyBase(): number;`<br>
`ttime.setDefaultCenturyBase(newBase: number): void;`

Get/set the default locale (or prioritized array of locales). This defaults to the value provide either by a web browser or the Node.js environment.

`ttime.getDefaultLocale(): string | string[];`<br>
`ttime.setDefaultLocale(newLocale: string | string[]): void;`

Get/set the default timezone. The “default default” (if you don’t use `setDefaultTimezone()`) is:

1. The default timezone provided by the `Intl` package, if available.
2. The timezone determined by the `Timezone.guess()` function.
3. The `OS` timezone, a special **@tubular/time** timezone created by probing the JavaScript `Date` class to determine the rules of the unnamed JavaScript-supported local timezone.

`ttime.getDefaultTimezone(): Timezone;`<br>
`ttime.setDefaultTimezone(newZone: Timezone | string): void;`

## The `DateTime` class

The main `ttime()` function works by creating instances of the `DateTime` class. You can use `new DateTime(`...`)` to create instances of `DateTime` directly. This is necessary for taking advantage of support for variable switch-over from the Julian to the Gregorian calendar, which by default is set at October 15, 1582.

### Constructor

```typescript
  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null,
              gregorianChange?: GregorianChange);

  constructor(initialTime?: DateTimeArg, timezone?: Timezone | string | null, locale?: string | string[],
              gregorianChange?: GregorianChange);
```

All arguments to the constructor are optional. When passed no arguments, `new DateTime()` will return an instance for the current moment, in the default timezone, default locale, and with the default October 15, 1582 Gregorian calendar switch-over.

* `initialTime`: This can be a single number (for milliseconds since 1970-01-01T00:00 UTC), an ISO-8601 date as a string, and ECMA-262 date as string, an ASP.​NET JSON date string, a JavaScript `Date` object, [a `DateAndTime` object](#the-ymddate-and-dateandtime-objects), an array of numbers (in the order year, month, day, hour, etc.), or a `null`, which causes the current time to be used.
* `timezone`: a `Timezone` instance, a string specifying an IANA timezone (e.g. 'Pacific/Honolulu') or a UTC offset (e.g. 'UTC+04:00'), or `null` to use the default timezone.
* `locale`: a locale string (e.g. 'fr-FR'), an array of locales strings in order of preference (e.g. ['fr-FR', 'fr-CA', 'en-US']), or `null` to use the default locale.
* `gregorianChange`: The first date when the Gregorian calendar is active, the string `'J'` for a pure Julian calendar, the string 'G' for a pure Gregorian calendar, the constant `ttime.PURE_JULIAN`, the constant `ttime.PURE_GREGORIAN`, or `null` for the default of 1582-10-15. A date can take the form of a year-month-day ISO-8601 date string (e.g. '1752-09-14'), a year-month-day numeric array (e.g. [1918, 2, 14]), or a date as a `DateAndTime` object.

As a string, `initialTime` can also include a trailing timezone or UTC offset, using the letter `Z` to indicate UTC (e.g. '1969‑07‑12T20:17Z'), or a specific timezone (e.g. '1969‑07‑20T16:17 EDT', '1969‑07‑20T16:17 America/New_York', or '1969‑07‑20T16:17-0400').

If the `timezone` argument is itself `null` or unspecified, this embedded timezone will become the timezone for the `DateTime` instance. If the `timezone` argument is also provided, the time will be parsed according to the first timezone, then it will be transformed to the second timezone.

`new DateTime('2022-06-01 14:30 America/Chicago', 'Europe/Paris', 'fr_FR').format('IMM ZZZ')` →<br>
`1 juin 2022 à 21:30:00 Europe/Paris`

The following is an example of using the `gregorianChange` parameter to apply the change from the Julian to Gregorian calendar that was used by Great Britain, including what were the American colonies at the time:

`new DateTime('1752-09', null, '1752-09-14').getCalendarMonth(1).map(date => date.m === 9 ? date.d : '-')`

```json5
[
  '-', 1,  2,  14, 15, 16, 17,
  18,  19, 20, 21, 22, 23, 24,
  25,  26, 27, 28, 29, 30, '-'
]
```

There is a function `getFirstDateInMonth()` which exists specifically to handle cases like this, because for historical dates you can assume that months always start with the 1st.

### Locking and cloning

The `lock()` method takes a mutable `DateTime` instance and makes it immutable, returning that same instance. _This is a one-way trip._ Once locked, an instance cannot be unlocked.

The `clone()` method creates a copy of a `DateTime` instance. By default, the copy is either locked or unlocked, the same as the original. You can, however, use `clone(false)` to create an unlocked, mutable copy of a locked original.

### `DateTime` astronomical time functions

Converts Julian days into milliseconds from the 1970-01-01T00:00 UTC epoch:

```typescript
DateTime.julianDay(millis: number): number;
```

Converts milliseconds from the 1970-01-01T00:00 UTC epoch into Julian days:

```typescript
DateTime.millisFromJulianDay(jd: number): number;
```

Given a year, month, day according to the standard Gregorian calendar (SGC) switch of 1582-10-15, and optional hour, minute, and second UTC, returns a Julian day number.

```typescript
DateTime.julianDay_SGC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number;
```

### Other `DateTime` constants, methods, getters/setters

#### Static constant

```typescript
static INVALID_DATE;
```

#### Static methods

Compares two `DateTime` instances, or a `DateTime` instance and another date form, return a negative value when the first date is less than the second, 0 when the two are equal (for the given `resolution`), or positive when the first date is greater than the second.

```typescript
static compare(d1: DateTime, d2: DateTime | string | number | Date,
               resolution: DateTimeField | DateTimeFieldName = DateTimeField.FULL): number;
```

Determine if a value is an instance of the `DateTime` class:

```typescript
static isDateTime(obj: any): obj is DateTime; // boolean
```

#### Getters

```typescript
dstOffsetMinutes: number;
dstOffsetSeconds: number;
error: string; // Explanation of why a DateTime is considered invalid
// 'DATETIME` is the usual type, but a DateTime instance can be DATELESS (time-only)
//   or an abstract date/time with no real-world timezone.
type: 'ZONELESS' | 'DATELESS' | 'DATETIME'; 
utcOffsetMinutes: number;
utcOffsetSeconds: number;
valid: boolean;
wallTimeLong: DateAndTime;
wallTimeShort: DateAndTime;
```

#### Getter/setters

```typescript
locale: string | string[];
timezone: Timezone;
utcTimeMillis: number;
utcTimeSeconds: number;
wallTime: DateAndTime;
```

### Other `DateTime` methods

```typescript
computeUtcMillisFromWallTime(wallTime: DateAndTime): number;

format(fmt = fullIsoFormat, localeOverride?: string): string;

// For questions like “What date is the second Tuesday of this month?”
// `dayOfTheWeek` 0-6 for Sun-Sat, index is 1-based.
getDateOfNthWeekdayOfMonth(year: number, month: number, dayOfTheWeek: number, index: number): number;
getDateOfNthWeekdayOfMonth(dayOfTheWeek: number, index: number): number;

getDayNumber(yearOrDate: YearOrDate, month?: number, day?: number);

getDayOfWeek(yearOrDateOrDayNum?: YearOrDate, month?: number, day?: number): number;

getDayOfWeekInMonthCount(year: number, month: number, dayOfTheWeek: number): number;
getDayOfWeekInMonthCount(dayOfTheWeek: number): number;

getDayOfWeekInMonthIndex(year: number, month: number, day: number): number;
getDayOfWeekInMonthIndex(date: YMDDate | number[]): number;
getDayOfWeekInMonthIndex(): number;

getDayOnOrAfter(year: number, month: number, dayOfTheWeek: number, minDate: number): number;
getDayOnOrAfter(dayOfTheWeek: number, minDate: number): number;

getDayOnOrBefore(year: number, month: number, dayOfTheWeek: number, maxDate: number): number;
getDayOnOrBefore(dayOfTheWeek: number, minDate: number): number;

getDaysInYear(year?: number): number;

getStartDateOfFirstWeekOfYear(year: number, startingDayOfWeek?: number, minDaysInCalendarYear?: number): YMDDate;

getStartOfDayMillis(yearOrDate?: YearOrDate, month?: number, day?: number): number;

getTimeOfDayFieldsFromMillis(millis: number): DateAndTime;

getTimezoneDisplayName(): string;

getWeeksInYear(year: number, startingDayOfWeek = 1, minDaysInCalendarYear = 4): number;

getYearWeekAndWeekday(year: number, month: number, day: number,
  startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];
getYearWeekAndWeekday(date: YearOrDate | number,
  startingDayOfWeek?: number, minDaysInCalendarYear?: number): number[];

isLeapYear(year?: number): boolean;

setGregorianChange(gcYearOrDate: YearOrDate | string, gcMonth?: number, gcDate?: number): DateTime;

toDate(): Date;

toHoursAndMinutesString(includeDst = false): string;

toIsoString(maxLength?: number): string;

toLocale(newLocale: string | string[]): DateTime;

toString(): string;

toYMDhmString(): string;
```
