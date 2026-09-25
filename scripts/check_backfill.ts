import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  if (fs.existsSync(".env.local")) {
    const content = fs.readFileSync(".env.local", "utf8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key.trim()] = val;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log("Supabase credentials not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBackfill() {
  const { data: classes, error: cErr } = await supabase
    .from("school_classes")
    .select("id, tenant_id, name, academic_year");

  if (cErr) {
    console.error("Error fetching classes:", cErr);
    return;
  }

  const { data: years, error: yErr } = await supabase
    .from("school_years")
    .select("id, tenant_id, year, title");

  if (yErr) {
    console.error("Error fetching school years:", yErr);
    return;
  }

  console.log(`\n=== ANÁLISE DE BACKFILL: school_classes ↔ school_years ===`);
  console.log(`Total de turmas existentes no banco: ${classes?.length || 0}`);
  console.log(`Total de anos letivos cadastrados: ${years?.length || 0}`);

  const matched: any[] = [];
  const unmatched: any[] = [];

  for (const c of classes || []) {
    const match = (years || []).find(
      (y) => y.tenant_id === c.tenant_id && y.year.trim() === (c.academic_year || "").trim()
    );
    if (match) {
      matched.push({ class: c, year: match });
    } else {
      unmatched.push(c);
    }
  }

  console.log(`\nTurmas com correspondência exata para vinculação (${matched.length}):`);
  matched.forEach((m) =>
    console.log(`  ✓ Turma "${m.class.name}" (Ano: ${m.class.academic_year}) -> Vincula ao Ano Letivo "${m.year.title}" (${m.year.id})`)
  );

  console.log(`\nTurmas sem correspondência de ano letivo (${unmatched.length}):`);
  if (unmatched.length === 0) {
    console.log(`  (Nenhuma turma sem correspondência)`);
  } else {
    unmatched.forEach((u) =>
      console.log(`  ✗ Turma "${u.name}" (academic_year: "${u.academic_year}", tenant_id: ${u.tenant_id})`)
    );
  }
}

checkBackfill();
