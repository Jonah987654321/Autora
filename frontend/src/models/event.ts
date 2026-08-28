export default interface CalendarEvent {
  id: string;
  moduleID: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: number;
}
