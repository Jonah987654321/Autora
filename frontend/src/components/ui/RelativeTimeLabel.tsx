import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useDateLocale } from "@/hooks/use-dateLocale";

interface RelativeTimeLabelProps {
  date: Date;
}

export default function RelativeTimeLabel({ date }: RelativeTimeLabelProps) {
  const dateLocale = useDateLocale();
  const [, setTick] = useState(0); 

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      ({formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })})
    </span>
  );
}