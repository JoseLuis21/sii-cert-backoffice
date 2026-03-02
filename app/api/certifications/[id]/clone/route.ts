import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { type Certification } from "@/lib/certifications";
import { getDb } from "@/lib/mongodb";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, message: "ID de certificación inválido" },
      { status: 400 }
    );
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

    const cloned: Certification = {
      ...current,
      _id: undefined,
      processingStatus: "pending",
      events: [
        {
          type: "cloned",
          message: `Certificación copiada desde ${id}`,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection<Certification>("certifications").insertOne(cloned);

    return NextResponse.json({
      ok: true,
      message: "Copia creada correctamente",
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Clone certification error", error);
    return NextResponse.json(
      { ok: false, message: "No fue posible copiar la certificación" },
      { status: 500 }
    );
  }
}
