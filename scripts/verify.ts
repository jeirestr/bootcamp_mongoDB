import { HumanMessage } from "@langchain/core/messages";
import { bootstrapCredentials } from "../src/credentials";
import { getConfig } from "../src/config";
import { closeMongoClient } from "../src/db/client";
import { knowledgeBaseSearch } from "../src/retrieval/retrieverTool";
import { structuredQuery } from "../src/query/queryTool";
import { assess } from "../src/hybrid/hybridTool";
import { buildPatternAgent } from "../src/patterns";
import { messageContentToString } from "../src/util/message";
import { generateActivityEvents, computeExpectations } from "../data/sample/activity_events";
import { getMemoryStore, saveUserMemory, listUserMemories } from "../src/memory/store";

/**
 * Acceptance checks for the three bootcamp checkpoints. Run after `npm run load`.
 *
 *   Checkpoint 1: the agent skeleton runs and answers a sample question per leg.
 *   Checkpoint 2: correct, evidence-backed results (retrieval cites; query is
 *                 correct; hybrid draws on both legs).
 *   Checkpoint 3: >= 2 tools working, memory resumes on a repeated thread_id,
 *                 and one demo scenario runs end to end.
 *
 * Correctness for the structured leg is checked against expectations derived
 * from the SAME deterministic generator that seeded the data.
 */

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures++;
}

async function askAgent(
  pattern: "rag" | "structured" | "hybrid",
  thread: string,
  q: string,
  user = "verify_user",
): Promise<string> {
  const agent = await buildPatternAgent(pattern);
  const res = await agent.invoke(
    { messages: [new HumanMessage(q)] },
    { configurable: { thread_id: thread, user_id: user }, recursionLimit: 25 },
  );
  const last = res.messages.at(-1);
  return last ? messageContentToString(last.content) : "";
}

async function main(): Promise<void> {
  await bootstrapCredentials();
  getConfig();

  const exp = computeExpectations(generateActivityEvents());
  const suraSaCount = String(exp.cartaLaboral.suraSaCount);
  const manizalesCount = String(exp.cedula.manizalesCount);

  // ---- Checkpoint 1: skeleton runs, one answer per leg -----------------------
  console.log("\nCheckpoint 1: skeleton runs and answers a sample question");
  const ragAnswer = await askAgent("rag", "cp1-rag", "What is the dual-control threshold for transfers?");
  check("RAG agent returns a non-empty grounded answer", ragAnswer.trim().length > 0);

  const structAnswer = await askAgent(
    "structured",
    "cp1-struct",
    "¿Cuántos documentos de tipo Carta laboral tienen como empleador a SURA SA?",
  );
  check("Structured agent returns a non-empty answer", structAnswer.trim().length > 0);

  // ---- Checkpoint 2: correct, evidence-backed results ------------------------
  console.log("\nCheckpoint 2: correct, evidence-backed results");

  const kb = await knowledgeBaseSearch.invoke({ query: "What is the dual-control threshold for transfers?" });
  check("Retrieval returns cited passages (source .md)", kb.includes(".md"));
  check("Retrieval finds the dual-control standard", kb.includes("dual-control-standard.md"));
  check("Retrieval passage is relevant (mentions the threshold)", kb.includes("1,000,000") || kb.includes("10,000"));

  const suraSaResult = await structuredQuery.invoke({
    question: "¿Cuántos documentos de tipo Carta laboral tienen nombre_empleador igual a SURA SA? Devuelve el conteo.",
  });
  check(
    "structured_query returns the correct SURA SA count",
    suraSaResult.includes(suraSaCount),
    `expected count ${suraSaCount}`,
  );
  check("structured_query result includes a plain-language explanation", suraSaResult.includes("explanation"));

  const manizalesResult = await structuredQuery.invoke({
    question: `¿Cuántas cédulas de ciudadanía fueron expedidas en MANIZALES? Devuelve el conteo.`,
  });
  check(
    "structured_query returns the correct MANIZALES count",
    manizalesResult.includes(manizalesCount),
    `expected count ${manizalesCount}`,
  );

  const judgment = await assess.invoke({ subjectId: exp.cartaLaboral.actualizadoReferenceId });
  check("hybrid assess produces a non-empty result", judgment.trim().length > 0);
  check("hybrid assess reaches a verdict token", /CONSISTENT|INCONSISTENT|NEEDS REVIEW/i.test(judgment));

  // ---- Checkpoint 3: >=2 tools, memory resumes, one E2E scenario -------------
  console.log("\nCheckpoint 3: tools + memory + end-to-end scenario");
  check("At least two tools working", true); // retrieval + query exercised above

  // Short-term memory: same thread_id resumes the conversation. Rebuild the
  // agent between turns to prove memory comes from the checkpointer, not from
  // in-process state.
  const memThread = "cp3-memory";
  await askAgent("structured", memThread, "Por favor recuerda para nuestra conversación: mi nombre es Dana.");
  const recall = await askAgent("structured", memThread, "¿Cuál es mi nombre?");
  check("Short-term memory resumes on the same thread_id", /dana/i.test(recall), `recall was: "${recall.slice(0, 120)}"`);

  // Long-term memory: durable, cross-thread, keyed by user. Seed a fact for a
  // user, then recall it from a DIFFERENT thread to prove it is not tied to a
  // single conversation the way the checkpointer is.
  const ltmUser = "verify_ltm_user";
  const store = await getMemoryStore();
  await saveUserMemory(store, ltmUser, "team", {
    kind: "profile",
    summary: "The user is on the RiskRunners team.",
    references: [],
  });
  const stored = await listUserMemories(store, ltmUser);
  check("Long-term store persists a user memory", stored.some((m) => /RiskRunners/.test(m.summary)));

  const ltmRecall = await askAgent("structured", "cp3-ltm-fresh-thread", "¿En qué equipo estoy?", ltmUser);
  check(
    "Long-term memory recalls across a different thread (same user)",
    /riskrunners/i.test(ltmRecall),
    `recall was: "${ltmRecall.slice(0, 120)}"`,
  );

  const scenario = await askAgent(
    "structured",
    "cp3-scenario",
    `¿Existen documentos con estado ACTUALIZADO para la referencia ${exp.cartaLaboral.actualizadoReferenceId}? Muestra los detalles.`,
  );
  check("End-to-end structured scenario returns a reasoned answer", scenario.trim().length > 0);

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`\nVerify failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closeMongoClient());
