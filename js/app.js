// ========== MAIN APP CONTROLLER ==========
let currentView = 'dashboard';
let editingInvoiceId = null;

// --- Navigation ---
function navigateTo(view, param) {
    currentView = view;
    editingInvoiceId = param || null;
    const content = document.getElementById('content');
    const titles = { dashboard: 'Dashboard', create: getSettings().language === 'id' ? 'Buat Invoice' : 'Create Invoice', history: getSettings().language === 'id' ? 'Riwayat' : 'History', clients: getSettings().language === 'id' ? 'Klien' : 'Clients', settings: getSettings().language === 'id' ? 'Pengaturan' : 'Settings' };
    document.getElementById('pageTitle').textContent = titles[view] || 'Dashboard';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));

    switch (view) {
        case 'dashboard': content.innerHTML = renderDashboard(); break;
        case 'create': content.innerHTML = renderCreateInvoice(editingInvoiceId); initItemValues(); recalc(); break;
        case 'history': content.innerHTML = renderHistory(); break;
        case 'clients': content.innerHTML = renderClients(); break;
        case 'settings': content.innerHTML = renderSettings(); break;
    }
    closeSidebar();
    window.scrollTo(0, 0);
}

function editInvoice(id) { navigateTo('create', id); }

// --- Sidebar ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('active');
}

// --- Item Rows ---
function addItemRow() {
    const tbody = document.getElementById('itemsBody');
    const idx = tbody.children.length;
    const serviceOpts = SERVICES.map(s => {
        const L = getSettings().language === 'id';
        return `<option value="${L ? s.nameId : s.name}">${L ? s.nameId : s.name}</option>`;
    }).join('');
    tbody.insertAdjacentHTML('beforeend', itemRowHTML({ service: '', description: '', unitPrice: '', quantity: 1 }, idx, serviceOpts));
    recalc();
}

function removeItemRow(btn) {
    const tbody = document.getElementById('itemsBody');
    if (tbody.children.length > 1) { btn.closest('tr').remove(); recalc(); }
}

function initItemValues() {
    if (!editingInvoiceId) return;
    const inv = getInvoices().find(i => i.id === editingInvoiceId);
    if (!inv) return;
    const rows = document.querySelectorAll('#itemsBody tr');
    inv.items.forEach((item, i) => {
        if (!rows[i]) return;
        const sel = rows[i].querySelector('.item-service');
        if (sel) { for (let o of sel.options) { if (o.value === item.service) o.selected = true; } }
        const desc = rows[i].querySelector('.item-desc'); if (desc) desc.value = item.description || '';
        const price = rows[i].querySelector('.item-price'); if (price) price.value = item.unitPrice || '';
        const qty = rows[i].querySelector('.item-qty'); if (qty) qty.value = item.quantity || 1;
    });
}

