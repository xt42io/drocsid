import { FloatingPortal } from "@floating-ui/react";
import type { ReactNode } from "react";

// Keep floating UI outside scrollable panels while inheriting the workspace theme.
export function WorkspacePortal({ children }: { children: ReactNode }) {
  return (
    <FloatingPortal root={document.querySelector<HTMLElement>(".workspace")}>
      {children}
    </FloatingPortal>
  );
}
