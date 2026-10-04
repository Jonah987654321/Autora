import { refreshClient } from "./client";

export interface FileUploadResp {
    fileName: string;
}

export async function uploadMedia(file: File): Promise<FileUploadResp> {
    const response = await refreshClient.post("/upload", file, {headers: {"Content-Type": "application/octet-stream"}});
    return response.data;
}