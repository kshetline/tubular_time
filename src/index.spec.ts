import { expect } from 'chai';
import { addZonesUpdateListener, getTimezones, pollForTimezoneUpdates } from './index';
import { zonePollerNode } from './zone-poller-node';

describe('Zone updates', () => {
  it('should retrieve remote timezone updates', function (done) {
    this.slow(3000);
    this.timeout(10000);

    addZonesUpdateListener(result => {
      expect(result).to.be.true;
      expect(result instanceof Error).to.be.false;
      done();
    });

    pollForTimezoneUpdates(zonePollerNode);
  });

  it('should retrieve one-off remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(10000);
    getTimezones(zonePollerNode, 'large').then(result => {
      expect(result).to.be.true;
      done();
    })
      .catch(() => {
        expect(false).to.be.true;
      });
  });
});
