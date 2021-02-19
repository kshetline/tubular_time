export interface IZonePoller {
  getTimezones(url: string): Promise<Record<string, string>>
}
