"""
Thread-safe bounded collections and background task execution.
"""
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import threading
from typing import Any


class BoundedDict:
    """Thread-safe bounded dictionary with LRU eviction."""

    def __init__(self, maxsize: int = 500):
        self.maxsize = maxsize
        self._dict: OrderedDict = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Any, default: Any = None) -> Any:
        with self._lock:
            if key not in self._dict:
                return default
            self._dict.move_to_end(key)
            return self._dict[key]

    def set(self, key: Any, value: Any) -> None:
        with self._lock:
            if key in self._dict:
                self._dict.move_to_end(key)
            self._dict[key] = value
            if len(self._dict) > self.maxsize:
                self._dict.popitem(last=False)

    def __setitem__(self, key: Any, value: Any) -> None:
        self.set(key, value)

    def __getitem__(self, key: Any) -> Any:
        with self._lock:
            self._dict.move_to_end(key)
            return self._dict[key]

    def __contains__(self, key: Any) -> bool:
        with self._lock:
            return key in self._dict

    def pop(self, key: Any, default: Any = None) -> Any:
        with self._lock:
            return self._dict.pop(key, default)

    def clear(self) -> None:
        with self._lock:
            self._dict.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._dict)


class BoundedSet:
    """Thread-safe bounded set with FIFO/LRU eviction."""

    def __init__(self, maxsize: int = 1000):
        self.maxsize = maxsize
        self._set: OrderedDict = OrderedDict()
        self._lock = threading.Lock()

    def add(self, item: Any) -> None:
        with self._lock:
            if item in self._set:
                self._set.move_to_end(item)
            else:
                self._set[item] = None
                if len(self._set) > self.maxsize:
                    self._set.popitem(last=False)

    def __contains__(self, item: Any) -> bool:
        with self._lock:
            return item in self._set

    def remove(self, item: Any) -> None:
        with self._lock:
            self._set.pop(item, None)

    def clear(self) -> None:
        with self._lock:
            self._set.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._set)


# Shared thread pool for background asynchronous tasks (e.g. SWR cache refresh)
background_executor = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="shiki_bg"
)
