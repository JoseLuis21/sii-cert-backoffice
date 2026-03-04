"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
import { cn } from "@/lib/utils";

type CertificationDetail = {
  _id: string;
  setSiiBase64: string;
  exhangeDteBase64?: string;
  numerations?: Array<{
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
  processingStatus: "pending" | "processing" | "finish" | "finished";
  trackId?: string;
  uploadStatus?: string;
  salesBookTrackId?: string;
  salesBookUploadStatus?: string;
  purchaseBookTrackId?: string;
  purchaseBookUploadStatus?: string;
  stage2TrackId?: string;
  stage2UploadStatus?: string;
  envioXmlUrl?: string;
  salesBookXmlUrl?: string;
  purchaseBookXmlUrl?: string;
  stage2EnvioXmlUrl?: string;
  stage2Dte33XmlUrl?: string;
  stage2Dte56XmlUrl?: string;
  stage2Dte61XmlUrl?: string;
  stage3RecepcionDteXmlUrl?: string;
  stage3EnvioRecibosXmlUrl?: string;
  stage3ResultadoDteXmlUrl?: string;
  stagesPdfZipUrl?: string;
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

type CertificationFormPageProps = {
  mode: "create" | "edit";
  certificationId?: string;
};

const INFO_FALLBACK_VALUE = "informativo";
const NO_STATUS = "sin estado";

export function CertificationFormPage({
  mode,
  certificationId,
}: CertificationFormPageProps) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(isEditing);
  const [message, setMessage] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [setSiiFile, setSetSiiFile] = useState<File | null>(null);
  const [exchangeDteFile, setExchangeDteFile] = useState<File | null>(null);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [numerations, setNumerations] = useState<NumerationForm[]>([]);
  const [actecoOptions, setActecoOptions] = useState<ActecoOption[]>([]);
  const [actecoOpen, setActecoOpen] = useState(false);
  const [isValidatingCertPassword, setIsValidatingCertPassword] = useState(false);
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [isEnqueueingCertification, setIsEnqueueingCertification] = useState(false);
  const [isEnqueueingStage3, setIsEnqueueingStage3] = useState(false);
  const [isCloningCertification, setIsCloningCertification] = useState(false);
  const [isSavingPurchaseXml, setIsSavingPurchaseXml] = useState(false);
  const [editingProcessingStatus, setEditingProcessingStatus] = useState<
    "pending" | "processing" | "finish"
  >("pending");
  const [editingEvents, setEditingEvents] = useState<
    CertificationDetail["events"]
  >([]);
  const [editingDetail, setEditingDetail] = useState<CertificationDetail | null>(null);
  const [copiedTrackDocKey, setCopiedTrackDocKey] = useState<string | null>(null);
  const [enqueueStatus, setEnqueueStatus] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [certPasswordValidation, setCertPasswordValidation] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const isFinishedCertification = isEditing && editingProcessingStatus === "finish";
  const hasMissingStage3Xml =
    isFinishedCertification &&
    !(
      editingDetail?.stage3RecepcionDteXmlUrl &&
      editingDetail.stage3EnvioRecibosXmlUrl &&
      editingDetail.stage3ResultadoDteXmlUrl
    );
  const requiresCertValidation = !isEditing || Boolean(certificadoFile);
  const hasValidCertPassword = certPasswordValidation?.status === "success";

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

  useEffect(() => {
    if (!isEditing) {
      const defaultActecoLabel =
        actecoOptions.find((option) => option.code === DEFAULT_ACTECO_CODE)?.label ??
        "";
      setForm((prev) => ({
        ...prev,
        actecoEmisor: prev.actecoEmisor || DEFAULT_ACTECO_CODE,
        giroEmisor: prev.giroEmisor || defaultActecoLabel,
      }));
      return;
    }

    if (!certificationId) {
      setLoadingDetail(false);
      setMessage("No se recibió el ID de la certificación");
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setLoadingDetail(true);
      setMessage("");
      try {
        const response = await fetch(`/api/certifications/${certificationId}`);
        const payload = (await response.json()) as {
          ok: boolean;
          data?: CertificationDetail;
        };

        if (!response.ok || !payload.ok || !payload.data) {
          if (!cancelled) {
            setMessage("No fue posible cargar la certificación");
          }
          return;
        }

        if (cancelled) {
          return;
        }

        const data = payload.data;
        setEditingDetail(data);
        const normalizedStatus =
          data.processingStatus === "finished" ? "finish" : data.processingStatus ?? "pending";
        const showInformativeForMissing = normalizedStatus === "finish";
        const withInformativeFallback = (value: string | undefined) =>
          showInformativeForMissing && !value?.trim() ? INFO_FALLBACK_VALUE : (value ?? "");

        setForm({
          rutEmisor: withInformativeFallback(data.rutEmisor),
          razonSocialEmisor: withInformativeFallback(data.razonSocialEmisor),
          giroEmisor: withInformativeFallback(data.giroEmisor),
          actecoEmisor: withInformativeFallback(data.actecoEmisor),
          direccionEmisor: withInformativeFallback(data.direccionEmisor),
          comunaEmisor: withInformativeFallback(data.comunaEmisor),
          emailEmisor: withInformativeFallback(data.emailEmisor),
          rutReceptor: withInformativeFallback(data.rutReceptor),
          razonSocialReceptor: withInformativeFallback(data.razonSocialReceptor),
          giroReceptor: withInformativeFallback(data.giroReceptor),
          direccionReceptor: withInformativeFallback(data.direccionReceptor),
          comunaReceptor: withInformativeFallback(data.comunaReceptor),
          emailReceptor: withInformativeFallback(data.emailReceptor),
          claveCertificado: withInformativeFallback(data.claveCertificado),
          resolutionNumber: withInformativeFallback(data.resolutionNumber),
          resolutionDate: withInformativeFallback(data.resolutionDate),
          resolutionTicketNumber: withInformativeFallback(data.resolutionTicketNumber),
          resolutionTicketDate: withInformativeFallback(data.resolutionTicketDate),
        });

        const safeNumerations = Array.isArray(data.numerations) ? data.numerations : [];
        setNumerations(
          safeNumerations.map((item) => ({
            startNumber: String(item.startNumber),
            endNumber: String(item.endNumber),
            documentType: item.documentType ?? "",
            file: null,
            existingBase64: item.numerationBase64,
          }))
        );
        setEditingProcessingStatus(normalizedStatus);
        setEditingEvents(data.events ?? []);
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [actecoOptions, certificationId, isEditing]);

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

  function updateNumeration(index: number, patch: Partial<NumerationForm>) {
    setNumerations((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  function removeNumeration(index: number) {
    setNumerations((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
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
    if (isEditing && editingProcessingStatus === "finish") {
      setSaving(false);
      setMessage("No se puede actualizar una certificación finalizada");
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

    if (exchangeDteFile) {
      formData.set("exchangeDteFile", exchangeDteFile);
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
      ? `/api/certifications/${certificationId}`
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

      router.push("/dashboard/certifications");
      router.refresh();
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

  async function onEnqueueCertification() {
    if (!certificationId) {
      return;
    }

    setEnqueueStatus(null);
    setIsEnqueueingCertification(true);

    try {
      const response = await fetch(`/api/certifications/${certificationId}/enqueue`, {
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
    } finally {
      setIsEnqueueingCertification(false);
    }
  }

  async function onCloneCertification() {
    if (!certificationId) {
      return;
    }

    setEnqueueStatus(null);
    setIsCloningCertification(true);

    try {
      const response = await fetch(`/api/certifications/${certificationId}/clone`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setEnqueueStatus({
          status: "error",
          message: payload.message ?? "No fue posible copiar la certificación",
        });
        return;
      }

      setEnqueueStatus({
        status: "success",
        message: payload.message ?? "Copia creada correctamente",
      });
    } finally {
      setIsCloningCertification(false);
    }
  }

  async function onEnqueueStage3() {
    if (!certificationId) {
      return;
    }

    setEnqueueStatus(null);
    setIsEnqueueingStage3(true);
    try {
      const response = await fetch(`/api/certifications/${certificationId}/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 3 }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setEnqueueStatus({
          status: "error",
          message: payload.message ?? "No fue posible encolar la etapa 3",
        });
        return;
      }

      setEnqueueStatus({
        status: "success",
        message: payload.message ?? "Etapa 3 encolada correctamente",
      });
      setEditingProcessingStatus("pending");
      setEditingEvents((prev) => [
        ...prev,
        {
          type: "stage3_enqueued",
          message: "Certificación encolada para generación de etapa 3",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsEnqueueingStage3(false);
    }
  }

  async function onSavePurchaseXml() {
    if (!certificationId || !exchangeDteFile) {
      setMessage("Debes seleccionar el XML de compra SII para guardar");
      return;
    }

    setIsSavingPurchaseXml(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("exchangeDteFile", exchangeDteFile);

      const response = await fetch(`/api/certifications/${certificationId}/purchase-xml`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "No fue posible guardar el XML de compra SII");
        return;
      }

      setMessage(payload.message ?? "XML de compra SII guardado");
      setExchangeDteFile(null);
      const input = document.getElementById("exchangeDteFile") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
    } finally {
      setIsSavingPurchaseXml(false);
    }
  }

  function renderStatusBadge(status: "pending" | "processing" | "finish") {
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

  function renderDocStatusBadge(status?: string) {
    const normalized = status?.trim() || NO_STATUS;
    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5">
        {normalized}
      </Badge>
    );
  }

  function copyTrackId(trackId: string, docKey: string) {
    if (!trackId || trackId === "-") {
      return;
    }
    void navigator.clipboard.writeText(trackId);
    setCopiedTrackDocKey(docKey);
    window.setTimeout(() => {
      setCopiedTrackDocKey((current) => (current === docKey ? null : current));
    }, 1200);
  }

  function downloadXmlFile(url: string, docKey: string) {
    if (!url) {
      setMessage("No se pudo descargar el XML");
      return;
    }

    const endpoint = `/api/certifications/download?url=${encodeURIComponent(
      url
    )}&name=${encodeURIComponent(`${docKey}.xml`)}`;

    const link = document.createElement("a");
    link.href = endpoint;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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
                {isEditing ? "Editar certificación" : "Nueva certificación"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Sube archivos y el backend los convierte a base64.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {loadingDetail ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Cargando certificación...
            </CardContent>
          </Card>
        ) : (
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
                        className="w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] min-w-0 max-w-[680px] p-0"
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
                  <CardTitle className="text-base">Datos receptor</CardTitle>
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
                                : form[field.key] === INFO_FALLBACK_VALUE
                                  ? INFO_FALLBACK_VALUE
                                  : "Selecciona fecha"}
                              <CalendarIcon className="size-4 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              startMonth={new Date(1980, 0)}
                              endMonth={new Date(new Date().getFullYear() + 1, 11)}
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
                  <div className="space-y-1">
                    <Label htmlFor="exchangeDteFile">XML de compra SII</Label>
                    <Input
                      id="exchangeDteFile"
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      onChange={(event) =>
                        setExchangeDteFile(event.target.files?.[0] ?? null)
                      }
                    />
                    {isEditing ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Si no subes archivo, mantiene el actual.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void onSavePurchaseXml()}
                          disabled={!exchangeDteFile || isSavingPurchaseXml}
                        >
                          {isSavingPurchaseXml
                            ? "Guardando..."
                            : "Guardar XML de compra SII"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Certificado y password</CardTitle>
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
                  <Label htmlFor="claveCertificado">Clave certificado</Label>
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
                  <CardTitle className="text-base">Folios</CardTitle>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addNumeration}
                  >
                    <Plus className="mr-2 size-4" />
                    Agregar folio
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
                    No hay folios cargados.
                  </p>
                ) : (
                  numerations.map((row, index) => (
                    <div
                      key={`numeration-${index}`}
                      className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(160px,0.9fr)_minmax(240px,1.5fr)_44px] lg:items-start"
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
                        <Label>Archivo folio</Label>
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
                              startNumber: parsed.startNumber ?? row.startNumber,
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
                      <div className="flex justify-end pt-6">
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
                  <CardTitle className="text-base">Documentos y TrackID SII</CardTitle>
                  <CardDescription>
                    XML en R2, TrackID y estado por documento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      key: "envio",
                      label: "Etapa 1 - Envio DTE",
                      trackId: editingDetail?.trackId,
                      status: editingDetail?.uploadStatus,
                      url: editingDetail?.envioXmlUrl,
                    },
                    {
                      key: "salesBook",
                      label: "Etapa 1 - Libro de Ventas",
                      trackId: editingDetail?.salesBookTrackId,
                      status: editingDetail?.salesBookUploadStatus,
                      url: editingDetail?.salesBookXmlUrl,
                    },
                    {
                      key: "purchaseBook",
                      label: "Etapa 1 - Libro de Compras",
                      trackId: editingDetail?.purchaseBookTrackId,
                      status: editingDetail?.purchaseBookUploadStatus,
                      url: editingDetail?.purchaseBookXmlUrl,
                    },
                    {
                      key: "stage2Envio",
                      label: "Etapa 2 - Envio",
                      trackId: editingDetail?.stage2TrackId,
                      status: editingDetail?.stage2UploadStatus,
                      url: editingDetail?.stage2EnvioXmlUrl,
                    },
                    {
                      key: "stage2dte33",
                      label: "Etapa 2 - DTE 33",
                      trackId: editingDetail?.stage2TrackId,
                      status: editingDetail?.stage2UploadStatus,
                      url: editingDetail?.stage2Dte33XmlUrl,
                    },
                    {
                      key: "stage2dte56",
                      label: "Etapa 2 - DTE 56",
                      trackId: editingDetail?.stage2TrackId,
                      status: editingDetail?.stage2UploadStatus,
                      url: editingDetail?.stage2Dte56XmlUrl,
                    },
                    {
                      key: "stage2dte61",
                      label: "Etapa 2 - DTE 61",
                      trackId: editingDetail?.stage2TrackId,
                      status: editingDetail?.stage2UploadStatus,
                      url: editingDetail?.stage2Dte61XmlUrl,
                    },
                    {
                      key: "stage3recepcion",
                      label: "Etapa 3 - Recepcion DTE",
                      trackId: "-",
                      status: NO_STATUS,
                      url: editingDetail?.stage3RecepcionDteXmlUrl,
                    },
                    {
                      key: "stage3recibos",
                      label: "Etapa 3 - Envio Recibos",
                      trackId: "-",
                      status: NO_STATUS,
                      url: editingDetail?.stage3EnvioRecibosXmlUrl,
                    },
                    {
                      key: "stage3resultado",
                      label: "Etapa 3 - Resultado DTE",
                      trackId: "-",
                      status: NO_STATUS,
                      url: editingDetail?.stage3ResultadoDteXmlUrl,
                    },
                    {
                      key: "stage4pdfzip",
                      label: "Etapa 4 - PDFs (ZIP)",
                      trackId: "-",
                      status: NO_STATUS,
                      url: editingDetail?.stagesPdfZipUrl,
                    },
                  ].map((doc) => (
                    <div
                      key={doc.key}
                      className="grid gap-2 rounded-lg border p-3 xl:grid-cols-[minmax(220px,1.2fr)_minmax(210px,1fr)_120px_260px] xl:items-center"
                    >
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:hidden">
                          Documento
                        </p>
                        <p className="text-sm font-medium">{doc.label}</p>
                      </div>
                      <div className="space-y-1 border-t pt-2 xl:border-0 xl:pt-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:hidden">
                          TrackID
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>TrackID: {doc.trackId || "-"}</span>
                        {doc.trackId && doc.trackId !== "-" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => copyTrackId(doc.trackId ?? "", doc.key)}
                            aria-label="Copiar TrackID"
                            title={
                              copiedTrackDocKey === doc.key
                                ? "Copiado"
                                : "Copiar TrackID"
                            }
                          >
                            {copiedTrackDocKey === doc.key ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        ) : null}
                        </div>
                      </div>
                      <div className="space-y-1 border-t pt-2 xl:border-0 xl:pt-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:hidden">
                          Estado
                        </p>
                        <div>{renderDocStatusBadge(doc.status)}</div>
                      </div>
                      {doc.url ? (
                        <div className="space-y-1 border-t pt-2 xl:border-0 xl:pt-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:hidden">
                            Acciones
                          </p>
                          <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:justify-end">
                          {doc.key !== "stage4pdfzip" ? (
                            <Button asChild variant="outline" size="sm">
                              <a href={doc.url} target="_blank" rel="noreferrer noopener">
                                <ExternalLink className="mr-2 size-4" />
                                Ver XML
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="invisible"
                              aria-hidden
                              tabIndex={-1}
                            >
                              Ver XML
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void downloadXmlFile(doc.url ?? "", doc.key)}
                          >
                            <Download className="mr-2 size-4" />
                            Descargar
                          </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 border-t pt-2 xl:border-0 xl:pt-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:hidden">
                            Acciones
                          </p>
                          <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:justify-end">
                          {doc.key !== "stage4pdfzip" ? (
                            <Button variant="outline" size="sm" disabled>
                              Sin XML
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="invisible"
                              aria-hidden
                              tabIndex={-1}
                            >
                              Ver XML
                            </Button>
                          )}
                          <Button variant="outline" size="sm" disabled>
                            Descargar
                          </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

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

            {message ? <p className="text-sm text-destructive">{message}</p> : null}
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

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onCloneCertification()}
                  className="w-full sm:w-auto"
                  disabled={
                    isCloningCertification ||
                    saving ||
                    isEnqueueingCertification ||
                    !isFinishedCertification
                  }
                >
                  <Copy className="mr-2 size-4" />
                  {isCloningCertification ? "Copiando..." : "Copiar certificación"}
                </Button>
              ) : null}
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onEnqueueStage3()}
                  className="w-full sm:w-auto"
                  disabled={
                    isEnqueueingStage3 ||
                    saving ||
                    isEnqueueingCertification ||
                    !hasMissingStage3Xml
                  }
                >
                  {isEnqueueingStage3 ? "Encolando etapa 3..." : "Encolar etapa 3"}
                </Button>
              ) : null}
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 sm:w-auto"
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
                className="w-full sm:w-auto"
                onClick={() => router.push("/dashboard/certifications")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={
                  saving ||
                  loadingDetail ||
                  editingProcessingStatus === "processing" ||
                  editingProcessingStatus === "finish" ||
                  (requiresCertValidation && !hasValidCertPassword)
                }
              >
                <Upload className="mr-2 size-4" />
                {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
