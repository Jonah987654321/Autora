import { refreshClient } from "./client";
import { format } from "date-fns";

export async function loadAllSemesters(signal?: AbortSignal) {
    const response = await refreshClient.get("/academic/semesters", {
        signal: signal
    })
    return response.data
}

export async function createSemester(name: string, startDate: Date, endDate: Date) {
    const response = await refreshClient.post("/academic/semesters", {
        name: name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
    })
    return response.data
}

export async function editSemester(id: string, name: string, startDate: Date, endDate: Date) {
    const response = await refreshClient.put(`/academic/semesters/${id}`, {
        name: name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
    })
    return response.data
}