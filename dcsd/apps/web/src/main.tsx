import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/glass.css";
import "./styles/app.css";

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type Readiness = {
  status: "ready" | "degraded";
  checks: Record<string, unknown>;
};

type JobRecord = {
  jobId: string;
  status: string;
  progress: number;
  type: string;
};

function apiBase(): string {
  return localStorage.getItem("apiBase") ?? DEFAULT_API_BASE;
}

function AppShell() {
  const location = useLocation();
  const nav = useMemo(
    () => [
      { to: "/upload", label: "Upload" },
      { to: "/jobs", label: "Jobs" },
      { to: "/api-keys", label: "API Keys" },
      { to: "/settings", label: "Settings" },
      { to: "/convert", label: "Convert" },
      { to: "/transcribe", label: "Transcribe" },
      { to: "/voice", label: "Generate Voice" }
    ],
    []
  );

  return (
    <main className="layout">
      <header className="topbar glass-nav depth-2">
        <div className="brand">
          <p className="eyebrow">AURALITH ATLAS</p>
          <h1>Eternal Spirit Command Surface</h1>
        </div>
        <p className="topbar-note">Azure-primary, WebSocket-first progress, resumable uploads, and real orchestration routes.</p>
      </header>
      <section className="workspace">
        <aside className="sidebar glass-panel depth-1">
          {nav.map((item) => (
            <Link key={item.to} className={`nav-item ${location.pathname === item.to ? "is-active" : ""}`} to={item.to}>
              {item.label}
            </Link>
          ))}
        </aside>
        <section className="content-grid">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/results/:jobId" element={<ResultsPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/convert" element={<Placeholder title="Convert" />} />
            <Route path="/transcribe" element={<Placeholder title="Transcribe" />} />
            <Route path="/voice" element={<Placeholder title="Generate Voice" />} />
          </Routes>
        </section>
      </section>
    </main>
  );
}

function UploadPage() {
  const [tenantId, setTenantId] = useState("00000000-0000-4000-8000-000000000001");
  const [userId, setUserId] = useState("00000000-0000-4000-8000-000000000002");
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState("");
  const [jobId, setJobId] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function uploadAndSubmit() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const checksum = await sha256File(file);
      const chunkSize = 5 * 1024 * 1024;
      const createRes = await fetch(`${apiBase()}/v1/uploads`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId
        },
        body: JSON.stringify({
          tenantId,
          userId,
          filename: file.name,
          sizeBytes: file.size,
          contentType: file.type || "application/octet-stream",
          checksumSha256: checksum,
          chunkSizeBytes: chunkSize
        })
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const created = await createRes.json();
      const newUploadId = created.upload.uploadId as string;
      setUploadId(newUploadId);

      const totalParts = Math.max(1, Math.ceil(file.size / chunkSize));
      const parts: Array<{ partNumber: number; etag: string }> = [];
      for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const signRes = await fetch(`${apiBase()}/v1/uploads/${newUploadId}/parts`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tenant-id": tenantId,
            "x-user-id": userId
          },
          body: JSON.stringify({ partNumber })
        });
        if (!signRes.ok) throw new Error(await signRes.text());
        const signed = await signRes.json();

        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const put = await fetch(signed.signedUrl.url, {
          method: "PUT",
          headers: {
            "content-type": file.type || "application/octet-stream"
          },
          body: file.slice(start, end)
        });
        if (!put.ok) throw new Error(`Part upload failed:${partNumber}:${put.status}`);
        const etag = put.headers.get("etag") ?? `etag-part-${partNumber}`;
        parts.push({ partNumber, etag });
        setProgress(partNumber / totalParts);
      }

      const completeRes = await fetch(`${apiBase()}/v1/uploads/${newUploadId}/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId
        },
        body: JSON.stringify({ parts })
      });
      if (!completeRes.ok) throw new Error(await completeRes.text());
      const completed = await completeRes.json();

      const submitRes = await fetch(`${apiBase()}/v1/jobs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId
        },
        body: JSON.stringify({
          idempotencyKey: `upload-${Date.now()}`,
          tenantId,
          userId,
          fileId: completed.asset.assetId,
          type: "pipeline",
          options: { routingMode: "balanced", partialArtifactMode: true }
        })
      });
      if (!submitRes.ok) throw new Error(await submitRes.text());
      const submitted = await submitRes.json();
      setJobId(submitted.jobId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="surface glass-panel depth-3">
      <h2>Upload - Extract/OCR/STT - TTS</h2>
      <label className="field"><span>Tenant ID</span><input value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></label>
      <label className="field"><span>User ID</span><input value={userId} onChange={(e) => setUserId(e.target.value)} /></label>
      <label className="field"><span>File</span><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      <div className="actions">
        <button className="btn glass-cta" onClick={uploadAndSubmit} disabled={!file || busy}>{busy ? "Processing..." : "Upload + Run Pipeline"}</button>
      </div>
      <p>Upload progress: {Math.round(progress * 100)}%</p>
      {uploadId && <p>Upload ID: {uploadId}</p>}
      {jobId && <p>Job ID: {jobId}</p>}
      {jobId && <Link className="nav-item" to={`/results/${jobId}`}>Open Results</Link>}
      {error && <p className="error">{error}</p>}
    </article>
  );
}

