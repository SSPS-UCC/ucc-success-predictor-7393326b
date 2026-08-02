import codeCrest from "@/assets/code-crest.png.asset.json";
import uccCrest from "@/assets/ucc-crest.png.asset.json";
import { cn } from "@/lib/utils";

export function Crests({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={uccCrest.url}
        alt="University of Cape Coast crest"
        width={size}
        height={size}
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
      <img
        src={codeCrest.url}
        alt="College of Distance Education crest"
        width={size}
        height={size}
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
    </div>
  );
}
