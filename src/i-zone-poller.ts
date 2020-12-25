export interface IZonePoller {
  getTimezones(url: string): Promise<{[id: string]: string}>
}