function recalc() {
    const rows = document.querySelectorAll('#itemsBody tr');
    let subtotal = 0;
    rows.forEach(row => {
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const qty = parseInt(row.querySelector('.item-qty')?.value) || 1;
        const total = price * qty;
        subtotal += total;
        const td = row.querySelector('.item-total');
        if (td) td.textContent = formatCurrency(total);
    });
    const discountPct = parseFloat(document.querySelector('[name="discount"]')?.value) || 0;
    const discountAmt = subtotal * (discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const payType = document.querySelector('[name="paymentType"]')?.value || 'dp';
    const dpAmt = payType === 'dp' ? afterDiscount * 0.5 : 0;
    const remaining = payType === 'dp' ? afterDiscount - dpAmt : 0;
    const L = getSettings().language === 'id';

    const sumDiv = document.getElementById('summaryCalc');
    if (sumDiv) {
        sumDiv.innerHTML = `
            <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
            ${discountPct > 0 ? `<div class="row"><span>${L ? 'Diskon' : 'Discount'} (${discountPct}%)</span><span>- ${formatCurrency(discountAmt)}</span></div>` : ''}
            <div class="row total"><span>Total</span><span>${formatCurrency(afterDiscount)}</span></div>
            ${payType === 'dp' ? `<div class="row dp"><span>DP 50%</span><span>${formatCurrency(dpAmt)}</span></div><div class="row remaining"><span>${L ? 'Sisa' : 'Remaining'}</span><span>${formatCurrency(remaining)}</span></div>` : ''}
        `;
    }
}

// --- Save Invoice ---
function saveInvoice(e, editId) {
    e.preventDefault();
    const f = e.target;
    const items = [];
    document.querySelectorAll('#itemsBody tr').forEach(row => {
        const service = row.querySelector('.item-service')?.value || '';
        const description = row.querySelector('.item-desc')?.value || '';
        const unitPrice = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const quantity = parseInt(row.querySelector('.item-qty')?.value) || 1;
        if (service || unitPrice > 0) items.push({ service, description, unitPrice, quantity, total: unitPrice * quantity });
    });
    if (items.length === 0) { showToast(getSettings().language === 'id' ? 'Tambahkan minimal 1 item' : 'Add at least 1 item', 'error'); return; }

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const discountPercent = parseFloat(f.discount.value) || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;
    const paymentType = f.paymentType.value;
    const dpAmount = paymentType === 'dp' ? total * 0.5 : 0;
    const remainingAmount = paymentType === 'dp' ? total - dpAmount : 0;

    const invoice = {
        id: editId || uid(),
        number: f.number.value,
        clientId: document.getElementById('clientSelect')?.value || '',
        clientName: f.clientName.value,
        clientCompany: f.clientCompany.value,
        clientAddress: f.clientAddress.value,
        clientEmail: f.clientEmail.value,
        clientPhone: f.clientPhone.value,
        items, subtotal, discountPercent, discountAmount, total,
        paymentType, dpAmount, remainingAmount,
        status: editId ? (getInvoices().find(i => i.id === editId)?.status || 'unpaid') : 'unpaid',
        dateCreated: f.dateCreated.value,
        dateDue: f.dateDue.value,
        invLang: f.invLang.value,
        notes: f.notes.value,
        createdAt: editId ? (getInvoices().find(i => i.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    const invoices = getInvoices();
    if (editId) {
        const idx = invoices.findIndex(i => i.id === editId);
        if (idx >= 0) invoices[idx] = invoice;
    } else {
        invoices.push(invoice);
    }
    saveInvoices(invoices);

    if (f.saveClient?.checked && invoice.clientName) {
        const clients = getClients();
        const existing = clients.find(c => c.name === invoice.clientName && c.company === invoice.clientCompany);
        if (!existing) {
            clients.push({ id: uid(), name: invoice.clientName, company: invoice.clientCompany, address: invoice.clientAddress, email: invoice.clientEmail, phone: invoice.clientPhone });
            saveClients(clients);
        }
    }

    showToast(getSettings().language === 'id' ? 'Invoice berhasil disimpan!' : 'Invoice saved!', 'success');
    previewInvoice(invoice.id);
}

// --- Invoice Status ---
function toggleStatus(id) {
    const invoices = getInvoices();
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    const cycle = inv.paymentType === 'dp' ? ['unpaid', 'dp_paid', 'paid'] : ['unpaid', 'paid'];
    const idx = cycle.indexOf(inv.status);
    inv.status = cycle[(idx + 1) % cycle.length];
    saveInvoices(invoices);
    navigateTo(currentView);
    showToast('Status updated', 'success');
}

function deleteInvoice(id) {
    const L = getSettings().language === 'id';
    if (!confirm(L ? 'Hapus invoice ini?' : 'Delete this invoice?')) return;
    saveInvoices(getInvoices().filter(i => i.id !== id));
    navigateTo(currentView);
    showToast(L ? 'Invoice dihapus' : 'Invoice deleted', 'info');
}

// --- Client Functions ---
function fillClient(clientId) {
    const c = getClients().find(cl => cl.id === clientId);
    const f = document.getElementById('invoiceForm');
    if (c && f) {
        f.clientName.value = c.name; f.clientCompany.value = c.company || '';
        f.clientAddress.value = c.address || ''; f.clientEmail.value = c.email || '';
        f.clientPhone.value = c.phone || '';
    }
}

function showAddClient() {
    const L = getSettings().language === 'id';
    document.getElementById('clientFormArea').innerHTML = `
        <div class="card mb-16"><div class="card-body"><div class="form-grid">
            <div class="form-group"><label class="form-label">${L ? 'Nama' : 'Name'}</label><input class="form-input" id="newClientName" required></div>
            <div class="form-group"><label class="form-label">${L ? 'Perusahaan' : 'Company'}</label><input class="form-input" id="newClientCompany"></div>
            <div class="form-group full"><label class="form-label">${L ? 'Alamat' : 'Address'}</label><input class="form-input" id="newClientAddress"></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="newClientEmail"></div>
            <div class="form-group"><label class="form-label">${L ? 'Telepon' : 'Phone'}</label><input class="form-input" id="newClientPhone"></div>
        </div><div class="btn-group mt-16">
            <button class="btn btn-primary btn-sm" onclick="addClientSubmit()">${L ? 'Simpan' : 'Save'}</button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('clientFormArea').innerHTML=''">${L ? 'Batal' : 'Cancel'}</button>
        </div></div></div>`;
}

function addClientSubmit() {
    const name = document.getElementById('newClientName').value;
    if (!name) return;
    const clients = getClients();
    clients.push({ id: uid(), name, company: document.getElementById('newClientCompany').value, address: document.getElementById('newClientAddress').value, email: document.getElementById('newClientEmail').value, phone: document.getElementById('newClientPhone').value });
    saveClients(clients);
    navigateTo('clients');
    showToast(getSettings().language === 'id' ? 'Klien ditambahkan' : 'Client added', 'success');
}

function editClient(id) {
    const c = getClients().find(cl => cl.id === id);
    if (!c) return;
    const L = getSettings().language === 'id';
    document.getElementById('clientFormArea').innerHTML = `
        <div class="card mb-16"><div class="card-header"><h2>${L ? 'Edit Klien' : 'Edit Client'}</h2></div><div class="card-body"><div class="form-grid">
            <div class="form-group"><label class="form-label">${L ? 'Nama' : 'Name'}</label><input class="form-input" id="editClientName" value="${c.name}"></div>
            <div class="form-group"><label class="form-label">${L ? 'Perusahaan' : 'Company'}</label><input class="form-input" id="editClientCompany" value="${c.company || ''}"></div>
            <div class="form-group full"><label class="form-label">${L ? 'Alamat' : 'Address'}</label><input class="form-input" id="editClientAddress" value="${c.address || ''}"></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="editClientEmail" value="${c.email || ''}"></div>
            <div class="form-group"><label class="form-label">${L ? 'Telepon' : 'Phone'}</label><input class="form-input" id="editClientPhone" value="${c.phone || ''}"></div>
        </div><div class="btn-group mt-16">
            <button class="btn btn-primary btn-sm" onclick="updateClient('${id}')">${L ? 'Update' : 'Update'}</button>
            <button class="btn btn-outline btn-sm" onclick="navigateTo('clients')">${L ? 'Batal' : 'Cancel'}</button>
        </div></div></div>`;
    window.scrollTo(0, 0);
}

function updateClient(id) {
    const clients = getClients();
    const c = clients.find(cl => cl.id === id);
    if (!c) return;
    c.name = document.getElementById('editClientName').value;
    c.company = document.getElementById('editClientCompany').value;
    c.address = document.getElementById('editClientAddress').value;
    c.email = document.getElementById('editClientEmail').value;
    c.phone = document.getElementById('editClientPhone').value;
    saveClients(clients);
    navigateTo('clients');
    showToast('Client updated', 'success');
}

function deleteClient(id) {
    if (!confirm(getSettings().language === 'id' ? 'Hapus klien ini?' : 'Delete this client?')) return;
    saveClients(getClients().filter(c => c.id !== id));
    navigateTo('clients');
}

// --- Settings ---
function saveSettingsForm(e) {
    e.preventDefault();
    const f = e.target;
    const s = getSettings();
    s.name = f.name.value; s.role = f.role.value; s.address = f.address.value;
    s.email = f.email.value; s.phone = f.phone.value;
    s.bankName = f.bankName.value; s.bankAccount = f.bankAccount.value; s.bankHolder = f.bankHolder.value;
    s.language = f.language.value;
    s.termsId = f.termsId.value.split('\n').filter(l => l.trim());
    s.termsEn = f.termsEn.value.split('\n').filter(l => l.trim());
    saveSettings(s);
    document.getElementById('langLabel').textContent = s.language === 'id' ? 'EN' : 'ID';
    navigateTo('settings');
    showToast(s.language === 'id' ? 'Pengaturan disimpan!' : 'Settings saved!', 'success');
}

// --- Toast ---
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Preview & PDF ---
function previewInvoice(id) {
    const inv = getInvoices().find(i => i.id === id);
    if (!inv) return;
    const s = getSettings();
    const L = (inv.invLang || 'id') === 'id';
    const terms = L ? (s.termsId || []) : (s.termsEn || []);

    const html = `<div class="invoice-template" id="invoicePDF">
        <div class="inv-header">
            <div class="inv-brand">
                <h1>${s.name}</h1>
                <p>${s.role || 'Graphic Designer'}<br>${s.address || ''}<br>${s.phone || ''} • ${s.email || ''}</p>
            </div>
            <div class="inv-meta">
                <div class="inv-title">INVOICE</div>
                <div class="inv-number">${inv.number}</div>
                <div class="inv-date">${L ? 'Tanggal' : 'Date'}: ${formatDate(inv.dateCreated)}<br>${L ? 'Jatuh Tempo' : 'Due'}: ${formatDate(inv.dateDue)}</div>
            </div>
        </div>
        <div class="inv-parties">
            <div><div class="inv-party-label">${L ? 'Dari' : 'From'}</div>
                <div class="inv-party-name">${s.name}</div>
                <div class="inv-party-detail">${s.address || ''}<br>${s.phone || ''}<br>${s.email || ''}</div>
            </div>
            <div><div class="inv-party-label">${L ? 'Kepada' : 'Bill To'}</div>
                <div class="inv-party-name">${inv.clientName}</div>
                <div class="inv-party-detail">${inv.clientCompany ? inv.clientCompany + '<br>' : ''}${inv.clientAddress || ''}<br>${inv.clientPhone || ''}<br>${inv.clientEmail || ''}</div>
            </div>
        </div>
        <table class="inv-table">
            <thead><tr><th>${L ? 'Layanan' : 'Service'}</th><th>${L ? 'Deskripsi' : 'Description'}</th><th>${L ? 'Harga' : 'Price'}</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>${inv.items.map(item => `<tr>
                <td><div class="item-name">${item.service}</div></td>
                <td>${item.description || '-'}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.total)}</td>
            </tr>`).join('')}</tbody>
        </table>
        <div class="inv-summary"><div class="inv-summary-table">
            <div class="inv-summary-row"><span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span></div>
            ${inv.discountPercent > 0 ? `<div class="inv-summary-row"><span>${L ? 'Diskon' : 'Discount'} (${inv.discountPercent}%)</span><span>- ${formatCurrency(inv.discountAmount)}</span></div>` : ''}
            <div class="inv-summary-row total"><span>Total</span><span>${formatCurrency(inv.total)}</span></div>
            ${inv.paymentType === 'dp' ? `
                <div class="inv-summary-row dp"><span>Down Payment (50%)</span><span>${formatCurrency(inv.dpAmount)}</span></div>
                <div class="inv-summary-row remaining"><span>${L ? 'Sisa Pembayaran' : 'Remaining'}</span><span>${formatCurrency(inv.remainingAmount)}</span></div>
            ` : ''}
        </div></div>
        <div class="inv-payment">
            <h3>${L ? 'Metode Pembayaran' : 'Payment Method'}</h3>
            <p><strong>Bank ${s.bankName || 'BCA'}</strong><br>${L ? 'No. Rekening' : 'Account'}: ${s.bankAccount || '-'}<br>${L ? 'Atas Nama' : 'Name'}: ${s.bankHolder || '-'}</p>
        </div>
        ${inv.notes ? `<div class="inv-payment"><h3>${L ? 'Catatan' : 'Notes'}</h3><p>${inv.notes}</p></div>` : ''}
        <div class="inv-terms">
            <h3>Terms & Conditions</h3>
            <ol>${terms.map(t => `<li>${t}</li>`).join('')}</ol>
        </div>
        <div class="inv-footer">
            <div class="inv-footer-contact">${s.phone || ''}<br>${s.email || ''}<br>${s.address || ''}</div>
            <div class="inv-footer-sig"><div class="sig-line"></div><div class="sig-name">${s.name}</div><div class="sig-role">${s.role || 'Graphic Designer'}</div></div>
        </div>
    </div>`;

    document.getElementById('invoicePreviewBody').innerHTML = html;
    document.getElementById('previewModal').classList.add('active');

    document.getElementById('downloadPdf').onclick = () => generatePDF(inv);
    document.getElementById('printInvoice').onclick = () => { window.print(); };
}

function generatePDF(inv) {
    const el = document.getElementById('invoicePDF');
    if (!el) return;

    // Clone the invoice template outside the modal for proper rendering
    const clone = el.cloneNode(true);
    clone.id = 'invoicePDFClone';
    clone.style.cssText = 'position:fixed;top:0;left:0;width:800px;z-index:-9999;background:#fff;padding:40px;';
    document.body.appendChild(clone);

    const opt = {
        margin: [0.3, 0.4, 0.3, 0.4],
        filename: `${inv.number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save().then(() => {
        clone.remove();
        showToast(getSettings().language === 'id' ? 'PDF berhasil didownload!' : 'PDF downloaded!', 'success');
    }).catch(() => {
        clone.remove();
        showToast('PDF generation failed', 'error');
    });
}

// --- Language Toggle ---
function toggleLanguage() {
    const s = getSettings();
    s.language = s.language === 'id' ? 'en' : 'id';
    saveSettings(s);
    document.getElementById('langLabel').textContent = s.language === 'id' ? 'EN' : 'ID';
    navigateTo(currentView);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('hamburger').addEventListener('click', toggleSidebar);
    document.getElementById('mobileOverlay').addEventListener('click', closeSidebar);
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    document.getElementById('closePreview').addEventListener('click', () => document.getElementById('previewModal').classList.remove('active'));
    document.getElementById('modalOverlay').addEventListener('click', () => document.getElementById('previewModal').classList.remove('active'));

    document.getElementById('sidebarNav').addEventListener('click', e => {
        const item = e.target.closest('.nav-item');
        if (item) { e.preventDefault(); navigateTo(item.dataset.view); }
    });

    const s = getSettings();
    document.getElementById('langLabel').textContent = s.language === 'id' ? 'EN' : 'ID';
    navigateTo('dashboard');
});
