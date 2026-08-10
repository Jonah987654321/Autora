import { refreshClient } from "./client";
import { format } from "date-fns";

export async function loadAllSemesters(signal?: AbortSignal) {
    const response = await refreshClient.get("/academic/semesters", {
        signal: signal
    });
    return response.data;
}

export async function createSemester(name: string, startDate: Date, endDate: Date) {
    const response = await refreshClient.post("/academic/semesters", {
        name: name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
    });
    return response.data;
}

export async function editSemester(id: string, name: string, startDate: Date, endDate: Date) {
    const response = await refreshClient.put(`/academic/semesters/${id}`, {
        name: name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
    });
    return response.data;
}

export async function getModulesBySemesterID(semesterID: string) {
    const response = await refreshClient.get(`/academic/semesters/${semesterID}/modules`);
    return response.data;
}

export async function createModule(semesterID: string, name: string, abbr: string, color: string, ects?: number, grade?: string) {
    let request = {
        name: name,
        abbreviation: abbr,
        color: color,
        ...(ects !== undefined && { ects: ects }),
        ...(grade !== undefined && { grade: grade })
    };
    const response = await refreshClient.post(`/academic/semesters/${semesterID}/modules`, request);
    return response.data;
}