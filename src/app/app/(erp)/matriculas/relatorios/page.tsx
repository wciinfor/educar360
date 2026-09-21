import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getEnrollmentsAction } from "@/app/actions/matriculas";
import { MatriculasReportsClient } from "@/components/matriculas/MatriculasReportsClient";

export default async function MatriculasReportsPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // RBAC Guard
  if (!canAccessModule(session.role, "matriculas")) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo</h2>
        <p className="text-sm text-slate-600">
          O seu perfil (<strong>{session.role}</strong>) não possui permissão para acessar os relatórios do módulo <strong>Matrículas</strong> nesta instituição escolar.
        </p>
      </div>
    );
  }

  // Carrega inicialmente todas as matrículas e estrutura acadêmica para geração dos relatórios
  const [enrollmentsRes, coursesRes, seriesRes, classesRes] = await Promise.all([
    getEnrollmentsAction({ status: "all" }),
    import("@/app/actions/academico").then((m) => m.getCoursesAction()),
    import("@/app/actions/academico").then((m) => m.getSeriesAction()),
    import("@/app/actions/academico").then((m) => m.getSchoolClassesAction()),
  ]);

  const initialEnrollments = enrollmentsRes.success ? enrollmentsRes.data : [];
  const courses = coursesRes.success ? coursesRes.courses : [];
  const series = seriesRes.success ? seriesRes.series : [];
  const schoolClasses = classesRes.success ? classesRes.schoolClasses : [];

  return (
    <div className="max-w-7xl mx-auto">
      <MatriculasReportsClient
        initialEnrollments={initialEnrollments}
        courses={courses}
        seriesList={series}
        schoolClasses={schoolClasses}
        tenantName={session.tenant.name}
        currentUserRole={session.role}
      />
    </div>
  );
}

