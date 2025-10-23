from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import json
import threading
from worker import run_job

WORK_DIR = Path("/work")
IN_DIR = WORK_DIR / "jobs"
OUT_DIR = WORK_DIR / "results"
IN_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()


class RosettaJob(BaseModel):
    jobId: str | None = None
    sequence: str
    directions: list[str] | None = None
    params: dict | None = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/jobs")
def create_job(job: RosettaJob):
    job_id = job.jobId or __import__("uuid").uuid4().hex
    job_in = IN_DIR / job_id
    job_out = OUT_DIR / job_id
    job_in.mkdir(parents=True, exist_ok=True)
    job_out.mkdir(parents=True, exist_ok=True)

    with (job_in / "input.json").open("w", encoding="utf-8") as f:
        json.dump(job.dict() | {"jobId": job_id}, f)

    # fire-and-forget background thread
    t = threading.Thread(target=run_job, args=(job_id,), daemon=True)
    t.start()

    return {"jobId": job_id, "status": "queued"}


@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    status_file = OUT_DIR / job_id / "status.json"
    if not status_file.exists():
        # If no status yet, report queued/running conservatively
        in_dir = IN_DIR / job_id
        if in_dir.exists():
            return {"jobId": job_id, "status": "running"}
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        return json.loads(status_file.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(status_code=500, detail="Status unreadable")


@app.get("/jobs/{job_id}/pdb")
def get_job_pdb(job_id: str):
    pdb_path = OUT_DIR / job_id / "output.pdb"
    if not pdb_path.exists():
        raise HTTPException(status_code=404, detail="PDB not available")
    return FileResponse(
        path=str(pdb_path),
        media_type="application/octet-stream",
        filename=f"{job_id}.pdb",
    )

