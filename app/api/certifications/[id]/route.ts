import { ObjectId } from "mongodb";
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

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function invalidIdResponse() {
  return NextResponse.json(
    { ok: false, message: "ID de certificación inválido" },
    { status: 400 }
  );
}

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const db = await getDb();
    const row = await db
      .collection<Certification>("certifications")
      .findOne({ _id: new ObjectId(id) });

    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...row,
        _id: row._id?.toString(),
        processingStatus: row.processingStatus ?? "pending",
        events: row.events ?? [],
      },
    });
  } catch (error) {
    console.error("Get certification error", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener certificación" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const db = await getDb();
    const current = await db
      .collection<Certification>("certifications")
      .findOne({ _id: new ObjectId(id) });

    if (!current) {
      return NextResponse.json(
        { ok: false, message: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    if (current.processingStatus === "processing") {
      return NextResponse.json(
        {
          ok: false,
          message: "No se puede actualizar una certificación en proceso",
        },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const rutEmisor = readString(formData, "rutEmisor");
    const normalizedRutEmisor = normalizeRut(rutEmisor);
    const setSiiFile = readFile(formData, "setSiiFile");
    const certificadoFile = readFile(formData, "certificadoFile");

    const numerationsMeta = parseNumerations(readString(formData, "numerations"));
    const numerations = await Promise.all(
      numerationsMeta.map(async (item, index) => {
        const numerationFile = readFile(formData, `numerationFile_${index}`);
        const numerationBase64 = numerationFile
          ? await fileToBase64(numerationFile)
          : item.existingBase64 ?? "";

        if (numerationFile) {
          const folioRut = await extractRutFromFolioXml(numerationFile);
          if (!normalizedRutEmisor || !folioRut || folioRut !== normalizedRutEmisor) {
            return Promise.reject(
              new Error("El RUT del folio no coincide con el RUT del emisor")
            );
          }
        }

        if (!numerationBase64) {
          throw new Error("Cada numeración debe tener archivo o base64 previo");
        }

        return {
          numerationBase64,
          startNumber: item.startNumber,
          endNumber: item.endNumber,
          documentType:
            item.documentType?.trim() ?? current.numerations[index]?.documentType ?? "",
        };
      })
    );

    const nextCertification: Certification = {
      ...current,
      setSiiBase64: setSiiFile
        ? await fileToBase64(setSiiFile)
        : current.setSiiBase64,
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
      certificadoBase64: certificadoFile
        ? await fileToBase64(certificadoFile)
        : current.certificadoBase64,
      claveCertificado: readString(formData, "claveCertificado"),
      resolutionNumber: readString(formData, "resolutionNumber"),
      resolutionDate: readString(formData, "resolutionDate"),
      resolutionTicketNumber: readString(formData, "resolutionTicketNumber"),
      resolutionTicketDate: readString(formData, "resolutionTicketDate"),
      processingStatus: current.processingStatus ?? "pending",
      events: current.events ?? [],
      createdAt: current.createdAt,
    };

    await db
      .collection<Certification>("certifications")
      .replaceOne({ _id: new ObjectId(id) }, nextCertification);

    return NextResponse.json({
      ok: true,
      message: "Certificación actualizada",
    });
  } catch (error) {
    console.error("Update certification error", error);
    if (error instanceof Error) {
      if (error.message === "El RUT del folio no coincide con el RUT del emisor") {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 400 }
        );
      }

      if (error.message === "Cada numeración debe tener archivo o base64 previo") {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Error al actualizar certificación" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const db = await getDb();
    const result = await db
      .collection<Certification>("certifications")
      .deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json(
        { ok: false, message: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Certificación eliminada",
    });
  } catch (error) {
    console.error("Delete certification error", error);
    return NextResponse.json(
      { ok: false, message: "Error al eliminar certificación" },
      { status: 500 }
    );
  }
}
