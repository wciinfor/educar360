"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { revalidatePath } from "next/cache";
import {
  TimetableGridData,
  TimetableStore,
  TimetableOption,
  SubjectItem,
  TimeSlot,
  DEFAULT_TIME_SLOTS,
  DAYS_OF_WEEK,
  DayOfWeek,
  GridCellLesson,
  TimetableRoomClass,
} from "@/types/grade-horaria";
import { SchoolClass, Course, Series } from "@/types/academico";

const DEFAULT_SUBJECTS: SubjectItem[] = [
  {
    id: "subj-1",
    name: "Língua Portuguesa",
    teacherName: "Ana Silva",
    weeklyLessons: 25,
    allocatedLessons: 25,
    colorHex: "#10B981",
    colorName: "emerald",
  },
  {
    id: "subj-2",
    name: "Matemática",
    teacherName: "Carlos Souza",
    weeklyLessons: 25,
    allocatedLessons: 25,
    colorHex: "#3B82F6",
    colorName: "blue",
  },
  {
    id: "subj-3",
    name: "Ciências",
    teacherName: "Beatriz Lima",
    weeklyLessons: 20,
    allocatedLessons: 20,
    colorHex: "#F59E0B",
    colorName: "amber",
  },
  {
    id: "subj-4",
    name: "História",
    teacherName: "Diego Alves",
    weeklyLessons: 15,
    allocatedLessons: 15,
    colorHex: "#8B5CF6",
    colorName: "purple",
  },
  {
    id: "subj-5",
    name: "Geografia",
    teacherName: "Elisa Costa",
    weeklyLessons: 15,
    allocatedLessons: 15,
    colorHex: "#F43F5E",
    colorName: "rose",
  },
  {
    id: "subj-6",
    name: "Língua Inglesa",
    teacherName: "Fernanda Rocha",
    weeklyLessons: 10,
    allocatedLessons: 10,
    colorHex: "#F97316",
    colorName: "orange",
  },
  {
    id: "subj-7",
    name: "Arte",
    teacherName: "Gabriel Lima",
    weeklyLessons: 10,
    allocatedLessons: 10,
    colorHex: "#14B8A6",
    colorName: "teal",
  },
];

export async function getTimetableDataAction(): Promise<{
  success: boolean;
  store?: TimetableStore;
  rooms?: TimetableRoomClass[];
  classes?: SchoolClass[];
  error?: string;
}> {
  try {
    const session = await getTenantSession();
    if (!session) {
      throw new Error("Não autenticado.");
    }
    if (!canAccessModule(session.role, "academico")) {
      throw new Error("Acesso negado.");
    }

    const supabase = await createClient();

    // 1. Busca turmas cadastradas
    let dbClasses: SchoolClass[] = [];
    try {
      const { data, error } = await (supabase.from("school_classes") as any)
        .select(`
          *,
          series:series (
            id,
            name,
            course:courses (
              id,
              name
            )
          )
        `)
        .eq("tenant_id", session.tenant.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        dbClasses = data;
      }
    } catch {
      // ignore
    }

    // 2. Busca dados de grade salvos em tenant.settings
    const { data: tenantData } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const settings = (tenantData?.settings as Record<string, any>) || {};
    let store: TimetableStore = settings.timetable_grid_store;

    // Se não houver turmas no banco, cria representações realistas padrão da escola
    const rooms: TimetableRoomClass[] =
      dbClasses.length > 0
        ? dbClasses.map((cls, idx) => ({
            id: cls.id,
            roomNumber: idx + 1,
            roomLabel: `Sala ${idx + 1} — ${cls.name}`,
            className: cls.name,
            shift: cls.shift || "matutino",
            totalWeeklyLessons: 32,
            classId: cls.id,
          }))
        : [
            {
              id: "room-1",
              roomNumber: 1,
              roomLabel: "Sala 1 — 6º Ano A",
              className: "6º Ano A",
              shift: "matutino",
              totalWeeklyLessons: 32,
              classId: "room-1",
            },
            {
              id: "room-2",
              roomNumber: 2,
              roomLabel: "Sala 2 — 6º Ano B",
              className: "6º Ano B",
              shift: "matutino",
              totalWeeklyLessons: 32,
              classId: "room-2",
            },
            {
              id: "room-3",
              roomNumber: 3,
              roomLabel: "Sala 3 — 7º Ano A",
              className: "7º Ano A",
              shift: "matutino",
              totalWeeklyLessons: 32,
              classId: "room-3",
            },
            {
              id: "room-4",
              roomNumber: 4,
              roomLabel: "Sala 4 — 7º Ano B",
              className: "7º Ano B",
              shift: "matutino",
              totalWeeklyLessons: 32,
              classId: "room-4",
            },
          ];

    // Se o store não existir, inicializa distribuição padrão
    if (!store || !store.options || store.options.length === 0) {
      store = generateInitialTimetableStore(rooms, DEFAULT_SUBJECTS);
    }

    return {
      success: true,
      store,
      rooms,
      classes: dbClasses,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao carregar dados da grade horária.",
    };
  }
}

