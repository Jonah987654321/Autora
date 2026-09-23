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
  Gapcursor,
  TrailingNode,
  UndoRedo,
} from "@tiptap/extensions";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type MarkType,
  type NodeType,
  type TextType,
} from "@tiptap/react";
import { BookOpenIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { all, createLowlight } from "lowlight";
import Mathematics from "@tiptap/extension-mathematics";

export default function PageEditor() {
  const [currentNotesHTML, setCurrentNotesHTML] = useState("");

  // Create lowlight code highlighting
  const codeblockHighlighting = createLowlight(all);

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
        // optional options for the inline math node
      },
      blockOptions: {
        // optional options for the block math node
      },
      katexOptions: {
        // optional options for the KaTeX renderer
      },
    }),
  ];
  const editor = useEditor({
    extensions: extensions,
    content: "hi",
    editorProps: {
      attributes: {
        class: "w-full h-full outline-none",
      },
    },
  });

  // --- Handle heading retrieval
  const [headings, setHeadings] = useState<
    NodeType<
      string,
      Record<string, any> | undefined,
      any,
      (NodeType<any, any, any, any> | TextType<MarkType<any, any>>)[]
    >[]
  >([]);
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        currentContent: editor.getJSON(),
        currentHtml: editor.getHTML(),
      };
    },
  });

  useEffect(() => {
    if (editorState === null) return;
    setHeadings(
      editorState.currentContent.content.filter((e) => e.type === "heading"),
    );
    setCurrentNotesHTML(editorState.currentHtml);
  }, [editorState]);

  return (
    <>
      <div className="flex w-full h-dvh">
        <div className="flex-1 flex flex-col px-10 pt-10">
          <div>
            <div className="space-x-2">
              <Badge>
                <BookOpenIcon data-icon="inline-start" />
                Maths
              </Badge>
              <Badge variant="secondary">Vorlesung 21</Badge>
            </div>
            <Input
              className="bg-transparent border-none rounded-none ring-0! p-0 text-3xl! pt-2 h-14"
              placeholder="Gib der Vorlesung einen Titel"
            />
            <div className="text-muted-foreground text-sm">
              16. September 2026 <SeperatorDot /> 14:00-14:30
            </div>
          </div>
          <div className="pt-6">
            <MenuBar editor={editor} />
          </div>
          <EditorContent editor={editor} className=" w-full flex-1 pt-2 px-2" />
          <div className="py-4">
            <div className="flex items-center">
              <Button variant="ghost" className="w-full justify-start py-2">
                <ChevronRightIcon /> Zusammenfassung
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-muted/50 border-l border-border px-5 w-60 pt-10">
          <div>
            <div className="text-lg font-bold flex items-center gap-x-1">
              Gliederung
            </div>
            <div>
              {headings.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Füge Überschriften hinzu um die Gliederung zu sehen
                </div>
              ) : (
                headings.map((e, index) => {
                  let textContent;
                  if (!e.content) {
                    textContent = "Unnamed section";
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
              Karteikarten
            </div>
            <div className="text-muted-foreground text-sm">
              Noch keine Karteikarten erstellt
            </div>
            <div className="pt-3">
              <Button className="w-full" variant="outline">
                Karteikarte erstellen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
