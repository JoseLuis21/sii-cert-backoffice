"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { cn } from "@/lib/utils";

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

type CertificationDetail = {
  _id: string;
  setSiiBase64: string;
  numerations: Array<{
    numerationBase64: string;
    startNumber: number;
    endNumber: number;
    documentType: string;
  }>;
  rutEmisor: string;
  razonSocialEmisor: string;
  giroEmisor: string;
  actecoEmisor: string;
  direccionEmisor: string;
  comunaEmisor: string;
  emailEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor: string;
  direccionReceptor: string;
  comunaReceptor: string;
  emailReceptor: string;
  certificadoBase64: string;
  claveCertificado: string;
  resolutionNumber: string;
  resolutionDate: string;
  resolutionTicketNumber: string;
  resolutionTicketDate: string;
  processingStatus: "pending" | "processing" | "finish";
  events: Array<{
    type: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
};

type NumerationForm = {
  startNumber: string;
  endNumber: string;
  documentType: string;
  file: File | null;
  existingBase64?: string;
};

type ParsedXmlNumeration = {
  startNumber?: string;
  endNumber?: string;
  documentType?: string;
  emitterRut?: string;
};

type ActecoOption = {
  code: string;
  label: string;
};

type FormState = {
  rutEmisor: string;
  razonSocialEmisor: string;
  giroEmisor: string;
  actecoEmisor: string;
  direccionEmisor: string;
  comunaEmisor: string;
  emailEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor: string;
  direccionReceptor: string;
  comunaReceptor: string;
  emailReceptor: string;
  claveCertificado: string;
  resolutionNumber: string;
  resolutionDate: string;
  resolutionTicketNumber: string;
  resolutionTicketDate: string;
};

const DEFAULT_ACTECO_CODE = "472101";

const emptyForm: FormState = {
  rutEmisor: "",
  razonSocialEmisor: "",
  giroEmisor: "",
  actecoEmisor: DEFAULT_ACTECO_CODE,
  direccionEmisor: "",
  comunaEmisor: "",
  emailEmisor: "",
  rutReceptor: "76.746.877-6",
  razonSocialReceptor: "SERVICIOS INFORMATICOS BICOM LIMITADA",
  giroReceptor: "VENTA AL POR MENOR DE COMPUTADORES, EQUI",
  direccionReceptor:
    "Hendaya 60 Piso 11, Las Condes - Laguna  Verde 1979, Puerto Montt",
  comunaReceptor: "Santiago",
  emailReceptor: "contacto@bicom.cl",
  claveCertificado: "",
  resolutionNumber: "",
  resolutionDate: "",
  resolutionTicketNumber: "",
  resolutionTicketDate: "",
};

const emitterFields: Array<{ key: keyof FormState; label: string; type?: string }> =
  [
    { key: "rutEmisor", label: "RUT Emisor" },
    { key: "razonSocialEmisor", label: "Razón Social Emisor" },
    { key: "giroEmisor", label: "Giro Emisor" },
    { key: "direccionEmisor", label: "Dirección Emisor" },
    { key: "comunaEmisor", label: "Comuna Emisor" },
    { key: "emailEmisor", label: "Email Emisor", type: "email" },
  ];

const receiverFields: Array<{ key: keyof FormState; label: string; type?: string }> =
  [
    { key: "rutReceptor", label: "RUT Receptor" },
    { key: "razonSocialReceptor", label: "Razón Social Receptor" },
    { key: "giroReceptor", label: "Giro Receptor" },
    { key: "direccionReceptor", label: "Dirección Receptor" },
    { key: "comunaReceptor", label: "Comuna Receptor" },
    { key: "emailReceptor", label: "Email Receptor", type: "email" },
  ];

const resolutionFields: Array<{
  key: keyof FormState;
  label: string;
  autoComplete?: string;
}> = [
  { key: "resolutionNumber", label: "Número Resolución", autoComplete: "off" },
  {
    key: "resolutionTicketNumber",
    label: "Número Ticket Resolución",
    autoComplete: "off",
  },
];

const resolutionDateFields: Array<{ key: keyof FormState; label: string }> = [
  { key: "resolutionDate", label: "Fecha Resolución" },
  { key: "resolutionTicketDate", label: "Fecha Ticket Resolución" },
];

function parseDateValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    return undefined;
  }

  return parsed;
}

