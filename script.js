// =================== Persistência ===================
const STORAGE_KEY = 'lt_nail_bookings_v3'; // mantém dados existentes

// =================== Estado ===================
let bookings = []; // {id, name, phone(11), title, date(YYYY-MM-DD), time(HH:MM), notes}
let selectedDate = new Date();

// ===== Modal de confirmação =====
let pendingConfirmAction = null;
const confirmModal = () => document.getElementById('confirmModal');
const confirmText = () => document.getElementById('confirmText');
const confirmYes = () => document.getElementById('confirmYes');
const confirmNo = () => document.getElementById('confirmNo');

function openConfirm(message, onYes) {
    confirmText().textContent = message || 'Tem certeza?';
    pendingConfirmAction = onYes;
    confirmModal().classList.remove('hidden');
}

function closeConfirm() {
    confirmModal().classList.add('hidden');
    pendingConfirmAction = null;
}

function wireConfirmButtons() {
    confirmYes().onclick = () => {
        if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
        closeConfirm();
    };
    confirmNo().onclick = closeConfirm;
}

// =================== Utilitários ===================

// ❗ NOVO: converte Date -> "YYYY-MM-DD" usando campos locais (sem fuso)
function dateToISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ❗ NOVO: converte "YYYY-MM-DD" -> Date local (sem UTC)
function isoToLocalDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
}
// (xx) xxxxx-xxxx  <->  11999998888
function digitsToPhoneMask(d) {
    const v = onlyDigits(d).slice(0, 11);
    if (!v) return "";
    if (v.length < 3) return `(${v}`;
    if (v.length <= 7) return `(${v.slice(0,2)}) ${v.slice(2)}`;
    return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
}

function maskToDigits(mask) {
    return onlyDigits(mask).slice(0, 11);
}

// Evita que texto digitado pelo usuário vire HTML na tela (segurança simples)
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function isPastDateTime(dateStr, timeStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(n => parseInt(n, 10));
    let hour = 0,
        min = 0;
    if (timeStr) {
        const parts = timeStr.split(":");
        hour = parseInt(parts[0] || "0", 10);
        min = parseInt(parts[1] || "0", 10);
    }
    const bookingDate = new Date(y, m - 1, d, hour, min, 0);
    return bookingDate < new Date();
}

function showFormMessage(msg, isError = true) {
    const el = document.getElementById("formMessage");
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.style.color = isError ? "#b00020" : "#1a6f3f";
    if (msg) setTimeout(() => {
        el.hidden = true;
        el.textContent = "";
    }, 4000);
}
// YYYY-MM-DD -> DD/MM/YYYY
function formatDateBR(iso) {
    if (!iso || !iso.includes("-")) return iso || "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

// ===== WhatsApp: abrir chat direto (sem mensagem automática) =====
function openWhatsApp(phoneDigits11) {
    const digits = onlyDigits(phoneDigits11);
    if (!digits || digits.length !== 11) {
        alert('Telefone inválido para WhatsApp. Use (XX) XXXXX-XXXX.');
        return;
    }
    const url = `https://wa.me/55${digits}`;
    window.open(url, "_blank");
}

// =================== Tema (paleta de cores) ===================
const THEME_KEY = 'lt_theme_color';
const THEMES = {
    rosa: { c1: '#ff2d95', c2: '#ff5bb3' },
    roxo: { c1: '#9b5de5', c2: '#c77dff' },
    azul: { c1: '#3a86ff', c2: '#6fa8ff' },
    verde: { c1: '#2ec4b6', c2: '#6fdfd3' },
    laranja: { c1: '#ff8800', c2: '#ffb347' },
    vermelho: { c1: '#e63946', c2: '#ff6b6b' }
};

function setThemeColors(c1, c2) {
    document.documentElement.style.setProperty('--pink-1', c1);
    document.documentElement.style.setProperty('--pink-2', c2);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', c1);
}

function applyThemeColor(colorKey) {
    const theme = THEMES[colorKey];
    if (!theme) return;

    setThemeColors(theme.c1, theme.c2);

    document.querySelectorAll('.color-swatch').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === colorKey);
    });

    localStorage.setItem(THEME_KEY, JSON.stringify({ type: 'preset', key: colorKey }));
}

