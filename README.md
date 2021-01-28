## @tubular/time

### Key features

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond simply parsing and formatting using timezones, including live updates.
* Many features available using a familiar Moment.js-style interface.
* Extensive date/time manipulation and calculation capabilities.
* Astronomical time functions.
* Internationalization via `Intl`, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Suitable for tree shaking.
* Full TypeScript typing support.

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, https://skyviewcafe.com, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone data that reaches roughly five years into the past and five years into the future, and indefinitely further into the future where generally stable Daylight Saving Time rules apply. Unlike the `Intl` API, the full list of available timezones is exposed, allowing the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. Each can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

### Installation

#### Via npm

`npm install @tubular/time`

```typescript
import ttime, { DateTime,  Timezone } from '@tubular/time';
```
...or...
```javascript
const { default: ttime, DateTime, Timezone } = require('@tubular/time');
```

#### Via `<script>` tag.
```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```

The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The package will be available via the global variable `tbTime`. `tbTime.default` is the default function, and other functions an classes will be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, etc.

### Format string tokens

| | Token | Output |
| -------|------:|------- |
| Era | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinctions between narrow and abbreviated). |
| | NNNN | Before Christ, Anno Domini<br><br>Long-form era.
| | n | BC<br><br>Abbreviated era, only shows BC, not AD. When AD, leading space before `n` token is removed. |
| Year | YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits |
| | YYYY | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. |
| | YY | 70 71 ... 29 30 |
| | Y | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. |
| | y | 1 2 ... 2020 ...<br>Era year, for use with BC/AD, never 0 or negative. |
| Week year (ISO) | GGGG | 1970 1971 ... 2029 2030 |
| | GG | 70 71 ... 29 30 |
| Week year (locale) | gggg | 1970 1971 ... 2029 2030 |
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
| | hh | 01-12 |
| | h | 1-12, use with AM/PM |
| | KK | 00-11 |
| | K | 0-11, use with AM/PM |
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
| | ZZ | -0700 -0600 ... +0600 +0700
| | zz,&nbsp;z | EST, CDT, etc.<br><br>Please note that timezones in this format are not internationalized, and are not unambiguous when parsed. |
| | Z | -07:00 -06:00 ... +06:00 +07:00
| Unix timestamp | X | 1360013296 |
| Unix millisecond timestamp | x | 1360013296123 |
| Daylight Saving Time indicator | V | § # ^ ~ ❄<br><br>Symbol indicating DST is in effect.<br>This is typically §, meaning the clock has been turned forward one hour.<br># means two hours forward, ^ means half an hour, ~ is any other forward amount.<br>❄ is negative DST, i.e. "Winter Time".<br>Renders one blank space when DST is not in effect. |
| | v | Same as above, but no blank space when DST is not in effect. |
| Occurrence indicator | R | 1:00 , 1:01 ... 1:58 , 1:59 , 1:00₂, 1:01₂ ... 1:58₂, 1:59₂, 2:00 , 2:01<br><br>A subscript 2 (₂) that denotes the second occurrence of the same clock time during a day when clocks are turned back for Daylight Saving Time. |
| | r | Same as above, but no blank space when subscript isn't needed. |

**Formats not supported by @tubular/time:** DDDo, Wo, wo

**Formats not supported by Moment.js:** KK, K, kk, k, ZZZ, V, v, R, r, n, I*XX*
<br>
<br>

### Moment.js-style localized formats

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

### @tubular/time `Intl` shorthand formats

These start with a capital letter `I`, followed by one letter for the date format, which corresponds to the `dateStyle` option of `Intl.DateTimeFormat`, and one letter for the time format, corresponding to the `timeStyle` option.

The capital letters `F`, `L`, `M`, and `S` correspond to the options `'full'`, `'long'`, `'medium'`, and `'short'`.
