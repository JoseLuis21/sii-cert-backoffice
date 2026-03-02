import { ObjectId } from "mongodb";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/lib/mongodb";

type UserRow = {
  _id: ObjectId;
  email: string;
  status?: string;
  createdAt?: Date;
};

export default async function DashboardPage() {
  const db = await getDb();

  const [totalUsers, activeUsers, totalCertifications, recentUsers] =
    await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ status: "active" }),
      db.collection("certifications").countDocuments(),
      db
        .collection("users")
        .find<UserRow>({}, { projection: { email: 1, status: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

  return (
    <div className="min-h-screen bg-muted/50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Resumen de certificación y usuarios.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuarios totales</CardDescription>
              <CardTitle className="text-3xl">{totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuarios activos</CardDescription>
              <CardTitle className="text-3xl">{activeUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Certificaciones</CardDescription>
              <CardTitle className="text-3xl">{totalCertifications}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimos usuarios</CardTitle>
            <CardDescription>Registro reciente en la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha creación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentUsers.map((user) => (
                    <TableRow key={user._id.toString()}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active" ? "default" : "secondary"
                          }
                        >
                          {user.status ?? "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleString("es-CL")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              Fuente: MongoDB base <strong>certificacion</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
