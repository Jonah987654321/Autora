import type { WeeklyScheduleEntry } from "@/models/module";
import { refreshClient } from "./client";
import { format } from "date-fns";

export async function loadAllSemesters(signal?: AbortSignal) {
  const response = await refreshClient.get("/academic/semesters", {
    signal: signal,
  });
  return response.data;
}

export async function createSemester(
  name: string,
  startDate: Date,
  endDate: Date,
) {
  const response = await refreshClient.post("/academic/semesters", {
    name: name,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });
  return response.data;
}

export async function editSemester(
  id: string,
  name: string,
  startDate: Date,
  endDate: Date,
) {
  const response = await refreshClient.put(`/academic/semesters/${id}`, {
    name: name,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });
  return response.data;
}

export async function getSemesterByID(id: string) {
  const response = await refreshClient.get(`/academic/semesters/${id}`);
  return response.data;
}

export async function getModulesBySemesterID(semesterID: string) {
  const response = await refreshClient.get(
    `/academic/semesters/${semesterID}/modules`,
  );
  return response.data;
}

export async function createModule(
  semesterID: string,
  name: string,
  abbr: string,
  color: string,
  ects?: number,
  grade?: string,
) {
  const request = {
    name: name,
    abbreviation: abbr,
    color: color,
    ...(ects !== undefined && { ects: ects }),
    ...(grade !== undefined && { grade: grade }),
  };
  const response = await refreshClient.post(
    `/academic/semesters/${semesterID}/modules`,
    request,
  );
  return response.data;
}

export async function getModule(moduleID: string) {
  const response = await refreshClient.get(`/academic/modules/${moduleID}`);
  return response.data;
}

export async function editModule(
  moduleID: string,
  semesterID: string,
  name: string,
  abbr: string,
  color: string,
  ects?: number,
  grade?: string,
) {
  const request = {
    semester: semesterID,
    name: name,
    abbreviation: abbr,
    color: color,
    ...(ects !== undefined && { ects: ects }),
    ...(grade !== undefined && { grade: grade }),
  };
  const response = await refreshClient.put(
    `/academic/modules/${moduleID}`,
    request,
  );
  return response.data;
}

export async function setWeeklySchedule(moduleID: string, data: WeeklyScheduleEntry[]) {
  const response = await refreshClient.put(`/academic/modules/${moduleID}/weekly-schedule`, data);
  return response.data;
}
