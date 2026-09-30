import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { menuBarStateSelector } from "./menuBarState.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Minus,
  RemoveFormatting,
  SquareCode,
  Underline,
  Sigma,
  SquareSigma,
} from "lucide-react";

const Divider = () => <div className="w-px h-6 bg-border mx-1" />;

export const MenuBar = ({
  editor,
  onInsertMath,
}: {
  editor: Editor | null;
  onInsertMath: (isBlock: boolean) => void;
}) => {
  if (!editor) {
    return null;
  }

  const editorState = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-1 border rounded-md bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editorState.canBold}
          className={
            editorState.isBold ? "bg-accent text-accent-foreground" : ""
          }
          title="Fett"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editorState.canItalic}
          className={
            editorState.isItalic ? "bg-accent text-accent-foreground" : ""
          }
          title="Kursiv"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editorState.canUnderline}
          className={
            editorState.isUnderline ? "bg-accent text-accent-foreground" : ""
          }
          title="Unterstrichen"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editorState.canStrike}
          className={
            editorState.isStrike ? "bg-accent text-accent-foreground" : ""
          }
          title="Durchgestrichen"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editorState.canCode}
          className={
            editorState.isCode ? "bg-accent text-accent-foreground" : ""
          }
          title="Inline-Code"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Formatierung entfernen"
        >
          <RemoveFormatting className="w-4 h-4" />
        </Button>

        <Divider />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={
            editorState.isParagraph ? "bg-accent text-accent-foreground" : ""
          }
          title="Absatz"
        >
          <Pilcrow className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editorState.isHeading1 ? "bg-accent text-accent-foreground" : ""
          }
          title="Überschrift 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editorState.isHeading2 ? "bg-accent text-accent-foreground" : ""
          }
          title="Überschrift 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={
            editorState.isHeading3 ? "bg-accent text-accent-foreground" : ""
          }
          title="Überschrift 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <Divider />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={
            editorState.isBulletList ? "bg-accent text-accent-foreground" : ""
          }
          title="Aufzählung"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={
            editorState.isOrderedList ? "bg-accent text-accent-foreground" : ""
          }
          title="Nummerierte Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={
            editorState.isCodeBlock ? "bg-accent text-accent-foreground" : ""
          }
          title="Code-Block"
        >
          <SquareCode className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={
            editorState.isBlockquote ? "bg-accent text-accent-foreground" : ""
          }
          title="Zitat"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Trennlinie"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <Divider />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (editorState.isMathInline)
              editor.chain().focus().deleteSelection().run();
            else onInsertMath(false);
          }}
          className={
            editorState.isMathInline ? "bg-accent text-accent-foreground" : ""
          }
          title="Inline-Mathe"
        >
          <Sigma className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (editorState.isMathBlock)
              editor.chain().focus().deleteSelection().run();
            else onInsertMath(true);
          }}
          className={
            editorState.isMathBlock ? "bg-accent text-accent-foreground" : ""
          }
          title="Matheblock"
        >
          <SquareSigma className="w-4 h-4" />
        </Button>
        <Divider />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editorState.canUndo}
          title="Rückgängig"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editorState.canRedo}
          title="Wiederholen"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
};
