import { expect } from 'chai';
import { SUNDAY } from './calendar';
import { DateTimeField, DateTime } from './date-time';
import { Timezone } from './timezone';
import { initTimeZoneLarge } from './timezone-large';
import { initTimeZoneLargeAlt } from './timezone-large-alt';
import { initTimeZoneSmall } from './timezone-small';
import { parseISODateTime } from './common';

describe('DateTime', () => {
  initTimeZoneSmall();
  initTimeZoneLarge();
  initTimeZoneLargeAlt();

  beforeEach(() => {
    Timezone.defineTimeZones({
      'America/Juneau': '+1502 -0900 60;f2/0/LMT -8W/0/LMT -80/0/PST -70/10/PWT -70/10/PPT -70/10/PDT -80/10/YDT -90/0/YST -90/0/AKST -80/10/AKDT;1234252525252525252525252526252525789898989898989898989898989898989898989898989898989898989898989898989898989898989898989898989898;-48PP2 1jVM0 1EX12 8x10 iy0 Vo10 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 s10 1Vz0 LB0 1BX0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cM0 1cM0 1cL0 1cN0 1fz0 1a10 1fz0 co0 10q0 1cL0 1cN0 1cL0 1cN0 1cL0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0;2007 11 1 1 2:0 0 0,2007 3 8 1 2:0 0 60',
      'America/New_York': '-045602 -0500 60;-4U.2/0/LMT -50/0/EST -40/10/EDT -40/10/EWT -40/10/EPT;121212121212121212121212121212121212121212121212134121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121212121;-3tFH0 1nEe0 1nX0 11B0 1nX0 11B0 1qL0 1a10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 RB0 8x40 iv0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 s10 1Vz0 LB0 1BX0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0;2007 11 1 1 2:0 0 0,2007 3 8 1 2:0 0 60',
      'Europe/Dublin': '-0025 +0100 -60;-p/0/LMT -p/0/DMT z/10/IST 0/0/GMT 10/10/BST 10/10/IST 10/0/IST 0/-10/GMT;123434343434353535353535353535353535353535353535353535353535353535353535353535353535353535353567676767676767676767676767676767676767676767676767676767676767676767676767676767676767676767676767676767676767676767676;-3BHbz 1ra20 Rc0 1fzz 14M0 1fc0 1g00 1co0 1dc0 1co0 1oo0 1400 1dc0 19A0 1io0 1io0 WM0 1o00 14o0 1o00 17c0 1io0 17c0 1fA0 1a00 1lc0 17c0 1io0 17c0 1fA0 1a00 1io0 17c0 1io0 17c0 1fA0 1cM0 1io0 17c0 1fA0 1a00 1io0 17c0 1io0 17c0 1fA0 1a00 1io0 1qM0 Dc0 g600 14o0 1wo0 17c0 1io0 11A0 1o00 17c0 1fA0 1a00 1fA0 1cM0 1fA0 1a00 17c0 1fA0 1a00 1io0 17c0 1lc0 17c0 1fA0 1a00 1io0 17c0 1io0 17c0 1fA0 1a00 1a00 1qM0 WM0 1qM0 11A0 1o00 WM0 1qM0 WM0 1qM0 WM0 1qM0 WM0 1tA0 IM0 1EJ0 7jD0 U00 1tA0 U00 1tA0 U00 1tA0 U00 1tA0 WM0 1qM0 WM0 1qM0 WM0 1tA0 U00 1tA0 U00 1tA0 11z0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 14o0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0;1981 3 0 1 1:0 2 0,1996 10 0 1 1:0 2 -60',
      'Pacific/Apia': '+123304 +1300 60;cx.4/0/LMT -bq.U/0/LMT -bu/0 -b0/0 -a0/10 e0/10 d0/0;12343456565656565656565656565656565656565656;-38Fox.4 J1A0 1yW03.4 2rRbu 1ff0 1a00 CI0 AQ0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0;2012 4 1 1 4:0 0 0,2012 9 0 1 3:0 0 60'
    });
  });

  it('should skip an hour starting Daylight Saving Time.', () => {
    const zone = Timezone.getTimeZone('America/New_York');
    const time = new DateTime({ y: 2018, m: 3, d: 11, hrs: 1, min: 59, sec: 59 }, zone);

    expect(time.wallTime.utcOffset).to.equal(-5 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EST');
    time.add(DateTimeField.SECONDS, 1);
    expect(time.wallTime.utcOffset).to.equal(-4 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EDT');
    expect(time.wallTime.hrs).to.equal(3);
    time.add(DateTimeField.SECONDS, -1);
    expect(time.wallTime.hrs).to.equal(1);
    expect(time.getSecondsInDay()).to.equal(82800);
    expect(time.getMinutesInDay()).to.equal(1380);
  });

  it('should turn back an hour ending Daylight Saving Time.', () => {
    const zone = Timezone.getTimeZone('America/New_York');
    const time = new DateTime({ y: 2018, m: 11, d: 4, hrs: 1, min: 59, sec: 59, occurrence: 1 }, zone);

    expect(time.wallTime.utcOffset).to.equal(-4 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EDT');
    time.add(DateTimeField.SECONDS, 1);
    expect(time.wallTime.utcOffset).to.equal(-5 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EST');
    expect(time.wallTime.hrs).to.equal(1);
    expect(time.wallTime.occurrence).to.equal(2);
    time.add(DateTimeField.SECONDS, -1);
    expect(time.wallTime.hrs).to.equal(1);
    expect(time.wallTime.occurrence).to.equal(1);
    expect(time.getSecondsInDay()).to.equal(90000);
    expect(time.getMinutesInDay()).to.equal(1500);
  });

  it('should end Daylight Saving Time correctly on a future computed date.', () => {
    const zone = Timezone.getTimeZone('America/New_York');
    const time = new DateTime({ y: 2100, m: 11, d: 7, hrs: 1, min: 59, sec: 59, occurrence: 1 }, zone);

    expect(time.wallTime.utcOffset).to.equal(-4 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EDT');
    time.add(DateTimeField.SECONDS, 1);
    expect(time.wallTime.utcOffset).to.equal(-5 * 3600);
    expect(zone.getDisplayName(time.utcTimeMillis)).to.equal('EST');
    expect(time.wallTime.hrs).to.equal(1);
    expect(time.wallTime.occurrence).to.equal(2);
    time.add(DateTimeField.SECONDS, -1);
    expect(time.wallTime.hrs).to.equal(1);
    expect(time.wallTime.occurrence).to.equal(1);
  });

  it('should handle missing day in Pacific/Apia, December 2011.', () => {
    const zone = Timezone.getTimeZone('Pacific/Apia');
    const time = new DateTime({ y: 2011, m: 12, d: 1, hrs: 0, min: 0, sec: 0 }, zone);

    expect(time.getSecondsInDay(2011, 12, 30)).to.equal(0);
    const calendar = time.getCalendarMonth(2011, 12, SUNDAY);
    expect(calendar[32].d).to.equal(29);
    expect(calendar[33].d).to.equal(-30);
    expect(calendar[34].d).to.equal(31);
  });

  it('should handle 48-hour day in America/Juneau, October 1867.', () => {
    const zone = Timezone.getTimeZone('America/Juneau');
    const time = new DateTime({ y: 1867, m: 10, d: 18, hrs: 0, min: 0, sec: 0, occurrence: 1 }, zone);

    expect(time.getSecondsInDay()).to.equal(172800);
    expect(time.getMinutesInDay()).to.equal(2880);
    expect(time.wallTime.utcOffset).to.equal(54120);
    time.add(DateTimeField.HOURS, 24);
    expect(time.wallTime.utcOffset).to.equal(-32280);
    expect(time.wallTime.d).to.equal(18);
    expect(time.wallTime.hrs).to.equal(0);
    expect(time.wallTime.occurrence).to.equal(2);
  });

  it('should handle negative Daylight Saving Time.', () => {
    const zone = Timezone.getTimeZone('Europe/Dublin');
    const time = new DateTime({ y: 2017, m: 12, d: 1, hrs: 0, min: 0, sec: 0 }, zone);

    expect(time.wallTime.dstOffset).to.equal(-3600);
    time.add(DateTimeField.MONTHS, 6);
    expect(time.wallTime.dstOffset).to.equal(0);
  });

  it('should handle non-whole-minute UTC offsets.', () => {
    const zone = Timezone.getTimeZone('Pacific/Apia');
    const time = new DateTime({ y: 1892, m: 1, d: 1, hrs: 0, min: 0, sec: 0 }, zone);

    expect(time.wallTime.utcOffset).to.equal(45184);
    expect(zone.getFormattedOffset(time.utcTimeMillis)).to.equal('+12:33:04');
    time.add(DateTimeField.YEARS, 1);
    expect(time.wallTime.utcOffset).to.equal(-41216);
    expect(zone.getFormattedOffset(time.utcTimeMillis)).to.equal('-11:26:56');
    time.add(DateTimeField.YEARS, 20);
    expect(time.wallTime.utcOffset).to.equal(-41400);
    expect(zone.getFormattedOffset(time.utcTimeMillis)).to.equal('-11:30');

    const time2 = new DateTime({ y: 1900, m: 1, d: 1, hrs: 0, min: 0, sec: 0 }, Timezone.UT_ZONE);
    const time3 = new DateTime(time2.utcTimeMillis, zone);

    expect(time3.wallTime.y).to.equal(1899);
    expect(time3.wallTime.m).to.equal(12);
    expect(time3.wallTime.d).to.equal(31);
    expect(time3.wallTime.hrs).to.equal(12);
    expect(time3.wallTime.min).to.equal(33);
    expect(time3.wallTime.sec).to.equal(4);
  });

  it('should parse ISO date/time strings.', () => {
    expect(parseISODateTime('1962-10-13T03:09')).to.eql({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('+1962-10-13T03:09')).to.eql({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('-1962-10-13T03:09')).to.eql({ y: -1962, m: 10, d: 13, hrs: 3, min: 9, sec: 0 });
    expect(parseISODateTime('1962-10-13T03:09:01')).to.eql({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 1 });
    expect(parseISODateTime('1962-10-13T03:09:01-0500')).to.eql({ y: 1962, m: 10, d: 13, hrs: 3, min: 9, sec: 1, utcOffset: -18000 });
    expect(parseISODateTime('2020-11-29 23:24:25 +03:00')).to.eql({ y: 2020, m: 11, d: 29, hrs: 23, min: 24, sec: 25, utcOffset: 10800 });
  });
});
