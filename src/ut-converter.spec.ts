import { expect } from 'chai';
import { getDeltaTAtTaiMillis, isSafeTaiMillis, taiDaysToUt, taiToUtMillis, utToTai, utToTaiMillis } from './ut-converter';
import { DateTime } from './date-time';
import { DAY_MSEC, DELTA_TDT_SEC, UNIX_TIME_ZERO_AS_JULIAN_DAY } from './common';
import { initTimezoneSmall } from './index';
import { round } from '@tubular/math';

const SIX_MONTHS_DAYS = 180;
const TEST_DTS = [
  22.69, 23.12, 23.49, 23.79, 24.02, 24.20, 24.32, 24.39, 24.42, 24.41,
  24.38, 24.32, 24.25, 24.16, 24.08, 24.04, 24.06, 24.17, 24.43, 24.83,
  25.35, 25.92, 26.51, 27.05, 27.51, 27.89, 28.24, 28.58, 28.93, 29.32,
  29.70, 30.00, 30.20, 30.41, 30.76, 31.34, 32.03, 32.65, 33.07, 33.36,
  33.62, 33.96, 34.44, 35.09, 35.95, 36.93, 37.96, 38.95, 39.93, 40.95,
  42.04, 43.15, 44.24, 45.28, 46.28, 47.29, 48.33, 49.37, 50.36, 51.28,
  52.13, 52.94, 53.70, 54.39, 54.98, 55.46, 55.89, 56.37, 56.99, 57.70,
  58.31, 59.12, 59.98, 60.79, 61.63, 62.30, 62.97, 63.47, 63.83, 64.09,
  64.30, 64.47, 64.57, 64.69, 64.85, 65.15, 65.46, 65.78, 66.07, 66.32,
  66.60, 66.91, 67.28, 67.64, 68.10, 68.59, 68.97, 69.22, 69.36, 69.36,
  69.28
];

describe('UT/TDT Converter', () => {
  initTimezoneSmall();

  it('should convert properly between time systems', () => {
    for (let t = UNIX_TIME_ZERO_AS_JULIAN_DAY - 75 * SIX_MONTHS_DAYS; t < UNIX_TIME_ZERO_AS_JULIAN_DAY + 160 * SIX_MONTHS_DAYS; t += SIX_MONTHS_DAYS) {
      const millis = (t - UNIX_TIME_ZERO_AS_JULIAN_DAY) * DAY_MSEC;

      expect(utToTai(taiDaysToUt(t))).to.be.approximately(t, 1E-15);
      expect(utToTaiMillis(taiToUtMillis(millis))).to.be.approximately(millis, 0.001);
      expect(utToTaiMillis(taiToUtMillis(millis, true), true)).to.be.approximately(millis, 0.55);
      expect(taiToUtMillis(utToTaiMillis(millis, true), true)).to.equal(millis);
    }

    for (let y = 1922; y <= 2022; ++y) {
      const now = new DateTime([y], 'UTC');
      const epochMillis = now.epochMillis;
      const deltaTai = round(now.wallTime.deltaTai * 1000);

      expect((utToTaiMillis(epochMillis) - epochMillis) / 1000 + DELTA_TDT_SEC).to.be.approximately(TEST_DTS[y - 1922], 0.015);
      expect(getDeltaTAtTaiMillis(epochMillis)).to.be.approximately(TEST_DTS[y - 1922], 0.015);
      now.timezone = 'TAI' as any;
      expect(now.epochMillis - epochMillis).to.be.approximately(deltaTai, 0.55);
      now.timezone = 'UTC' as any;
      expect(now.epochMillis).equals(epochMillis);
    }
  });

  it('isSafeTaiMillis', () => {
    expect(isSafeTaiMillis(new Date('1950-12-31').getTime())).to.be.false;
    expect(isSafeTaiMillis(new Date('2024-12-31').getTime())).to.be.true;
    expect(isSafeTaiMillis(new Date('2099-12-31').getTime())).to.be.false;
  });
});
