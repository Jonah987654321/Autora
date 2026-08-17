export interface WeeklyScheduleEntry {
  weekday: number;
  start: number;
  end: number;
  type: number;
}

export default interface ModuleData {
  id: string;
  semesterID: string;
  name: string;
  abbreviation: string;
  color: string;
  ects?: number;
  grade?: string;
  weeklySchedule: WeeklyScheduleEntry[];
}
