import type { JSONContent } from "@tiptap/react";

export default interface LectureNote {
    id: string;
    moduleID: string;
    nr: number;
    title: string;
    start: string;
    end: string;
    linkedFiles: string[];
    content: JSONContent;
    summary: JSONContent;
    summaryDone: boolean;
}