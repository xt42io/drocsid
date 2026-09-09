import { FloatingPortal } from "@floating-ui/react";
import type { ReactNode } from "react";

// Keep floating UI outside scrollable panels while inheriting the workspace theme.
export function WorkspacePortal({ children }: { children: ReactNode }) {
  return (
    <FloatingPortal
      root={
        typeof document !== "undefined"
          ? (document.querySelector<HTMLElement>("[data-ui~=workspace]") ??
            undefined)
          : undefined
      }
    >
      {children}
    </FloatingPortal>
  );
}
