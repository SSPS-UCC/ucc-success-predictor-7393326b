import { useQuery } from "@tanstack/react-query";

import codeCrest from "@/assets/code-crest.png.asset.json";
import uccCrest from "@/assets/ucc-crest.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const BRANDING_KEYS = { ucc: "ucc_crest", code: "code_crest" } as const;

/** Staff-uploaded crest overrides, readable by everyone (including signed-out visitors). */
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("branding_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });
}

export function Crests({ className, size = 56 }: { className?: string; size?: number }) {
  const branding = useBranding();
  const ucc = branding.data?.[BRANDING_KEYS.ucc] ?? uccCrest.url;
  const code = branding.data?.[BRANDING_KEYS.code] ?? codeCrest.url;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={ucc}
        alt="University of Cape Coast crest"
        width={size}
        height={size}
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
      <img
        src={code}
        alt="College of Distance Education crest"
        width={size}
        height={size}
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
    </div>
  );
}
