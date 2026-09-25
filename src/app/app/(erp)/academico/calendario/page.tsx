import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import {
  getSchoolYearsAction,
  getCalendarEventCategoriesAction,
  getCalendarEventsAction,
} from "@/app/actions/calendario";
import { CalendarioAnosClient } from "@/components/academico/CalendarioAnosClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Calendário Escolar - Anos, Etapas e Eventos | Educar360",
  description: "Configuração de Anos Letivos, Períodos Acadêmicos e Eventos no Educar360",
};

export default async function CalendarioAcademicoPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca dados iniciais de Anos, Categorias e Eventos em paralelo
  const [yearsRes, categoriesRes, eventsRes] = await Promise.all([
    getSchoolYearsAction(),
    getCalendarEventCategoriesAction(),
    getCalendarEventsAction(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CalendarioAnosClient
        initialSchoolYears={yearsRes.schoolYears || []}
        initialCategories={categoriesRes.categories || []}
        initialEvents={eventsRes.events || []}
        userRole={session.role}
        currentUserId={session.user.id}
        schoolName={session.tenant.name}
      />
    </Suspense>
  );
}
