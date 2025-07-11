_Updates limited to IANA tzdb updates omitted._

### 3.10.3

* Fix UMD packaging.

### 3.10.2

* Fixed a very edge-case bug where `getSecondsInDay()` and `getMinutesInDay()` might return 0 for the very last Julian calendar date before a transition to the Gregorian calendar.
* Increased test coverage.

### 3.10.1

* Minor documentation update.

### 3.10.0

* Fixed bug with creating `DateTime` instances using `Date` objects.
* Other minor bug fixes.
* Code coverage increased to 95%.
* Updated build, linting, and documentation.
* Improved sourcemaps.
* CHANGELOG.md started (earlier changes listed added retroactively).

### 3.9.6

* Filter out extraneous items from `Timezone.getAvailableTimezones()`.

### 3.9.5

* Updates for legacy SystemV timezones.

### 3.8.11

* Fix missing country and population info for some aliased timezones names.

### 3.8.8

* Improve timezone alias matching.
* Fix "zh-tw" local AM/PM parsing.

### 3.8.1

* Improvements for more consistent TAI-to-UTC-and-back time conversions.

### 3.7.5

* Update ΔT values from 1992-2019.

### 3.7.4

* Fix bug in splicing `Intl`-derived timezone transitions onto tabularly defined data.
* Update 2022 estimated ΔT.

### 3.7.3

* Prevent exceptions from being thrown by null/undefined locale settings. Treat null/undefined/empty string locale as default locale.
* Add caching to speed up format parsing.
* Add `Timezone.getAliasesForZone()` method.
* Gracefully handle timezone names which may be new and known to @tubular/time, but which are not yet known to JavaScript's `Intl` package.
* Fix z/zz formatting with `Intl`-unrecognized timezone names.
* Add `Timezone.stdRule` and `Timezone.dstRule` accessors to get textual descriptions of a Timezone's latest rules for starting and ending DST (undefined if timezone currently does not observe DST).
* Improve format access to short-form timezone names.

### 3.5.1

* Added Y~ and MMM~ format tokens for CJK formatting, extending the new CJK formatting added in v3.5.0.

### 3.5.0

* Special CJK date formatting options

The date formatting tokens YYYY, y, MMMM, MM, M, DD, and D can now have an optional trailing tilde (`~`) added. This is for special handling of Chinese, Japanese, and Korean (CJK) date notation. The `~` is replaced, where appropriate, with `年`, `月`, or `日` for Chinese and Japanese, and with `년`, `월`, or `일` for Korean. Korean formatting also adds a space character when the following character is a letter or digit, but not when punctuation or the end of the format string comes next.

For all other languages, `~` is replaced with a space character when the following character is a letter or digit, or simply removed when followed by punctuation or the end of the format string.

* Added Timezone.getAllTransitions() function.
* Improved retrieval of timezone updates, taking advantage of tzexplorer.org.