function JobsPage() {
  const [tenantId, setTenantId] = useState("00000000-0000-4000-8000-000000000001");
  const [userId, setUserId] = useState("00000000-0000-4000-8000-000000000002");
  const [items, setItems] = useState<JobRecord[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const readyRes = await fetch(`${apiBase()}/health/readiness`);
      setReadiness(await readyRes.json());
      const res = await fetch(`${apiBase()}/v1/jobs`, { headers: { "x-tenant-id": tenantId, "x-user-id": userId } });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setItems(json.items ?? []);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [tenantId, userId]);

  return (
    <article className="surface glass-panel depth-2">
      <h2>Jobs Dashboard</h2>
      <label className="field"><span>Tenant ID</span><input value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></label>
      <label className="field"><span>User ID</span><input value={userId} onChange={(e) => setUserId(e.target.value)} /></label>
      {readiness && <p>Readiness: <strong>{readiness.status}</strong></p>}
      <div className="live-lines">
        {items.map((job) => (
          <p key={job.jobId}>
            <span>{job.type}</span> {job.status} ({Math.round((job.progress ?? 0) * 100)}%){" "}
            <Link to={`/results/${job.jobId}`}>view</Link>
          </p>
        ))}
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={() => void refresh()}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
    </article>
  );
}

function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId ?? "";
  const [tenantId, setTenantId] = useState("00000000-0000-4000-8000-000000000001");
  const [userId, setUserId] = useState("00000000-0000-4000-8000-000000000002");
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const res = await fetch(`${apiBase()}/v1/jobs/${jobId}`, { headers: { "x-tenant-id": tenantId, "x-user-id": userId } });
      if (!res.ok) throw new Error(await res.text());
      setPayload(await res.json());
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [jobId, tenantId, userId]);

  return (
    <article className="surface glass-panel depth-3">
      <h2>Results: {jobId}</h2>
      <label className="field"><span>Tenant ID</span><input value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></label>
      <label className="field"><span>User ID</span><input value={userId} onChange={(e) => setUserId(e.target.value)} /></label>
      {payload?.job && <p>Status: {payload.job.status} ({Math.round((payload.job.progress ?? 0) * 100)}%)</p>}
      {(payload?.artifacts ?? []).map((artifact: any) => (
        <div key={artifact.artifactId}>
          <p>{artifact.type} ({artifact.format})</p>
          {typeof artifact.storageKey === "string" && artifact.storageKey.startsWith("data:audio") && (
            <audio controls src={artifact.storageKey} />
          )}
          {typeof artifact.storageKey === "string" && artifact.storageKey.startsWith("data:text") && (
            <pre>{atob(artifact.storageKey.split(",")[1] ?? "").slice(0, 2000)}</pre>
          )}
        </div>
      ))}
      <div className="actions">
        <button className="btn ghost" onClick={() => void refresh()}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
    </article>
  );
}

function ApiKeysPage() {
  const [tenantId, setTenantId] = useState("00000000-0000-4000-8000-000000000001");
  const [userId, setUserId] = useState("00000000-0000-4000-8000-000000000002");
  const [label, setLabel] = useState("Local Dev Key");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch(`${apiBase()}/v1/api-keys`, { headers: { "x-tenant-id": tenantId, "x-user-id": userId } });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const json = await res.json();
    setItems(json.items ?? []);
  }

  async function createKey() {
    try {
      const res = await fetch(`${apiBase()}/v1/api-keys`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId
        },
        body: JSON.stringify({
          tenantId,
          userId,
          label,
          scopes: ["jobs:read", "jobs:write", "keys:read"]
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setToken(json.token ?? "");
      await refresh();
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function revoke(apiKeyId: string) {
    try {
      const res = await fetch(`${apiBase()}/v1/api-keys/${apiKeyId}/revoke`, {
        method: "POST",
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId
        }
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
  }, [tenantId, userId]);

  return (
    <article className="surface glass-panel depth-2">
      <h2>API Key Management</h2>
      <label className="field"><span>Tenant ID</span><input value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></label>
      <label className="field"><span>User ID</span><input value={userId} onChange={(e) => setUserId(e.target.value)} /></label>
      <label className="field"><span>Label</span><input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
      <div className="actions">
        <button className="btn glass-cta" onClick={() => void createKey()}>Create Key</button>
        <button className="btn ghost" onClick={() => void refresh()}>Refresh</button>
      </div>
      {token && <p>Key (shown once): <code>{token}</code></p>}
      {items.map((item) => (
        <p key={item.apiKeyId}>
          {item.label} ({item.keyPrefix}) {item.revokedAt ? "revoked" : "active"}
          {!item.revokedAt && <button className="btn ghost" onClick={() => void revoke(item.apiKeyId)}>Revoke</button>}
        </p>
      ))}
      {error && <p className="error">{error}</p>}
    </article>
  );
}

function SettingsPage() {
  const [api, setApi] = useState(localStorage.getItem("apiBase") ?? DEFAULT_API_BASE);
  const [saved, setSaved] = useState(false);
  return (
    <article className="surface glass-panel depth-1">
      <h2>Settings</h2>
      <label className="field"><span>API Base URL</span><input value={api} onChange={(e) => setApi(e.target.value)} /></label>
      <div className="actions">
        <button className="btn glass-cta" onClick={() => { localStorage.setItem("apiBase", api); setSaved(true); }}>Save</button>
      </div>
      {saved && <p>Saved. Reload app to apply.</p>}
    </article>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <article className="surface glass-panel depth-2">
      <h2>{title}</h2>
      <p>This section remains available and can now bind to live APIs as we expand post-slice features.</p>
    </article>
  );
}

async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

const root = document.querySelector("#app");
if (!root) throw new Error("#app missing");

createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);