function applyCustomThemeColor() {
    const c1El = document.getElementById('customColor1');
    const c2El = document.getElementById('customColor2');
    if (!c1El || !c2El) return;

    const c1 = c1El.value;
    const c2 = c2El.value;

    setThemeColors(c1, c2);
    document.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('selected'));

    localStorage.setItem(THEME_KEY, JSON.stringify({ type: 'custom', c1, c2 }));
}

// Converte "#rrggbb" (ou "#rgb") em [r, g, b] para uso no PDF
function hexToRgbArray(hex) {
    let h = (hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (isNaN(num)) return [255, 45, 149];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Lê a cor de tema atual (salva) para usar também no cabeçalho do PDF
function getCurrentThemeColorHex() {
    const raw = localStorage.getItem(THEME_KEY);
    let saved = null;
    try {
        saved = raw ? JSON.parse(raw) : null;
    } catch {
        saved = raw ? { type: 'preset', key: raw } : null;
    }

    if (saved && saved.type === 'custom' && saved.c1) return saved.c1;
    if (saved && saved.type === 'preset' && THEMES[saved.key]) return THEMES[saved.key].c1;
    return THEMES.vermelho.c1;
}

function loadThemeColor() {
    const raw = localStorage.getItem(THEME_KEY);
    let saved = null;
    try {
        saved = raw ? JSON.parse(raw) : null;
    } catch {
        // Formato antigo (só a chave da cor, sem JSON)
        saved = raw ? { type: 'preset', key: raw } : null;
    }

    if (saved && saved.type === 'custom' && saved.c1 && saved.c2) {
        setThemeColors(saved.c1, saved.c2);
        document.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('selected'));
        const c1El = document.getElementById('customColor1');
        const c2El = document.getElementById('customColor2');
        if (c1El) c1El.value = saved.c1;
        if (c2El) c2El.value = saved.c2;
        return;
    }

    const key = saved && saved.type === 'preset' && THEMES[saved.key] ? saved.key : 'vermelho';
    applyThemeColor(key);
}

// =================== Storage ===================
function loadBookings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        bookings = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(bookings)) bookings = [];
    } catch {
        bookings = [];
    }
}

function saveBookings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

// =================== Páginas ===================
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");
    if (pageId === "listaPage") renderFullList();
    if (pageId === "financeiroPage") renderFinanceiro();
}

// =================== Calendário ===================
function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const monthYearEl = document.getElementById("monthYear");
    if (monthYearEl) {
        monthYearEl.textContent = selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    weekdays.forEach(d => {
        const el = document.createElement("div");
        el.className = "weekday";
        el.textContent = d;
        grid.appendChild(el);
    });

    // Espaços em branco antes do 1º dia
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "weekday empty";
        grid.appendChild(empty);
    }

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d); // LOCAL
        const cell = document.createElement("div");
        cell.className = "day-cell";

        const today = new Date();
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add("today");
        }

        const iso = dateToISO(date); // <-- sem fuso
        const hasEvent = bookings.some(b => b.date === iso);
        if (hasEvent) {
            const dot = document.createElement("div");
            dot.className = "dot";
            cell.appendChild(dot);
            cell.classList.add("has-event");
        }

        const num = document.createElement("div");
        num.className = "date-num";
        num.textContent = d;
        cell.appendChild(num);

        cell.onclick = () => selectDate(date);
        grid.appendChild(cell);
    }
}

