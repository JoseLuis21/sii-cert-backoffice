import { CertificationFormPage } from "@/components/certifications/certification-form-page";

type EditCertificationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCertificationPage({
  params,
}: EditCertificationPageProps) {
  const { id } = await params;

  return <CertificationFormPage mode="edit" certificationId={id} />;
}
