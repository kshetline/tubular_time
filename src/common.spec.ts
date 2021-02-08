import { expect } from 'chai';
import { parseISODateTime } from './common';

describe('Common', () => {
  it('should parse ISO date/time strings.', () => {
    expect(parseISODateTime('19621013')).to.include({ y: 1962, q: 4, m: 10, d: 13, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('19620313')).to.include({ y: 1962, q: 1, m: 3, d: 13, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('19620413')).to.include({ y: 1962, q: 2, m: 4, d: 13, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('19620813')).to.include({ y: 1962, q: 3, m: 8, d: 13, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('1962-10-13T03:09')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('1962-10-13  T03:09:05')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 5 });
    expect(parseISODateTime('1962-10-13T  03:09:05.3')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 5, millis: 300 });
    expect(parseISODateTime('1962-10-13 T 03:09:05,0305')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 5, millis: 30 });
    expect(parseISODateTime('+1962-10-13  03:09')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('-1962-10-13 03:09')).to.include({ y: -1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('1962-10-13T03:09:01')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 1 });
    expect(parseISODateTime('1962-10-13T03:09:01-0500')).to.include({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 1, utcOffset: -18000 });
    expect(parseISODateTime('2020-11-29 23:24:25 +03:00')).to.include({ y: 2020, m: 11, d: 29, hrs: 23, min: 24, sec: 25, utcOffset: 10800 });
    expect(parseISODateTime('2020-W01-1')).to.include({ yw: 2020, w: 1, dw: 1, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('2020001')).to.include({ y: 2020, dy: 1, hrs: 0, min: 0, sec: 0 });
    expect(parseISODateTime('2020-001')).to.include({ y: 2020, dy: 1, hrs: 0, min: 0, sec: 0 });
  });
});
