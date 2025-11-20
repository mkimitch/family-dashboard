#!/usr/bin/env python3

import json
import os
import shlex
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, Optional


PORT = int(os.environ.get("SYSINFO_PORT", "9000"))
HOST = os.environ.get("SYSINFO_HOST", "127.0.0.1")


def read_cpu_temp_c() -> Optional[float]:
    paths = [
        "/sys/class/thermal/thermal_zone0/temp",
        "/sys/devices/virtual/thermal/thermal_zone0/temp",
    ]
    for path in paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = f.read().strip()
            milli_c = int(raw)
            return milli_c / 1000.0
        except (FileNotFoundError, ValueError, OSError):
            continue
    return None


def read_gpu_temp_c() -> Optional[float]:
    """Best-effort GPU temperature.

    By default uses ``vcgencmd measure_temp`` on Raspberry Pi. You can override
    the command via the ``GPU_TEMP_CMD`` environment variable. If anything
    fails, this returns None.
    """

    cmd = os.environ.get("GPU_TEMP_CMD", "vcgencmd measure_temp")
    try:
        out = subprocess.check_output(shlex.split(cmd), encoding="utf-8").strip()
    except (FileNotFoundError, subprocess.CalledProcessError, OSError, ValueError):
        return None

    # Typical output: "temp=54.0'C"
    text = out.replace("'", "").strip()
    for token in text.split():
        if token.startswith("temp="):
            val = token.split("=", 1)[1].replace("C", "")
            try:
                return float(val)
            except ValueError:
                return None

    # Fallback: try to parse the whole string as a float.
    try:
        return float(text)
    except ValueError:
        return None


def read_loadavg() -> Optional[Dict[str, float]]:
    try:
        with open("/proc/loadavg", "r", encoding="utf-8") as f:
            parts = f.read().split()
        return {
            "1m": float(parts[0]),
            "5m": float(parts[1]),
            "15m": float(parts[2]),
        }
    except (FileNotFoundError, ValueError, OSError, IndexError):
        return None


def read_uptime_sec() -> Optional[float]:
    try:
        with open("/proc/uptime", "r", encoding="utf-8") as f:
            raw = f.read().split()[0]
        return float(raw)
    except (FileNotFoundError, ValueError, OSError, IndexError):
        return None


def read_meminfo_mb() -> Optional[Dict[str, float]]:
    try:
        data: Dict[str, int] = {}
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            for line in f:
                if ":" not in line:
                    continue
                key, rest = line.split(":", 1)
                parts = rest.strip().split()
                if not parts:
                    continue
                value_kib = int(parts[0])
                data[key] = value_kib * 1024
        total = data.get("MemTotal")
        available = data.get("MemAvailable")
        if total is None or available is None:
            return None
        used = total - available
        to_mb = lambda b: round(b / (1024 * 1024), 1)
        return {
            "totalMB": to_mb(total),
            "usedMB": to_mb(used),
            "freeMB": to_mb(available),
        }
    except (FileNotFoundError, ValueError, OSError):
        return None


def collect_sysinfo() -> Dict[str, Any]:
    return {
        "cpuTempC": read_cpu_temp_c(),
        "gpuTempC": read_gpu_temp_c(),
        "cpuCount": os.cpu_count(),
        "load": read_loadavg(),
        "uptimeSec": read_uptime_sec(),
        "mem": read_meminfo_mb(),
    }


class SysInfoHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload: Dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # type: ignore[override]
        if self.path.startswith("/sysinfo"):
            payload = collect_sysinfo()
            self._send_json(payload)
        else:
            self._send_json({"error": "not found"}, status=404)

    def log_message(self, format: str, *args: Any) -> None:  # type: ignore[override]
        # Reduce noise: do not log every request to stderr.
        return


def run() -> None:
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, SysInfoHandler)
    print(f"pi-sysinfo listening on http://{HOST}:{PORT}/sysinfo")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    run()