function extractTagValue(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

function normalizeRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

async function parseNumerationXml(file: File): Promise<ParsedXmlNumeration> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  const xmlError = xmlDoc.querySelector("parsererror");
  if (xmlError) {
    return {};
  }

  const documentType =
    xmlDoc.getElementsByTagName("TD")[0]?.textContent?.trim() ||
    extractTagValue(text, "TD");
  const startNumber =
    xmlDoc.getElementsByTagName("D")[0]?.textContent?.trim() ||
    extractTagValue(text, "D");
  const endNumber =
    xmlDoc.getElementsByTagName("H")[0]?.textContent?.trim() ||
    extractTagValue(text, "H");
  const emitterRut =
    xmlDoc.getElementsByTagName("RE")[0]?.textContent?.trim() ||
    extractTagValue(text, "RE");

  return { documentType, startNumber, endNumber, emitterRut };
}

export default function CertificationsPage() {
  const [items, setItems] = useState<CertificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [setSiiFile, setSetSiiFile] = useState<File | null>(null);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [numerations, setNumerations] = useState<NumerationForm[]>([]);
  const [actecoOptions, setActecoOptions] = useState<ActecoOption[]>([]);
  const [actecoOpen, setActecoOpen] = useState(false);
  const [isValidatingCertPassword, setIsValidatingCertPassword] = useState(false);
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [isEnqueueingCertification, setIsEnqueueingCertification] = useState(false);
  const [editingProcessingStatus, setEditingProcessingStatus] = useState<
    "pending" | "processing" | "finish"
  >("pending");
  const [editingEvents, setEditingEvents] = useState<
    CertificationDetail["events"]
  >([]);
  const [enqueueStatus, setEnqueueStatus] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [certPasswordValidation, setCertPasswordValidation] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const isEditing = Boolean(editingId);
  const requiresCertValidation = !isEditing || Boolean(certificadoFile);
  const hasValidCertPassword =
    certPasswordValidation?.status === "success";

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

  useEffect(() => {
    let cancelled = false;

    async function loadActecoOptions() {
      try {
        const response = await fetch("/api/acteco-options");
        const payload = (await response.json()) as {
          ok: boolean;
          data?: ActecoOption[];
        };

        if (!cancelled && response.ok && payload.ok && payload.data) {
          setActecoOptions(payload.data);
        }
      } catch {
        if (!cancelled) {
          setActecoOptions([]);
        }
      }
    }

    void loadActecoOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isEditing || !form.actecoEmisor || form.giroEmisor) {
      return;
    }

    const selected = actecoOptions.find(
      (option) => option.code === form.actecoEmisor
    );
    if (!selected) {
      return;
    }

    setForm((prev) => ({ ...prev, giroEmisor: selected.label }));
  }, [actecoOptions, form.actecoEmisor, form.giroEmisor, isEditing]);

  function resetForm() {
    setEditingId(null);
    const defaultActecoLabel =
      actecoOptions.find((option) => option.code === DEFAULT_ACTECO_CODE)?.label ??
      "";
    setForm({
      ...emptyForm,
      giroEmisor: defaultActecoLabel,
    });
    setSetSiiFile(null);
    setCertificadoFile(null);
    setNumerations([]);
    setMessage("");
    setCertPasswordValidation(null);
    setEditingProcessingStatus("pending");
    setEditingEvents([]);
    setEnqueueStatus(null);
    setShowCertPassword(false);
  }

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyActecoSelection(code: string) {
    const selected = actecoOptions.find((option) => option.code === code);
    setForm((prev) => ({
      ...prev,
      actecoEmisor: code,
      giroEmisor: selected?.label ?? prev.giroEmisor,
    }));
  }

  function addNumeration() {
    setNumerations((prev) => [
      ...prev,
      {
        startNumber: "",
        endNumber: "",
        documentType: "",
        file: null,
      },
    ]);
  }

  function updateNumeration(
    index: number,
    patch: Partial<NumerationForm>
  ) {
    setNumerations((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  function removeNumeration(index: number) {
    setNumerations((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  async function openEdit(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/certifications/${id}`);
      const payload = (await response.json()) as {
        ok: boolean;
        data?: CertificationDetail;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setMessage("No fue posible cargar la certificación");
        return;
      }

      const data = payload.data;
      setEditingId(data._id);
      setForm({
        rutEmisor: data.rutEmisor ?? "",
        razonSocialEmisor: data.razonSocialEmisor ?? "",
        giroEmisor: data.giroEmisor ?? "",
        actecoEmisor: data.actecoEmisor ?? "",
        direccionEmisor: data.direccionEmisor ?? "",
        comunaEmisor: data.comunaEmisor ?? "",
        emailEmisor: data.emailEmisor ?? "",
        rutReceptor: data.rutReceptor ?? "",
        razonSocialReceptor: data.razonSocialReceptor ?? "",
        giroReceptor: data.giroReceptor ?? "",
        direccionReceptor: data.direccionReceptor ?? "",
        comunaReceptor: data.comunaReceptor ?? "",
        emailReceptor: data.emailReceptor ?? "",
        claveCertificado: data.claveCertificado ?? "",
        resolutionNumber: data.resolutionNumber ?? "",
        resolutionDate: data.resolutionDate ?? "",
        resolutionTicketNumber: data.resolutionTicketNumber ?? "",
        resolutionTicketDate: data.resolutionTicketDate ?? "",
      });
      setSetSiiFile(null);
      setCertificadoFile(null);
      setNumerations(
        data.numerations.map((item) => ({
          startNumber: String(item.startNumber),
          endNumber: String(item.endNumber),
          documentType: item.documentType ?? "",
          file: null,
          existingBase64: item.numerationBase64,
        }))
      );
      setEditingProcessingStatus(data.processingStatus ?? "pending");
      setEditingEvents(data.events ?? []);
      setDialogOpen(true);
      setMessage("");
      setEnqueueStatus(null);
      setShowCertPassword(false);
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (isEditing && editingProcessingStatus === "processing") {
      setSaving(false);
      setMessage("No se puede actualizar una certificación en proceso");
      return;
    }

    if (!form.actecoEmisor.trim()) {
      setSaving(false);
      setMessage("Debes seleccionar un Acteco para el emisor");
      return;
    }

    if (!isEditing && (!setSiiFile || !certificadoFile)) {
      setSaving(false);
      setMessage("Debes subir Set SII y Certificado para crear");
      return;
    }

    if (requiresCertValidation && !hasValidCertPassword) {
      setSaving(false);
      setMessage(
        "Debes validar correctamente la contraseña del certificado antes de guardar"
      );
      return;
    }

    const formData = new FormData();
    (Object.keys(form) as Array<keyof FormState>).forEach((key) => {
      formData.set(key, form[key]);
    });

    if (setSiiFile) {
      formData.set("setSiiFile", setSiiFile);
    }

    if (certificadoFile) {
      formData.set("certificadoFile", certificadoFile);
    }

    const numerationsMeta = numerations.map((row) => ({
      startNumber: Number(row.startNumber),
      endNumber: Number(row.endNumber),
      documentType: row.documentType.trim(),
      existingBase64: row.existingBase64 ?? "",
    }));

    formData.set("numerations", JSON.stringify(numerationsMeta));
    numerations.forEach((row, index) => {
      if (row.file) {
        formData.set(`numerationFile_${index}`, row.file);
      }
    });

    const url = isEditing
      ? `/api/certifications/${editingId}`
      : "/api/certifications";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        body: formData,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "No fue posible guardar");
        return;
      }

      setDialogOpen(false);
      resetForm();
      await loadCertifications();
    } finally {
      setSaving(false);
    }
  }

  async function onValidateCertificatePassword() {
    setCertPasswordValidation(null);

    if (!certificadoFile) {
      setCertPasswordValidation({
        status: "error",
        message: "Debes subir el certificado para validar la contraseña",
      });
      return;
    }

    if (!form.claveCertificado.trim()) {
      setCertPasswordValidation({
        status: "error",
        message: "Debes ingresar la contraseña del certificado",
      });
      return;
    }

    setIsValidatingCertPassword(true);
    try {
      const payload = new FormData();
      payload.set("certificadoFile", certificadoFile);
      payload.set("password", form.claveCertificado);

      const response = await fetch("/api/certificates/validate-password", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as {
        ok: boolean;
        message: string;
      };

      if (!response.ok || !data.ok) {
        setCertPasswordValidation({
          status: "error",
          message: data.message || "No fue posible validar la contraseña",
        });
        return;
      }

      setCertPasswordValidation({
        status: "success",
        message: data.message,
      });
    } finally {
      setIsValidatingCertPassword(false);
    }
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar esta certificación?"
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
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

  async function onEnqueueCertification() {
    if (!editingId) {
      return;
    }

    setEnqueueStatus(null);
    setIsEnqueueingCertification(true);

    try {
      const response = await fetch(`/api/certifications/${editingId}/enqueue`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setEnqueueStatus({
          status: "error",
          message: payload.message ?? "No fue posible encolar la certificación",
        });
        return;
      }

      setEnqueueStatus({
        status: "success",
        message: payload.message ?? "Certificación encolada correctamente",
      });
      setEditingProcessingStatus("processing");
      setEditingEvents((prev) => [
        ...prev,
        {
          type: "enqueued",
          message: "Certificación encolada para envío al SII",
          createdAt: new Date().toISOString(),
        },
      ]);
      await loadCertifications();
    } finally {
      setIsEnqueueingCertification(false);
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

  function renderEventTypeLabel(type: string) {
    if (type === "enqueued") {
      return "encolado";
    }
    if (type === "enqueue_failed") {
      return "error encolando";
    }
    return type;
  }

  const emptyState = useMemo(
    () => !loading && items.length === 0,
    [items.length, loading]
  );
  const selectedActeco = useMemo(
    () => actecoOptions.find((option) => option.code === form.actecoEmisor),
    [actecoOptions, form.actecoEmisor]
  );

  return (
    <div className="min-h-screen bg-muted/50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Certificaciones
              </h1>
              <p className="text-sm text-muted-foreground">
                CRUD de la colección certifications.
              </p>
            </div>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <div className="flex items-center gap-2">
              <ModeToggle />
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm();
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Nueva certificación
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Editar certificación" : "Crear certificación"}
                </DialogTitle>
                <DialogDescription>
                  Sube archivos y el backend los convierte a base64.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Datos emisor</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {emitterFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Input
                            id={field.key}
                            type={field.type ?? "text"}
                            value={form[field.key]}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            required
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label>Acteco Emisor</Label>
                        <Popover open={actecoOpen} onOpenChange={setActecoOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={actecoOpen}
                              className="w-full overflow-hidden justify-between font-normal"
                            >
                              <span className="min-w-0 flex-1 truncate text-left">
                                {selectedActeco
                                  ? selectedActeco.code
                                  : form.actecoEmisor
                                    ? form.actecoEmisor
                                    : "Selecciona Acteco"}
                              </span>
                              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] min-w-[420px] max-w-[680px] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Buscar por código o actividad..." />
                              <CommandList
                                className="h-72 overflow-y-scroll overscroll-contain"
                                onWheelCapture={(event) => event.stopPropagation()}
                                onTouchMove={(event) => event.stopPropagation()}
                              >
                                <CommandEmpty>
                                  No se encontraron actividades.
                                </CommandEmpty>
                                <CommandGroup>
                                  {actecoOptions.map((option) => (
                                    <CommandItem
                                      key={option.code}
                                      value={`${option.code} ${option.label}`}
                                      onSelect={() => {
                                        applyActecoSelection(option.code);
                                        setActecoOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 size-4",
                                          form.actecoEmisor === option.code
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate pr-2">
                                        {option.code} - {option.label}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedActeco ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {selectedActeco.label}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Datos receptor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {receiverFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Input
                            id={field.key}
                            type={field.type ?? "text"}
                            value={form[field.key]}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            required
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Resolución</CardTitle>
                      <CardDescription>
                        Puedes consultar número y fecha de resolución en{" "}
                        <a
                          href="https://maullin.sii.cl/cvc_cgi/dte/ad_empresa1"
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-4"
                        >
                          el portal del SII
                        </a>
                        .
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {resolutionFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Input
                            id={field.key}
                            value={form[field.key]}
                            autoComplete={field.autoComplete ?? "off"}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            required
                          />
                        </div>
                      ))}
                      {resolutionDateFields.map((field) => {
                        const selectedDate = parseDateValue(form[field.key]);

                        return (
                          <div key={field.key} className="space-y-1">
                            <Label>{field.label}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                >
                                  {selectedDate
                                    ? format(selectedDate, "yyyy-MM-dd")
                                    : "Selecciona fecha"}
                                  <CalendarIcon className="size-4 opacity-60" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) =>
                                    updateField(
                                      field.key,
                                      date ? format(date, "yyyy-MM-dd") : ""
                                    )
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <input
                              type="text"
                              className="sr-only"
                              tabIndex={-1}
                              aria-hidden
                              required
                              readOnly
                              value={form[field.key]}
                            />
                          </div>
                        );
                      })}

                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Archivos</CardTitle>
                      <CardDescription>
                        El backend guarda los archivos en base64.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="setSiiFile">Set SII</Label>
                        <Input
                          id="setSiiFile"
                          type="file"
                          onChange={(event) =>
                            setSetSiiFile(event.target.files?.[0] ?? null)
                          }
                        />
                        {isEditing ? (
                          <p className="text-xs text-muted-foreground">
                            Si no subes archivo, mantiene el actual.
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Certificado y password
                    </CardTitle>
                    <CardDescription>
                      Valida contraseña y vigencia del certificado antes de guardar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="certificadoFile">Certificado</Label>
                      <Input
                        id="certificadoFile"
                        type="file"
                        onChange={(event) => {
                          setCertificadoFile(event.target.files?.[0] ?? null);
                          setCertPasswordValidation(null);
                        }}
                      />
                      {isEditing ? (
                        <p className="text-xs text-muted-foreground">
                          Si no subes archivo, mantiene el actual.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="claveCertificado">
                        Clave certificado
                      </Label>
                      <div className="relative">
                        <Input
                          id="claveCertificado"
                          type={showCertPassword ? "text" : "password"}
                          value={form.claveCertificado}
                          onChange={(event) => {
                            updateField("claveCertificado", event.target.value);
                            setCertPasswordValidation(null);
                          }}
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCertPassword((prev) => !prev)}
                          aria-label={
                            showCertPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {showCertPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onValidateCertificatePassword()}
                      disabled={isValidatingCertPassword}
                    >
                      {isValidatingCertPassword
                        ? "Validando..."
                        : "Validar password y vigencia"}
                    </Button>
                    {certPasswordValidation ? (
                      <p
                        className={cn(
                          "text-sm md:col-span-2",
                          certPasswordValidation.status === "success"
                            ? "text-green-600"
                            : "text-destructive"
                        )}
                      >
                        {certPasswordValidation.message}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Numeraciones</CardTitle>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addNumeration}
                      >
                        <Plus className="mr-2 size-4" />
                        Agregar numeración
                      </Button>
                    </div>
                    <CardDescription>
                      Puedes descargar folios en{" "}
                      <a
                        href="https://maullin.sii.cl/cvc_cgi/dte/of_solicita_folios"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline underline-offset-4"
                      >
                        el portal del SII
                      </a>
                      .
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {numerations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay numeraciones cargadas.
                      </p>
                    ) : (
                      numerations.map((row, index) => (
                        <div
                          key={`numeration-${index}`}
                          className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_2fr_auto]"
                        >
                          <div className="space-y-1">
                            <Label>Inicio</Label>
                            <Input
                              value={row.startNumber}
                              onChange={(event) =>
                                updateNumeration(index, {
                                  startNumber: event.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Fin</Label>
                            <Input
                              value={row.endNumber}
                              onChange={(event) =>
                                updateNumeration(index, {
                                  endNumber: event.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Tipo documento (TD)</Label>
                            <Input
                              value={row.documentType}
                              onChange={(event) =>
                                updateNumeration(index, {
                                  documentType: event.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Archivo numeración</Label>
                            <Input
                              type="file"
                              onChange={async (event) => {
                                const file = event.target.files?.[0] ?? null;
                                if (!file) {
                                  updateNumeration(index, { file: null });
                                  return;
                                }

                                const parsed = await parseNumerationXml(file);
                                const normalizedEmitterRut = normalizeRut(form.rutEmisor);
                                const normalizedFolioRut = normalizeRut(
                                  parsed.emitterRut ?? ""
                                );

                                if (
                                  !normalizedEmitterRut ||
                                  !normalizedFolioRut ||
                                  normalizedEmitterRut !== normalizedFolioRut
                                ) {
                                  updateNumeration(index, { file: null });
                                  setMessage(
                                    "El RUT del folio seleccionado no coincide con el RUT del emisor"
                                  );
                                  return;
                                }

                                updateNumeration(index, { file });
                                updateNumeration(index, {
                                  startNumber:
                                    parsed.startNumber ?? row.startNumber,
                                  endNumber: parsed.endNumber ?? row.endNumber,
                                  documentType:
                                    parsed.documentType ?? row.documentType,
                                });
                              }}
                            />
                            {row.existingBase64 ? (
                              <p className="text-xs text-muted-foreground">
                                Si no subes archivo, mantiene el actual.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeNumeration(index)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {isEditing ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Eventos</CardTitle>
                      <CardDescription>
                        Historial de procesamiento de la certificación.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">{renderStatusBadge(editingProcessingStatus)}</div>
                      {editingEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aún no hay eventos para esta certificación.
                        </p>
                      ) : (
                        <div className="max-h-52 space-y-3 overflow-y-auto pr-2">
                          {editingEvents.map((event, index) => (
                            <div
                              key={`${event.createdAt}-${event.type}-${index}`}
                              className="relative pl-5"
                            >
                              <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                              <p className="text-sm font-medium">{event.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {renderEventTypeLabel(event.type)} ·{" "}
                                {event.createdAt
                                  ? new Date(event.createdAt).toLocaleString("es-CL")
                                  : "-"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {message ? (
                  <p className="text-sm text-destructive">{message}</p>
                ) : null}
                {enqueueStatus ? (
                  <p
                    className={cn(
                      "text-sm",
                      enqueueStatus.status === "success"
                        ? "text-green-600"
                        : "text-destructive"
                    )}
                  >
                    {enqueueStatus.message}
                  </p>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  {isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                      onClick={() => void onEnqueueCertification()}
                      disabled={
                        isEnqueueingCertification ||
                        saving ||
                        editingProcessingStatus !== "pending"
                      }
                    >
                      {isEnqueueingCertification
                        ? "Encolando..."
                        : "Enviar al SII certificación"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      editingProcessingStatus === "processing" ||
                      (requiresCertValidation && !hasValidCertPassword)
                    }
                  >
                    <Upload className="mr-2 size-4" />
                    {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

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
                  <TableHead>Numeraciones</TableHead>
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
                        <p className="text-xs text-muted-foreground">
                          {item.rutEmisor}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.razonSocialReceptor}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.rutReceptor}
                        </p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void openEdit(item._id)}
                            disabled={saving}
                          >
                            <Pencil className="size-4" />
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
