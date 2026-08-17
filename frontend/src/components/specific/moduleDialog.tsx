import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { Spinner } from "../ui/spinner";
import { Check } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import ColorSelector from "../ui/color-choice";
import type ModuleData from "@/models/module";
import { toast } from "sonner";

interface ModuleDialogProps {
  mode: "edit" | "create";
  children: React.ReactNode;
  onSave: (name: string, abbr: string, color: string, ects?: number, grade?: string) => Promise<void>;
  initialData?: ModuleData;
}

export default function ModuleDialog({ children, mode, onSave, initialData }: ModuleDialogProps) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [nameInvalid, setNameInvalid] = useState(false);

  const [abbreviation, setAbbreviation] = useState("");
  const [abbreviationInvalid, setAbbreviationInvalid] = useState(false);

  const [color, setColor] = useState("gray");

  const [ects, setEcts] = useState<number | undefined>(undefined);
  const [ectsInvalid, setEctsInvalid] = useState(false);

  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [gradeInvalid, setGradeInvalid] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let startName;
    let startAbbr;
    let startColor;
    let startEcts;
    let startGrade;

    if (initialData !== undefined) {
      startName = initialData.name;
      startAbbr = initialData.abbreviation;
      startColor = initialData.color;
      startEcts = initialData.ects;
      startGrade = initialData.grade;
    } else {
      startName = "";
      startAbbr = "";
      startColor = "gray";
      startEcts = undefined;
      startGrade = undefined;
    }
    

    setName(startName);
    setNameInvalid(false);
    setAbbreviation(startAbbr);
    setAbbreviationInvalid(false);
    setColor(startColor);
    setEcts(startEcts);
    setEctsInvalid(false);
    setGrade(startGrade);
    setGradeInvalid(false);
  }, [dialogOpen, initialData])

  const toggleOpen = (state: boolean) => {
    if (!loading) {
      setDialogOpen(state);
    }
  }

  const submit = async () => {
    // --- Input validation
    let invalid = false;
    if (name == "") {
      setNameInvalid(true);
      invalid = true;
    }
    if (abbreviation == "") {
      setAbbreviationInvalid(true);
      invalid = true;
    }
    if (invalid) return;

    // --- Saving
    setLoading(true);
    try {
      await onSave(name, abbreviation, color, ects, grade);
      setLoading(false);
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create module: ", error);
      toast.error(t("common.internalServerError"));
      setLoading(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode == "edit"
              ? t("course.dialog.titleEdit")
              : t("course.dialog.titleNew")}
          </DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="input-courseName">
              {t("course.dialog.courseName")}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              value={name}
              id="input-courseName"
              aria-invalid={nameInvalid}
              placeholder={t(
                "course.dialog.courseNamePlaceholder",
              )}
              onChange={(e) => {
                setNameInvalid(false);
                setName(e.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="input-courseAbbreviation">
              {t("course.dialog.courseAbbreviation")}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              value={abbreviation}
              id="input-courseAbbreviation"
              aria-invalid={abbreviationInvalid}
              placeholder={t(
                "course.dialog.courseAbbreviationPlaceholder",
              )}
              onChange={(e) => {
                setAbbreviationInvalid(false);
                setAbbreviation(e.target.value);
              }}
            />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel>
            {t("course.dialog.courseColor")}
          </FieldLabel>
          <div className="flex justify-around">
            <ColorSelector
              setColor={setColor}
              color="red"
              selected={color == "red"}
            />
            <ColorSelector
              setColor={setColor}
              color="orange"
              selected={color == "orange"}
            />
            <ColorSelector
              setColor={setColor}
              color="amber"
              selected={color == "amber"}
            />
            <ColorSelector
              setColor={setColor}
              color="green"
              selected={color == "green"}
            />
            <ColorSelector
              setColor={setColor}
              color="emerald"
              selected={color == "emerald"}
            />
            <ColorSelector
              setColor={setColor}
              color="blue"
              selected={color == "blue"}
            />
            <ColorSelector
              setColor={setColor}
              color="indigo"
              selected={color == "indigo"}
            />
            <ColorSelector
              setColor={setColor}
              color="purple"
              selected={color == "purple"}
            />
            <ColorSelector
              setColor={setColor}
              color="pink"
              selected={color == "pink"}
            />
            <ColorSelector
              setColor={setColor}
              color="gray"
              selected={color == "gray"}
            />
          </div>
        </Field>
        <FieldGroup className="grid max-w-sm grid-cols-2">
          <Field>
            <FieldLabel htmlFor="input-ects">
              {t("course.dialog.ects")}
            </FieldLabel>
            <Input
              value={ects === undefined ? "" : ects.toString()}
              id="input-ects"
              aria-invalid={ectsInvalid}
              placeholder={t("course.dialog.ectsPlaceholder")}
              type="number"
              min="0"
              onChange={(e) => {
                setEctsInvalid(false);
                setEcts(
                  e.target.value == ""
                    ? undefined
                    : Number.parseInt(e.target.value),
                );
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="input-grade">
              {t("course.dialog.grade")}
            </FieldLabel>
            <Input
              value={grade === undefined ? "" : grade.toString()}
              id="input-grade"
              aria-invalid={gradeInvalid}
              placeholder={t("course.dialog.gradePlaceholder")}
              type="number"
              step="0.1"
              min="0"
              onChange={(e) => {
                setGradeInvalid(false);
                setGrade(
                  e.target.value == ""
                    ? undefined
                    : (Math.round(Number.parseFloat(e.target.value) * 10) / 10).toString(),
                );
              }}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button onClick={(_) => submit()} disabled={loading}>
            {loading ? (
              <Spinner />
            ) : mode == "create" ? (
              <>
                <Check /> {t("course.dialog.submitNew")}
              </>
            ) : (
              <>
                <Check /> {t("course.dialog.submitEdit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
