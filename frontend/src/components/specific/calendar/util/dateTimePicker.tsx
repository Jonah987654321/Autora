import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateLocale } from "@/hooks/use-dateLocale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  invalid
}: DateTimePickerProps) {
  const {t} = useTranslation();
  const dateLocale = useDateLocale();
  const [open, setOpen] = useState(false);

  const handleDaySelect = (day: Date | undefined) => {
    if (day === undefined) return;
    const merged = new Date(day);
    if (value !== undefined) {
      merged.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange(merged);
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return; 

    const [hours, minutes] = e.target.value.split(":").map(Number);
    
    if (minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) return;

    const merged = value !== undefined ? new Date(value) : new Date();
    merged.setHours(hours, minutes, 0, 0);
    onChange(merged);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal",
              value === undefined && "text-muted-foreground",
            )}
            aria-invalid={invalid ?? false}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {value !== undefined
              ? format(value, "PP", { locale: dateLocale })
              : (placeholder ?? t("calendar.eventDialog.dateTimePicker.placeholder"))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            defaultMonth={value}
            mode="single"
            selected={value}
            onSelect={(day) => {
              handleDaySelect(day);
              setOpen(false);
            }}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        className="w-[120px] shrink-0"
        value={value !== undefined ? format(value, "HH:mm") : ""}
        onChange={handleTimeChange}
        aria-invalid={invalid}
      />
    </div>
  );
}