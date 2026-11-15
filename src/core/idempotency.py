"""
Cơ chế Idempotency (Tính bất biến) chống AI Agent gọi trùng lặp các MCP Tool ghi dữ liệu.
Bao gồm:
- @mcp_idempotent: Decorator băm tham số SHA-256 và quản lý vòng đời khóa.
- InMemoryIdempotencyStore: Lưu trữ trên RAM (dùng cho Unit Test / môi trường nhẹ).
- SQLiteIdempotencyStore: Lưu trữ bền vững trên ổ cứng với WAL mode & chống Zombie Lock.
"""

import contextlib
import functools
import hashlib
import inspect
import json
import logging
import sqlite3
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterator, Literal, Optional, ParamSpec, TypeVar

from src.core.exceptions import DuplicateInProgressError

logger = logging.getLogger("MCPServer")


@dataclass(frozen=True)
class IdempotencyRecord:
    status: Literal["IN_PROGRESS", "COMPLETED"]
    created_at: float
    expires_at: float
    result: Optional[dict[str, Any]] = None


class IdempotencyStore(ABC):
    @abstractmethod
    def try_acquire(self, key: str, ttl_seconds: float) -> tuple[bool, Optional[IdempotencyRecord]]:
        pass

    @abstractmethod
    def mark_completed(self, key: str, result: dict[str, Any], ttl_seconds: float) -> None:
        pass

    @abstractmethod
    def release(self, key: str) -> None:
        pass


