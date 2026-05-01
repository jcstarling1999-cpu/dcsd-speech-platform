import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "2m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<600"]
  }
};

const tenantId = "a43b16a6-4cf2-4558-a4f4-5ffd50894bb0";
const userId = "47f2b2b7-dab5-4861-b5ce-77b6edf5eb07";
const fileId = "8f7f4fd9-7f86-4b55-8ea7-13f771790d1a";

export default function () {
  const payload = {
    idempotencyKey: `k6-${__VU}-${__ITER}-${Date.now()}`,
    tenantId,
    userId,
    fileId,
    type: "stt",
    options: {
      routingMode: "balanced"
    }
  };

  const res = http.post("http://localhost:8080/v1/jobs", JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      "x-user-id": userId,
      "x-role": "owner"
    }
  });

  check(res, {
    accepted: (r) => r.status === 202
  });

  sleep(0.2);
}
