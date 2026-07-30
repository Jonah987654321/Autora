import { Spinner } from "./spinner";

export default function FullscreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8 text-primary" />

        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading Application...
        </p>
      </div>
    </div>
  );
}
