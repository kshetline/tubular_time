import { assert, expect } from 'chai';
import { getISOFormatDate, Calendar, LAST, YMDDate } from './calendar';

describe('Calendar', () => {
  const calendar = new Calendar();

  it('should consistently convert the date for a day number back to the same day number.', () => {
    let match = true;
    let dayNum: number;
    let dayNum2: number;
    let ymd: YMDDate;

    // Trial 1 covers BCE-to-CE transition, trial 2 covers Julian-to-Gregorian transition.
    for (let trial = 1; trial <= 2 && match; ++trial) {
      const start = (trial === 1 ? -722000 : -142000);
      const end   = (trial === 1 ? -717000 :  -97000);

      for (dayNum = start; dayNum <= end && match; dayNum += (match ? 1 : 0)) {
        ymd = calendar.getDateFromDayNumber(dayNum);
        dayNum2 = calendar.getDayNumber(ymd);
        match = (dayNum === dayNum2);
      }
    }

    assert(match, dayNum + ' -> ' + getISOFormatDate(ymd) + ' -> ' + dayNum2);
  });

  it('should return Saturday (6) for 1962-10-13.', () => {
    expect(calendar.getDayOfWeek(1962, 10, 13)).to.equal(6);
  });

  it('should return Friday (5) for 2016-12-16.', () => {
    expect(calendar.getDayOfWeek(2016, 12, 16)).to.equal(5);
  });

  it('should return 24 as the fourth Thursday of 2016/11.', () => {
    expect(calendar.getDateOfNthWeekdayOfMonth(2016, 11, 4, 4)).to.equal(24);
  });

  it('should return a series of Tuesdays at the correct index for each month.', () => {
    let match = true;
    let countMatch = true;
    let count = 0;
    let expectedCount = 0;
    let month = 1;
    let day: number;
    let index = 0;
    let ymd, lastYmd: YMDDate;

    for (let dayNum = 9497; dayNum <= 10225 && match && countMatch; dayNum += (match ? 7 : 0)) { // 1996-01-02 through 1997-12-30
      ymd = calendar.getDateFromDayNumber(dayNum);

      if (ymd.m === month)
        ++index;
      else {
        count = calendar.getDayOfWeekInMonthCount(lastYmd?.y, lastYmd?.m, 2);
        expectedCount = index;
        countMatch = (count === expectedCount);
        index = 1;
        month = ymd.m;
      }

      day = calendar.getDateOfNthWeekdayOfMonth(ymd.y, ymd.m, 2, index);
      match = (day === ymd.d);
      lastYmd = ymd;
    }

    assert(match, getISOFormatDate(ymd) + ' -> ' + index + ': ' + day);
    assert(countMatch, getISOFormatDate(lastYmd) + ' -> ' + count + ' counted, ' + expectedCount + ' expected.');
  });

  it('should have only 19 days in September 1752 when most of North America switched to the Gregorian calendar.', () => {
    calendar.setGregorianChange(1752, 9, 14);
    expect(calendar.getDaysInMonth(1752, 9)).to.equal(19);
  });

  // Proceeding with modified Gregorian Calendar change...

  it('should return 30 as the third Saturday of 1752/09.', () => {
    expect(calendar.getDateOfNthWeekdayOfMonth(1752, 9, 6, 3)).to.equal(30);
  });

  it('should return 30 as the last Saturday of 1752/09.', () => {
    expect(calendar.getDateOfNthWeekdayOfMonth(1752, 9, 6, LAST)).to.equal(30);
  });
});
