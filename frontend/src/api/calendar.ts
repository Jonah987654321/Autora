import { refreshClient } from "./client";

export async function createEvent(title: string, description: string, moduleID: string, type: number, start: Date, end: Date) {
    const response = await refreshClient.post("/calendar/events", {
        moduleID: moduleID,
        title: title,
        description: description,
        start: start,
        end: end,
        type: type
    });
    return response.data;
}

export async function updateEvent(eventID: string, title: string, description: string, moduleID: string, type: number, start: Date, end: Date) {
    const response = await refreshClient.put(`/calendar/events/${eventID}`, {
        moduleID: moduleID,
        title: title,
        description: description,
        start: start,
        end: end,
        type: type
    });
    return response.data;
}

export async function deleteEvent(eventID: string) {
    await refreshClient.delete(`/calendar/events/${eventID}`);
}

export async function getUpcomingEventsForModule(moduleID: string) {
    const response = await refreshClient.get(`/calendar/modules/${moduleID}/upcoming`);
    return response.data;
}