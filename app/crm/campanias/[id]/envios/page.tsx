import CampaignOperationsPanel from "@/components/crm/CampaignOperationsPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignOperationsPage({ params }: PageProps) {
  const { id } = await params;
  const idCampania = Number(id);

  if (!Number.isInteger(idCampania) || idCampania <= 0) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            ID de campaña inválido.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <CampaignOperationsPanel idCampania={idCampania} />
      </div>
    </main>
  );
}