import os
import queue
import threading
from collections.abc import Callable
from dataclasses import dataclass


ImageJobRunner = Callable[[], None]


@dataclass
class QueuedImageJob:
    job_id: str
    job_type: str
    runner: ImageJobRunner


_job_queue: queue.Queue[QueuedImageJob] = queue.Queue()
_workers_started = False
_workers_lock = threading.Lock()


def _worker_loop(worker_name: str):
    while True:
        job = _job_queue.get()
        try:
            print(
                f"[image-job-queue] {worker_name} started "
                f"{job.job_type} job_id={job.job_id}",
                flush=True,
            )
            job.runner()
        except Exception as exc:
            print(
                f"[image-job-queue] {worker_name} failed "
                f"{job.job_type} job_id={job.job_id}: {exc}",
                flush=True,
            )
        finally:
            _job_queue.task_done()


def _get_worker_count():
    raw_value = os.getenv("AI_IMAGE_QUEUE_WORKERS", "1")
    try:
        return max(1, int(raw_value))
    except ValueError:
        return 1


def start_image_job_workers():
    global _workers_started

    if _workers_started:
        return

    with _workers_lock:
        if _workers_started:
            return

        worker_count = _get_worker_count()
        for index in range(worker_count):
            worker = threading.Thread(
                target=_worker_loop,
                args=(f"worker-{index + 1}",),
                daemon=True,
                name=f"ai-image-job-worker-{index + 1}",
            )
            worker.start()

        _workers_started = True
        print(
            f"[image-job-queue] started {worker_count} worker(s)",
            flush=True,
        )


def enqueue_image_job(job_id: str, job_type: str, runner: ImageJobRunner):
    start_image_job_workers()
    _job_queue.put(QueuedImageJob(job_id=job_id, job_type=job_type, runner=runner))
    return _job_queue.qsize()


def get_image_job_queue_size():
    return _job_queue.qsize()
