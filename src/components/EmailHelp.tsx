import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Collapsible "I didn't get the email" troubleshooting panel.
 * Used on both the registration verification step and password recovery.
 */
export function EmailHelp({ className, address }: { className?: string; address?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/40", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Didn&apos;t receive the email?
        <ChevronDown
          className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <li>
            Delivery can take up to <strong className="text-foreground">2 minutes</strong>. Refresh
            your inbox before trying again.
          </li>
          <li>
            Check your <strong className="text-foreground">Spam</strong>,{" "}
            <strong className="text-foreground">Junk</strong>,{" "}
            <strong className="text-foreground">Promotions</strong> and{" "}
            <strong className="text-foreground">Updates</strong> folders — automated mail often
            lands there first.
          </li>
          <li>
            Confirm the address you typed is correct
            {address ? (
              <>
                {" "}
                (<span className="text-foreground">{address}</span>)
              </>
            ) : null}
            . A single wrong character sends the mail elsewhere.
          </li>
          <li>Search your mailbox for &ldquo;confirm&rdquo; or &ldquo;reset&rdquo;.</li>
          <li>
            On a university or work mailbox, filters may block external senders — try a personal
            Gmail address instead.
          </li>
          <li>Still nothing after a few minutes? Use the resend button above.</li>
        </ul>
      )}
    </div>
  );
}
