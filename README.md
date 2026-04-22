## PC28 数据展示 Demo（Python + Flask）

**说明：**  
本项目只做 PC28 开奖数据 `/api/kj` 与 Keno 源数据 `/api/keno` 的获取与前端展示，不包含任何投注、充值、结算等资金相关逻辑，仅用于技术演示与数据可视化。

### 安装依赖

在项目根目录运行：

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows 使用: .venv\\Scripts\\activate
pip install -r requirements.txt
```

### 启动服务

```bash
python app.py
```

随后在浏览器中访问：

```text
http://127.0.0.1:5000/
```

首页会展示：
- **最新开奖数据**：期号、日期、时间、特码、组合
- **Keno 源数据**：对应期号的 20 个 Keno 号码

