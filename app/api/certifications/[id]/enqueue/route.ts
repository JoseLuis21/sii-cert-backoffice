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

const STAGE3_QUEUE = "certificaciones_stage3";

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, message: "ID de certificación inválido" },
      { status: 400 }
    );
  }

  try {
    let stage: number | undefined;
    try {
      const body = (await request.json()) as { stage?: number };
      stage = body.stage;
    } catch {
      stage = undefined;
    }

    const isStage3Enqueue = stage === 3;

    const db = await getDb();
    const certification = await db
      .collection<Certification>("certifications")
      .findOne(
        { _id: new ObjectId(id) },
        {
          projection: {
            _id: 1,
            processingStatus: 1,
            stage3RecepcionDteXmlUrl: 1,
            stage3EnvioRecibosXmlUrl: 1,
            stage3ResultadoDteXmlUrl: 1,
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
    if (!isStage3Enqueue && currentStatus !== "pending") {
      return NextResponse.json(
        {
          ok: false,
          message: `No se puede reenviar una certificación con estado ${currentStatus}`,
        },
        { status: 400 }
      );
    }

    if (isStage3Enqueue) {
      if (currentStatus !== "finish") {
        return NextResponse.json(
          {
            ok: false,
            message: "Solo se puede encolar etapa 3 cuando la certificación está en finish",
          },
          { status: 400 }
        );
      }

      const hasStage3Xml =
        Boolean((certification as Certification).stage3RecepcionDteXmlUrl) &&
        Boolean((certification as Certification).stage3EnvioRecibosXmlUrl) &&
        Boolean((certification as Certification).stage3ResultadoDteXmlUrl);

      if (hasStage3Xml) {
        return NextResponse.json(
          {
            ok: false,
            message: "La certificación ya tiene XML de etapa 3",
          },
          { status: 400 }
        );
      }

      try {
        await enqueueCertification(id, STAGE3_QUEUE);
      } catch {
        await db.collection<Certification>("certifications").updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              events: {
                type: "stage3_enqueue_failed",
                message: "Error al publicar etapa 3 en RabbitMQ",
                createdAt: new Date().toISOString(),
              },
            },
          }
        );
        throw new Error("stage3_enqueue_failed");
      }

      await db.collection<Certification>("certifications").updateOne(
        { _id: new ObjectId(id), processingStatus: "finish" },
        {
          $set: {
            processingStatus: "pending",
          },
          $push: {
            events: {
              type: "stage3_enqueued",
              message: "Certificación encolada para generación de etapa 3",
              createdAt: new Date().toISOString(),
            },
          },
        }
      );

      return NextResponse.json({
        ok: true,
        message: "Etapa 3 encolada. Estado actualizado a pending.",
      });
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
