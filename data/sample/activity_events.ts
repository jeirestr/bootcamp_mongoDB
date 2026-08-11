import {
  PROCESS_NAMES,
  SUBTYPES,
  DOC_STATUSES,
  CHANNELS,
  OCR_STATUS,
  type ProcessName,
  type Channel,
  type DocStatus,
} from "../../src/query/schema";

/**
 * Synthetic, internally consistent OCR extraction results (liquidData collection).
 *
 * Deterministic: a fixed seed produces the same dataset every run, so the
 * verify script can assert exact answers. The generator injects anchor records
 * for each verifiable fact and ASSERTS internal consistency before returning.
 * If an assertion fails, the data is wrong and load must not proceed.
 *
 * All values are synthetic. Salary amounts are in COP (pesos colombianos),
 * stored as strings in liquidData (OCR pattern), e.g. "2225550".
 */

// ---- OCR interfaces --------------------------------------------------------

interface OcrField {
  confidence: string;
  value: string;
  status: typeof OCR_STATUS;
}

interface Ingreso {
  descripcion: OcrField;
  cantidad: OcrField;
}

interface CartaLaboralFields {
  ingresos: Ingreso[];
  tipo_id_empleador: OcrField;
  contrato: OcrField;
  fecha_expedicion: OcrField;
  fecha_contratos: string[];
  digito_verificacion: OcrField;
  nombre_empleado: OcrField;
  nombre_empleador: OcrField;
  fecha_vinculacion: OcrField;
  id_empleador: OcrField;
  id: OcrField;
  tipo_id: OcrField;
  cargo: OcrField;
}

interface CartaLaboralResultJson extends CartaLaboralFields {
  files_to_process: CartaLaboralFields[];
}

interface CartaLaboralLiquidData {
  transaction_id: string;
  DocID: string;
  result_json: CartaLaboralResultJson;
}

interface CedulaLiquidData {
  nombres: OcrField;
  apellidos: OcrField;
  numero_documento: OcrField;
  fecha_nacimiento: OcrField;
  lugar_expedicion: OcrField;
}

interface RutLiquidData {
  primer_apellido: OcrField;
  segundo_apellido: OcrField;
  primer_nombre: OcrField;
  otros_nombres: OcrField;
  numero_identificacion: OcrField;
  dv: OcrField;
}

interface DocumentBase {
  liquidDataDetail: null;
  issueDate: Date;
  validityDays: null;
}

type DocumentContent =
  | (DocumentBase & { subtype: "Carta laboral"; liquidData: CartaLaboralLiquidData })
  | (DocumentBase & { subtype: "Cedula de Ciudadania"; liquidData: CedulaLiquidData })
  | (DocumentBase & { subtype: "RUT"; liquidData: RutLiquidData });

export interface LiquidDataDocument {
  _id: string;
  bdtlRecordDate: Date;
  bdtlCleanupDate: Date;
  process: {
    name: ProcessName;
    code: null;
    referenceId: string;
    entity: { value: string };
  };
  processing: {
    _id: string;
    startDate: Date;
    endDate: Date;
    technology: { value: "MONGO" };
    channel: { value: Channel };
  };
  document: DocumentContent;
  status: {
    value: DocStatus;
    lastChangeDate: Date;
  };
  ingestionVersion: "v1.0.0 - LegacySQL";
}

// ---- Expectations ----------------------------------------------------------

export interface Expectations {
  totalDocuments: number;
  cartaLaboral: {
    total: number;
    highSalaryCount: number;
    highSalaryThreshold: number;
    suraSaCount: number;
    asesoraVentasCount: number;
    actualizadoReferenceId: string;
    actualizadoDocId: string;
  };
  cedula: {
    total: number;
    manizalesCount: number;
    bornAfter1990Count: number;
    bornAfter1990Cutoff: string;
  };
  rut: {
    total: number;
  };
}

// ---- Constants -------------------------------------------------------------

const SEED = 424242;
const DAY_MS = 86_400_000;
const CLEANUP_DAYS = 33;

/** Salary threshold for the "high earner" demo query (COP). */
const HIGH_SALARY_THRESHOLD = 2_000_000;
/** Expected counts — used in assertions after generation. */
const HIGH_SALARY_COUNT = 10; // 10 NUEVO anchors with salary > threshold
const SURA_SA_COUNT = 9;      // 8 NUEVO + 1 ACTUALIZADO
const ASESORA_VENTAS_COUNT = 6; // 5 NUEVO + 1 ACTUALIZADO
const MANIZALES_COUNT = 15;
const BORN_AFTER_1990_COUNT = 25; // 8 from MANIZALES + 17 from other cities
const BORN_AFTER_1990_CUTOFF = "1990-12-31";

/** referenceId shared by anchor[0] (NUEVO) and the ACTUALIZADO record. */
const ACTUALIZADO_REFERENCE_ID = "T001_AFD001.pdf";

