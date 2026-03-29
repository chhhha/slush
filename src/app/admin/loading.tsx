import { CupSoda } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <CupSoda className="size-9 text-primary animate-float" />
      <div className="mt-4 flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
