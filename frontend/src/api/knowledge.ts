import type LectureNote from "@/models/note";
import type { JSONContent } from "@tiptap/react";
import { refreshClient } from "./client";

export async function createNote(
  moduleID: string,
  title: string,
  start: Date,
  end: Date,
): Promise<LectureNote> {
  const response = await refreshClient.post("/knowledge/notes", {
    moduleID: moduleID,
    title: title,
    start: start,
    end: end,
  });
  return response.data;
}

export async function updateNote(
  noteID: string,
  moduleID: string,
  title: string,
  start: Date,
  end: Date,
  content: JSONContent,
  summary: JSONContent,
  summaryDone: boolean,
): Promise<LectureNote> {
  const response = await refreshClient.put(
    `/knowledge/notes/${noteID}`,
    {
      moduleID: moduleID,
      title: title,
      start: start,
      end: end,
      content: content,
      summary: summary,
      summaryDone: summaryDone,
    },
    { adapter: "fetch", fetchOptions: { keepalive: true } },
  );
  return response.data;
}

export async function deleteNote(noteID: string) {
  await refreshClient.delete(`/knowledge/notes/${noteID}`);
}

export async function getNoteByID(noteID: string): Promise<LectureNote> {
  const response = await refreshClient.get(`/knowledge/notes/${noteID}`);
  return response.data;
}

export async function getNotesByModule(
  moduleID: string,
): Promise<LectureNote[]> {
  const response = await refreshClient.get(
    `/knowledge/notes/module/${moduleID}`,
  );
  return response.data;
}
