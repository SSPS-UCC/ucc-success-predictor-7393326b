import { Check, X } from "lucide-react";

import { passwordRules, scorePassword } from "@/lib/password";
import { cn } from "@/lib/utils";

const BAR_TONE = [
  "bg-destructive",
  "bg-destructive",
  "bg-gold",
  "bg-primary",
  "bg-primary",
] as const;

export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const { score, label } = scorePassword(value);
  const rules = passwordRules(value);

  return (
    <div className={cn("space-y-2", className)} aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                value && score > i ? BAR_TONE[score] : "bg-border",
              )}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <ul className="space-y-1">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              rule.passed ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {rule.passed ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
