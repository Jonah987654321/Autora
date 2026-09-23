import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "katex/dist/katex.css";

interface MathInputProps {
    open: boolean;
    onOpenChange: (state: boolean) => void;
    onSubmit: (content: string) => void;
}

export default function MathInput({open, onOpenChange, onSubmit}: MathInputProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Gib deine Formel ein</DialogTitle>
        </DialogHeader>
    </DialogContent>
  </Dialog>;
}
