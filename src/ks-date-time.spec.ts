import { DateTimeField, KsDateTime } from './ks-date-time';
import { KsTimeZone } from './ks-timezone';

describe('KsDateTime', () => {
  it('should skip an hour starting Daylight Saving Time.', () => {
    const zone = KsTimeZone.getTimeZone('America/New_York');
    const time = new KsDateTime({y: 2018, m: 3, d: 11, hrs: 1, min: 59, sec: 59}, zone);

    expect(time.wallTime.utcOffset).toEqual(-300);
    expect(zone.getDisplayName(time.utcTimeMillis)).toEqual('EST');
    time.add(DateTimeField.SECONDS, 1);
    expect(time.wallTime.utcOffset).toEqual(-240);
    expect(zone.getDisplayName(time.utcTimeMillis)).toEqual('EDT');
    expect(time.wallTime.hrs).toEqual(3);
    time.add(DateTimeField.SECONDS, -1);
    expect(time.wallTime.hrs).toEqual(1);
  });

  it('should turn back an hour ending Daylight Saving Time.', () => {
    const zone = KsTimeZone.getTimeZone('America/New_York');
    const time = new KsDateTime({y: 2018, m: 11, d: 4, hrs: 1, min: 59, sec: 59, occurrence: 1}, zone);

    expect(time.wallTime.utcOffset).toEqual(-240);
    expect(zone.getDisplayName(time.utcTimeMillis)).toEqual('EDT');
    time.add(DateTimeField.SECONDS, 1);
    expect(time.wallTime.utcOffset).toEqual(-300);
    expect(zone.getDisplayName(time.utcTimeMillis)).toEqual('EST');
    expect(time.wallTime.hrs).toEqual(1);
    expect(time.wallTime.occurrence).toEqual(2);
    time.add(DateTimeField.SECONDS, -1);
    expect(time.wallTime.hrs).toEqual(1);
    expect(time.wallTime.occurrence).toEqual(1);
  });
});
