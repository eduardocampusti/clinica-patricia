import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const supabaseDirectory = join(projectRoot, "supabase");
const configPath = join(supabaseDirectory, "config.toml");
const migrationsPath = join(supabaseDirectory, "migrations");
const seedPath = join(supabaseDirectory, "seed.sql");

const linkedStatePaths = [
  join(supabaseDirectory, ".temp", "project-ref"),
  join(projectRoot, ".supabase", "project.json"),
];

const operations = {
  version: ["--version"],
  start: ["start", "--workdir", projectRoot],
  status: ["status", "--workdir", projectRoot],
  reset: ["db", "reset", "--local", "--workdir", projectRoot],
  stop: ["stop", "--workdir", projectRoot],
};

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exit(1);
}

function assertLocalOnly() {
  const linkedState = linkedStatePaths.find((path) => existsSync(path));
  if (linkedState) {
    fail(
      `estado de projeto linked detectado em ${linkedState}. Os scripts locais foram bloqueados.`,
    );
  }

  if (!existsSync(configPath)) {
    fail(`configuracao local ausente: ${configPath}`);
  }
}

function validateStructure() {
  assertLocalOnly();

  const missing = [migrationsPath, seedPath].filter((path) => !existsSync(path));
  if (missing.length > 0) {
    fail(`estrutura local incompleta: ${missing.join(", ")}`);
  }

  const config = readFileSync(configPath, "utf8");
  const requiredMarkers = [
    '[db.migrations]',
    'schema_paths = []',
    '[db.seed]',
    'sql_paths = ["./seed.sql"]',
  ];
  const absentMarkers = requiredMarkers.filter((marker) => !config.includes(marker));
  if (absentMarkers.length > 0) {
    fail(`config.toml nao contem: ${absentMarkers.join(", ")}`);
  }

  console.log("Configuracao local reconhecida.");
  console.log("Protecao remota ativa: nenhum estado linked foi encontrado.");
  console.log("Baseline ausente por decisao: migrations contem apenas o marcador do diretorio.");
  console.log("Versao remota do PostgreSQL ainda nao confirmada; paridade nao presumida.");
}

function redactLocalCredentials(output) {
  if (!output) return "";

  const jsonSecretKeys = [
    "DB_URL",
    "PUBLISHABLE_KEY",
    "SECRET_KEY",
    "JWT_SECRET",
    "ANON_KEY",
    "SERVICE_ROLE_KEY",
    "S3_PROTOCOL_ACCESS_KEY_ID",
    "S3_PROTOCOL_ACCESS_KEY_SECRET",
  ].join("|");

  return output
    .replace(
      new RegExp(`("(?:${jsonSecretKeys})"\\s*:\\s*")[^"]*(")`, "g"),
      "$1[REDACTED]$2",
    )
    .replace(/(postgres(?:ql)?:\/\/)[^@\s"]+@/gi, "$1[REDACTED]@")
    .replace(
      /^(\s*(?:DB URL|Publishable key|Secret key|JWT secret|Anon key|Service role key|S3[^:]*key)\s*:\s*).+$/gim,
      "$1[REDACTED]",
    );
}

function runSupabase(args) {
  const cliEntryPoint = join(
    projectRoot,
    "node_modules",
    "supabase",
    "dist",
    "supabase.js",
  );

  if (!existsSync(cliEntryPoint)) {
    fail("Supabase CLI local ausente. Instale as dependencias fixadas pelo package-lock.json.");
  }

  const result = spawnSync(process.execPath, [cliEntryPoint, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DO_NOT_TRACK: "1",
      SUPABASE_TELEMETRY_DISABLED: "1",
    },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });

  if (result.error) {
    fail(result.error.message);
  }

  const stdout = redactLocalCredentials(result.stdout);
  const stderr = redactLocalCredentials(result.stderr);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  process.exit(result.status ?? 1);
}

if (process.argv.length !== 3) {
  fail("argumentos adicionais nao sao permitidos nos scripts locais.");
}

const operation = process.argv[2];

if (operation === "validate") {
  validateStructure();
  process.exit(0);
}

const args = operations[operation];
if (!args) {
  fail(`operacao local desconhecida: ${operation}`);
}

assertLocalOnly();
runSupabase(args);
