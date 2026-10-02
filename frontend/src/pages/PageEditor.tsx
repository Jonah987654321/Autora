import "@/css/editor.css";
import "katex/dist/katex.css";

import { MenuBar } from "@/components/specific/editor/MenuBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeperatorDot from "@/components/ui/seperator-dot";
import { cn } from "@/lib/utils";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Italic from "@tiptap/extension-italic";
import {
  BulletList,
  ListItem,
  ListKeymap,
  OrderedList,
} from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import UniqueID from "@tiptap/extension-unique-id";
import {
  Dropcursor,
  Focus,
  Gapcursor,
  Placeholder,
  TrailingNode,
  UndoRedo,
} from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  BookOpenIcon,
  CircleCheck,
  CircleX,
  GripVertical,
  HashIcon,
  RotateCcw,
  UnplugIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { all, createLowlight } from "lowlight";
import Mathematics from "@tiptap/extension-mathematics";
import { Link, useParams } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { getNoteByID, updateNote } from "@/api/knowledge";
import type ModuleData from "@/models/module";
import type LectureNote from "@/models/note";
import { getModule } from "@/api/academic";
import { useDateLocale } from "@/hooks/use-dateLocale";
import { format, isSameDay } from "date-fns";
import RelativeTimeLabel from "@/components/ui/RelativeTimeLabel";
import MathInput from "@/components/specific/editor/MathInput";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PageEditor() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  // --- Data states
  const [noteData, setNoteData] = useState<LectureNote | undefined>(undefined);
  const [moduleData, setModuleData] = useState<ModuleData | undefined>(
    undefined,
  );
  const lastInput = useRef(0);
  // Set Title
  useDocumentTitle(
    `${noteData ? (noteData.title !== "" ? noteData.title : t("notes.list.unnamedLecture")) + " - " : ""}${t("pageTitles.editor")}`,
  );
  // Indicator wether the summary is being edited or the real content
  const [isSummaryMode, _] = useState(false);
  // Math Input control
  type MathDialogState = {
    open: boolean;
    isBlock: boolean;
    mode: "insert" | "update";
    latex: string;
    pos?: number;
  };
  const [mathDialog, setMathDialog] = useState<MathDialogState>({
    open: false,
    isBlock: false,
    mode: "insert",
    latex: "",
  });
  const openMathInsert = (isBlock: boolean) =>
    setMathDialog({ open: true, isBlock, mode: "insert", latex: "" });

  // --- Init editor
  // Create lowlight code highlighting
  const codeblockHighlighting = createLowlight(all);
  // Extensions
  const extensions = [
    // ALWAYS REQUIRED
    Document,
    Text,
    Paragraph,

    // Other basics
    Dropcursor,
    Gapcursor,
    UndoRedo,
    TrailingNode,
    HardBreak,
    Heading.configure({ levels: [1, 2, 3] }),
    Typography,
    CodeBlockLowlight.configure({
      lowlight: codeblockHighlighting,
      enableTabIndentation: true,
    }),
    Blockquote,
    HorizontalRule,
    Placeholder.configure({
      placeholder: t("notes.editor.emptyPlaceholder"),
    }),
    Focus.configure({
      mode: "deepest",
    }),

    // Give every node a unique id
    UniqueID,

    // Lists
    ListItem,
    BulletList,
    OrderedList,
    ListKeymap,

    // Text-styling
    Bold,
    Italic,
    Strike,
    Underline,
    Code,

    // Support for maths rendering LaTeX using KaTeX
    Mathematics.configure({
      inlineOptions: {
        onClick: (node, pos) =>
          setMathDialog({
            open: true,
            isBlock: false,
            mode: "update",
            latex: node.attrs.latex,
            pos,
          }),
      },
      blockOptions: {
        onClick: (node, pos) =>
          setMathDialog({
            open: true,
            isBlock: true,
            mode: "update",
            latex: node.attrs.latex,
            pos,
          }),
      },
    }),
  ];
  const editor = useEditor({
    extensions: extensions,
    editorProps: {
      attributes: {
        class:
          "w-full h-full outline-none max-w-full [word-break:break-word] whitespace-pre-wrap",
      },
    },
    onUpdate: ({ editor }) => {
      if (noteData === undefined) return;

      if (isSummaryMode) {
        setNoteData((prev) => ({ ...prev!, summary: editor.getJSON() }));
      } else {
        setNoteData((prev) => ({ ...prev!, content: editor.getJSON() }));
      }
      lastInput.current = Date.now();
    },
    onBlur: () => {
      save();
    },
  });

  // --- Handle loading the data
  // state indicators
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  // id from url
  const { noteId } = useParams();
  // state for loaded data
  const loadData = async () => {
    if (noteId === undefined) return;

    setIsLoading(true);
    setIsError(false);
    try {
      const data = await getNoteByID(noteId);
      if (editor) {
        editor.commands.setContent(data.content);
      }
      setNoteData(data);
    } catch (error) {
      console.error("failed to fetch note data: ", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [noteId]);
  // handle module loading
  const loadModule = async () => {
    if (noteData === undefined) return;

    try {
      const data = await getModule(noteData.moduleID);
      setModuleData(data);
    } catch (error) {
      console.error("Failed to load module data: ", error);
    }
  };
  useEffect(() => {
    if (
      noteData &&
      (moduleData === undefined || moduleData.id !== noteData.moduleID)
    ) {
      loadModule();
    }
  }, [noteData]);

  // --- Handle saving
  const [isSaving, setIsSaving] = useState(false);
  const [savingFailed, setSavingFailed] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const lastSavedRef = useRef<Date | undefined>(undefined);
  const inSaveFailRetry = useRef(false);
  const saveFailRetryNo = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const save = async () => {
    const data = latestNoteData.current;
    if (!data) return;
    setIsSaving(true);
    setSavingFailed(false);
    try {
      await updateNote(
        data.id,
        data.moduleID,
        data.title,
        new Date(data.start),
        new Date(data.end),
        data.content,
        data.summary,
        data.summaryDone,
      );
      const now = new Date(Date.now());
      setLastSaved(now);
      lastSavedRef.current = now;
      inSaveFailRetry.current = false;
      saveFailRetryNo.current = 0;
    } catch (error) {
      console.error("saving failed: ", error);
      setSavingFailed(true);
      inSaveFailRetry.current = true;
      saveFailRetryNo.current += 1;
      // Use exponential backoff with max and jitter for retry timing
      const cap = Math.min(30000, 1000 * Math.pow(2, saveFailRetryNo.current));
      const baseWait = cap / 2;
      const jitter = Math.random() * baseWait;
      const waitTime = baseWait + jitter;
      retryTimeoutRef.current = setTimeout(() => {
        save();
      }, waitTime);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handle unmount / tab close
  // Safe state in ref
  const latestNoteData = useRef(noteData);
  useEffect(() => {
    latestNoteData.current = noteData;
  }, [noteData]);
  // save on unload -> saving without ui state updating
  const saveOnUnload = (e?: BeforeUnloadEvent) => {
    if (e && inSaveFailRetry.current) {
      e.preventDefault();
      return;
    }

    const data = latestNoteData.current;
    if (!data) return;
    updateNote(
      data.id,
      data.moduleID,
      data.title,
      new Date(data.start),
      new Date(data.end),
      data.content,
      data.summary,
      data.summaryDone,
    ).catch((err) => console.error("Unload save failed:", err));
  };
  useEffect(() => {
    // Save on closing tab/ browser window
    window.addEventListener("beforeunload", saveOnUnload);

    // Save on unmount (e.g. navigation)
    return () => {
      window.removeEventListener("beforeunload", saveOnUnload);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      saveOnUnload();
    };
  }, []);

  // --- Handle auto-saving
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (inSaveFailRetry.current) return;

      const lastSavedData = lastSavedRef.current;

      const now = Date.now();
      if (
        lastInput.current > 0 &&
        (lastSavedData === undefined ||
          (lastInput.current > lastSavedData.getTime() &&
            (now - lastInput.current >= 5000 ||
              now - lastSavedData.getTime() >= 60000)))
      ) {
        save();
      }
    }, 1000);

    return () => clearInterval(autoSaveInterval);
  }, []);

  // --- Handle Ctrl+S / Cmd+S Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // Prevent "Save as html dialog"

        if (inSaveFailRetry.current) return;
        save();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyE") {
        e.preventDefault();
        openMathInsert(false);
        return true;
      }
      return false;
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle scrolling for outline
  const scrollToHeading = (index: number) => {
    if (!editor) return;

    const headings = editor.view.dom.querySelectorAll<HTMLElement>(
      ":scope > h1, :scope > h2, :scope > h3",
    );
    const el = headings[index];
    if (!el) return;

    // Cursor on start of heading, without tiptap scrolling
    const pos = editor.view.posAtDOM(el, 0);
    editor
      .chain()
      .focus(null, { scrollIntoView: false })
      .setTextSelection(pos)
      .run();

    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const headingsList =
    noteData?.content?.content?.filter((e) => e.type === "heading") || [];

  return (
    <>
      {isLoading && (
        <div className="w-full h-dvh flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {!isLoading && isError && (
        <div className="w-full h-dvh flex flex-col items-center justify-center text-destructive">
          <UnplugIcon className="size-16 stroke-1" />
          <div className="text-2xl mt-10">
            {t("notes.editor.loadingFailed.title")}
          </div>
          <div className="text-muted-foreground">
            {t("notes.editor.loadingFailed.description")}
          </div>
          <div className="mt-5">
            <Button variant="secondary" onClick={loadData}>
              <RotateCcw />
              {t("notes.editor.loadingFailed.retry")}
            </Button>
          </div>
        </div>
      )}
      {!isLoading && !isError && noteData && (
        <div className="flex w-full h-dvh">
          <div className="flex-1 flex flex-col px-10 pt-10 min-h-0 min-w-0">
            <div>
              <div className="space-x-2">
                <Link to={`/course/${noteData.moduleID}`}>
                  <Badge>
                    <BookOpenIcon data-icon="inline-start" />
                    {moduleData !== undefined ? moduleData.name : <Spinner />}
                  </Badge>
                </Link>
                <Badge variant="secondary">
                  <HashIcon data-icon="inline-start" />
                  {t("notes.editor.lecture", { nr: noteData.nr })}
                </Badge>
              </div>
              <Input
                className="bg-transparent border-none rounded-none ring-0! p-0 text-3xl! pt-2 h-14"
                placeholder={t("notes.editor.emptyTitlePlaceholder")}
                value={noteData.title}
                onChange={(e) => {
                  setNoteData((prev) => ({ ...prev!, title: e.target.value }));
                  lastInput.current = Date.now();
                }}
                onBlur={save}
              />
              <div className="text-muted-foreground text-sm">
                {isSameDay(noteData.start, noteData.end) ? (
                  <>
                    {format(noteData.start, "PPP", { locale: dateLocale })}{" "}
                    <SeperatorDot />{" "}
                    {noteData.start !== noteData.end
                      ? `${format(noteData.start, "p", { locale: dateLocale })} - ${format(noteData.end, "p", { locale: dateLocale })}`
                      : format(noteData.start, "p", { locale: dateLocale })}
                  </>
                ) : (
                  `${format(noteData.start, "PPPp", { locale: dateLocale })} - ${format(noteData.end, "PPPp", { locale: dateLocale })}`
                )}
              </div>
            </div>
            <div className="pt-6">
              <MenuBar onInsertMath={openMathInsert} editor={editor} />
            </div>
            <EditorContent
              editor={editor}
              className="w-full flex-1 pt-2 px-3 min-h-0 overflow-y-auto min-w-0 overflow-x-hidden"
            />
            <DragHandle
              editor={editor}
              className="cursor-pointer translate-y-2"
            >
              <GripVertical className="size-4" />
            </DragHandle>
            <div className="bg-muted text-sm p-2 rounded-t-lg flex px-4">
              <div
                className={cn(
                  "flex justify-end items-center flex-1 gap-x-1",
                  isSaving
                    ? ""
                    : savingFailed
                      ? "text-destructive"
                      : "text-green-600",
                )}
              >
                {isSaving ? (
                  <>
                    <Spinner className="size-4" />{" "}
                    {t("notes.editor.saveStates.saving")}
                  </>
                ) : savingFailed ? (
                  <>
                    <CircleX className="size-4" />{" "}
                    {t("notes.editor.saveStates.failed")}
                  </>
                ) : (
                  <>
                    <CircleCheck className="size-4" />{" "}
                    {t("notes.editor.saveStates.saved")}{" "}
                    {lastSaved && <RelativeTimeLabel date={lastSaved} />}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="bg-muted/50 border-l border-border px-5 w-60 pt-10">
            <div>
              <div className="text-lg font-bold flex items-center gap-x-1">
                {t("notes.editor.outline")}
              </div>
              <div>
                {headingsList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("notes.editor.outlineEmpty")}
                  </div>
                ) : (
                  headingsList.map((e, index) => {
                    let textContent;
                    if (!e.content) {
                      textContent = t("notes.editor.outlineEmptyHeading");
                    } else {
                      textContent = e.content
                        .map((node: any) => node.text || "")
                        .join("");
                    }

                    const padMap: Record<number, string> = {
                      1: "pl-2",
                      2: "text-sm pl-5",
                      3: "text-sm pl-8",
                      4: "text-sm pl-8",
                      5: "text-sm pl-8",
                      6: "text-sm pl-8",
                    };

                    return (
                      <div
                        key={index}
                        onClick={() => scrollToHeading(index)}
                        className={cn(
                          "border-border border-l-3 truncate text-muted-foreground cursor-pointer hover:text-blue-400 hover:border-blue-400",
                          padMap[e.attrs ? e.attrs.level : 1],
                        )}
                      >
                        {textContent}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="pt-10">
              <div className="text-lg font-bold flex items-center gap-x-1">
                {t("notes.flashcards.title")}
              </div>
              <div className="text-muted-foreground text-sm">
                {t("notes.flashcards.empty")}
              </div>
              <div className="pt-3">
                <Button className="w-full" variant="outline">
                  {t("notes.flashcards.create")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <MathInput
        open={mathDialog.open}
        onOpenChange={(open) => setMathDialog((p) => ({ ...p, open }))}
        mode={mathDialog.mode}
        initialData={mathDialog.latex}
        onSubmit={(latex) => {
          if (!editor) return;
          const { isBlock, mode, pos } = mathDialog;
          if (mode === "update") {
            if (isBlock) editor.commands.updateBlockMath({ latex, pos });
            else editor.commands.updateInlineMath({ latex, pos });
          } else {
            const chain = editor.chain().focus();
            if (isBlock) chain.insertBlockMath({ latex }).run();
            else chain.insertInlineMath({ latex }).run();
          }
        }}
      />
    </>
  );
}
