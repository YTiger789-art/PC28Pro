from flask import Flask, jsonify, render_template, request
import requests
from datetime import datetime, timedelta
from collections import deque

app = Flask(__name__)

# 简单内存访问统计（进程重启后会清空）
stats = {
    "total_pv": 0,            # 总访问量（PV）
    "by_date": {},            # 每日统计：{date: {"pv": int, "ips": set()}}
    "recent": deque(maxlen=50)  # 最近活跃访客列表：[(ip, datetime)]
}


def _get_client_ip() -> str:
    """获取客户端 IP（优先使用 X-Forwarded-For，方便以后挂到反向代理后使用）。"""
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        # 形如 "real_ip, proxy1, proxy2"
        return xff.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _update_visit_stats():
    """更新访问统计，只在首页访问时调用。"""
    today = datetime.utcnow().date()
    today_str = today.isoformat()
    ip = _get_client_ip()

    day_stat = stats["by_date"].setdefault(today_str, {"pv": 0, "ips": set()})
    day_stat["pv"] += 1
    day_stat["ips"].add(ip)

    stats["total_pv"] += 1
    stats["recent"].append((ip, datetime.utcnow()))

    # 清理最近访客中较早的记录（这里只保留最近 24 小时以内的记录）
    cutoff = datetime.utcnow() - timedelta(days=1)
    while stats["recent"] and stats["recent"][0][1] < cutoff:
        stats["recent"].popleft()

# 禁用静态文件缓存（开发环境）
@app.after_request
def add_no_cache(response):
    if app.debug:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    return response

BASE_URL = "https://pc28.help"
# BASE_URL = "https://pc28.ai"
# 接口本身响应较慢，curl 实测通常在 4~6 秒左右，
# 为了减少 Read timed out 的情况，这里把超时放宽到 15 秒
REQUEST_TIMEOUT = 15


@app.route("/api/kj")
def proxy_kj():
    """
    代理 pc28.help 开奖数据接口 /api/kj.json
    这里只做数据转发，不做任何投注逻辑。
    """
    try:
        # 根据官方文档，使用 nbr 参数控制返回最近多少期，这里固定为 20 期
        resp = requests.get(
            f"{BASE_URL}/api/kj.json",
            params={"nbr": 20},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_kj", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/keno")
def proxy_keno():
    """
    代理 pc28.help Keno 源数据接口 /api/keno.json
    """
    try:
        # 与开奖接口保持一致，这里也固定取最近 20 期
        resp = requests.get(
            f"{BASE_URL}/api/keno.json",
            params={"nbr": 20},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_keno", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/yl")
def proxy_yl():
    """
    代理 pc28.help 遗漏统计接口 /api/yl.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/yl.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_yl", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/yk")
def proxy_yk():
    """
    代理 pc28.help 已开统计接口 /api/yk.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/yk.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_yk", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/ds")
def proxy_ds():
    """
    代理 pc28.help 单双预测接口 /api/ds.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/ds.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_ds", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/dx")
def proxy_dx():
    """
    代理 pc28.help 大小预测接口 /api/dx.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/dx.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_dx", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/sz")
def proxy_sz():
    """
    代理 pc28.help 双组预测接口 /api/sz.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/sz.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_sz", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/sha")
def proxy_sha():
    """
    代理 pc28.help 杀组预测接口 /api/sha.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/sha.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_sha", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/xh")
def proxy_xh():
    """
    代理 pc28.help 循环长龙接口 /api/xh.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/xh.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_xh", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/jt")
def proxy_jt():
    """
    代理 pc28.help 交替长龙接口 /api/jt.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/jt.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_jt", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/abb")
def proxy_abb():
    """
    代理 pc28.help ABB循环接口 /api/abb.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/abb.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_abb", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/api/pl")
def proxy_pl():
    """
    代理 pc28.help 赔率循环接口 /api/pl.json
    这里只做数据转发，不做任何投注或资金相关逻辑。
    """
    try:
        resp = requests.get(
            f"{BASE_URL}/api/pl.json",
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return jsonify({"error": "failed_to_fetch_pl", "detail": str(exc)}), 502

    return jsonify(data)


@app.route("/")
def index():
    """
    前端首页，展示开奖数据和 Keno 源数据。
    """
    _update_visit_stats()
    return render_template("index.html")


@app.route("/api/stats")
def get_stats():
    """
    返回简单访问统计：
    - recent_active: 最近活跃访客数（去重 IP，最近 30 分钟）
    - today_uv: 今日访问人数（去重 IP）
    - today_pv: 今日访问量
    - yesterday_pv: 昨日访问量
    - total_pv: 总访问量
    """
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    today_str = today.isoformat()
    yesterday_str = yesterday.isoformat()

    today_stat = stats["by_date"].get(today_str, {"pv": 0, "ips": set()})
    yesterday_stat = stats["by_date"].get(yesterday_str, {"pv": 0, "ips": set()})

    # 最近 30 分钟内活跃的唯一 IP 数
    cutoff = datetime.utcnow() - timedelta(minutes=30)
    recent_ips = {ip for ip, ts in stats["recent"] if ts >= cutoff}

    return jsonify(
        {
            "recent_active": len(recent_ips),
            "today_uv": len(today_stat.get("ips", [])),
            "today_pv": today_stat.get("pv", 0),
            "yesterday_pv": yesterday_stat.get("pv", 0),
            "total_pv": stats["total_pv"],
        }
    )


if __name__ == "__main__":
    # 默认关闭 debug（生产环境安全）。如需本地调试，请手动改为 True 或使用环境变量/独立配置。
    app.run(host="0.0.0.0", port=2888, debug=False)

