import threading
import uuid
from typing import Any


_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def create_edit_job(user_id: int):
    job_id = uuid.uuid4().hex
    job = {
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "file_paths": [],
        "remain": None,
        "credit": None,
        "error": None,
    }

    with _jobs_lock:
        _jobs[job_id] = job

    return job


def get_edit_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def update_edit_job(job_id: str, **updates):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            return None

        job.update(updates)
        return dict(job)
