import { NextResponse } from "next/server";

import {
  type Certification,
  extractRutFromFolioXml,
  fileToBase64,
  normalizeRut,
  parseNumerations,
  readFile,
  readString,
} from "@/lib/certifications";
import { getDb } from "@/lib/mongodb";

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
};

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .collection<Certification>("certifications")
      .find(
        {},
        {
          projection: {
            rutEmisor: 1,
            razonSocialEmisor: 1,
            rutReceptor: 1,
            razonSocialReceptor: 1,
            resolutionNumber: 1,
            createdAt: 1,
            numerations: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const data: CertificationListItem[] = rows.map((row) => ({
      _id: row._id?.toString() ?? "",
      rutEmisor: row.rutEmisor ?? "",
      razonSocialEmisor: row.razonSocialEmisor ?? "",
      rutReceptor: row.rutReceptor ?? "",
      razonSocialReceptor: row.razonSocialReceptor ?? "",
      resolutionNumber: row.resolutionNumber ?? "",
      createdAt: row.createdAt ?? "",
      numerationsCount: row.numerations?.length ?? 0,
      documentTypes: Array.from(
        new Set(
          (row.numerations ?? [])
            .map((n) => n.documentType?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).join(", "),
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("List certifications error", error);
    return NextResponse.json(
      { ok: false, message: "Error al listar certificaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rutEmisor = readString(formData, "rutEmisor");
    const normalizedRutEmisor = normalizeRut(rutEmisor);
    const setSiiFile = readFile(formData, "setSiiFile");
    const certificadoFile = readFile(formData, "certificadoFile");

    if (!setSiiFile || !certificadoFile) {
      return NextResponse.json(
        {
          ok: false,
          message: "setSiiFile y certificadoFile son obligatorios",
        },
        { status: 400 }
      );
    }

    const numerationsMeta = parseNumerations(readString(formData, "numerations"));
    const numerations = await Promise.all(
      numerationsMeta.map(async (item, index) => {
        const numerationFile = readFile(formData, `numerationFile_${index}`);
        if (!numerationFile) {
          throw new Error("Todas las numeraciones requieren archivo");
        }

        const folioRut = await extractRutFromFolioXml(numerationFile);
        if (!normalizedRutEmisor || !folioRut || folioRut !== normalizedRutEmisor) {
          return Promise.reject(
            new Error("El RUT del folio no coincide con el RUT del emisor")
          );
        }

        return {
          numerationBase64: await fileToBase64(numerationFile),
          startNumber: item.startNumber,
          endNumber: item.endNumber,
          documentType: item.documentType?.trim() ?? "",
        };
      })
    );

    const certification: Certification = {
      setSiiBase64: await fileToBase64(setSiiFile),
      numerations,
      rutEmisor,
      razonSocialEmisor: readString(formData, "razonSocialEmisor"),
      giroEmisor: readString(formData, "giroEmisor"),
      actecoEmisor: readString(formData, "actecoEmisor"),
      direccionEmisor: readString(formData, "direccionEmisor"),
      comunaEmisor: readString(formData, "comunaEmisor"),
      emailEmisor: readString(formData, "emailEmisor"),
      rutReceptor: readString(formData, "rutReceptor"),
      razonSocialReceptor: readString(formData, "razonSocialReceptor"),
      giroReceptor: readString(formData, "giroReceptor"),
      direccionReceptor: readString(formData, "direccionReceptor"),
      comunaReceptor: readString(formData, "comunaReceptor"),
      emailReceptor: readString(formData, "emailReceptor"),
      certificadoBase64: await fileToBase64(certificadoFile),
      claveCertificado: readString(formData, "claveCertificado"),
      resolutionNumber: readString(formData, "resolutionNumber"),
      resolutionDate: readString(formData, "resolutionDate"),
      resolutionTicketNumber: readString(formData, "resolutionTicketNumber"),
      resolutionTicketDate: readString(formData, "resolutionTicketDate"),
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    const result = await db.collection<Certification>("certifications").insertOne(certification);

    return NextResponse.json({
      ok: true,
      message: "Certificación creada",
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Create certification error", error);
    if (error instanceof Error) {
      if (error.message === "El RUT del folio no coincide con el RUT del emisor") {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 400 }
        );
      }

      if (error.message === "Todas las numeraciones requieren archivo") {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Error al crear certificación" },
      { status: 500 }
    );
  }
}
