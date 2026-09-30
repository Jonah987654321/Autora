import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import "katex/dist/katex.css";
import katex from "katex";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { useTranslation } from "react-i18next";

interface KatexDisplayProps {
  data: string;
}

function KatexDisplay({data}: KatexDisplayProps) {
  const displayRef = useRef(null);

  useEffect(() => {
      if (displayRef.current) {
        katex;
        katex.render(data, displayRef.current, {
          throwOnError: false,
        });
      }
  }, [data]);

  return <span ref={displayRef} />
}

interface MathInputProps {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onSubmit: (content: string) => void;
  initialData?: string;
  mode: "update" | "insert"
}

export default function MathInput({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode
}: MathInputProps) {
  const {t} = useTranslation();

  const [data, setData] = useState("");

  useEffect(() => {
    setData(initialData ?? "");
  }, [initialData, open]);

  const handleSubmit = () => {
    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("notes.editor.mathInput.title")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>{t("notes.editor.mathInput.labelInput")}</FieldLabel>
          <FieldContent>
            <InputGroup>
              <InputGroupInput
                value={data}
                onChange={(e) => setData(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && data !== "") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              <InputGroupAddon align="inline-end">
                <Kbd>Enter</Kbd>
              </InputGroupAddon>
            </InputGroup>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>{t("notes.editor.mathInput.labelPreview")}</FieldLabel>
          <FieldContent>
            <KatexDisplay data={data} />
          </FieldContent>
        </Field>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={data === ""}
          >
            {mode == "update" ? t("notes.editor.mathInput.buttonUpdate") : t("notes.editor.mathInput.buttonInsert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
