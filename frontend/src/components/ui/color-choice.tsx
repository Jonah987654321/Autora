import { Check } from "lucide-react";
import { Button } from "./button";

interface ColorSelectorProps {
    color: string;
    selected: boolean;
    setColor: (color: string) => void
}

const colorMap: Record<string, string> = {
    red: "bg-red-600 hover:bg-red-700",
    orange: "bg-orange-600 hover:bg-orange-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    green: "bg-green-600 hover:bg-green-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    purple: "bg-purple-600 hover:bg-purple-700",
    pink: "bg-pink-600 hover:bg-pink-700",
    gray: "bg-gray-600 hover:bg-gray-700",
};

export default function ColorSelector({color, selected, setColor}: ColorSelectorProps) {
    const dynamicClasses = colorMap[color];

    return (
      <Button variant="ghost" className={`hover:text-white ${dynamicClasses} h-7 w-7 rounded-md cursor-pointer flex justify-center items-center text-white`} onClick={(_) => setColor(color)}>
        {selected ? <Check /> : <></>}
      </Button>
    );
  }