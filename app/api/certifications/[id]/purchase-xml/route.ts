import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { type Certification, fileToBase64, readFile } from "@/lib/certifications";
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

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const formData = await request.formData();
    const exchangeDteFile = readFile(formData, "exchangeDteFile");

    if (!exchangeDteFile) {
      return NextResponse.json(
        { ok: false, message: "Debes subir el XML de compra SII" },
        { status: 400 }
      );
    }

    const base64 = await fileToBase64(exchangeDteFile);
    const db = await getDb();
    const result = await db.collection<Certification>("certifications").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          exhangeDteBase64: base64,
        },
        $push: {
          events: {
            type: "purchase_xml_saved",
            message: "XML de compra SII actualizado manualmente",
            createdAt: new Date().toISOString(),
          },
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { ok: false, message: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "XML de compra SII guardado",
    });
  } catch (error) {
    console.error("Save purchase XML error", error);
    return NextResponse.json(
      { ok: false, message: "No fue posible guardar el XML de compra SII" },
      { status: 500 }
    );
  }
}