function prevMonth() {
    selectedDate.setMonth(selectedDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    selectedDate.setMonth(selectedDate.getMonth() + 1);
    renderCalendar();
}

function selectDate(date) {
    selectedDate = date;
    const title = document.getElementById("selectedDateTitle");
    if (title) {
        const iso = dateToISO(date);
        title.textContent = `Agendamentos para ${formatDateBR(iso)}`;
    }

    const dateInput = document.getElementById("date");
    if (dateInput) {
        const yyyy = selectedDate.getFullYear();
        dateInput.value = "";
        dateInput.placeholder = `${yyyy}-MM-DD`;
        dateInput.min = `${yyyy}-01-01`;
        dateInput.max = `${yyyy}-12-31`;
    }

    renderDayList();
}

function renderDayList() {
    const list = document.getElementById("appointmentsDayList");
    if (!list) return;
    list.innerHTML = "";

    const iso = dateToISO(selectedDate); // local
    const todayBookings = bookings
        .filter(b => b.date === iso)
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    todayBookings.forEach((b) => {
        const li = document.createElement("li");
        li.className = "app-item";
        li.innerHTML = `
      <div class="app-left">
        <div class="app-time">${b.time || "--:--"}</div>
        <div class="app-meta">
          <strong>${escapeHTML(b.title)}</strong><br>
          ${escapeHTML(b.name)} - ${digitsToPhoneMask(b.phone)}<br>
          <small>${escapeHTML(b.notes)}</small>
        </div>
      </div>
      <div class="app-actions">
        <button class="icon-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${b.phone}')">
          <i class="fa-brands fa-whatsapp"></i>
        </button>
        <button class="icon-btn" title="Editar" onclick="confirmEdit('${b.id}')">✏️</button>
        <button class="icon-btn" title="Excluir" onclick="confirmDelete('${b.id}')">🗑</button>
      </div>
    `;
        list.appendChild(li);
    });
}

// =================== Formulário ===================
const form = document.getElementById("appointmentForm");

// Capitalização automática
["name", "title", "notes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", (e) => {
            const val = e.target.value;
            e.target.value = val.length ? val.charAt(0).toUpperCase() + val.slice(1) : "";
        });
    }
});

// Telefone máscara
const phoneEl = document.getElementById("phone");
if (phoneEl) {
    phoneEl.addEventListener("input", (e) => {
        const masked = digitsToPhoneMask(e.target.value);
        e.target.value = masked;
        if (e.target.value.length > 15) e.target.value = e.target.value.slice(0, 15);
    });
    phoneEl.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        phoneEl.value = digitsToPhoneMask(text);
    });
}

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const editId = document.getElementById("editId").value || null;
    const nameVal = capitalizeFirst(document.getElementById("name").value.trim());
    const phoneMasked = document.getElementById("phone").value.trim();
    const phoneDigits = maskToDigits(phoneMasked);
    const titleVal = capitalizeFirst(document.getElementById("title").value.trim());
    const dateVal = document.getElementById("date").value;
    const timeVal = document.getElementById("time").value;
    const notesVal = capitalizeFirst(document.getElementById("notes").value.trim());

    if (!/^\(\d{2}\)\s\d{5}-\d{4}$/.test(phoneMasked) || phoneDigits.length !== 11) {
        showFormMessage("Telefone deve estar no formato (XX) XXXXX-XXXX.", true);
        return;
    }
    if (!dateVal || !timeVal) {
        showFormMessage("Preencha data e hora.", true);
        return;
    }
    if (isPastDateTime(dateVal, timeVal)) {
        showFormMessage("Não é permitido agendar em datas/horas passadas.", true);
        return;
    }

    let booking = { id: editId || uid(), name: nameVal, phone: phoneDigits, title: titleVal, date: dateVal, time: timeVal, notes: notesVal };

    if (editId) {
        const idx = bookings.findIndex(b => b.id === editId);
        if (idx >= 0) bookings[idx] = booking;
    } else {
        bookings.push(booking);
    }

    saveBookings();
    renderCalendar();
    // ❗ Troca crítica: cria Date LOCAL a partir do ISO do input
    selectDate(isoToLocalDate(dateVal));

    e.target.reset();
    document.getElementById("editId").value = "";

    const yyyy = selectedDate.getFullYear();
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.placeholder = `${yyyy}-MM-DD`;
        dateInput.min = `${yyyy}-01-01`;
        dateInput.max = `${yyyy}-12-31`;
    }

    showFormMessage("Agendamento salvo com sucesso!", false);
});

