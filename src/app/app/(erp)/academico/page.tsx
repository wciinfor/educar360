import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getCoursesAction, getSeriesAction, getSchoolClassesAction } from "@/app/actions/academico";
import { getSchoolYearsAction } from "@/app/actions/calendario";
import { AcademicoClient } from "@/components/academico/AcademicoClient";

export default async function EstruturaAcademicaPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca dados acadêmicos e anos letivos em paralelo
  const [coursesRes, seriesRes, classesRes, schoolYearsRes] = await Promise.all([
    getCoursesAction(),
    getSeriesAction(),
    getSchoolClassesAction(),
    getSchoolYearsAction(),
  ]);

  return (
    <AcademicoClient
      initialCourses={coursesRes.courses || []}
      initialSeries={seriesRes.series || []}
      initialClasses={classesRes.schoolClasses || []}
      initialSchoolYears={schoolYearsRes.schoolYears || []}
      userRole={session.role}
      schoolName={session.tenant.name}
    />
  );
}