class InMemoryIdempotencyStore(IdempotencyStore):
    """Bộ lưu trữ khóa Idempotency trên RAM, an toàn đa luồng (Thread-safe)."""

    def __init__(self, max_entries: int = 2048) -> None:
        if max_entries <= 0:
            raise ValueError("max_entries phải lớn hơn 0.")
        self._store: dict[str, IdempotencyRecord] = {}
        self._lock = threading.RLock()
        self._max_entries = max_entries

    def try_acquire(self, key: str, ttl_seconds: float) -> tuple[bool, Optional[IdempotencyRecord]]:
        now = time.monotonic()
        with self._lock:
            self._evict_expired(now)
            existing = self._store.get(key)

            if existing is not None and existing.expires_at > now:
                return False, existing

            self._store[key] = IdempotencyRecord(
                status="IN_PROGRESS",
                created_at=now,
                expires_at=now + ttl_seconds,
                result=None,
            )
            return True, None

    def mark_completed(self, key: str, result: dict[str, Any], ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._store[key] = IdempotencyRecord(
                status="COMPLETED",
                created_at=now,
                expires_at=now + ttl_seconds,
                result=result,
            )

    def release(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def _evict_expired(self, now: float) -> None:
        expired_keys = [k for k, v in self._store.items() if v.expires_at <= now]
        for k in expired_keys:
            del self._store[k]

        while len(self._store) >= self._max_entries:
            oldest_key = next(iter(self._store))
            del self._store[oldest_key]


class SQLiteIdempotencyStore(IdempotencyStore):
    """
    Bộ lưu trữ khóa Idempotency bền vững trên ổ cứng bằng SQLite.
    - Sử dụng WAL mode + BEGIN IMMEDIATE chống Race Condition đa luồng & đa tiến trình.
    - Tự động thu hồi khóa IN_PROGRESS bị treo (Zombie Lock) nếu Server sập đột ngột.
    """

    def __init__(
        self,
        db_path: str | Path = "data/idempotency.sqlite3",
        max_entries: int = 10000,
        lock_timeout_seconds: float = 60.0,
        sqlite_busy_timeout_ms: int = 5000,
    ) -> None:
        if not db_path or str(db_path).strip() == "":
            raise ValueError("Đường dẫn file SQLite (db_path) không được để trống.")
        if max_entries <= 0:
            raise ValueError("max_entries phải lớn hơn 0.")
        if lock_timeout_seconds <= 0:
            raise ValueError("lock_timeout_seconds phải lớn hơn 0.")
        if sqlite_busy_timeout_ms < 100:
            raise ValueError("sqlite_busy_timeout_ms phải từ 100ms trở lên.")

        self._db_path = Path(db_path).resolve()
        self._max_entries = max_entries
        self._lock_timeout_seconds = lock_timeout_seconds
        self._busy_timeout_ms = sqlite_busy_timeout_ms
        self._thread_lock = threading.RLock()

        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_schema()

    def _create_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(
            str(self._db_path),
            timeout=self._busy_timeout_ms / 1000.0,
            isolation_level=None,
            check_same_thread=False,
        )
        conn.row_factory = sqlite3.Row
        conn.execute(f"PRAGMA busy_timeout = {self._busy_timeout_ms};")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    @contextlib.contextmanager
    def _atomic_write_transaction(self) -> Iterator[sqlite3.Cursor]:
        with self._thread_lock:
            conn = self._create_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("BEGIN IMMEDIATE;")
                yield cursor
                cursor.execute("COMMIT;")
            except Exception as exc:
                with contextlib.suppress(sqlite3.Error):
                    cursor.execute("ROLLBACK;")
                logger.error(f"SQLite transaction rolled back due to error: {exc}", exc_info=True)
                raise
            finally:
                cursor.close()
                conn.close()

    def _initialize_schema(self) -> None:
        with self._atomic_write_transaction() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS idempotency_records (
                    idem_key TEXT PRIMARY KEY,
                    status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS', 'COMPLETED')),
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    result_json TEXT
                );
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
                ON idempotency_records(expires_at);
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
                ON idempotency_records(created_at);
                """
            )

    def try_acquire(self, key: str, ttl_seconds: float) -> tuple[bool, Optional[IdempotencyRecord]]:
        if not key or not key.strip():
            raise ValueError("Khóa đối chiếu (key) không được để trống.")
        if ttl_seconds <= 0:
            raise ValueError("Thời gian hiệu lực (ttl_seconds) phải lớn hơn 0.")

        now = time.time()
        initial_expires_at = now + min(ttl_seconds, self._lock_timeout_seconds)

        with self._atomic_write_transaction() as cursor:
            self._evict_expired_and_overflow(cursor, now)

            cursor.execute(
                """
                SELECT status, created_at, expires_at, result_json
                FROM idempotency_records
                WHERE idem_key = ?
                """,
                (key,),
            )
            row = cursor.fetchone()

            if row is not None:
                parsed_result: Optional[dict[str, Any]] = None
                if row["result_json"] is not None:
                    parsed_result = json.loads(row["result_json"])

                existing_record = IdempotencyRecord(
                    status=row["status"],
                    created_at=float(row["created_at"]),
                    expires_at=float(row["expires_at"]),
                    result=parsed_result,
                )
                return False, existing_record

            cursor.execute(
                """
                INSERT INTO idempotency_records (idem_key, status, created_at, expires_at, result_json)
                VALUES (?, 'IN_PROGRESS', ?, ?, NULL)
                """,
                (key, now, initial_expires_at),
            )
            return True, None

    def mark_completed(self, key: str, result: dict[str, Any], ttl_seconds: float) -> None:
        if not key or not key.strip():
            raise ValueError("Khóa đối chiếu (key) không được để trống.")
        if ttl_seconds <= 0:
            raise ValueError("Thời gian hiệu lực (ttl_seconds) phải lớn hơn 0.")

        now = time.time()
        final_expires_at = now + ttl_seconds
        serialized_result = json.dumps(result, ensure_ascii=False, sort_keys=True, default=str)

        with self._atomic_write_transaction() as cursor:
            cursor.execute(
                """
                INSERT INTO idempotency_records (idem_key, status, created_at, expires_at, result_json)
                VALUES (?, 'COMPLETED', ?, ?, ?)
                ON CONFLICT(idem_key) DO UPDATE SET
                    status = 'COMPLETED',
                    expires_at = excluded.expires_at,
                    result_json = excluded.result_json
                """,
                (key, now, final_expires_at, serialized_result),
            )

    def release(self, key: str) -> None:
        if not key or not key.strip():
            return

        with self._atomic_write_transaction() as cursor:
            cursor.execute("DELETE FROM idempotency_records WHERE idem_key = ?", (key,))

    def _evict_expired_and_overflow(self, cursor: sqlite3.Cursor, now: float) -> None:
        cursor.execute("DELETE FROM idempotency_records WHERE expires_at <= ?", (now,))

        cursor.execute("SELECT COUNT(1) AS total FROM idempotency_records")
        count_row = cursor.fetchone()
        current_count = int(count_row["total"]) if count_row else 0

        if current_count >= self._max_entries:
            overflow_count = (current_count - self._max_entries) + 1
            cursor.execute(
                """
                DELETE FROM idempotency_records
                WHERE idem_key IN (
                    SELECT idem_key FROM idempotency_records
                    ORDER BY created_at ASC
                    LIMIT ?
                )
                """,
                (overflow_count,),
            )


def _normalize_value(val: Any) -> Any:
    if isinstance(val, float):
        return round(val, 4)
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        return {str(k): _normalize_value(v) for k, v in sorted(val.items())}
    if isinstance(val, (list, tuple)):
        return [_normalize_value(item) for item in val]
    return val


def compute_deterministic_key(
    func: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    ignore_params: tuple[str, ...] = (),
) -> str:
    sig = inspect.signature(func)
    bound = sig.bind_partial(*args, **kwargs)
    bound.apply_defaults()

    filtered_arguments = {
        k: _normalize_value(v)
        for k, v in bound.arguments.items()
        if k not in ignore_params
    }
    canonical_payload = json.dumps(
        {"tool": func.__qualname__, "params": filtered_arguments},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()


P = ParamSpec("P")
R = TypeVar("R", bound=dict[str, Any])


def mcp_idempotent(
    store: IdempotencyStore,
    ttl_seconds: float = 300.0,
    ignore_params: tuple[str, ...] = (),
) -> Callable[[Callable[P, R]], Callable[P, dict[str, Any]]]:
    """
    Decorator bảo vệ các MCP Tool có thao tác ghi/chỉnh sửa dữ liệu:
    - Tự động tạo khóa SHA-256 từ tên hàm và bộ tham số đã chuẩn hóa.
    - Ngăn chặn gọi trùng lặp song song (ném DuplicateInProgressError).
    - Trả về kết quả từ bộ nhớ đệm nếu AI gọi lặp lại trong thời gian `ttl_seconds`.
    """
    if ttl_seconds <= 0:
        raise ValueError("ttl_seconds phải lớn hơn 0.")

    def decorator(func: Callable[P, R]) -> Callable[P, dict[str, Any]]:
        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> dict[str, Any]:
                idem_key = compute_deterministic_key(func, args, kwargs, ignore_params)
                acquired, existing = store.try_acquire(idem_key, ttl_seconds)

                if not acquired and existing is not None:
                    return _handle_existing_record(func.__name__, idem_key, existing)

                try:
                    result = await func(*args, **kwargs)
                    store.mark_completed(idem_key, result, ttl_seconds)
                    return {
                        **result,
                        "is_idempotent_replay": False,
                        "idempotency_key": idem_key[:12],
                    }
                except Exception:
                    store.release(idem_key)
                    raise

            return async_wrapper  # type: ignore

        @functools.wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> dict[str, Any]:
            idem_key = compute_deterministic_key(func, args, kwargs, ignore_params)
            acquired, existing = store.try_acquire(idem_key, ttl_seconds)

            if not acquired and existing is not None:
                return _handle_existing_record(func.__name__, idem_key, existing)

            try:
                result = func(*args, **kwargs)
                store.mark_completed(idem_key, result, ttl_seconds)
                return {
                    **result,
                    "is_idempotent_replay": False,
                    "idempotency_key": idem_key[:12],
                }
            except Exception:
                store.release(idem_key)
                raise

        return sync_wrapper

    return decorator


def _handle_existing_record(
    tool_name: str,
    idem_key: str,
    record: IdempotencyRecord,
) -> dict[str, Any]:
    if record.status == "IN_PROGRESS":
        raise DuplicateInProgressError(tool_name, idem_key)

    cached_data = record.result or {}
    return {
        **cached_data,
        "is_idempotent_replay": True,
        "idempotency_key": idem_key[:12],
        "notice": (
            "Thao tác này đã được thực thi thành công trước đó. "
            "Trả về kết quả từ bộ nhớ đệm để tránh tạo dữ liệu trùng lặp."
        ),
    }