export async function saveTimetableDataAction(
  store: TimetableStore
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getTenantSession();
    if (!session) {
      throw new Error("Não autenticado.");
    }
    if (!canAccessModule(session.role, "academico")) {
      throw new Error("Acesso negado.");
    }

    const supabase = await createClient();

    const { data: tenantData } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const currentSettings = (tenantData?.settings as Record<string, any>) || {};

    const updatedStore: TimetableStore = {
      ...store,
      updatedAt: new Date().toISOString(),
    };

    await (supabase.from("tenants") as any)
      .update({
        settings: {
          ...currentSettings,
          timetable_grid_store: updatedStore,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.tenant.id);

    // Registra log de auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "TIMETABLE_SAVED",
        entity_name: "timetable_grid",
        entity_id: session.tenant.id,
        new_values: {
          activeOption: store.activeOption,
          optionsCount: store.options?.length || 0,
        },
      },
    ]);

    revalidatePath("/app/academico/grade-horaria");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao salvar a grade horária.",
    };
  }
}

/**
 * Gera store inicial com 5 opções de distribuição automática
 */
export function generateInitialTimetableStore(
  rooms: TimetableRoomClass[],
  subjects: SubjectItem[]
): TimetableStore {
  const options: TimetableOption[] = [];

  for (let optIndex = 1; optIndex <= 5; optIndex++) {
    const gridData: TimetableGridData = {};
    const slots = DEFAULT_TIME_SLOTS.filter((s) => !s.isBreak);

    rooms.forEach((room, roomIdx) => {
      gridData[room.id] = {
        segunda: {},
        terca: {},
        quarta: {},
        quinta: {},
        sexta: {},
      };

      DAYS_OF_WEEK.forEach((day, dayIdx) => {
        slots.forEach((slot, slotIdx) => {
          // Distribui matérias com base em seed balanceada para cada opção
          const seed = (roomIdx * 7 + dayIdx * 3 + slotIdx + optIndex * 2) % subjects.length;
          const subject = subjects[seed];

          const isLocked = optIndex === 1 && (slotIdx === 0 && dayIdx < 2);

          gridData[room.id][day.key][slot.id] = {
            id: `cell-${room.id}-${day.key}-${slot.id}`,
            subjectId: subject.id,
            subjectName: subject.name,
            teacherName: subject.teacherName,
            colorHex: subject.colorHex,
            colorName: subject.colorName,
            isLocked,
          };
        });
      });
    });

    options.push({
      optionId: `opcao-${optIndex}`,
      name: `Opção ${optIndex}`,
      gridData,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    activeOption: "opcao-1",
    options,
    subjects,
    timeSlots: DEFAULT_TIME_SLOTS,
    updatedAt: new Date().toISOString(),
  };
}
