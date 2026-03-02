import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
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

type CertificationRow = {
  _id: string;
  rutEmisor?: string;
  razonSocialEmisor?: string;
  resolutionNumber?: string;
  processingStatus?: "pending" | "processing" | "finish";
  createdAt?: string;
};

export default async function DashboardPage() {
  const db = await getDb();

  const [totalCertifications, latestCertifications] = await Promise.all([
    db.collection("certifications").countDocuments(),
    db
      .collection("certifications")
      .find<CertificationRow>(
        {},
        {
          projection: {
            rutEmisor: 1,
            razonSocialEmisor: 1,
            resolutionNumber: 1,
            processingStatus: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray(),
  ]);

  function renderStatusBadge(status?: CertificationRow["processingStatus"]) {
    const normalized = status ?? "pending";
    const label =
      normalized === "pending"
        ? "pendiente"
        : normalized === "processing"
          ? "en proceso"
          : "finalizado";

    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5">
        {normalized === "processing" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : null}
        {label}
      </Badge>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
            <p className="text-sm text-muted-foreground">
              Resumen de certificaciones.
            </p>
          </div>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Certificaciones</CardDescription>
              <CardTitle className="text-3xl">{totalCertifications}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas 3 certificaciones</CardTitle>
            <CardDescription>Registro reciente con estado de proceso</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emisor</TableHead>
                  <TableHead>Resolución</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha creación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestCertifications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay certificaciones registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  latestCertifications.map((certification) => (
                    <TableRow key={certification._id.toString()}>
                      <TableCell>
                        <p className="font-medium">
                          {certification.razonSocialEmisor || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {certification.rutEmisor || "-"}
                        </p>
                      </TableCell>
                      <TableCell>{certification.resolutionNumber || "-"}</TableCell>
                      <TableCell>
                        {renderStatusBadge(certification.processingStatus)}
                      </TableCell>
                      <TableCell>
                        {certification.createdAt
                          ? new Date(certification.createdAt).toLocaleString("es-CL")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              Información obtenida desde la base de datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
