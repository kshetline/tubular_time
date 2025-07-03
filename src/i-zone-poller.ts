export interface IZonePoller {
  getLatestVersion(url: string): Promise<string>;
  getTimezones(url: string): Promise<Record<string, string>>;
}
