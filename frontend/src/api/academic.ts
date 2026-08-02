import { refreshClient } from "./client";

export async function loadAllSemesters() {
    const response = await refreshClient.get("/academic/semesters")
    return response.data
}