#!/usr/bin/env node
/**
 * Ajusta `user_course_points` cuando cambió la lógica de puntos por retos aprobados.
 *
 * Necesitas:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (rol servicio; no uses la anon key en prod)
 *
 * Uso:
 *   node scripts/fix-challenge-points.mjs --legacy-model rewardOnly --dry-run
 *   node scripts/fix-challenge-points.mjs --legacy-model rewardOnly --apply
 *   node scripts/fix-challenge-points.mjs --legacy-model fixed30 --apply --user-id=user_xxx
 *   node scripts/fix-challenge-points.mjs --legacy-model rewardOnly --apply --course-id=uuid --reviewed-before=2026-03-20T00:00:00.000Z
 *
 * Modelos legacy (--legacy-model):
 *   - rewardOnly  → antes: a tiempo = solo points_reward; tarde = mitad (como ahora en tarde).
 *                   Delta típico a tiempo: +30 (bonus) por entrega.
 *   - fixed30     → antes: 30 a tiempo / 15 tarde (sin mirar points_reward).
 *
 * Por defecto solo muestra el plan (--dry-run). Con --apply escribe en user_course_points.
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_CHALLENGE_POINTS_REWARD = 30;
const CHALLENGE_ON_TIME_BONUS = 30;

function normalizeChallengePointsReward(raw) {
  if (raw == null || !Number.isFinite(Number(raw))) return DEFAULT_CHALLENGE_POINTS_REWARD;
  const v = Math.round(Number(raw));
  return Math.max(0, Math.min(1000, v));
}

function computeCurrentApprovalPoints(pointsRewardRaw, { onTime, isOnDemand }) {
  const base = normalizeChallengePointsReward(pointsRewardRaw);
  if (isOnDemand || onTime) return base + CHALLENGE_ON_TIME_BONUS;
  return Math.max(0, Math.floor(base / 2));
}

function computeLegacyApprovalPoints(pointsRewardRaw, { onTime, isOnDemand }, legacyModel) {
  const base = normalizeChallengePointsReward(pointsRewardRaw);
  if (legacyModel === 'rewardOnly') {
    if (isOnDemand || onTime) return base;
    return Math.max(0, Math.floor(base / 2));
  }
  if (legacyModel === 'fixed30') {
    if (isOnDemand || onTime) return 30;
    return 15;
  }
  throw new Error(`legacy-model desconocido: ${legacyModel}`);
}

function parseArgs(argv) {
  const out = {
    dryRun: true,
    apply: false,
    legacyModel: null,
    userId: null,
    courseId: null,
    reviewedBefore: null,
  };
  for (const a of argv) {
    if (a === '--apply') out.apply = true;
    if (a === '--dry-run') out.dryRun = true;
    if (a.startsWith('--legacy-model=')) out.legacyModel = a.slice('--legacy-model='.length);
    if (a.startsWith('--user-id=')) out.userId = a.slice('--user-id='.length);
    if (a.startsWith('--course-id=')) out.courseId = a.slice('--course-id='.length);
    if (a.startsWith('--reviewed-before=')) out.reviewedBefore = a.slice('--reviewed-before='.length);
  }
  if (out.apply) out.dryRun = false;
  return out;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Uso:
  node scripts/fix-challenge-points.mjs --legacy-model=<rewardOnly|fixed30> [--dry-run|--apply] [opciones]

Variables de entorno:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Opciones:
  --legacy-model=rewardOnly   Entregas a tiempo sumaban solo points_reward (sin +30).
  --legacy-model=fixed30        Antes 30/15 fijos.
  --user-id=...                 Solo este usuario (Clerk id).
  --course-id=...               Solo este curso (UUID).
  --reviewed-before=ISO         Solo submissions con reviewed_at < esta fecha (ej. deploy).
  --dry-run                     Solo imprime (default si no pasas --apply).
  --apply                       Aplica cambios en user_course_points.

Ejemplo:
  node scripts/fix-challenge-points.mjs --legacy-model=rewardOnly --dry-run
  node scripts/fix-challenge-points.mjs --legacy-model=rewardOnly --apply --user-id=user_xxx
`);
    process.exit(0);
  }

  const args = parseArgs(process.argv.slice(2));

  if (!args.legacyModel || !['rewardOnly', 'fixed30'].includes(args.legacyModel)) {
    console.error('Error: indica --legacy-model=rewardOnly o --legacy-model=fixed30');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Error: define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let q = supabase
    .from('submissions')
    .select(
      'id, user_id, reviewed_at, approved, submitted_at, challenges ( points_reward, deadline, course_id )',
    )
    .eq('approved', true);

  if (args.userId) q = q.eq('user_id', args.userId);
  if (args.reviewedBefore) q = q.lt('reviewed_at', args.reviewedBefore);

  const { data: submissions, error: subErr } = await q;
  if (subErr) {
    console.error('Error leyendo submissions:', subErr.message);
    process.exit(1);
  }

  const rows = submissions ?? [];
  const enrollKeys = new Set();
  for (const s of rows) {
    const ch = s.challenges;
    const cid = ch?.course_id;
    if (cid && s.user_id) enrollKeys.add(`${s.user_id}::${cid}`);
  }

  /** @type {Map<string, 'on_demand' | 'cohort'>} */
  const accessByUserCourse = new Map();
  for (const key of enrollKeys) {
    const [userId, courseId] = key.split('::');
    const { data: en } = await supabase
      .from('enrollments')
      .select('access_type')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    accessByUserCourse.set(key, en?.access_type === 'on_demand' ? 'on_demand' : 'cohort');
  }

  /** @type {Map<string, number>} key = userId::courseId */
  const deltaByKey = new Map();

  for (const s of rows) {
    const ch = s.challenges;
    if (!ch) {
      console.warn(`[skip] submission ${s.id}: sin datos de challenge`);
      continue;
    }
    if (!ch.course_id) continue;
    if (args.courseId && ch.course_id !== args.courseId) continue;

    const courseId = ch.course_id;
    const userId = s.user_id;
    const access = accessByUserCourse.get(`${userId}::${courseId}`) ?? 'cohort';
    const isOnDemand = access === 'on_demand';

    const deadline = ch.deadline ? new Date(ch.deadline).getTime() : null;
    const submittedAt = new Date(s.submitted_at || 0).getTime();
    const onTime = isOnDemand || (deadline != null && submittedAt <= deadline);

    const current = computeCurrentApprovalPoints(ch.points_reward, { onTime, isOnDemand });
    const legacy = computeLegacyApprovalPoints(ch.points_reward, { onTime, isOnDemand }, args.legacyModel);
    const delta = current - legacy;
    if (delta === 0) continue;

    const mapKey = `${userId}::${courseId}`;
    deltaByKey.set(mapKey, (deltaByKey.get(mapKey) ?? 0) + delta);

    console.log(
      `[fila] submission ${s.id} user=${userId} course=${courseId} ` +
        `legacy=${legacy} → actual=${current} Δ=${delta} (onTime=${onTime} onDemand=${isOnDemand})`,
    );
  }

  console.log('\n--- Resumen por usuario + curso ---');
  let totalDelta = 0;
  for (const [mapKey, d] of deltaByKey) {
    const [userId, courseId] = mapKey.split('::');
    totalDelta += d;
    console.log(`${userId}  ${courseId}  Δ total: +${d}`);
  }
  console.log(`\nSuma de todos los deltas: +${totalDelta}`);

  if (args.dryRun) {
    console.log('\n(dry-run: no se escribió nada. Usa --apply para aplicar.)');
    return;
  }

  for (const [mapKey, d] of deltaByKey) {
    if (d === 0) continue;
    const [userId, courseId] = mapKey.split('::');
    const { data: row } = await supabase
      .from('user_course_points')
      .select('points')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    const prev = row?.points ?? 0;
    const next = prev + d;
    const { error: upErr } = await supabase.from('user_course_points').upsert(
      {
        user_id: userId,
        course_id: courseId,
        points: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' },
    );
    if (upErr) {
      console.error(`Error actualizando ${userId} / ${courseId}:`, upErr.message);
      process.exit(1);
    }
    console.log(`OK ${userId} ${courseId}: ${prev} → ${next} (+${d})`);
  }
  console.log('\nListo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
