import { SchoolClass, Course, Series } from "./academico";

export type DayOfWeek = "segunda" | "terca" | "quarta" | "quinta" | "sexta";

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
];

export interface TimeSlot {
  id: string;
  slotIndex: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  label?: string;
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: "slot-1", slotIndex: 1, startTime: "07:30", endTime: "08:20" },
  { id: "slot-2", slotIndex: 2, startTime: "08:20", endTime: "09:10" },
  { id: "slot-3", slotIndex: 3, startTime: "09:10", endTime: "10:00" },
  { id: "break-1", slotIndex: 0, startTime: "10:00", endTime: "10:20", isBreak: true, label: "Intervalo" },
  { id: "slot-4", slotIndex: 4, startTime: "10:20", endTime: "11:10" },
  { id: "slot-5", slotIndex: 5, startTime: "11:10", endTime: "12:00" },
];

export interface SubjectItem {
  id: string;
  name: string;
  teacherId?: string;
  teacherName: string;
  weeklyLessons: number;
  allocatedLessons: number;
  colorHex: string;
  colorName: "emerald" | "blue" | "amber" | "purple" | "rose" | "orange" | "teal" | "slate";
  isBlocked?: boolean;
}

export interface GridCellLesson {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  teacherId?: string;
  colorHex: string;
  colorName: "emerald" | "blue" | "amber" | "purple" | "rose" | "orange" | "teal" | "slate";
  isLocked: boolean;
  isBlocked?: boolean;
}

export type TimetableGridData = Record<
  string, // classId
  Record<
    DayOfWeek,
    Record<
      string, // slotId (e.g. "slot-1")
      GridCellLesson | null
    >
  >
>;

export interface TimetableRoomClass {
  id: string;
  roomNumber: number;
  roomLabel: string;
  className: string;
  shift: string;
  totalWeeklyLessons: number;
  classId: string;
}

export interface TimetableOption {
  optionId: string;
  name: string;
  gridData: TimetableGridData;
  createdAt: string;
}

export interface TimetableStore {
  activeOption: string;
  options: TimetableOption[];
  subjects: SubjectItem[];
  timeSlots: TimeSlot[];
  updatedAt: string;
}
