import { Settings } from "lucide-react";
import { Button } from "../ui/button";

export default function Module() {
  function SeperatorDot() {
    return <span className="px-1.5">•</span>;
  }

  return (
    <div className="border-muted border-2 p-2 rounded-md mt-2 hover:bg-accent border-l-6 border-l-green-500 rounded-l-sm">
      <div className="flex pl-2">
        <div className="flex-1">
          Beispiel-Modul
          <div className="text-muted-foreground text-sm">
            Dozent: Prof. Dr. Test<SeperatorDot />
            Status: Abgeschlossen (1,0)<SeperatorDot /> 
            ECTS: 6
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost">
            <Settings />
          </Button>
        </div>
      </div>
    </div>
  );
}
