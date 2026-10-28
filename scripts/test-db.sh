#!/usr/bin/env bash
# Runs the Supabase migrations against a throwaway local PostgreSQL instance and
# executes the database security tests (supabase/tests/db/*.test.ts).
#
# Requires PostgreSQL server binaries (initdb, pg_ctl) — e.g. `apt install postgresql`.
# Alternatively, point DATABASE_URL at an existing empty database that already
# has the shim applied and run `npx vitest run --config vitest.db.config.mts`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [[ -z "${PG_BIN}" || ! -x "${PG_BIN}/initdb" ]]; then
  echo "PostgreSQL server binaries not found. Set PG_BIN or install postgresql." >&2
  exit 1
fi

WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN_AS=()
if [[ "$(id -u)" == "0" ]]; then
  # initdb refuses to run as root.
  chown postgres "${WORK}"
  RUN_AS=(runuser -u postgres --)
fi

cleanup() {
  "${RUN_AS[@]}" "${PG_BIN}/pg_ctl" -D "${WORK}/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "${WORK}"
}
trap cleanup EXIT

"${RUN_AS[@]}" "${PG_BIN}/initdb" -D "${WORK}/data" -U postgres --auth=trust >/dev/null
"${RUN_AS[@]}" "${PG_BIN}/pg_ctl" -D "${WORK}/data" -l "${WORK}/pg.log" \
  -o "-p ${PORT} -k ${WORK} -c listen_addresses=''" -w start >/dev/null

PSQL=(psql -v ON_ERROR_STOP=1 -q -h "${WORK}" -p "${PORT}" -U postgres)
"${PSQL[@]}" -d postgres -c "create database nanocrab_test"
"${PSQL[@]}" -d nanocrab_test -f "${ROOT}/supabase/tests/db/supabase-shim.sql"
for f in "${ROOT}"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")"
  "${PSQL[@]}" -d nanocrab_test -f "$f"
done

export DATABASE_URL="postgresql://postgres@localhost:${PORT}/nanocrab_test?host=${WORK}"
cd "${ROOT}"
npx vitest run --config vitest.db.config.mts
