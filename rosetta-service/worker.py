from pathlib import Path
import json
import time

WORK_DIR = Path("/work")
IN_DIR = WORK_DIR / "jobs"
OUT_DIR = WORK_DIR / "results"


def _write_status(job_id: str, status: str, error: str | None = None):
    out = OUT_DIR / job_id
    out.mkdir(parents=True, exist_ok=True)
    with (out / "status.json").open("w", encoding="utf-8") as f:
        json.dump({"jobId": job_id, "status": status, "errorMessage": error}, f)


def _write_stub_pdb(job_id: str):
    """Write a minimal valid PDB so UI can load/download before PyRosetta is enabled."""
    pdb = """
ATOM      1  N   GLY A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  GLY A   1       1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   GLY A   1       1.958   1.410   0.000  1.00  0.00           C
ATOM      4  O   GLY A   1       1.158   2.330   0.000  1.00  0.00           O
TER
END
""".strip()
    out = OUT_DIR / job_id
    out.mkdir(parents=True, exist_ok=True)
    (out / "output.pdb").write_text(pdb + "\n", encoding="utf-8")


def run_job(job_id: str):
    _write_status(job_id, "running")
    try:
        job_in = IN_DIR / job_id / "input.json"
        data = json.loads(job_in.read_text(encoding="utf-8"))

        # Simulate compute time; replace with real PyRosetta later
        time.sleep(2)

        # TODO: integrate PyRosetta here
        # from pyrosetta import init, pose_from_sequence
        # init("-mute all")
        # pose = pose_from_sequence(data["sequence"], "fa_standard")
        # pose.dump_pdb(str(OUT_DIR / job_id / "output.pdb"))

        _write_stub_pdb(job_id)
        _write_status(job_id, "succeeded")
    except Exception as e:
        _write_status(job_id, "failed", str(e))

