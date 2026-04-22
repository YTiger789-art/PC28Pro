async function fetchJson(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error('HTTP ' + resp.status);
    }
    return resp.json();
}

function renderKj(data) {
    const tbody = document.getElementById('kj-body');
    tbody.innerHTML = '';

    const list = data.data || data || [];
    list.forEach((item) => {
        let displayNumber = item.number ?? '';
        if (typeof displayNumber === 'string') {
            const hasPlus = displayNumber.includes('+');
            const hasEqual = displayNumber.includes('=');

            if (hasEqual) {
                const equalParts = displayNumber.split('=');
                const lastPart = equalParts[equalParts.length - 1];
                const m = lastPart.match(/(\d+)\s*$/);
                if (m) {
                    displayNumber = m[1];
                }
            } else if (hasPlus) {
                const nums = displayNumber
                    .split('+')
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !Number.isNaN(n));
                if (nums.length > 0) {
                    const sum = nums.reduce((acc, n) => acc + n, 0);
                    displayNumber = String(sum);
                }
            } else {
                const match = displayNumber.match(/(\d+)\s*$/);
                if (match) {
                    displayNumber = match[1];
                }
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nbr ?? ''}</td>
            <td>${item.time ?? ''}</td>
            <td>
                <div class="keno-balls">
                    <span class="keno-ball keno-special">${displayNumber}</span>
                </div>
            </td>
            <td>${item.combination ?? ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderKeno(data) {
    const tbody = document.getElementById('keno-body');
    tbody.innerHTML = '';

    const list = data.data || data || [];
    list.forEach((item) => {
        const nums = item.nbrs || item.numbers || [];
        const safeNums = Array.isArray(nums) ? nums : String(nums || '').split(',').map((n) => n.trim()).filter(Boolean);

        const groupA = safeNums.slice(0, 7);
        const groupB = safeNums.slice(7, 14);
        const groupC = safeNums.slice(14, 20);

        const ballsHtml = (group, groupClass) =>
            group
                .map((n) => `<span class="keno-ball ${groupClass}">${n}</span>`)
                .join('');

        const numbersHtml = `
            <div class="keno-groups">
                <div class="keno-group">
                    <span class="keno-group-label keno-a-label">A组</span>
                    <div class="keno-balls">
                        ${ballsHtml(groupA, 'keno-a')}
                    </div>
                </div>
                <div class="keno-group">
                    <span class="keno-group-label keno-b-label">B组</span>
                    <div class="keno-balls">
                        ${ballsHtml(groupB, 'keno-b')}
                    </div>
                </div>
                <div class="keno-group">
                    <span class="keno-group-label keno-c-label">C组</span>
                    <div class="keno-balls">
                        ${ballsHtml(groupC, 'keno-c')}
                    </div>
                </div>
            </div>
        `;

        const sum = safeNums.reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);
        const size = sum >= 14 ? '大' : '小';
        const parity = sum % 2 === 0 ? '双' : '单';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nbr ?? ''}</td>
            <td>${numbersHtml}</td>
            <td>
                <div class="keno-summary">
                    <span class="keno-formula">${safeNums.slice(0, 3).join(' + ')} + ... =</span>
                    <span class="keno-sum">${sum}</span>
                    <span class="keno-tag keno-tag-size">${size}</span>
                    <span class="keno-tag keno-tag-parity">${parity}</span>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderYl(data) {
    const tbody = document.getElementById('yl-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const payload = data?.data || data || {};

    // 数组：保底用 JSON 展示
    if (Array.isArray(payload)) {
        payload.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>记录 ${idx + 1}</td>
                <td><pre class="stat-json">${JSON.stringify(item, null, 2)}</pre></td>
            `;
            tbody.appendChild(tr);
        });
        return;
    }

    if (!payload || typeof payload !== 'object') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>数据</td>
            <td>${String(payload ?? '')}</td>
        `;
        tbody.appendChild(tr);
        return;
    }

    // 按 key 分类：号码 / 大小 / 单双 / 其他
    const sections = {
        numbers: [],
        size: [],
        parity: [],
        others: [],
    };

    Object.entries(payload).forEach(([key, value]) => {
        if (/^\d+$/.test(key) || /^n\d+$/i.test(key)) {
            sections.numbers.push({ key, value });
        } else if (/[大小]/.test(key)) {
            sections.size.push({ key, value });
        } else if (/[单双]/.test(key)) {
            sections.parity.push({ key, value });
        } else {
            sections.others.push({ key, value });
        }
    });

    const buildTableHtml = (rows, label) => {
        if (!rows.length) return '';

        // 如果 value 是对象，自动抽取字段作为列
        const sampleObj = rows.find((r) => r.value && typeof r.value === 'object' && !Array.isArray(r.value))?.value;
        const fieldKeys = sampleObj ? Object.keys(sampleObj) : [];

        const firstColTitle = label.includes('号码') ? '号码' : '类别';
        let headerHtml = `<th>${firstColTitle}</th>`;
        fieldKeys.forEach((f) => {
            headerHtml += `<th>${f}</th>`;
        });

        const bodyRows = rows
            .map(({ key, value }) => {
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    // 非对象：直接一列展示
                    return `
                        <tr>
                            <td>${key}</td>
                            <td colspan="${Math.max(fieldKeys.length, 1)}">${String(value ?? '')}</td>
                        </tr>
                    `;
                }

                const cells = fieldKeys
                    .map((f) => {
                        const v = value[f];
                        const isNumber = typeof v === 'number';
                        const cls = isNumber ? 'stat-number' : '';
                        return `<td class="${cls}">${v ?? ''}</td>`;
                    })
                    .join('');

                return `
                    <tr>
                        <td>${key}</td>
                        ${cells}
                    </tr>
                `;
            })
            .join('');

        return `
            <div class="stat-block">
                <div class="stat-block-title">${label}</div>
                <div class="stat-block-table-wrapper">
                    <table class="stat-table">
                        <thead>
                            <tr>${headerHtml}</tr>
                        </thead>
                        <tbody>
                            ${bodyRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const htmlParts = [];
    const numbersHtml = buildTableHtml(sections.numbers, '号码遗漏（0 - 27）');
    if (numbersHtml) htmlParts.push(numbersHtml);
    const sizeHtml = buildTableHtml(sections.size, '大小遗漏');
    if (sizeHtml) htmlParts.push(sizeHtml);
    const parityHtml = buildTableHtml(sections.parity, '单双遗漏');
    if (parityHtml) htmlParts.push(parityHtml);
    const othersHtml = buildTableHtml(sections.others, '其他遗漏统计');
    if (othersHtml) htmlParts.push(othersHtml);

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>遗漏统计</td>
        <td>
            <div class="stat-grid">
                ${htmlParts.join('')}
            </div>
        </td>
    `;
    tbody.appendChild(tr);
}

function renderYk(data) {
    const tbody = document.getElementById('yk-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const payload = data?.data || data || {};

    // 数组：保底 JSON 展示
    if (Array.isArray(payload)) {
        payload.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>记录 ${idx + 1}</td>
                <td><pre class="stat-json">${JSON.stringify(item, null, 2)}</pre></td>
            `;
            tbody.appendChild(tr);
        });
        return;
    }

    if (!payload || typeof payload !== 'object') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>数据</td>
            <td>${String(payload ?? '')}</td>
        `;
        tbody.appendChild(tr);
        return;
    }

    // 按 key 分类：号码 / 大小 / 单双 / 其他
    const sections = {
        numbers: [],
        size: [],
        parity: [],
        others: [],
    };

    Object.entries(payload).forEach(([key, value]) => {
        if (/^\d+$/.test(key) || /^n\d+$/i.test(key)) {
            sections.numbers.push({ key, value });
        } else if (/[大小]/.test(key)) {
            sections.size.push({ key, value });
        } else if (/[单双]/.test(key)) {
            sections.parity.push({ key, value });
        } else {
            sections.others.push({ key, value });
        }
    });

    const buildTableHtml = (rows, label) => {
        if (!rows.length) return '';

        const sampleObj = rows.find((r) => r.value && typeof r.value === 'object' && !Array.isArray(r.value))?.value;
        const fieldKeys = sampleObj ? Object.keys(sampleObj) : [];

        const firstColTitle = label.includes('号码') ? '号码' : '类别';
        let headerHtml = `<th>${firstColTitle}</th>`;
        fieldKeys.forEach((f) => {
            headerHtml += `<th>${f}</th>`;
        });

        const bodyRows = rows
            .map(({ key, value }) => {
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    return `
                        <tr>
                            <td>${key}</td>
                            <td colspan="${Math.max(fieldKeys.length, 1)}">${String(value ?? '')}</td>
                        </tr>
                    `;
                }

                const cells = fieldKeys
                    .map((f) => {
                        const v = value[f];
                        const isNumber = typeof v === 'number';
                        const cls = isNumber ? 'stat-number' : '';
                        return `<td class="${cls}">${v ?? ''}</td>`;
                    })
                    .join('');

                return `
                    <tr>
                        <td>${key}</td>
                        ${cells}
                    </tr>
                `;
            })
            .join('');

        return `
            <div class="stat-block">
                <div class="stat-block-title">${label}</div>
                <div class="stat-block-table-wrapper">
                    <table class="stat-table">
                        <thead>
                            <tr>${headerHtml}</tr>
                        </thead>
                        <tbody>
                            ${bodyRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const htmlParts = [];
    const numbersHtml = buildTableHtml(sections.numbers, '号码已开统计（0 - 27）');
    if (numbersHtml) htmlParts.push(numbersHtml);
    const sizeHtml = buildTableHtml(sections.size, '大小已开统计');
    if (sizeHtml) htmlParts.push(sizeHtml);
    const parityHtml = buildTableHtml(sections.parity, '单双已开统计');
    if (parityHtml) htmlParts.push(parityHtml);
    const othersHtml = buildTableHtml(sections.others, '其他已开统计');
    if (othersHtml) htmlParts.push(othersHtml);

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>已开统计</td>
        <td>
            <div class="stat-grid">
                ${htmlParts.join('')}
            </div>
        </td>
    `;
    tbody.appendChild(tr);
}

// 预测命中统计缓存（按 tbodyId 记录）
const predictStats = {};

// 预测结果渲染：按「期号 / 预测 / 号码 / 结果 / 命中」五列展示，并统计命中率
function renderPredictionStructured(tbodyId, data, defaultPredictLabel) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    let payload = data?.data ?? data ?? [];
    if (!Array.isArray(payload)) {
        // 常见：{ list: [...] }
        if (Array.isArray(payload.list)) {
            payload = payload.list;
        } else {
            // 实在不是数组，就兜底 JSON 展示
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="5">
                    <pre class="stat-json">${JSON.stringify(payload, null, 2)}</pre>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }
    }

    const pickField = (obj, keys) => {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
                return obj[k];
            }
        }
        return '';
    };

    const hitState = (raw) => {
        if (raw === undefined || raw === null || raw === '') return 'unknown';
        if (typeof raw === 'boolean') return raw ? 'hit' : 'miss';
        if (typeof raw === 'number') return raw ? 'hit' : 'miss';
        const s = String(raw).trim();
        if (/^(1|true|是|中|命中|win)$/i.test(s)) return 'hit';
        if (/^(0|false|否|挂|错|lost?)$/i.test(s)) return 'miss';
        return 'unknown';
    };

    let hitCount = 0;
    let totalCount = 0;

    payload.forEach((item) => {
        if (!item || typeof item !== 'object') {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="5">
                    <pre class="stat-json">${JSON.stringify(item, null, 2)}</pre>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        const issue =
            pickField(item, ['issue', 'qihao', 'expect', 'period', 'nbr', 'id']) ?? '';
        const predict =
            pickField(item, ['predict', 'forecast', 'type', 'direction', 'plan']) ||
            defaultPredictLabel;

        // 预测期号的「号码」和「结果」按需求固定展示
        const number = '待开奖';
        const result = '-';

        const hitRaw = pickField(item, ['hit', 'is_hit', 'win', 'isWin', 'match', 'success']);
        const state = hitState(hitRaw);

        let hitHtml = '-';
        if (state === 'hit') {
            hitCount += 1;
            totalCount += 1;
            hitHtml = `
                <span class="hit-icon hit-icon-hit" title="命中">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="7"></circle>
                        <path d="M4 8.2L6.5 11 12 5" fill="none"></path>
                    </svg>
                </span>
            `;
        } else if (state === 'miss') {
            totalCount += 1;
            hitHtml = `
                <span class="hit-icon hit-icon-miss" title="未命中">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="7"></circle>
                        <path d="M5 5l6 6M11 5l-6 6" fill="none"></path>
                    </svg>
                </span>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${issue}</td>
            <td>${predict}</td>
            <td>${number}</td>
            <td>${result}</td>
            <td>${hitHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    // 记录该表格的命中统计
    predictStats[tbodyId] = { hit: hitCount, total: totalCount };
}

// 根据 tbodyId 更新「当前命中率」展示
function updatePredictHitRateByTbodyId(tbodyId) {
    const el = document.getElementById('predict-hit-rate');
    if (!el) return;
    const stat = predictStats[tbodyId] || { hit: 0, total: 0 };
    const { hit, total } = stat;

    if (!total) {
        el.textContent = '当前命中率：-';
        return;
    }
    const rate = ((hit / total) * 100).toFixed(1).replace(/\.0$/, '');

    // 不同 tbodyId 使用不同名称
    const labelMap = {
        'ds-body': '单双预测',
        'dx-body': '大小预测',
        'sz-body': '双组预测',
        'sha-body': '杀组预测',
    };
    const name = labelMap[tbodyId] || '当前预测';

    el.textContent = `${name}命中率：${rate}%（${hit}/${total}）`;
}

function renderDs(data) {
    renderPredictionStructured('ds-body', data, '单双预测');
}

function renderDx(data) {
    renderPredictionStructured('dx-body', data, '大小预测');
}

function renderSz(data) {
    renderPredictionStructured('sz-body', data, '双组预测');
}

function renderSha(data) {
    renderPredictionStructured('sha-body', data, '杀组预测');
}

function renderDragonData(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    let payload = data?.data ?? data ?? [];
    
    // 如果返回的是对象而非数组，尝试转换为数组
    if (!Array.isArray(payload)) {
        if (typeof payload === 'object' && payload !== null) {
            payload = Object.values(payload);
        } else {
            payload = [];
        }
    }

    // 如果数组为空，显示暂无数据
    if (payload.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">暂无数据</div>';
        return;
    }

    // 渲染可视化的长龙项
    payload.forEach(item => {
        const dragonItem = document.createElement('div');
        dragonItem.className = 'dragon-item';
        
        // 状态标签
        const isActive = item.status !== '已断开';
        const statusClass = isActive ? 'dragon-status-active' : 'dragon-status-broken';
        
        // 序列项
        const sequenceItems = (item.sequence || '').split(' ')
            .filter(s => s.trim())
            .map(s => `<div class="dragon-sequence-item">${s}</div>`)
            .join('');
        
        dragonItem.innerHTML = `
            <div class="dragon-header">
                <div class="dragon-type">${item.content || '未知类型'}</div>
                <div class="dragon-status ${statusClass}">${item.status || '未知'}</div>
            </div>
            <div class="dragon-info">
                <div class="dragon-info-item">
                    <div class="dragon-info-label">起始期号</div>
                    <div class="dragon-info-value">${item.start || '-'}</div>
                </div>
                <div class="dragon-info-item">
                    <div class="dragon-info-label">当前期号</div>
                    <div class="dragon-info-value">${item.current || '-'}</div>
                </div>
                <div class="dragon-info-item">
                    <div class="dragon-info-label">连续次数</div>
                    <div class="dragon-info-value dragon-count">${item.count || 0} 期</div>
                </div>
                <div class="dragon-info-item">
                    <div class="dragon-info-label">预期结果</div>
                    <div class="dragon-info-value">${item.expected || '-'}</div>
                </div>
            </div>
            ${sequenceItems ? `
                <div class="dragon-sequence">
                    <div class="dragon-sequence-label">序列模式</div>
                    <div class="dragon-sequence-items">${sequenceItems}</div>
                </div>
            ` : ''}
        `;
        
        container.appendChild(dragonItem);
    });
}

function renderXh(data) {
    renderDragonData('xh-body', data);
}

function renderJt(data) {
    renderDragonData('jt-body', data);
}

function renderAbb(data) {
    renderDragonData('abb-body', data);
}

function renderPl(data) {
    renderDragonData('pl-body', data);
}

// 轮询相关：间隔时间（毫秒），当前是否在加载中
const POLL_INTERVAL_MS = 30000; // 每 30 秒自动刷新一次
let isLoading = false;

async function loadStats() {
    try {
        const data = await fetchJson('/api/stats');
        const recentEl = document.getElementById('stats-recent-active');
        const todayUvEl = document.getElementById('stats-today-uv');
        const todayPvEl = document.getElementById('stats-today-pv');
        const yesterdayPvEl = document.getElementById('stats-yesterday-pv');
        const totalPvEl = document.getElementById('stats-total-pv');

        if (recentEl) recentEl.textContent = data.recent_active ?? '-';
        if (todayUvEl) todayUvEl.textContent = data.today_uv ?? '-';
        if (todayPvEl) todayPvEl.textContent = data.today_pv ?? '-';
        if (yesterdayPvEl) yesterdayPvEl.textContent = data.yesterday_pv ?? '-';
        if (totalPvEl) totalPvEl.textContent = data.total_pv ?? '-';
    } catch (e) {
        // 静默失败即可，不影响主数据渲染
        console.error('加载统计数据失败', e);
    }
}

async function loadData() {
    if (isLoading) {
        // 上一次请求还没结束，避免并发请求堆积
        return;
    }
    isLoading = true;

    const kjStatus = document.getElementById('kj-status');
    const kenoStatus = document.getElementById('keno-status');
    const ylStatus = document.getElementById('yl-status');
    const ykStatus = document.getElementById('yk-status');
    const dsStatus = document.getElementById('ds-status');
    const dxStatus = document.getElementById('dx-status');
    const szStatus = document.getElementById('sz-status');
    const shaStatus = document.getElementById('sha-status');
    const xhStatus = document.getElementById('xh-status');
    const jtStatus = document.getElementById('jt-status');
    const abbStatus = document.getElementById('abb-status');
    const plStatus = document.getElementById('pl-status');
    const lastUpdate = document.getElementById('last-update');

    kjStatus.textContent = '正在加载开奖数据...';
    kenoStatus.textContent = '正在加载 Keno 数据...';
    ylStatus.textContent = '正在加载遗漏统计数据...';
    ykStatus.textContent = '正在加载已开统计数据...';
    if (dsStatus) dsStatus.textContent = '正在加载单双预测数据...';
    if (dxStatus) dxStatus.textContent = '正在加载大小预测数据...';
    if (szStatus) szStatus.textContent = '正在加载双组预测数据...';
    if (shaStatus) shaStatus.textContent = '正在加载杀组预测数据...';
    if (xhStatus) xhStatus.textContent = '正在加载循环长龙数据...';
    if (jtStatus) jtStatus.textContent = '正在加载交替长龙数据...';
    if (abbStatus) abbStatus.textContent = '正在加载ABB循环数据...';
    if (plStatus) plStatus.textContent = '正在加载赔率循环数据...';

    try {
        const [kj, keno, yl, yk, ds, dx, sz, sha, xh, jt, abb, pl] = await Promise.all([
            fetchJson('/api/kj'),
            fetchJson('/api/keno'),
            fetchJson('/api/yl'),
            fetchJson('/api/yk'),
            fetchJson('/api/ds'),
            fetchJson('/api/dx'),
            fetchJson('/api/sz'),
            fetchJson('/api/sha'),
            fetchJson('/api/xh'),
            fetchJson('/api/jt'),
            fetchJson('/api/abb'),
            fetchJson('/api/pl'),
        ]);
        // 同步拉取访问统计（不阻塞上面的 Promise.all）
        loadStats();

        renderKj(kj);
        renderKeno(keno);
        renderYl(yl);
        renderYk(yk);
        renderDs(ds);
        renderDx(dx);
        renderSz(sz);
        renderSha(sha);
        renderXh(xh);
        renderJt(jt);
        renderAbb(abb);
        renderPl(pl);

        kjStatus.textContent = '';
        kjStatus.className = '';
        kenoStatus.textContent = '';
        kenoStatus.className = '';
        ylStatus.textContent = '';
        ylStatus.className = '';
        ykStatus.textContent = '';
        ykStatus.className = '';
        if (dsStatus) {
            dsStatus.textContent = '';
            dsStatus.className = '';
        }
        if (dxStatus) {
            dxStatus.textContent = '';
            dxStatus.className = '';
        }
        if (szStatus) {
            szStatus.textContent = '';
            szStatus.className = '';
        }
        if (shaStatus) {
            shaStatus.textContent = '';
            shaStatus.className = '';
        }
        if (xhStatus) {
            xhStatus.textContent = '';
            xhStatus.className = '';
        }
        if (jtStatus) {
            jtStatus.textContent = '';
            jtStatus.className = '';
        }
        if (abbStatus) {
            abbStatus.textContent = '';
            abbStatus.className = '';
        }
        if (plStatus) {
            plStatus.textContent = '';
            plStatus.className = '';
        }
        lastUpdate.textContent = `最近更新：${new Date().toLocaleString()}`;

        // 刷新后默认展示「单双预测」的命中率
        updatePredictHitRateByTbodyId('ds-body');
    } catch (err) {
        console.error(err);
        kjStatus.textContent = '获取开奖数据失败，请稍后重试。';
        kjStatus.className = 'error';
        kenoStatus.textContent = '获取 Keno 数据失败，请稍后重试。';
        kenoStatus.className = 'error';
        ylStatus.textContent = '获取遗漏统计数据失败，请稍后重试。';
        ylStatus.className = 'error';
        ykStatus.textContent = '获取已开统计数据失败，请稍后重试。';
        ykStatus.className = 'error';
        if (dsStatus) {
            dsStatus.textContent = '获取单双预测数据失败，请稍后重试。';
            dsStatus.className = 'error';
        }
        if (dxStatus) {
            dxStatus.textContent = '获取大小预测数据失败，请稍后重试。';
            dxStatus.className = 'error';
        }
        if (szStatus) {
            szStatus.textContent = '获取双组预测数据失败，请稍后重试。';
            szStatus.className = 'error';
        }
        if (shaStatus) {
            shaStatus.textContent = '获取杀组预测数据失败，请稍后重试。';
            shaStatus.className = 'error';
        }
        if (xhStatus) {
            xhStatus.textContent = '获取循环长龙数据失败，请稍后重试。';
            xhStatus.className = 'error';
        }
        if (jtStatus) {
            jtStatus.textContent = '获取交替长龙数据失败，请稍后重试。';
            jtStatus.className = 'error';
        }
        if (abbStatus) {
            abbStatus.textContent = '获取ABB循环数据失败，请稍后重试。';
            abbStatus.className = 'error';
        }
        if (plStatus) {
            plStatus.textContent = '获取赔率循环数据失败，请稍后重试。';
            plStatus.className = 'error';
        }
        lastUpdate.textContent = '数据加载失败';
    } finally {
        isLoading = false;
    }
}

function setupViewToggle() {
    const btnKj = document.getElementById('btn-view-kj');
    const btnKeno = document.getElementById('btn-view-keno');
    const btnYl = document.getElementById('btn-view-yl');
    const btnYk = document.getElementById('btn-view-yk');
    const btnPredict = document.getElementById('btn-view-predict');
    const btnDragon = document.getElementById('btn-view-dragon');
    const cardKj = document.getElementById('card-kj');
    const cardKeno = document.getElementById('card-keno');
    const cardYl = document.getElementById('card-yl');
    const cardYk = document.getElementById('card-yk');
    const cardPredict = document.getElementById('card-predict');
    const cardDragon = document.getElementById('card-dragon');

    if (!btnKj || !btnKeno || !btnYl || !btnYk || !cardKj || !cardKeno || !cardYl || !cardYk) return;

    const allButtons = [btnKj, btnKeno, btnYl, btnYk, btnPredict, btnDragon].filter(Boolean);
    const allCards = [cardKj, cardKeno, cardYl, cardYk, cardPredict, cardDragon].filter(Boolean);

    const activate = (btn, card) => {
        allButtons.forEach((b) => b.classList.remove('toggle-btn-active'));
        allCards.forEach((c) => c.classList.add('hidden'));
        btn.classList.add('toggle-btn-active');
        card.classList.remove('hidden');
    };

    btnKj.addEventListener('click', () => activate(btnKj, cardKj));
    btnKeno.addEventListener('click', () => activate(btnKeno, cardKeno));
    btnYl.addEventListener('click', () => activate(btnYl, cardYl));
    btnYk.addEventListener('click', () => activate(btnYk, cardYk));
    if (btnPredict && cardPredict) {
        btnPredict.addEventListener('click', () => activate(btnPredict, cardPredict));
    }
    if (btnDragon && cardDragon) {
        btnDragon.addEventListener('click', () => activate(btnDragon, cardDragon));
    }

    // 默认显示最新开奖
    activate(btnKj, cardKj);
}

function setupPredictSubToggle() {
    const btnDs = document.getElementById('sub-predict-ds');
    const btnDx = document.getElementById('sub-predict-dx');
    const btnSz = document.getElementById('sub-predict-sz');
    const btnSha = document.getElementById('sub-predict-sha');
    const panelDs = document.getElementById('panel-ds');
    const panelDx = document.getElementById('panel-dx');
    const panelSz = document.getElementById('panel-sz');
    const panelSha = document.getElementById('panel-sha');

    if (!btnDs || !panelDs) return;

    const allButtons = [btnDs, btnDx, btnSz, btnSha].filter(Boolean);
    const allPanels = [panelDs, panelDx, panelSz, panelSha].filter(Boolean);

    const panelIdToTbodyId = {
        'panel-ds': 'ds-body',
        'panel-dx': 'dx-body',
        'panel-sz': 'sz-body',
        'panel-sha': 'sha-body',
    };

    const activate = (btn, panel) => {
        allButtons.forEach((b) => b.classList.remove('predict-sub-btn-active'));
        allPanels.forEach((p) => p.classList.add('hidden'));
        btn.classList.add('predict-sub-btn-active');
        panel.classList.remove('hidden');

        const tbodyId = panelIdToTbodyId[panel.id];
        if (tbodyId) {
            updatePredictHitRateByTbodyId(tbodyId);
        }
    };

    btnDs.addEventListener('click', () => activate(btnDs, panelDs));
    if (btnDx && panelDx) {
        btnDx.addEventListener('click', () => activate(btnDx, panelDx));
    }
    if (btnSz && panelSz) {
        btnSz.addEventListener('click', () => activate(btnSz, panelSz));
    }
    if (btnSha && panelSha) {
        btnSha.addEventListener('click', () => activate(btnSha, panelSha));
    }

    // 默认显示：单双预测
    activate(btnDs, panelDs);
}

function setupDragonSubToggle() {
    const btnXh = document.getElementById('sub-dragon-xh');
    const btnJt = document.getElementById('sub-dragon-jt');
    const btnAbb = document.getElementById('sub-dragon-abb');
    const btnPl = document.getElementById('sub-dragon-pl');
    const panelXh = document.getElementById('panel-xh');
    const panelJt = document.getElementById('panel-jt');
    const panelAbb = document.getElementById('panel-abb');
    const panelPl = document.getElementById('panel-pl');

    if (!btnXh || !panelXh) return;

    const allButtons = [btnXh, btnJt, btnAbb, btnPl].filter(Boolean);
    const allPanels = [panelXh, panelJt, panelAbb, panelPl].filter(Boolean);

    const activate = (btn, panel) => {
        allButtons.forEach((b) => b.classList.remove('predict-sub-btn-active'));
        allPanels.forEach((p) => p.classList.add('hidden'));
        btn.classList.add('predict-sub-btn-active');
        panel.classList.remove('hidden');
    };

    btnXh.addEventListener('click', () => activate(btnXh, panelXh));
    if (btnJt && panelJt) {
        btnJt.addEventListener('click', () => activate(btnJt, panelJt));
    }
    if (btnAbb && panelAbb) {
        btnAbb.addEventListener('click', () => activate(btnAbb, panelAbb));
    }
    if (btnPl && panelPl) {
        btnPl.addEventListener('click', () => activate(btnPl, panelPl));
    }

    // 默认显示：循环长龙
    activate(btnXh, panelXh);
}

window.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadStats();
    setupViewToggle();
    setupPredictSubToggle();
    setupDragonSubToggle();
    // 启动定时轮询
    setInterval(loadData, POLL_INTERVAL_MS);
    setInterval(loadStats, POLL_INTERVAL_MS);
});

