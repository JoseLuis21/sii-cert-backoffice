import { ObjectId } from "mongodb";

export type Numeration = {
  numerationBase64: string;
  startNumber: number;
  endNumber: number;
  documentType: string;
};

export type Certification = {
  _id?: ObjectId;
  setSiiBase64: string;
  numerations: Numeration[];
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
  createdAt: string;
};

export type NumerationMeta = {
  startNumber: number;
  endNumber: number;
  documentType?: string;
  existingBase64?: string;
};

export function normalizeRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function readString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

export function readFile(formData: FormData, key: string): File | null {
  const raw = formData.get(key);
  if (!(raw instanceof File) || raw.size === 0) {
    return null;
  }
  return raw;
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString("base64");
}

export async function extractRutFromFolioXml(
  file: File
): Promise<string | null> {
  const text = await file.text();
  const match = text.match(/<RE>\s*([^<\s]+)\s*<\/RE>/i);
  if (!match?.[1]) {
    return null;
  }
  return normalizeRut(match[1]);
}

export function parseNumerations(raw: string): NumerationMeta[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const result: NumerationMeta[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as Record<string, unknown>;
    const startNumber = Number(entry.startNumber);
    const endNumber = Number(entry.endNumber);

    if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber)) {
      continue;
    }

    result.push({
      startNumber,
      endNumber,
      documentType:
        typeof entry.documentType === "string" ? entry.documentType : "",
      existingBase64:
        typeof entry.existingBase64 === "string" ? entry.existingBase64 : "",
    });
  }

  return result;
}