form.addEventListener("reset", () => {
    setTimeout(() => {
        const yyyy = selectedDate.getFullYear();
        const dateInput = document.getElementById("date");
        if (dateInput) {
            dateInput.value = "";
            dateInput.placeholder = `${yyyy}-MM-DD`;
            dateInput.min = `${yyyy}-01-01`;
            dateInput.max = `${yyyy}-12-31`;
        }
        document.getElementById("editId").value = "";
        document.querySelectorAll(".form input, .form textarea").forEach(el => el.classList.remove("invalid"));
    }, 0);
});

// Ações com confirmação
function confirmEdit(id) {
    openConfirm('Deseja editar este agendamento?', () => startEdit(id));
}

function confirmDelete(id) {
    openConfirm('Tem certeza que deseja excluir este agendamento?', () => deleteBooking(id));
}

// Editar
function startEdit(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    document.getElementById("editId").value = b.id;
    document.getElementById("name").value = b.name;
    document.getElementById("phone").value = digitsToPhoneMask(b.phone);
    document.getElementById("title").value = b.title;
    document.getElementById("date").value = b.date;
    document.getElementById("time").value = b.time;
    document.getElementById("notes").value = b.notes || "";
    showPage('agendaPage');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Excluir
function deleteBooking(id) {
    bookings = bookings.filter(b => b.id !== id);
    saveBookings();
    renderCalendar();
    renderDayList();
    if (!document.getElementById("listaPage").classList.contains("hidden")) {
        renderFullList();
    }
}

// =================== Lista completa ===================
function renderFullList() {
    const list = document.getElementById("fullAppointmentsList");
    if (!list) return;
    list.innerHTML = "";

    const sorted = bookings.slice().sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || "00:00"}`); // string com hora -> local
        const db = new Date(`${b.date}T${b.time || "00:00"}`);
        return da - db;
    });

    sorted.forEach((b) => {
        const li = document.createElement("li");
        li.className = "app-item";
        li.innerHTML = `
      <div class="app-left">
        <div class="app-time">${formatDateBR(b.date)} ${b.time || "--:--"}</div>
        <div class="app-meta">
          <strong>${escapeHTML(b.title)}</strong><br>
          ${escapeHTML(b.name)} - ${digitsToPhoneMask(b.phone)}<br>
          <small>${escapeHTML(b.notes)}</small>
        </div>
      </div>
      <div class="app-actions">
        <button class="icon-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${b.phone}')">
          <i class="fa-brands fa-whatsapp"></i>
        </button>
        <button class="icon-btn" title="Editar" onclick="confirmEdit('${b.id}')">✏️</button>
        <button class="icon-btn" title="Excluir" onclick="confirmDelete('${b.id}')">🗑</button>
      </div>
    `;
        list.appendChild(li);
    });
}

// =================== Financeiro ===================
const FIN_STORAGE_KEY = 'lt_financeiro_v1';
let finEntries = [];

function formatBRL(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function loadFinEntries() {
    try {
        const raw = localStorage.getItem(FIN_STORAGE_KEY);
        finEntries = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(finEntries)) finEntries = [];
    } catch {
        finEntries = [];
    }
}

function saveFinEntries() {
    localStorage.setItem(FIN_STORAGE_KEY, JSON.stringify(finEntries));
}

function showFinanceMessage(msg, isError = true) {
    const el = document.getElementById("financeMessage");
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.style.color = isError ? "#b00020" : "#1a6f3f";
    if (msg) setTimeout(() => {
        el.hidden = true;
        el.textContent = "";
    }, 4000);
}

const financeForm = document.getElementById("financeForm");
const finValorEl = document.getElementById("finValor");
const finCustoEl = document.getElementById("finCusto");
const finTotalPreviewEl = document.getElementById("finTotalPreview");

function updateFinTotalPreview() {
    const valor = parseFloat(finValorEl.value) || 0;
    const custo = parseFloat(finCustoEl.value) || 0;
    finTotalPreviewEl.textContent = formatBRL(valor - custo);
}

if (finValorEl) finValorEl.addEventListener("input", updateFinTotalPreview);
if (finCustoEl) finCustoEl.addEventListener("input", updateFinTotalPreview);

if (financeForm) {
    financeForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const tipo = document.getElementById("finTipo").value;
        const dataVal = document.getElementById("finDate").value;
        const descricao = capitalizeFirst(document.getElementById("finDesc").value.trim());
        const valor = parseFloat(document.getElementById("finValor").value) || 0;
        const custo = parseFloat(document.getElementById("finCusto").value) || 0;
        const duracao = document.getElementById("finDuracao").value.trim();

        if (!dataVal) {
            showFinanceMessage("Preencha a data.", true);
            return;
        }
        if (!descricao) {
            showFinanceMessage("Preencha a descrição.", true);
            return;
        }
        if (valor <= 0) {
            showFinanceMessage("Informe um valor maior que zero.", true);
            return;
        }

        const total = valor - custo;
        finEntries.push({ id: uid(), tipo, data: dataVal, descricao, valor, custo, duracao, total });
        saveFinEntries();
        renderFinanceiro();

        e.target.reset();
        updateFinTotalPreview();
        showFinanceMessage("Lançamento salvo com sucesso!", false);
    });

    financeForm.addEventListener("reset", () => {
        setTimeout(updateFinTotalPreview, 0);
    });
}

function confirmDeleteFinance(id) {
    openConfirm('Tem certeza que deseja excluir este lançamento?', () => deleteFinance(id));
}

function deleteFinance(id) {
    finEntries = finEntries.filter(f => f.id !== id);
    saveFinEntries();
    renderFinanceiro();
}

function renderFinanceiro() {
    const list = document.getElementById("financeList");
    if (!list) return;
    list.innerHTML = "";

    const sorted = finEntries.slice().sort((a, b) => a.data.localeCompare(b.data));

    let totalEntradas = 0;
    let totalSaidas = 0;

    sorted.forEach((f) => {
                if (f.tipo === "entrada") totalEntradas += f.total;
                else totalSaidas += f.total;

                const badgeClass = f.tipo === "entrada" ? "entrada" : "saida";
                const badgeText = f.tipo === "entrada" ? "Entrada" : "Saída";

                const li = document.createElement("li");
                li.className = "app-item";
                li.innerHTML = `
      <div class="app-left">
        <div class="app-time">${formatDateBR(f.data)}</div>
        <div class="app-meta">
          <span class="fin-badge ${badgeClass}">${badgeText}</span><strong>${escapeHTML(f.descricao)}</strong><br>
          Valor: ${formatBRL(f.valor)}${f.custo ? ` - Custo: ${formatBRL(f.custo)}` : ""}<br>
          <small>${f.duracao ? `Duração: ${escapeHTML(f.duracao)} — ` : ""}Total: ${formatBRL(f.total)}</small>
        </div>
      </div>
      <div class="app-actions">
        <button class="icon-btn" title="Excluir" onclick="confirmDeleteFinance('${f.id}')">🗑</button>
      </div>
    `;
        list.appendChild(li);
    });

    const totalEntradasEl = document.getElementById("finTotalEntradas");
    const totalSaidasEl = document.getElementById("finTotalSaidas");
    const saldoEl = document.getElementById("finSaldo");
    if (totalEntradasEl) totalEntradasEl.textContent = formatBRL(totalEntradas);
    if (totalSaidasEl) totalSaidasEl.textContent = formatBRL(totalSaidas);
    if (saldoEl) saldoEl.textContent = formatBRL(totalEntradas - totalSaidas);
}

function downloadFinancePDF() {
    if (!finEntries.length) {
        alert('Não há lançamentos para exportar.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Financeiro — Fort Marcações', 40, 40);

    doc.setFontSize(10);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${dd}/${mm}/${yyyy}`, 40, 58);

    const sorted = finEntries.slice().sort((a, b) => a.data.localeCompare(b.data));
    let totalEntradas = 0;
    let totalSaidas = 0;

    const rows = sorted.map(f => {
        if (f.tipo === "entrada") totalEntradas += f.total;
        else totalSaidas += f.total;
        return [
            formatDateBR(f.data),
            f.tipo === "entrada" ? "Entrada" : "Saída",
            f.descricao,
            formatBRL(f.valor),
            formatBRL(f.custo || 0),
            f.duracao || "",
            formatBRL(f.total)
        ];
    });

    const temaRgb = hexToRgbArray(getCurrentThemeColorHex());

    doc.autoTable({
        head: [
            ['Data', 'Tipo', 'Descrição', 'Valor', 'Custo', 'Duração', 'Total']
        ],
        body: rows,
        startY: 75,
        tableWidth: 'wrap',
        margin: { left: 40 },
        styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fillColor: temaRgb, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 246, 248] },
        didDrawPage: (data) => {
            const str = 'Fort Marcações';
            doc.setFontSize(9);
            doc.setTextColor(140);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 18);
        }
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total de Entradas: ${formatBRL(totalEntradas)}`, 40, finalY);
    doc.text(`Total de Saídas: ${formatBRL(totalSaidas)}`, 40, finalY + 16);
    doc.text(`Saldo: ${formatBRL(totalEntradas - totalSaidas)}`, 40, finalY + 32);

    doc.save('fort_marcacoes_financeiro.pdf');
}

// =================== PDF (jsPDF + AutoTable) ===================
function downloadPDF() {
    if (!bookings.length) {
        alert('Não há marcações para exportar.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Lista de Marcações — Fort Marcações', 40, 40);

    // Subtítulo com data da geração
    doc.setFontSize(10);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${dd}/${mm}/${yyyy}`, 40, 58);

    // Dados (ordenados por data e hora, igual à lista na tela)
    const rows = bookings
        .slice()
        .sort((a, b) => {
            const da = new Date(`${a.date}T${a.time || "00:00"}`);
            const db = new Date(`${b.date}T${b.time || "00:00"}`);
            return da - db;
        })
        .map(b => [
            formatDateBR(b.date),
            b.time || '',
            b.name,
            digitsToPhoneMask(b.phone),
            b.title,
            b.notes || ''
        ]);

    // Tabela
    const temaRgb = hexToRgbArray(getCurrentThemeColorHex());

    doc.autoTable({
        head: [
            ['Data', 'Hora', 'Cliente', 'Telefone', 'Serviço', 'Observações']
        ],
        body: rows,
        startY: 75,
        tableWidth: 'wrap',
        margin: { left: 40 },
        styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fillColor: temaRgb, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 246, 248] },
        columnStyles: {
            0: { cellWidth: 48 },
            1: { cellWidth: 36 },
            2: { cellWidth: 100 },
            3: { cellWidth: 86 },
            4: { cellWidth: 96 },
            5: { cellWidth: 130 }
        },
        didDrawPage: (data) => {
            const str = 'Fort Marcações';
            doc.setFontSize(9);
            doc.setTextColor(140);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 18);
        }
    });

    doc.save('fort_marcacoes.pdf');
}

// =================== PWA: Service Worker & Instalação ===================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
}

let deferredPrompt = null;

function setupInstallButton() {
    const btn = document.getElementById('downloadAppBtn');
    if (!btn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        btn.disabled = false;
        btn.title = 'Instalar o app';
    });

    btn.addEventListener('click', async() => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            btn.disabled = true;
            btn.title = 'App instalado';
        }
        deferredPrompt = null;
    });

    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    if (isStandalone) {
        btn.disabled = true;
        btn.title = 'App já instalado';
    }
}

// =================== Inicialização ===================
function init() {
    loadThemeColor();
    loadBookings();
    loadFinEntries();
    wireConfirmButtons();
    registerServiceWorker();
    setupInstallButton();

    // Placeholder do ano atual no campo data (sem dia/mês)
    const dateInput = document.getElementById("date");
    if (dateInput) {
        const yyyy = selectedDate.getFullYear();
        dateInput.placeholder = `${yyyy}-MM-DD`;
        dateInput.min = `${yyyy}-01-01`;
        dateInput.max = `${yyyy}-12-31`;
    }

    renderCalendar();
    selectDate(new Date()); // hoje
}
init();