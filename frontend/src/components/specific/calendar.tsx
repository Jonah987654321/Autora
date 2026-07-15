function WeekView() {
  const days = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  return (
    <div className="flex flex-col w-full h-full border rounded-xl overflow-hidden shadow-sm bg-background">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map((day, index) => (
          <div
            key={index}
            className="py-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 min-h-[600px] bg-background">
        {days.map((_, index) => (
          <div 
            key={index} 
            className="p-2 border-r last:border-r-0 hover:bg-muted/10 transition-colors flex flex-col gap-2"
          >
            {index === 0 && (
              <div className="px-2 py-1.5 text-xs rounded-md bg-primary/10 text-primary font-medium border border-primary/20">
                10:00 - Vorlesung
              </div>
            )}
            {index === 2 && (
              <div className="px-2 py-1.5 text-xs rounded-md bg-secondary/50 text-secondary-foreground font-medium border">
                14:30 - Übung
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { WeekView };
