import { NextResponse } from "next/server";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get("url");
  const fallbackName = searchParams.get("name") ?? "document.xml";

  if (!sourceUrl) {
    return badRequest("Falta el parámetro url");
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return badRequest("URL inválida");
  }

  if (parsed.protocol !== "https:") {
    return badRequest("Solo se permiten URLs HTTPS");
  }

  if (!parsed.hostname.endsWith(".r2.dev")) {
    return badRequest("Host no permitido");
  }

  if (!parsed.pathname.startsWith("/certifications/")) {
    return badRequest("Ruta no permitida");
  }

  const upstream = await fetch(parsed.toString(), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { ok: false, message: "No se pudo obtener el archivo" },
      { status: 502 }
    );
  }

  const fileNameFromPath = decodeURIComponent(
    parsed.pathname.split("/").pop() || fallbackName
  );
  const fileName = (fileNameFromPath || fallbackName).replace(/"/g, "");

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/xml",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