// Filler constraints keep anchor assertions clean
const FILLER_SALARY_MIN = 800_000;
const FILLER_SALARY_MAX = 1_999_000; // always < HIGH_SALARY_THRESHOLD
const FILLER_EMPLOYERS = [
  "AVIANCA SA", "EPM SA", "NUTRESA SA", "ECOPETROL SA", "GRUPO ARGOS", "SURAMERICANA SA",
] as const;
const FILLER_CARGOS = [
  "ANALISTA FINANCIERO", "EJECUTIVO CUENTA", "AUXILIAR ADMINISTRATIVO",
  "COORDINADOR OPERATIVO", "ASESOR CARTERA", "INGENIERO SISTEMAS",
  "PROFESIONAL RECURSOS HUMANOS", "TECNICO MANTENIMIENTO",
] as const;
const FILLER_CONTRATOS = ["INDEFINIDO", "FIJO", "PRESTACION SERVICIOS"] as const;
const FILLER_CEDULA_CITIES = [
  "BOGOTA", "MEDELLIN", "CALI", "BARRANQUILLA", "CARTAGENA",
  "BUCARAMANGA", "PEREIRA", "SANTA MARTA", "CUCUTA", "IBAGUE",
] as const;
const FILLER_NOMBRES = [
  "JUAN DAVID", "LAURA PATRICIA", "CESAR AUGUSTO", "MONICA ANDREA", "NELSON FABIAN",
  "ADRIANA ISABEL", "HAROLD ROBERTO", "BEATRIZ ELENA", "VICTOR HUGO", "CAMILA SOFIA",
  "WILLIAM ESTEBAN", "DIANA MARCELA", "JORGE ANDRES", "MARIA FERNANDA", "OSCAR IVAN",
  "PILAR CATALINA", "ROBERTO CARLOS", "VALENTINA PAOLA", "LUCAS SEBASTIAN", "NATALIA ALEJANDRA",
] as const;
const FILLER_APELLIDOS = [
  "PEREZ GOMEZ", "RAMIREZ VILLA", "LOPEZ HERRERA", "TORRES JIMENEZ", "CASTILLO RUIZ",
  "MORA SALAZAR", "SUAREZ ROJAS", "VARGAS MONTES", "PENA CARDONA", "RODRIGUEZ ARANGO",
  "CANO OSPINA", "VELEZ SANCHEZ", "HENAO ZAPATA", "FRANCO MORENO", "BERMUDEZ REYES",
  "SALCEDO DIAZ", "MARIN PIZARRO", "AGUDELO LEON", "QUIROGA PIEDRAHITA", "SIERRA MEJIA",
] as const;
const FILLER_PRIMER_NOMBRES = [
  "JUAN", "LAURA", "CESAR", "MONICA", "NELSON", "ADRIANA",
  "HAROLD", "BEATRIZ", "VICTOR", "CAMILA", "WILLIAM", "DIANA",
] as const;
const FILLER_PRIMER_APELLIDOS = [
  "PEREZ", "RAMIREZ", "LOPEZ", "TORRES", "CASTILLO",
  "MORA", "SUAREZ", "VARGAS", "PENA", "RODRIGUEZ",
] as const;
const FILLER_SEGUNDO_APELLIDOS = [
  "GOMEZ", "VILLA", "HERRERA", "JIMENEZ", "RUIZ",
  "SALAZAR", "ROJAS", "MONTES", "CARDONA", "ARANGO",
] as const;
const FILLER_OTROS_NOMBRES = [
  "ANDRES", "MARIA", "JOSE", "CARLOS", "ELENA",
  "PATRICIA", "ALEJANDRO", "SOFIA", "LUIS", "ANA",
] as const;
const FILLER_DV = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

// ---- Anchor data -----------------------------------------------------------

interface CartaAnchorSpec {
  nombre: string;
  employer: string;
  cargo: string;
  salary: number;
  id_empleado: string;
  id_empleador: string;
  dv_emp: string;
  tipo_id: string;
  tipo_id_emp: string;
  contrato: string;
  fecha_exp: string; // YYYY-MM-DD
  fecha_vinc: string; // YYYY-MM-DD
}

