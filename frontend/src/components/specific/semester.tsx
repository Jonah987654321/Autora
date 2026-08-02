import { format, type Locale } from "date-fns";
import { Badge } from "../ui/badge";

interface SemesterProps {
  semesterName: string;
  start: Date;
  end: Date;
  locale?: Locale;
}

export default function Semester({
  semesterName,
  start,
  end,
  locale,
}: SemesterProps) {
  const now = new Date();
  return (
    <div className="bg-transparent hover:bg-accent cursor-pointer p-5">
      <div className="flex">
        <div className="flex-1 text-base font-medium text-foreground">
          {semesterName}
        </div>
        <div>{start <= now && now <= end ? <Badge className="bg-green-200 text-green-700 dark:bg-green-950 dark:text-green-300">Laufend</Badge> : <></>}</div>
      </div>
      <div className="text-sm text-muted-foreground">
        From {format(start, "PPP", { locale: locale })} until{" "}
        {format(end, "PPP", { locale: locale })}
      </div>
    </div>
  );
}
