// ========== VIEW RENDERERS ==========
function renderDashboard() {
    const invoices = getInvoices();
    const totalRev = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const pending = invoices.filter(i => i.status !== 'paid');
    const pendingAmt = pending.reduce((s, i) => s + (i.status === 'dp_paid' ? i.remainingAmount : i.total), 0);
    const lang = getSettings().language;
    const L = lang === 'id';

    return `
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">${L ? 'Total Invoice' : 'Total Invoices'}</div><div class="stat-value">${invoices.length}</div></div>
        <div class="stat-card"><div class="stat-label">${L ? 'Pendapatan' : 'Revenue'}</div><div class="stat-value gold">${formatCurrency(totalRev)}</div></div>
        <div class="stat-card"><div class="stat-label">${L ? 'Belum Lunas' : 'Pending'}</div><div class="stat-value">${pending.length}</div><div class="stat-sub">${formatCurrency(pendingAmt)}</div></div>
        <div class="stat-card"><div class="stat-label">${L ? 'Klien' : 'Clients'}</div><div class="stat-value">${getClients().length}</div></div>
    </div>
    <div class="card">
        <div class="card-header"><h2>${L ? 'Invoice Terbaru' : 'Recent Invoices'}</h2>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">+ ${L ? 'Buat Invoice' : 'New Invoice'}</button>
        </div>
        <div class="card-body"><div class="table-wrap"><table>
            <thead><tr><th>${L ? 'Nomor' : 'Number'}</th><th>${L ? 'Klien' : 'Client'}</th><th>${L ? 'Tanggal' : 'Date'}</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${invoices.length === 0 ? `<tr><td colspan="6" class="table-empty">${L ? 'Belum ada invoice' : 'No invoices yet'}</td></tr>` :
            invoices.slice().reverse().slice(0, 10).map(inv => `<tr>
                <td><strong>${inv.number}</strong></td>
                <td>${inv.clientName}</td>
                <td>${formatDate(inv.dateCreated)}</td>
                <td>${formatCurrency(inv.total)}</td>
                <td>${statusBadge(inv.status, lang)}</td>
                <td><div class="btn-group">
                    <button class="btn-icon" onclick="previewInvoice('${inv.id}')" title="Preview">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon" onclick="editInvoice('${inv.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="toggleStatus('${inv.id}')" title="Toggle Status">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                </div></td>
            </tr>`).join('')}</tbody>
        </table></div></div>
    </div>`;
}

function statusBadge(status, lang) {
    const L = lang === 'id';
    const map = {
        unpaid: { cls: 'badge-unpaid', t: L ? 'Belum Bayar' : 'Unpaid' },
        dp_paid: { cls: 'badge-dp', t: L ? 'DP Dibayar' : 'DP Paid' },
        paid: { cls: 'badge-paid', t: L ? 'Lunas' : 'Paid' }
    };
    const b = map[status] || map.unpaid;
    return `<span class="badge ${b.cls}">${b.t}</span>`;
}

function renderCreateInvoice(editId) {
    const settings = getSettings();
    const clients = getClients();
    const L = settings.language === 'id';
    let inv = null;
    if (editId) {
        inv = getInvoices().find(i => i.id === editId);
    }
    const invNumber = inv ? inv.number : getNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const items = inv ? inv.items : [{ service: '', description: '', unitPrice: '', quantity: 1 }];

    const serviceOpts = SERVICES.map(s =>
        `<option value="${L ? s.nameId : s.name}">${L ? s.nameId : s.name}</option>`
    ).join('');

    const clientOpts = clients.map(c =>
        `<option value="${c.id}" ${inv && inv.clientId === c.id ? 'selected' : ''}>${c.name}${c.company ? ' - ' + c.company : ''}</option>`
    ).join('');

    return `
    <form id="invoiceForm" onsubmit="saveInvoice(event, '${editId || ''}')">
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Detail Invoice' : 'Invoice Details'}</h2></div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">${L ? 'Nomor Invoice' : 'Invoice Number'}</label>
                        <input class="form-input" name="number" value="${invNumber}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${L ? 'Tanggal' : 'Date'}</label>
                        <input type="date" class="form-input" name="dateCreated" value="${inv ? inv.dateCreated : today}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${L ? 'Jatuh Tempo' : 'Due Date'}</label>
                        <input type="date" class="form-input" name="dateDue" value="${inv ? inv.dateDue : due}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${L ? 'Bahasa Invoice' : 'Invoice Language'}</label>
                        <select class="form-select" name="invLang">
                            <option value="id" ${(!inv || inv.invLang === 'id') ? 'selected' : ''}>Bahasa Indonesia</option>
                            <option value="en" ${inv && inv.invLang === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Data Klien' : 'Client Info'}</h2></div>
            <div class="card-body">
                <div class="form-group mb-16">
                    <label class="form-label">${L ? 'Pilih Klien Tersimpan' : 'Select Saved Client'}</label>
                    <select class="form-select" id="clientSelect" onchange="fillClient(this.value)">
                        <option value="">${L ? '— Klien Baru —' : '— New Client —'}</option>
                        ${clientOpts}
                    </select>
                </div>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">${L ? 'Nama Klien' : 'Client Name'}</label>
                        <input class="form-input" name="clientName" value="${inv ? inv.clientName : ''}" required></div>
                    <div class="form-group"><label class="form-label">${L ? 'Perusahaan' : 'Company'}</label>
                        <input class="form-input" name="clientCompany" value="${inv ? inv.clientCompany : ''}"></div>
                    <div class="form-group full"><label class="form-label">${L ? 'Alamat' : 'Address'}</label>
                        <input class="form-input" name="clientAddress" value="${inv ? inv.clientAddress : ''}"></div>
                    <div class="form-group"><label class="form-label">Email</label>
                        <input type="email" class="form-input" name="clientEmail" value="${inv ? inv.clientEmail : ''}"></div>
                    <div class="form-group"><label class="form-label">${L ? 'Telepon' : 'Phone'}</label>
                        <input class="form-input" name="clientPhone" value="${inv ? inv.clientPhone : ''}"></div>
                </div>
                <label class="mt-16" style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
                    <input type="checkbox" name="saveClient" ${!editId ? 'checked' : ''}> ${L ? 'Simpan klien untuk dipakai ulang' : 'Save client for reuse'}
                </label>
            </div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Item / Layanan' : 'Items / Services'}</h2>
                <button type="button" class="btn btn-secondary btn-sm" onclick="addItemRow()">+ ${L ? 'Tambah Item' : 'Add Item'}</button>
            </div>
            <div class="card-body">
                <div class="items-table"><table>
                    <thead><tr>
                        <th style="width:30%">${L ? 'Layanan' : 'Service'}</th>
                        <th style="width:25%">${L ? 'Deskripsi' : 'Description'}</th>
                        <th style="width:18%">${L ? 'Harga Satuan' : 'Unit Price'}</th>
                        <th style="width:10%">${L ? 'Qty' : 'Qty'}</th>
                        <th style="width:15%">Total</th>
                        <th style="width:2%"></th>
                    </tr></thead>
                    <tbody id="itemsBody">
                        ${items.map((item, idx) => itemRowHTML(item, idx, serviceOpts)).join('')}
                    </tbody>
                </table></div>
                <div class="invoice-summary">
                    <div class="summary-table" id="summaryCalc"></div>
                </div>
            </div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Pembayaran' : 'Payment'}</h2></div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">${L ? 'Tipe Pembayaran' : 'Payment Type'}</label>
                        <select class="form-select" name="paymentType" onchange="recalc()">
                            <option value="full" ${inv && inv.paymentType === 'full' ? 'selected' : ''}>${L ? 'Lunas Langsung' : 'Full Payment'}</option>
                            <option value="dp" ${(!inv || inv.paymentType === 'dp') ? 'selected' : ''}>Down Payment (DP 50%)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${L ? 'Diskon (%)' : 'Discount (%)'}</label>
                        <input type="number" class="form-input" name="discount" value="${inv ? inv.discountPercent || 0 : 0}" min="0" max="100" onchange="recalc()" oninput="recalc()">
                    </div>
                    <div class="form-group full">
                        <label class="form-label">${L ? 'Catatan' : 'Notes'}</label>
                        <textarea class="form-textarea" name="notes" placeholder="${L ? 'Catatan tambahan...' : 'Additional notes...'}">${inv ? inv.notes || '' : ''}</textarea>
                    </div>
                </div>
            </div>
        </div>
        <div class="btn-group" style="justify-content:flex-end">
            <button type="button" class="btn btn-outline" onclick="navigateTo('dashboard')">${L ? 'Batal' : 'Cancel'}</button>
            <button type="submit" class="btn btn-primary">${L ? 'Simpan & Preview' : 'Save & Preview'}</button>
        </div>
    </form>`;
}

function itemRowHTML(item, idx, serviceOpts) {
    return `<tr data-idx="${idx}">
        <td><select class="form-select item-service" onchange="recalc()">
            <option value="">— Pilih —</option>${serviceOpts}
        </select></td>
        <td><input class="form-input item-desc" value="${item.description || ''}" placeholder="Detail..."></td>
        <td><input type="number" class="form-input item-price" value="${item.unitPrice || ''}" min="0" placeholder="0" oninput="recalc()"></td>
        <td><input type="number" class="form-input item-qty" value="${item.quantity || 1}" min="1" oninput="recalc()"></td>
        <td class="item-total text-right" style="font-weight:600">Rp 0</td>
        <td><button type="button" class="remove-row" onclick="removeItemRow(this)">&times;</button></td>
    </tr>`;
}

function renderHistory() {
    const invoices = getInvoices();
    const L = getSettings().language === 'id';
    return `
    <div class="card">
        <div class="card-header"><h2>${L ? 'Semua Invoice' : 'All Invoices'}</h2>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">+ ${L ? 'Buat Baru' : 'New'}</button></div>
        <div class="card-body"><div class="table-wrap"><table>
            <thead><tr><th>${L ? 'Nomor' : 'Number'}</th><th>${L ? 'Klien' : 'Client'}</th><th>${L ? 'Tanggal' : 'Date'}</th><th>${L ? 'Jatuh Tempo' : 'Due'}</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${invoices.length === 0 ? `<tr><td colspan="7" class="table-empty">${L ? 'Belum ada invoice' : 'No invoices'}</td></tr>` :
            invoices.slice().reverse().map(inv => `<tr>
                <td><strong>${inv.number}</strong></td><td>${inv.clientName}</td>
                <td>${formatDate(inv.dateCreated)}</td><td>${formatDate(inv.dateDue)}</td>
                <td>${formatCurrency(inv.total)}</td><td>${statusBadge(inv.status, getSettings().language)}</td>
                <td><div class="btn-group">
                    <button class="btn-icon" onclick="previewInvoice('${inv.id}')" title="Preview"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    <button class="btn-icon" onclick="editInvoice('${inv.id}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-icon" onclick="deleteInvoice('${inv.id}')" title="Delete" style="color:var(--danger)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div></td>
            </tr>`).join('')}</tbody>
        </table></div></div>
    </div>`;
}

function renderClients() {
    const clients = getClients();
    const L = getSettings().language === 'id';
    return `
    <div class="flex-between mb-16">
        <h2 style="font-size:15px">${clients.length} ${L ? 'Klien Tersimpan' : 'Saved Clients'}</h2>
        <button class="btn btn-primary btn-sm" onclick="showAddClient()">+ ${L ? 'Tambah Klien' : 'Add Client'}</button>
    </div>
    <div id="clientFormArea"></div>
    <div class="client-grid">${clients.length === 0 ?
        `<div class="empty-state"><h3>${L ? 'Belum ada klien' : 'No clients yet'}</h3><p>${L ? 'Klien akan tersimpan otomatis saat membuat invoice' : 'Clients are saved automatically when creating invoices'}</p></div>` :
        clients.map(c => `<div class="client-card">
            <div class="client-card-name">${c.name}</div>
            <div class="client-card-company">${c.company || '-'}</div>
            <div class="client-card-info">${c.address ? c.address + '<br>' : ''}${c.email || ''}${c.phone ? ' • ' + c.phone : ''}</div>
            <div class="client-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editClient('${c.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">${L ? 'Hapus' : 'Delete'}</button>
            </div>
        </div>`).join('')}
    </div>`;
}

function renderSettings() {
    const s = getSettings();
    const L = s.language === 'id';
    return `
    <form id="settingsForm" onsubmit="saveSettingsForm(event)">
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Informasi Pribadi' : 'Personal Info'}</h2></div>
            <div class="card-body"><div class="form-grid">
                <div class="form-group"><label class="form-label">${L ? 'Nama Lengkap' : 'Full Name'}</label><input class="form-input" name="name" value="${s.name}" required></div>
                <div class="form-group"><label class="form-label">${L ? 'Profesi' : 'Role'}</label><input class="form-input" name="role" value="${s.role || 'Graphic Designer'}"></div>
                <div class="form-group full"><label class="form-label">${L ? 'Alamat' : 'Address'}</label><input class="form-input" name="address" value="${s.address}"></div>
                <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" value="${s.email}"></div>
                <div class="form-group"><label class="form-label">${L ? 'Telepon' : 'Phone'}</label><input class="form-input" name="phone" value="${s.phone}"></div>
            </div></div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Detail Bank' : 'Bank Details'}</h2></div>
            <div class="card-body"><div class="form-grid">
                <div class="form-group"><label class="form-label">${L ? 'Nama Bank' : 'Bank Name'}</label><input class="form-input" name="bankName" value="${s.bankName}"></div>
                <div class="form-group"><label class="form-label">${L ? 'Nomor Rekening' : 'Account Number'}</label><input class="form-input" name="bankAccount" value="${s.bankAccount}"></div>
                <div class="form-group"><label class="form-label">${L ? 'Atas Nama' : 'Account Holder'}</label><input class="form-input" name="bankHolder" value="${s.bankHolder}"></div>
            </div></div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>${L ? 'Bahasa Aplikasi' : 'App Language'}</h2></div>
            <div class="card-body">
                <div class="form-group"><label class="form-label">${L ? 'Bahasa' : 'Language'}</label>
                    <select class="form-select" name="language"><option value="id" ${s.language === 'id' ? 'selected' : ''}>Bahasa Indonesia</option><option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option></select>
                </div>
            </div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>Terms & Conditions (ID)</h2></div>
            <div class="card-body"><textarea class="form-textarea" name="termsId" rows="8">${(s.termsId || []).join('\n')}</textarea></div>
        </div>
        <div class="card mb-16">
            <div class="card-header"><h2>Terms & Conditions (EN)</h2></div>
            <div class="card-body"><textarea class="form-textarea" name="termsEn" rows="8">${(s.termsEn || []).join('\n')}</textarea></div>
        </div>
        <div class="btn-group" style="justify-content:flex-end">
            <button type="submit" class="btn btn-primary">${L ? 'Simpan Pengaturan' : 'Save Settings'}</button>
        </div>
    </form>`;
}
