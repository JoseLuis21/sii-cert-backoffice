import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userName: string | undefined;
  let userEmail: string | undefined;

  if (sessionUserId && ObjectId.isValid(sessionUserId)) {
    const db = await getDb();
    const user = await db.collection("users").findOne<{
      name?: string;
      email?: string;
    }>(
      { _id: new ObjectId(sessionUserId) },
      { projection: { name: 1, email: 1 } }
    );

    userEmail = user?.email;
    userName =
      user?.name ??
      (user?.email ? user.email.split("@")[0] : undefined) ??
      "Usuario autenticado";
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar userName={userName} userEmail={userEmail} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