// 10 high-salary anchors: 8 at SURA SA (5 ASESORA VENTAS + 3 other), 2 at BANCOLOMBIA SA
const CARTA_ANCHOR_SPECS: CartaAnchorSpec[] = [
  // SURA SA — ASESORA VENTAS (5)
  { nombre: "PEDRO GRAJALES VILLA",        employer: "SURA SA",       cargo: "ASESORA VENTAS",    salary: 3_500_000, id_empleado: "12370",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-05-03", fecha_vinc: "2020-01-10" },
  { nombre: "ANA MARIA GARCIA LOPEZ",      employer: "SURA SA",       cargo: "ASESORA VENTAS",    salary: 2_800_000, id_empleado: "43571",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-06-15", fecha_vinc: "2019-03-01" },
  { nombre: "MARIA JOSE OSPINA RESTREPO",  employer: "SURA SA",       cargo: "ASESORA VENTAS",    salary: 3_200_000, id_empleado: "56789",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-04-20", fecha_vinc: "2021-07-15" },
  { nombre: "LUIS CARLOS MARTINEZ SILVA",  employer: "SURA SA",       cargo: "ASESORA VENTAS",    salary: 2_600_000, id_empleado: "78901",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-03-10", fecha_vinc: "2018-09-20" },
  { nombre: "CAROLINA RAMIREZ GOMEZ",      employer: "SURA SA",       cargo: "ASESORA VENTAS",    salary: 2_900_000, id_empleado: "91234",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-07-01", fecha_vinc: "2022-01-03" },
  // SURA SA — other roles (3)
  { nombre: "JORGE IVAN HERNANDEZ VILLA",  employer: "SURA SA",       cargo: "GERENTE COMERCIAL", salary: 4_500_000, id_empleado: "34567",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-02-14", fecha_vinc: "2015-05-10" },
  { nombre: "DIANA MILENA ACOSTA REYES",   employer: "SURA SA",       cargo: "JEFE DE ZONA",      salary: 3_800_000, id_empleado: "23456",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-08-22", fecha_vinc: "2017-11-15" },
  { nombre: "ANDRES VELASQUEZ ARANGO",     employer: "SURA SA",       cargo: "GERENTE REGIONAL",  salary: 5_000_000, id_empleado: "67890",  id_empleador: "800306", dv_emp: "9", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-01-30", fecha_vinc: "2014-03-01" },
  // BANCOLOMBIA SA (2)
  { nombre: "PAULA CASTILLO MEJIA",        employer: "BANCOLOMBIA SA", cargo: "DIRECTOR FINANCIERO", salary: 4_200_000, id_empleado: "45678", id_empleador: "890123", dv_emp: "5", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-09-05", fecha_vinc: "2016-08-20" },
  { nombre: "GABRIEL RIOS CARDONA",        employer: "BANCOLOMBIA SA", cargo: "DIRECTOR FINANCIERO", salary: 3_600_000, id_empleado: "56780", id_empleador: "890123", dv_emp: "5", tipo_id: "CEDULA DE CIUDADANIA", tipo_id_emp: "NIT", contrato: "INDEFINIDO", fecha_exp: "2023-10-18", fecha_vinc: "2019-06-01" },
];

// ACTUALIZADO version of anchor[0] — same referenceId, corrected salary below threshold
const ACTUALIZADO_SPEC: CartaAnchorSpec = {
  nombre: "PEDRO GRAJALES VILLA",
  employer: "SURA SA",
  cargo: "ASESORA VENTAS",
  salary: 1_850_000, // corrected salary, below HIGH_SALARY_THRESHOLD
  id_empleado: "12370",
  id_empleador: "800306",
  dv_emp: "9",
  tipo_id: "CEDULA DE CIUDADANIA",
  tipo_id_emp: "NIT",
  contrato: "INDEFINIDO",
  fecha_exp: "2023-07-15", // corrected issue date
  fecha_vinc: "2020-01-10",
};

interface CedulaAnchorSpec {
  nombres: string;
  apellidos: string;
  numero_documento: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  lugar_expedicion: string;
}

// 15 MANIZALES anchors: 7 born <= 1990-12-31, 8 born > 1990-12-31
const CEDULA_MANIZALES_SPECS: CedulaAnchorSpec[] = [
  { nombres: "ANGELA MARIA",    apellidos: "GIRALDO VARGAS",   numero_documento: "43567890",   fecha_nacimiento: "1990-09-25", lugar_expedicion: "MANIZALES" },
  { nombres: "CARLOS ARTURO",   apellidos: "SALAZAR RESTREPO", numero_documento: "15234567",   fecha_nacimiento: "1985-03-14", lugar_expedicion: "MANIZALES" },
  { nombres: "LUZ MARINA",      apellidos: "OSPINA BEDOYA",    numero_documento: "29876543",   fecha_nacimiento: "1978-11-07", lugar_expedicion: "MANIZALES" },
  { nombres: "NESTOR IVAN",     apellidos: "ARANGO GUTIERREZ", numero_documento: "72345678",   fecha_nacimiento: "1975-06-20", lugar_expedicion: "MANIZALES" },
  { nombres: "GLORIA PATRICIA", apellidos: "MUNOZ VALENCIA",   numero_documento: "38901234",   fecha_nacimiento: "1968-02-28", lugar_expedicion: "MANIZALES" },
  { nombres: "GERMAN ALBERTO",  apellidos: "RIOS TORO",        numero_documento: "10567890",   fecha_nacimiento: "1982-08-15", lugar_expedicion: "MANIZALES" },
  { nombres: "MARTA LUCIA",     apellidos: "CANO BOTERO",      numero_documento: "24123456",   fecha_nacimiento: "1971-12-03", lugar_expedicion: "MANIZALES" },
  // born after 1990-12-31 (8 records)
  { nombres: "ESTEBAN",         apellidos: "PALACIO RENDON",   numero_documento: "1005234567", fecha_nacimiento: "1995-04-18", lugar_expedicion: "MANIZALES" },
  { nombres: "ISABELLA",        apellidos: "FRANCO ALZATE",    numero_documento: "1004567890", fecha_nacimiento: "1998-07-22", lugar_expedicion: "MANIZALES" },
  { nombres: "SANTIAGO",        apellidos: "VELEZ JARAMILLO",  numero_documento: "1015678901", fecha_nacimiento: "2001-01-09", lugar_expedicion: "MANIZALES" },
  { nombres: "MARIANA",         apellidos: "LONDONO DIAZ",     numero_documento: "1006789012", fecha_nacimiento: "2003-05-30", lugar_expedicion: "MANIZALES" },
  { nombres: "TOMAS",           apellidos: "MORALES ACEVEDO",  numero_documento: "1018901234", fecha_nacimiento: "1993-10-14", lugar_expedicion: "MANIZALES" },
  { nombres: "VALENTINA",       apellidos: "GOMEZ CARDONA",    numero_documento: "1007012345", fecha_nacimiento: "1999-03-27", lugar_expedicion: "MANIZALES" },
  { nombres: "SEBASTIAN",       apellidos: "AGUILAR MEJIA",    numero_documento: "1016123456", fecha_nacimiento: "2000-08-11", lugar_expedicion: "MANIZALES" },
  { nombres: "CAMILA ANDREA",   apellidos: "HOYOS URIBE",      numero_documento: "1008234567", fecha_nacimiento: "1992-06-05", lugar_expedicion: "MANIZALES" },
];

// 17 non-MANIZALES anchors all born after 1990-12-31
const CEDULA_POST1990_SPECS: CedulaAnchorSpec[] = [
  { nombres: "ANDRES MAURICIO",  apellidos: "RODRIGUEZ SILVA",  numero_documento: "1012345678", fecha_nacimiento: "1994-02-16", lugar_expedicion: "BOGOTA" },
  { nombres: "SARA LUCIA",       apellidos: "MEDINA CONTRERAS", numero_documento: "1011234567", fecha_nacimiento: "1997-09-08", lugar_expedicion: "BOGOTA" },
  { nombres: "JUAN PABLO",       apellidos: "BARON CASALLAS",   numero_documento: "1013456789", fecha_nacimiento: "2002-12-20", lugar_expedicion: "BOGOTA" },
  { nombres: "NATALIA PAOLA",    apellidos: "RODRIGUEZ MORA",   numero_documento: "1020567890", fecha_nacimiento: "1996-04-03", lugar_expedicion: "MEDELLIN" },
  { nombres: "FELIPE ANDRES",    apellidos: "CARVAJAL HENAO",   numero_documento: "1021678901", fecha_nacimiento: "1991-07-29", lugar_expedicion: "MEDELLIN" },
  { nombres: "LAURA DANIELA",    apellidos: "MUNOZ ARENAS",     numero_documento: "1022789012", fecha_nacimiento: "2004-11-15", lugar_expedicion: "MEDELLIN" },
  { nombres: "DAVID SANTIAGO",   apellidos: "GONZALEZ RUIZ",    numero_documento: "1093890123", fecha_nacimiento: "1995-08-21", lugar_expedicion: "CALI" },
  { nombres: "PAOLA ANDREA",     apellidos: "OCAMPO CAICEDO",   numero_documento: "1094901234", fecha_nacimiento: "1993-01-17", lugar_expedicion: "CALI" },
  { nombres: "JULIAN DAVID",     apellidos: "RINCON VARGAS",    numero_documento: "1096012345", fecha_nacimiento: "1998-05-04", lugar_expedicion: "CALI" },
  { nombres: "MARIA ALEJANDRA",  apellidos: "PEREZ LOZANO",     numero_documento: "1045123456", fecha_nacimiento: "2000-10-28", lugar_expedicion: "BARRANQUILLA" },
  { nombres: "CARLOS DANIEL",    apellidos: "HERRERA NIETO",    numero_documento: "1046234567", fecha_nacimiento: "1992-03-12", lugar_expedicion: "BARRANQUILLA" },
  { nombres: "ANA SOFIA",        apellidos: "MEZA GARCIA",      numero_documento: "1047345678", fecha_nacimiento: "1999-07-07", lugar_expedicion: "BARRANQUILLA" },
  { nombres: "JORGE MARIO",      apellidos: "ZULUAGA ARBOLEDA", numero_documento: "1063456789", fecha_nacimiento: "1996-11-24", lugar_expedicion: "CARTAGENA" },
  { nombres: "CATALINA",         apellidos: "NIETO SAAVEDRA",   numero_documento: "1064567890", fecha_nacimiento: "2003-02-09", lugar_expedicion: "PEREIRA" },
  { nombres: "MIGUEL ANGEL",     apellidos: "TAMAYO FLOREZ",    numero_documento: "1070678901", fecha_nacimiento: "1994-06-18", lugar_expedicion: "PEREIRA" },
  { nombres: "DANIELA",          apellidos: "CARDONA GIRALDO",  numero_documento: "1066789012", fecha_nacimiento: "1991-09-30", lugar_expedicion: "CARTAGENA" },
  { nombres: "NICOLAS",          apellidos: "SIERRA CASTANO",   numero_documento: "1060890123", fecha_nacimiento: "2001-04-23", lugar_expedicion: "BUCARAMANGA" },
];

// ---- PRNG (mulberry32) -----------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick from empty array");
  return item;
}

/** 40-char hex string using 5 RNG calls. */
function hexId(rng: () => number): string {
  let h = "";
  for (let i = 0; i < 5; i++) {
    h += Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0");
  }
  return h;
}

function randomDigits(rng: () => number, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10).toString();
  return s;
}

function randomDate(rng: () => number, windowMs: number, now: Date): Date {
  return new Date(now.getTime() - Math.floor(rng() * windowMs));
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---- OCR helpers -----------------------------------------------------------

function ocr(value: string, confidence = "0.99"): OcrField {
  return { confidence, value, status: OCR_STATUS };
}

function buildCartaFields(spec: CartaAnchorSpec, ingresos: Ingreso[]): CartaLaboralFields {
  return {
    ingresos,
    tipo_id_empleador: ocr(spec.tipo_id_emp),
    contrato: ocr(spec.contrato),
    fecha_expedicion: ocr(spec.fecha_exp),
    fecha_contratos: [],
    digito_verificacion: ocr(spec.dv_emp, "0.90"),
    nombre_empleado: ocr(spec.nombre),
    nombre_empleador: ocr(spec.employer),
    fecha_vinculacion: ocr(spec.fecha_vinc),
    id_empleador: ocr(spec.id_empleador),
    id: ocr(spec.id_empleado),
    tipo_id: ocr(spec.tipo_id),
    cargo: ocr(spec.cargo),
  };
}

function makeIngresos(salary: number, rng?: () => number): Ingreso[] {
  const ingresos: Ingreso[] = [
    { descripcion: ocr("SALARIO BASICO"), cantidad: ocr(String(salary)) },
  ];
  if (rng && rng() < 0.4) {
    const otro = Math.floor(rng() * 150_000) + 50_000;
    ingresos.push({ descripcion: ocr("OTRO", "0.90"), cantidad: ocr(String(otro)) });
  }
  return ingresos;
}

// ---- Document skeleton builder ---------------------------------------------

function skeleton(
  subtype: "Carta laboral",
  liquidData: CartaLaboralLiquidData,
  refId: string,
  processName: ProcessName,
  channel: Channel,
  status: DocStatus,
  bdtlDate: Date,
  issueDate: Date,
  rng: () => number,
): Omit<LiquidDataDocument, "_id">;
function skeleton(
  subtype: "Cedula de Ciudadania",
  liquidData: CedulaLiquidData,
  refId: string,
  processName: ProcessName,
  channel: Channel,
  status: DocStatus,
  bdtlDate: Date,
  issueDate: Date,
  rng: () => number,
): Omit<LiquidDataDocument, "_id">;
function skeleton(
  subtype: "RUT",
  liquidData: RutLiquidData,
  refId: string,
  processName: ProcessName,
  channel: Channel,
  status: DocStatus,
  bdtlDate: Date,
  issueDate: Date,
  rng: () => number,
): Omit<LiquidDataDocument, "_id">;
function skeleton(
  subtype: "Carta laboral" | "Cedula de Ciudadania" | "RUT",
  liquidData: CartaLaboralLiquidData | CedulaLiquidData | RutLiquidData,
  refId: string,
  processName: ProcessName,
  channel: Channel,
  status: DocStatus,
  bdtlDate: Date,
  issueDate: Date,
  rng: () => number,
): Omit<LiquidDataDocument, "_id"> {
  const procId = hexId(rng);
  const cleanup = new Date(bdtlDate.getTime() + CLEANUP_DAYS * DAY_MS);
  return {
    bdtlRecordDate: bdtlDate,
    bdtlCleanupDate: cleanup,
    process: { name: processName, code: null, referenceId: refId, entity: { value: "Bootcamp" } },
    processing: {
      _id: procId,
      startDate: bdtlDate,
      endDate: bdtlDate,
      technology: { value: "MONGO" },
      channel: { value: channel },
    },
    document: {
      subtype,
      liquidData,
      liquidDataDetail: null,
      issueDate,
      validityDays: null,
    } as DocumentContent,
    status: { value: status, lastChangeDate: bdtlDate },
    ingestionVersion: "v1.0.0 - LegacySQL",
  };
}

// ---- Per-subtype builders --------------------------------------------------

function buildCartaAnchor(
  spec: CartaAnchorSpec,
  rng: () => number,
  now: Date,
  refId: string,
): Omit<LiquidDataDocument, "_id"> {
  const ingresos = makeIngresos(spec.salary);
  const fields = buildCartaFields(spec, ingresos);
  const liquidData: CartaLaboralLiquidData = {
    transaction_id: hexId(rng),
    DocID: randomDigits(rng, 5),
    result_json: { ...fields, files_to_process: [{ ...fields }] },
  };
  const bdtl = randomDate(rng, 180 * DAY_MS, now);
  const issue = new Date(bdtl.getTime() - Math.floor(rng() * 365 * 2 * DAY_MS));
  return skeleton("Carta laboral", liquidData, refId, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "NUEVO", bdtl, issue, rng);
}

function buildCartaActualizado(
  rng: () => number,
  now: Date,
): Omit<LiquidDataDocument, "_id"> {
  // Corrected version of anchor[0]: same referenceId, salary below threshold
  const ingresos = makeIngresos(ACTUALIZADO_SPEC.salary);
  const fields = buildCartaFields(ACTUALIZADO_SPEC, ingresos);
  const liquidData: CartaLaboralLiquidData = {
    transaction_id: hexId(rng),
    DocID: randomDigits(rng, 5),
    result_json: { ...fields, files_to_process: [{ ...fields }] },
  };
  // Always the most recent date, so it sorts after the NUEVO version
  const bdtl = new Date(now.getTime() - 3_600_000); // 1 hour before now
  const issue = new Date(bdtl.getTime() - 60 * DAY_MS);
  return skeleton("Carta laboral", liquidData, ACTUALIZADO_REFERENCE_ID, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "ACTUALIZADO", bdtl, issue, rng);
}

function buildCartaFiller(
  rng: () => number,
  now: Date,
  refId: string,
): Omit<LiquidDataDocument, "_id"> {
  const nombre = `${pick(rng, FILLER_NOMBRES)} ${pick(rng, FILLER_APELLIDOS)}`;
  const employer = pick(rng, FILLER_EMPLOYERS); // never SURA SA
  const cargo = pick(rng, FILLER_CARGOS);       // never ASESORA VENTAS
  const salary = FILLER_SALARY_MIN + Math.floor(rng() * (FILLER_SALARY_MAX - FILLER_SALARY_MIN + 1));
  const spec: CartaAnchorSpec = {
    nombre,
    employer,
    cargo,
    salary,
    id_empleado: randomDigits(rng, 8),
    id_empleador: randomDigits(rng, 6),
    dv_emp: pick(rng, FILLER_DV),
    tipo_id: "CEDULA DE CIUDADANIA",
    tipo_id_emp: "NIT",
    contrato: pick(rng, FILLER_CONTRATOS),
    fecha_exp: ymd(2020 + Math.floor(rng() * 5), Math.floor(rng() * 12) + 1, Math.floor(rng() * 28) + 1),
    fecha_vinc: ymd(2015 + Math.floor(rng() * 8), Math.floor(rng() * 12) + 1, Math.floor(rng() * 28) + 1),
  };
  const ingresos = makeIngresos(salary, rng);
  const fields = buildCartaFields(spec, ingresos);
  const liquidData: CartaLaboralLiquidData = {
    transaction_id: hexId(rng),
    DocID: randomDigits(rng, 5),
    result_json: { ...fields, files_to_process: [{ ...fields }] },
  };
  const bdtl = randomDate(rng, 180 * DAY_MS, now);
  const issue = new Date(bdtl.getTime() - Math.floor(rng() * 365 * 2 * DAY_MS));
  return skeleton("Carta laboral", liquidData, refId, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "NUEVO", bdtl, issue, rng);
}

function buildCedulaAnchor(
  spec: CedulaAnchorSpec,
  rng: () => number,
  now: Date,
  refId: string,
): Omit<LiquidDataDocument, "_id"> {
  const liquidData: CedulaLiquidData = {
    nombres: ocr(spec.nombres),
    apellidos: ocr(spec.apellidos),
    numero_documento: ocr(spec.numero_documento),
    fecha_nacimiento: ocr(spec.fecha_nacimiento),
    lugar_expedicion: ocr(spec.lugar_expedicion, "0.98"),
  };
  const bdtl = randomDate(rng, 180 * DAY_MS, now);
  const issue = new Date(bdtl.getTime() - Math.floor(rng() * 365 * 2 * DAY_MS));
  return skeleton("Cedula de Ciudadania", liquidData, refId, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "NUEVO", bdtl, issue, rng);
}

function buildCedulaFiller(
  rng: () => number,
  now: Date,
  refId: string,
): Omit<LiquidDataDocument, "_id"> {
  // cities never MANIZALES; birth years 1960-1990 (never > BORN_AFTER_1990_CUTOFF)
  const city = pick(rng, FILLER_CEDULA_CITIES);
  const year = 1960 + Math.floor(rng() * 31); // [1960, 1990]
  const month = Math.floor(rng() * 12) + 1;
  const day = Math.floor(rng() * 28) + 1;
  const liquidData: CedulaLiquidData = {
    nombres: ocr(`${pick(rng, FILLER_PRIMER_NOMBRES)} ${pick(rng, FILLER_OTROS_NOMBRES)}`),
    apellidos: ocr(`${pick(rng, FILLER_PRIMER_APELLIDOS)} ${pick(rng, FILLER_SEGUNDO_APELLIDOS)}`),
    numero_documento: ocr(randomDigits(rng, 8)),
    fecha_nacimiento: ocr(ymd(year, month, day)),
    lugar_expedicion: ocr(city, "0.98"),
  };
  const bdtl = randomDate(rng, 180 * DAY_MS, now);
  const issue = new Date(bdtl.getTime() - Math.floor(rng() * 365 * 2 * DAY_MS));
  return skeleton("Cedula de Ciudadania", liquidData, refId, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "NUEVO", bdtl, issue, rng);
}

function buildRutFiller(
  rng: () => number,
  now: Date,
  refId: string,
): Omit<LiquidDataDocument, "_id"> {
  const liquidData: RutLiquidData = {
    primer_apellido: ocr(pick(rng, FILLER_PRIMER_APELLIDOS)),
    segundo_apellido: ocr(pick(rng, FILLER_SEGUNDO_APELLIDOS)),
    primer_nombre: ocr(pick(rng, FILLER_PRIMER_NOMBRES)),
    otros_nombres: ocr(pick(rng, FILLER_OTROS_NOMBRES)),
    numero_identificacion: ocr(randomDigits(rng, 10)),
    dv: ocr(pick(rng, FILLER_DV)),
  };
  const bdtl = randomDate(rng, 180 * DAY_MS, now);
  const issue = new Date(bdtl.getTime() - Math.floor(rng() * 365 * 2 * DAY_MS));
  return skeleton("RUT", liquidData, refId, pick(rng, PROCESS_NAMES), pick(rng, CHANNELS), "NUEVO", bdtl, issue, rng);
}

// ---- Main generator --------------------------------------------------------

function buildDocuments(now: Date): Array<Omit<LiquidDataDocument, "_id">> {
  const rng = mulberry32(SEED);
  const docs: Array<Omit<LiquidDataDocument, "_id">> = [];
  let refCounter = 1;

  function nextRef(): string {
    const n = refCounter++;
    return `T${String(n).padStart(3, "0")}_AFD${String(n).padStart(3, "0")}.pdf`;
  }

  // Carta laboral: 10 high-salary anchors + 1 ACTUALIZADO + 89 filler = 100
  for (const spec of CARTA_ANCHOR_SPECS) {
    docs.push(buildCartaAnchor(spec, rng, now, nextRef()));
  }
  docs.push(buildCartaActualizado(rng, now)); // reuses T001_AFD001.pdf (no new ref)
  for (let i = 0; i < 89; i++) {
    docs.push(buildCartaFiller(rng, now, nextRef()));
  }

  // Cedula de Ciudadania: 15 MANIZALES + 17 born-after-1990 + 68 filler = 100
  for (const spec of CEDULA_MANIZALES_SPECS) {
    docs.push(buildCedulaAnchor(spec, rng, now, nextRef()));
  }
  for (const spec of CEDULA_POST1990_SPECS) {
    docs.push(buildCedulaAnchor(spec, rng, now, nextRef()));
  }
  for (let i = 0; i < 68; i++) {
    docs.push(buildCedulaFiller(rng, now, nextRef()));
  }

  // RUT: 100 filler
  for (let i = 0; i < 100; i++) {
    docs.push(buildRutFiller(rng, now, nextRef()));
  }

  return docs;
}

// ---- Expectations ----------------------------------------------------------

export function computeExpectations(docs: LiquidDataDocument[]): Expectations {
  const cartaDocs = docs.filter((d) => d.document.subtype === "Carta laboral");
  const cedulaDocs = docs.filter((d) => d.document.subtype === "Cedula de Ciudadania");
  const rutDocs = docs.filter((d) => d.document.subtype === "RUT");

  const highSalary = cartaDocs.filter((d) => {
    if (d.document.subtype !== "Carta laboral") return false;
    return d.document.liquidData.result_json.ingresos.some(
      (ing) =>
        ing.descripcion.value === "SALARIO BASICO" &&
        parseInt(ing.cantidad.value, 10) > HIGH_SALARY_THRESHOLD,
    );
  });

  const suraSa = cartaDocs.filter((d) => {
    if (d.document.subtype !== "Carta laboral") return false;
    return d.document.liquidData.result_json.nombre_empleador.value === "SURA SA";
  });

  const asesoraVentas = cartaDocs.filter((d) => {
    if (d.document.subtype !== "Carta laboral") return false;
    return d.document.liquidData.result_json.cargo.value === "ASESORA VENTAS";
  });

  const manizales = cedulaDocs.filter((d) => {
    if (d.document.subtype !== "Cedula de Ciudadania") return false;
    return d.document.liquidData.lugar_expedicion.value === "MANIZALES";
  });

  const bornAfter1990 = cedulaDocs.filter((d) => {
    if (d.document.subtype !== "Cedula de Ciudadania") return false;
    return d.document.liquidData.fecha_nacimiento.value > BORN_AFTER_1990_CUTOFF;
  });

  const actualizadoDoc = docs.find((d) => d.status.value === "ACTUALIZADO");

  return {
    totalDocuments: docs.length,
    cartaLaboral: {
      total: cartaDocs.length,
      highSalaryCount: highSalary.length,
      highSalaryThreshold: HIGH_SALARY_THRESHOLD,
      suraSaCount: suraSa.length,
      asesoraVentasCount: asesoraVentas.length,
      actualizadoReferenceId: actualizadoDoc?.process.referenceId ?? "unknown",
      actualizadoDocId: actualizadoDoc?._id ?? "unknown",
    },
    cedula: {
      total: cedulaDocs.length,
      manizalesCount: manizales.length,
      bornAfter1990Count: bornAfter1990.length,
      bornAfter1990Cutoff: BORN_AFTER_1990_CUTOFF,
    },
    rut: {
      total: rutDocs.length,
    },
  };
}

/**
 * Generate the synthetic liquidData documents and assert internal consistency.
 * Throws if the data is not self-consistent, so callers never load bad data.
 */
export function generateActivityEvents(now: Date = new Date()): LiquidDataDocument[] {
  const raw = buildDocuments(now);
  const sorted = [...raw].sort((a, b) => a.bdtlRecordDate.getTime() - b.bdtlRecordDate.getTime());
  const docs: LiquidDataDocument[] = sorted.map((d, i) => ({
    ...d,
    _id: `doc_${String(i + 1).padStart(4, "0")}`,
  }));

  const exp = computeExpectations(docs);

  // Assert expected counts match designed anchors
  if (exp.totalDocuments !== 300)
    throw new Error(`totalDocuments: got ${exp.totalDocuments}, expected 300`);
  if (exp.cartaLaboral.total !== 100)
    throw new Error(`carta total: got ${exp.cartaLaboral.total}, expected 100`);
  if (exp.cartaLaboral.highSalaryCount !== HIGH_SALARY_COUNT)
    throw new Error(`highSalaryCount: got ${exp.cartaLaboral.highSalaryCount}, expected ${HIGH_SALARY_COUNT}`);
  if (exp.cartaLaboral.suraSaCount !== SURA_SA_COUNT)
    throw new Error(`suraSaCount: got ${exp.cartaLaboral.suraSaCount}, expected ${SURA_SA_COUNT}`);
  if (exp.cartaLaboral.asesoraVentasCount !== ASESORA_VENTAS_COUNT)
    throw new Error(`asesoraVentasCount: got ${exp.cartaLaboral.asesoraVentasCount}, expected ${ASESORA_VENTAS_COUNT}`);
  if (exp.cedula.total !== 100)
    throw new Error(`cedula total: got ${exp.cedula.total}, expected 100`);
  if (exp.cedula.manizalesCount !== MANIZALES_COUNT)
    throw new Error(`manizalesCount: got ${exp.cedula.manizalesCount}, expected ${MANIZALES_COUNT}`);
  if (exp.cedula.bornAfter1990Count !== BORN_AFTER_1990_COUNT)
    throw new Error(`bornAfter1990Count: got ${exp.cedula.bornAfter1990Count}, expected ${BORN_AFTER_1990_COUNT}`);
  if (exp.rut.total !== 100)
    throw new Error(`rut total: got ${exp.rut.total}, expected 100`);

  // Assert NUEVO/ACTUALIZADO pair exists for the same referenceId
  const actualizadoDoc = docs.find((d) => d.status.value === "ACTUALIZADO");
  if (!actualizadoDoc) throw new Error("ACTUALIZADO document missing");
  const nuevoPartner = docs.find(
    (d) =>
      d.process.referenceId === actualizadoDoc.process.referenceId &&
      d.status.value === "NUEVO",
  );
  if (!nuevoPartner) throw new Error("NUEVO partner for ACTUALIZADO document missing");

  // Assert ACTUALIZADO is more recent than its NUEVO partner
  if (actualizadoDoc.bdtlRecordDate <= nuevoPartner.bdtlRecordDate)
    throw new Error("ACTUALIZADO record is not more recent than its NUEVO partner");

  // Assert filler salary constraint
  const fillerHighSalary = docs.filter((d) => {
    if (d.document.subtype !== "Carta laboral") return false;
    if (d.status.value === "ACTUALIZADO") return false;
    const isAnchor = CARTA_ANCHOR_SPECS.some((s) => s.nombre === (
      d.document.subtype === "Carta laboral"
        ? d.document.liquidData.result_json.nombre_empleado.value
        : ""
    ));
    if (isAnchor) return false;
    return d.document.liquidData.result_json.ingresos.some(
      (ing) =>
        ing.descripcion.value === "SALARIO BASICO" &&
        parseInt(ing.cantidad.value, 10) > HIGH_SALARY_THRESHOLD,
    );
  });
  if (fillerHighSalary.length > 0)
    throw new Error(`${fillerHighSalary.length} filler record(s) leaked above HIGH_SALARY_THRESHOLD; check FILLER_SALARY_MAX`);

  // Assert enum integrity
  for (const d of docs) {
    if (!PROCESS_NAMES.includes(d.process.name))
      throw new Error(`Invalid process.name: ${d.process.name}`);
    if (!SUBTYPES.includes(d.document.subtype))
      throw new Error(`Invalid document.subtype: ${d.document.subtype}`);
    if (!DOC_STATUSES.includes(d.status.value))
      throw new Error(`Invalid status.value: ${d.status.value}`);
    if (!CHANNELS.includes(d.processing.channel.value))
      throw new Error(`Invalid channel.value: ${d.processing.channel.value}`);
  }

  return docs;
}
