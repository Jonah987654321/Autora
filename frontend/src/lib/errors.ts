import { isAxiosError } from "axios";

export function getErrorStatus(error: unknown): number | "network" | "unknown" {
    if (isAxiosError(error)) {
        return error.response?.status ?? "network";
    }
    return "unknown";
}