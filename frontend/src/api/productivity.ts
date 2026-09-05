import type { TaskStatusType } from "@/models/tasks";
import { refreshClient } from "./client";

export const SeriesUpdate = {
  None: 0,
  Upcoming: 1,
  All: 2,
} as const;

export type SeriesUpdateType =
  (typeof SeriesUpdate)[keyof typeof SeriesUpdate];

export async function getOpenTodosForModule(moduleID: string) {
  const response = await refreshClient.get(
    `/productivity/tasks/modules/${moduleID}/open`,
  );
  return response.data;
}

export async function createTask(
  title: string,
  description: string,
  status: TaskStatusType,
  moduleID?: string,
  dueDate?: Date,
  estimatedMinutes?: number,
  parentTask?: string,
  isTemplate?: boolean,
  repeatDays?: number,
) {
  const response = await refreshClient.post("/productivity/tasks", {
    moduleID: moduleID,
    title: title,
    description: description,
    dueDate: dueDate,
    estimatedMinutes: estimatedMinutes,
    status: status,
    parentTask: parentTask,
    isTemplate: isTemplate,
    repeatDays: repeatDays,
  });
  return response.data;
}

export async function updateTask(
  taskID: string,
  seriesUpdate: SeriesUpdateType,
  overwriteModified: boolean,
  title: string,
  description: string,
  status: TaskStatusType,
  moduleID?: string,
  dueDate?: Date,
  estimatedMinutes?: number,
  parentTask?: string,
  isTemplate?: boolean,
  repeatDays?: number,
) {
  const response = await refreshClient.put(`/productivity/tasks/${taskID}`, {
    moduleID: moduleID,
    title: title,
    description: description,
    dueDate: dueDate,
    estimatedMinutes: estimatedMinutes,
    status: status,
    parentTask: parentTask,
    isTemplate: isTemplate,
    repeatDays: repeatDays,
    updateCompleteSeries: seriesUpdate,
    overwriteModified: overwriteModified,
  });
  return response.data;
}

export async function deleteTask(
  taskID: string,
  seriesUpdate: SeriesUpdateType,
  overwriteModified: boolean,
) {
  await refreshClient.delete(`/productivity/tasks/${taskID}`, {
    params: {
      overwriteModified: overwriteModified,
      updateSeries: seriesUpdate,
    },
  });
}
