export const TaskStatus = {
    Open: 0,
    InProgress: 1,
    Blocked: 2,
    Cancelled: 3,
    Done: 4
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export default interface Task {
    id: string,
    moduleID?: string,
    title: string,
    description: string,
    dueDate?: string,
    estimatedMinutes: number,
    status: TaskStatusType,
    isParent: boolean,
    parentTask?: string,
    isTemplate: boolean,
    seriesID?: string,
    repeatDays: number
}