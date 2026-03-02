import forge from "node-forge";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");
    const certFile = formData.get("certificadoFile");

    if (typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { ok: false, message: "La contraseña es obligatoria" },
        { status: 400 }
      );
    }

    if (!(certFile instanceof File) || certFile.size === 0) {
      return NextResponse.json(
        { ok: false, message: "Debes subir un archivo de certificado" },
        { status: 400 }
      );
    }

    const bytes = await certFile.arrayBuffer();
    const certBuffer = Buffer.from(bytes);
    const binary = certBuffer.toString("binary");

    try {
      const asn1 = forge.asn1.fromDer(binary);
      forge.pkcs12.pkcs12FromAsn1(asn1, password.trim());
    } catch {
      return NextResponse.json(
        { ok: false, message: "Contraseña de certificado inválida" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Contraseña de certificado válida",
    });
  } catch (error) {
    console.error("Validate certificate password error", error);
    return NextResponse.json(
      { ok: false, message: "Error validando contraseña del certificado" },
      { status: 500 }
    );
  }
}
