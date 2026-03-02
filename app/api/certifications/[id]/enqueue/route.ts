import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import {
  type Certification,
  type CertificationEvent,
} from "@/lib/certifications";
import { getDb } from "@/lib/mongodb";
import { enqueueCertification } from "@/lib/rabbitmq";

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
    const certification = await db
      .collection<Certification>("certifications")
      .findOne(
        { _id: new ObjectId(id) },
        {
          projection: {
            _id: 1,
            processingStatus: 1,
          },
        }
      );

    if (!certification) {
      return NextResponse.json(
        { ok: false, message: "Certificación no encontrada" },
        { status: 404 }
      );
    }

    const currentStatus = certification.processingStatus ?? "pending";
    if (currentStatus !== "pending") {
      return NextResponse.json(
        {
          ok: false,
          message: `No se puede reenviar una certificación con estado ${currentStatus}`,
        },
        { status: 400 }
      );
    }

    const enqueueEvent: CertificationEvent = {
      type: "enqueued",
      message: "Certificación encolada para envío al SII",
      createdAt: new Date().toISOString(),
    };

    const transition = await db.collection<Certification>("certifications").updateOne(
      {
        _id: new ObjectId(id),
        $or: [{ processingStatus: "pending" }, { processingStatus: { $exists: false } }],
      },
      {
        $set: {
          processingStatus: "processing",
        },
        $push: {
          events: enqueueEvent,
        },
      }
    );

    if (!transition.modifiedCount) {
      return NextResponse.json(
        {
          ok: false,
          message: "La certificación ya fue enviada o está siendo procesada",
        },
        { status: 409 }
      );
    }

    try {
      await enqueueCertification(id);
    } catch (publishError) {
      await db.collection<Certification>("certifications").updateOne(
        { _id: new ObjectId(id), processingStatus: "processing" },
        {
          $set: { processingStatus: "pending" },
          $push: {
            events: {
              type: "enqueue_failed",
              message: "Error al publicar en RabbitMQ",
              createdAt: new Date().toISOString(),
            },
          },
        }
      );
      throw publishError;
    }

    return NextResponse.json({
      ok: true,
      message: "En proceso",
    });
  } catch (error) {
    console.error("Enqueue certification error", error);
    return NextResponse.json(
      { ok: false, message: "No fue posible encolar la certificación" },
      { status: 500 }
    );
  }
}
