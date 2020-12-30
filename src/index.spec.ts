import { expect } from 'chai';
import {
  addZonesUpdateListener, clearZonesUpdateListeners, getTimezones, initTimezoneSmall,
  pollForTimezoneUpdates, Timezone
} from './index';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import { zonePollerNode } from './zone-poller-node';

describe('Zone updates', () => {
  it('should retrieve remote timezone updates', function (done) {
    this.slow(3000);
    this.timeout(10000);

    addZonesUpdateListener(result => {
      clearZonesUpdateListeners();
      expect(typeof result === 'boolean').to.be.true;
      done();
    });

    pollForTimezoneUpdates(zonePollerNode);
  });

  it('should fail to retrieve remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(10000);

    addZonesUpdateListener(result => {
      clearZonesUpdateListeners();
      expect(result instanceof Error).to.be.true;
      done();
    });

    // Force bad time zones name
    pollForTimezoneUpdates(zonePollerNode, 'qqq' as any);
  });

  it('should retrieve one-off remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(10000);

    getTimezones(zonePollerNode, 'large')
      .then(result => {
        expect(typeof result === 'boolean').to.be.true;
        done();
      })
      .catch(() => {
        expect(false).to.be.true;
      });
  });

  it('should detect timezone changes', function () {
    initTimezoneSmall();
    expect(Timezone.defineTimezones(timezoneSmall)).to.be.false;
    expect(Timezone.defineTimezones(timezoneLarge)).to.be.true;
  });
});
