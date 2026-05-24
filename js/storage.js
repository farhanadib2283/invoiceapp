// ========== STORAGE & DATA LAYER ==========
const KEYS = { invoices: 'inv_invoices', clients: 'inv_clients', settings: 'inv_settings', counter: 'inv_counter' };

const DEFAULT_SETTINGS = {
    name: 'Farhan Adib Suryo', role: 'Graphic Designer',
    address: '', phone: '', email: '',
    bankName: 'BCA', bankAccount: '', bankHolder: '',
    language: 'id',
    termsId: [
        'DP 50% dibayarkan sebelum pengerjaan dimulai, pelunasan setelah desain final disetujui.',
        'Pembayaran via transfer bank BCA ke rekening yang tertera pada invoice.',
        'Invoice harus dilunasi dalam 14 hari setelah tanggal penerbitan.',
        'Revisi desain maksimal 2x, revisi tambahan dikenakan biaya tambahan.',
        'File desain final (high resolution) dikirim setelah pembayaran lunas.',
        'Hak cipta desain berpindah ke klien setelah pembayaran lunas.',
        'Pembatalan setelah pengerjaan dimulai tidak mendapat pengembalian DP.',
        'Perubahan scope pekerjaan dapat dikenakan biaya tambahan.'
    ],
    termsEn: [
        'A 50% Down Payment must be made before work begins; remaining balance is due upon final approval.',
        'Payment via bank transfer to the BCA account listed on the invoice.',
        'Invoice must be paid within 14 days of the issue date.',
        'Up to 2 design revisions included. Additional revisions may incur extra charges.',
        'Final design files (high resolution) delivered after full payment.',
        'Design copyright transfers to client upon complete payment.',
        'Cancellation after work begins is non-refundable for the Down Payment.',
        'Changes to scope may incur additional charges.'
    ]
};

const SERVICES = [
    { id: 'logo', name: 'Logo Design', nameId: 'Desain Logo' },
    { id: 'brand', name: 'Brand Identity', nameId: 'Identitas Brand' },
    { id: 'social', name: 'Social Media Design', nameId: 'Desain Media Sosial' },
    { id: 'packaging', name: 'Packaging Design', nameId: 'Desain Kemasan' },
    { id: 'illustration', name: 'Illustration', nameId: 'Ilustrasi' },
    { id: 'brochure', name: 'Brochure Design', nameId: 'Desain Brosur' },
    { id: 'print', name: 'Print Design', nameId: 'Desain Cetak' }
];

function load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function getInvoices() { return load(KEYS.invoices) || []; }
function saveInvoices(list) { save(KEYS.invoices, list); }
function getClients() { return load(KEYS.clients) || []; }
function saveClients(list) { save(KEYS.clients, list); }
function getSettings() { return { ...DEFAULT_SETTINGS, ...(load(KEYS.settings) || {}) }; }
function saveSettings(s) { save(KEYS.settings, s); }

function getNextInvoiceNumber() {
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${y}-${m}-`;
    const invoices = getInvoices();
    const existing = invoices.filter(i => i.number.startsWith(prefix));
    const max = existing.reduce((mx, i) => {
        const n = parseInt(i.number.split('-').pop());
        return n > mx ? n : mx;
    }, 0);
    return prefix + String(max + 1).padStart(3, '0');
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

function formatCurrency(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
