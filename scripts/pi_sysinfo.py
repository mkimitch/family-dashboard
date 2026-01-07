#!/usr/bin/env python3

import json
import os
import shlex
import socket
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


def read_ipv4() -> Optional[str]:
    """Return the primary IPv4 address of this machine, preferring private LAN IPs."""

    def is_loopback_or_linklocal(ip: str) -> bool:
        """Check if IP is loopback or link-local (should be skipped)."""
        return ip.startswith("127.") or ip.startswith("169.254.")

    def is_docker_bridge(ip: str) -> bool:
        """Check if IP is a Docker bridge (usually 172.17.x or 172.18.x)."""
        return ip.startswith("172.17.") or ip.startswith("172.18.")

    def is_private_ip(ip: str) -> bool:
        """Check if IP is in RFC1918 private ranges (10.x, 172.16-31.x, 192.168.x)."""
        try:
            parts = [int(p) for p in ip.split(".")]
            if parts[0] == 10:
                return True
            if parts[0] == 172 and 16 <= parts[1] <= 31:
                return True
            if parts[0] == 192 and parts[1] == 168:
                return True
        except (ValueError, IndexError):
            pass
        return False

    def is_valid_ipv4(ip: str) -> bool:
        """Check if string looks like a valid IPv4 address."""
        if not ip or ip.count(".") != 3:
            return False
        try:
            parts = [int(p) for p in ip.split(".")]
            return all(0 <= p <= 255 for p in parts)
        except (ValueError, AttributeError):
            return False

    candidates = []

    # Method 1: Try hostname -I (most reliable on Pi hardware)
    try:
        out = subprocess.check_output(["hostname", "-I"], encoding="utf-8").strip()
        for idx, token in enumerate(out.split()):
            if is_valid_ipv4(token):
                if is_loopback_or_linklocal(token) or is_docker_bridge(token):
                    continue
                # Score based on: is_private (prefer), position (prefer earlier)
                is_private = is_private_ip(token)
                score = (is_private, -idx)  # Earlier IPs get higher score
                candidates.append((score, token))
    except (FileNotFoundError, subprocess.CalledProcessError, OSError, ValueError):
        pass

    # Method 2: Socket trick as fallback
    if not candidates:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if is_valid_ipv4(ip) and not is_loopback_or_linklocal(ip):
                candidates.append(((False, 0), ip))
        except OSError:
            pass
        finally:
            sock.close()

    if candidates:
        candidates.sort(reverse=True, key=lambda x: x[0])
        return candidates[0][1]

    return None


def collect_sysinfo() -> Dict[str, Any]:
    return {
        "ipv4": read_ipv4(),
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
