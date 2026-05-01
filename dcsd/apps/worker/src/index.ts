import { log } from "@platform/observability/src/index.js";

export interface WorkerJob {
  jobId: string;
  stepId: string;
  attempt: number;
  queue: "ingest" | "extract" | "convert" | "ocr" | "stt" | "tts" | "merge" | "callback" | "webhook-delivery" | "cleanup";
  payload: Record<string, unknown>;
}

export interface WorkerResult {
  outcome: "ack" | "retry" | "dead-letter";
  reason?: string;
}

export async function processWorkerJob(job: WorkerJob): Promise<WorkerResult> {
  log({
    level: "info",
    service: "worker",
    message: "processing worker job",
    fields: {
      jobId: job.jobId,
      stepId: job.stepId,
      attempt: job.attempt,
      queue: job.queue
    }
  });

  if (job.payload["forceDeadLetter"] === true) {
    return { outcome: "dead-letter", reason: "FORCED_BY_PAYLOAD" };
  }

  if (job.payload["forceRetry"] === true && job.attempt < 4) {
    return { outcome: "retry", reason: "FORCED_BY_PAYLOAD" };
  }

  return { outcome: "ack" };
}

if (process.env.RUN_EXAMPLE === "true") {
  processWorkerJob({
    jobId: crypto.randomUUID(),
    stepId: crypto.randomUUID(),
    attempt: 0,
    queue: "stt",
    payload: { operation: "transcribe" }
  }).then((result) => {
    log({ level: "info", service: "worker", message: "worker result", fields: { ...result } });
  });
}
