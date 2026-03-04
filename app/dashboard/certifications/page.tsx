"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type CertificationListItem = {
  _id: string;
  rutEmisor: string;
  razonSocialEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  resolutionNumber: string;
  createdAt: string;
  numerationsCount: number;
  documentTypes: string;
  processingStatus: "pending" | "processing" | "finish";
};

export default function CertificationsPage() {
  const [items, setItems] = useState<CertificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function loadCertifications() {
    setLoading(true);
    try {
      const response = await fetch("/api/certifications");
      const payload = (await response.json()) as {
        ok: boolean;
        data: CertificationListItem[];
      };

      if (response.ok && payload.ok) {
        setItems(payload.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCertifications();
  }, []);

  async function onDelete(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar esta certificación?"
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/certifications/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "No fue posible eliminar");
        return;
      }
      await loadCertifications();
    } finally {
      setSaving(false);
    }
  }

  function renderStatusBadge(status: CertificationListItem["processingStatus"]) {
    const loadingStatus = status === "processing";
    const label =
      status === "pending"
        ? "pendiente"
        : status === "processing"
          ? "en proceso"
          : "finalizado";

    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5">
        {loadingStatus ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {label}
      </Badge>
    );
  }

  const emptyState = useMemo(
    () => !loading && items.length === 0,
    [items.length, loading]
  );

  return (
    <div className="min-h-screen bg-muted/50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Certificaciones</h1>
              <p className="text-sm text-muted-foreground">
                Gestión de certificaciones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button asChild>
              <Link href="/dashboard/certifications/new">
                <Plus className="mr-2 size-4" />
                Nueva certificación
              </Link>
            </Button>
          </div>
        </header>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>
              Registros de certificación almacenados en MongoDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emisor</TableHead>
                  <TableHead>Receptor</TableHead>
                  <TableHead>Resolución</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo documento</TableHead>
                  <TableHead>Folios</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : emptyState ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      Sin certificaciones.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <p className="font-medium">{item.razonSocialEmisor}</p>
                        <p className="text-xs text-muted-foreground">{item.rutEmisor}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.razonSocialReceptor}</p>
                        <p className="text-xs text-muted-foreground">{item.rutReceptor}</p>
                      </TableCell>
                      <TableCell>{item.resolutionNumber}</TableCell>
                      <TableCell>{renderStatusBadge(item.processingStatus)}</TableCell>
                      <TableCell>{item.documentTypes || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.numerationsCount}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("es-CL")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/dashboard/certifications/${item._id}/edit`}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void onDelete(item._id)}
                            disabled={saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
