import {
  CheckCircleIcon,
  CircleIcon,
  CircleOffIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  type LucideIcon,
} from "lucide-react";

export const TaskStatus = {
  Open: 0,
  InProgress: 1,
  Blocked: 2,
  Cancelled: 3,
  Done: 4,
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export default interface Task {
  id: string;
  moduleID?: string;
  title: string;
  description: string;
  dueDate?: string;
  estimatedMinutes: number;
  status: TaskStatusType;
  isParent: boolean;
  parentTask?: string;
  isTemplate: boolean;
  seriesID?: string;
  repeatDays: number;
}

interface StatusRepresentation {
  icon: LucideIcon;
  colorClass: string;
}

export const STATUS_MAP: Record<TaskStatusType, StatusRepresentation> = {
  [TaskStatus.Open]: {
    icon: CircleIcon,
    colorClass: "text-muted-foreground",
  },
  [TaskStatus.InProgress]: {
    icon: CirclePlayIcon,
    colorClass: "text-blue-500",
  },
  [TaskStatus.Blocked]: {
    icon: CirclePauseIcon,
    colorClass: "text-orange-500",
  },
  [TaskStatus.Cancelled]: {
    icon: CircleOffIcon,
    colorClass: "text-slate-400",
  },
  [TaskStatus.Done]: {
    icon: CheckCircleIcon,
    colorClass: "text-green-500",
  },
};
