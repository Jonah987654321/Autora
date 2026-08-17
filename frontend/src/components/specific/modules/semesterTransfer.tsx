import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { useState } from "react";
import type SemesterData from "@/models/semester";
import { loadAllSemesters } from "@/api/academic";
import { Field, FieldGroup } from "../../ui/field";
import { Input } from "../../ui/input";
import { ArrowDown, ArrowLeftRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";

interface SemesterTransferProps {
  current: string;
  processTransfer: (newSemesterID: string) => Promise<void>;
  children: React.ReactNode;
}

export default function SemesterTransfer({
  current,
  processTransfer,
  children,
}: SemesterTransferProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [currentSemester, setCurrentSemester] = useState<SemesterData>();
  const [error, setError] = useState(false);

  const [target, setTarget] = useState("");
  const [targetInvalid, setTargetInvalid] = useState(false);

  const [transferLoading, setTransferLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);

    setTarget("");

    try {
      const data = await loadAllSemesters();
      data.forEach((element: SemesterData) => {
        if (element.id === current) {
          setCurrentSemester(element);
        }
      });

      setSemesters(data);
      setLoading(false);
    } catch (error) {
      setError(true);
      setLoading(false);
      toast.error(t("common.internalServerError"));
      toggleOpen(false);
    }
  };

  const toggleOpen = (state: boolean) => {
    if (!transferLoading) {
      setOpen(state);

      if (state) {
        load();
      }
    }
  };

  const submit = async () => {
    if (target === "") {
      setTargetInvalid(true);
      return;
    }

    setTransferLoading(true);

    try {
      await processTransfer(target);
      setTransferLoading(false);
      toggleOpen(false);
    } catch (error) {
      setTransferLoading(false);
      toast.error(t("common.internalServerError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("semesterTransfer.title")}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            {!loading && !error && (
              <Input
                value={currentSemester?.name}
                disabled
                className="disabled:opacity-90 disabled:text-foreground disabled:bg-muted disabled:border-border disabled:cursor-not-allowed"
              />
            )}
            {loading && <Skeleton className="w-full h-7.5 rounded-xl" />}
          </Field>
          <div className="w-full flex justify-center">
            <ArrowDown />
          </div>
          <Field>
            {loading && <Skeleton className="w-full h-7.5 rounded-xl" />}
            {!loading && !error && (
              <Select
                onValueChange={(value) => {
                  setTarget(value);
                  setTargetInvalid(false);
                }}
              >
                <SelectTrigger
                  className="bg-muted rounded-xl border-border"
                  aria-invalid={targetInvalid}
                >
                  <SelectValue
                    placeholder={t(
                      "semesterTransfer.placeholderDestinationSelect",
                    )}
                  />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {semesters.map((el: SemesterData) => {
                      if (el.id == currentSemester?.id) {
                        return <></>;
                      }
                      return (
                        <SelectItem value={el.id} key={el.id}>
                          {el.name}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button onClick={(_) => submit()} disabled={loading}>
            {transferLoading ? (
              <Spinner />
            ) : (
              <>
                <ArrowLeftRight /> {t("semesterTransfer.action")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
