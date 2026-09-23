export interface DashboardSummary {
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  teachersCount: number;
  staffCount: number;
  classesCount: number;
  coursesCount: number;
}

export interface DashboardPlanUsage {
  planName: string;
  planCode: string;
  status: string;
  maxStudents: number | null;
  activeStudents: number;
  occupancyPercentage: number;
  availableSlots: number | null;
  monthlyPriceFormatted: string;
}

export interface MonthlyEvolutionItem {
  monthIndex: number;
  month: string;
  fullMonth: string;
  enrollments: number;
  newStudents: number;
}

export interface CourseDistributionItem {
  courseId: string;
  courseName: string;
  count: number;
  percentage: number;
  color: string;
}

export interface EnrollmentStatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
  colorHex: string;
  barColorClass: string;
  textColorClass: string;
  badgeBgClass: string;
}

export interface RecentEnrollmentItem {
  id: string;
  enrollmentCode: string;
  studentName: string;
  studentInitials: string;
  courseName: string;
  seriesName: string;
  className?: string | null;
  shift: string;
  status: string;
  statusLabel: string;
  statusColorClass: string;
  statusBgClass: string;
  createdAt: string;
  relativeTime: string;
}

export interface AcademicCalendarItem {
  id: string;
  dateBadge: { day: string; month: string };
  title: string;
  subtitle: string;
  colorClass: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  planUsage: DashboardPlanUsage;
  enrollmentEvolution: MonthlyEvolutionItem[];
  courseDistribution: CourseDistributionItem[];
  statusBreakdown: EnrollmentStatusBreakdownItem[];
  recentEnrollments: RecentEnrollmentItem[];
  academicCalendarInfo: {
    academicYear: string;
    todayFormatted: string;
    events: AcademicCalendarItem[];
  };
  authorizedModules: string[];
}
