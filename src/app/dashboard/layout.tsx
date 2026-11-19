import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
