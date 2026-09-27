const STALLED_DAYS = 14;
const OVERDUE_DAYS = 30;

let companies = [];

const $ = (id) => document.getElementById(id);

function daysSince(dateString) {
  const shipped = new Date(dateString);
  const now = new Date();
  return Math.floor((now - shipped) / (1000 * 60 * 60 * 24));
}

async function fetchCompanies() {
  const res = await fetch('/api/companies');
  if (!res.ok) return;
  companies = await res.json();
  render();
}

function render() {
  const total = companies.length;
  const received = companies.filter((c) => c.received).length;
  const blacklisted = companies.filter((c) => c.blacklisted).length;
  const pending = companies.filter((c) => !c.received).length;
  const stalled = companies.filter((c) => !c.received && daysSince(c.shipDate) > STALLED_DAYS);
  const overdue = companies.filter((c) => !c.received && daysSince(c.shipDate) > OVERDUE_DAYS);

  $('stat-total').textContent = total;
  $('stat-pending').textContent = pending;
  $('stat-stalled').textContent = stalled.length;
  $('stat-received').textContent = received;
  $('stat-blacklisted').textContent = blacklisted;

  $('stalled-alert-banner').classList.toggle('hidden', stalled.length === 0);
  $('alert-banner').classList.toggle('hidden', overdue.length === 0);

  $('record-count').textContent = `${total} record${total === 1 ? '' : 's'}`;
  $('empty-state').classList.toggle('hidden', total !== 0);

  const tbody = $('records-body');
  tbody.innerHTML = companies
    .slice()
    .reverse()
    .map((c) => {
      const days = daysSince(c.shipDate);
      let statusBadge;
      if (c.blacklisted) {
        statusBadge = '<span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">Blacklisted</span>';
      } else if (c.received) {
        statusBadge = '<span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Arrived</span>';
      } else if (days > OVERDUE_DAYS) {
        statusBadge = '<span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">Overdue</span>';
      } else if (days > STALLED_DAYS) {
        statusBadge = '<span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">Stalled</span>';
      } else {
        statusBadge = '<span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">In Transit</span>';
      }

      return `
        <tr class="hover:bg-slate-50">
          <td class="px-5 py-3 font-medium text-slate-800">${escapeHtml(c.name)}</td>
          <td class="px-5 py-3 text-slate-600">${escapeHtml(c.item)}</td>
          <td class="px-5 py-3 text-slate-600">${escapeHtml(c.category)}</td>
          <td class="px-5 py-3 text-slate-600">${escapeHtml(c.carrier || '—')}</td>
          <td class="px-5 py-3 text-slate-600">${days}d</td>
          <td class="px-5 py-3">${statusBadge}</td>
          <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
            ${c.received
              ? ''
              : `<button title="Mark received" onclick="markReceived(${c.id})" class="text-emerald-600 hover:text-emerald-800"><i class="fa-solid fa-circle-check"></i></button>`}
            <button title="${c.blacklisted ? 'Remove from blacklist' : 'Blacklist'}" onclick="toggleBlacklist(${c.id}, ${!c.blacklisted})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-ban"></i></button>
            <button title="Delete" onclick="deleteCompany(${c.id})" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function markReceived(id) {
  await fetch(`/api/companies?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  });
  await fetchCompanies();
}

async function toggleBlacklist(id, value) {
  await fetch(`/api/companies?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blacklisted: value }),
  });
  await fetchCompanies();
}

async function deleteCompany(id) {
  if (!confirm('Delete this record?')) return;
  await fetch(`/api/companies?id=${id}`, { method: 'DELETE' });
  await fetchCompanies();
}

function openPrivacyModal() {
  $('privacy-modal').classList.remove('hidden');
}

function closePrivacyModal() {
  $('privacy-modal').classList.add('hidden');
}

async function triggerAiGeneration() {
  const name = $('comp-name').value.trim();
  const item = $('comp-item').value.trim();
  const btn = $('ai-generate-btn');

  if (!name || !item) {
    alert('Enter a company name and sample item first, then click AI Generate to get a suggested category and note.');
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Generating...</span>';

  try {
    const res = await fetch('/api/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, item }),
    });

    if (!res.ok) throw new Error('AI generation failed');
    const { category, notes } = await res.json();

    if (category) $('comp-category').value = category;
    if (notes) $('comp-notes').value = notes;
  } catch (err) {
    alert('AI generation failed. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function exportToExcel() {
  const rows = companies.map((c) => ({
    Company: c.name,
    Item: c.item,
    Category: c.category,
    Carrier: c.carrier || '',
    'Ship Date': new Date(c.shipDate).toISOString().slice(0, 10),
    'Days In Transit': daysSince(c.shipDate),
    Received: c.received ? 'Yes' : 'No',
    Blacklisted: c.blacklisted ? 'Yes' : 'No',
    Notes: c.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shipments');
  XLSX.writeFile(workbook, 'freebie-tingz-shipments.xlsx');
}

$('company-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = $('form-error');
  errorEl.classList.add('hidden');

  const payload = {
    name: $('comp-name').value.trim(),
    item: $('comp-item').value.trim(),
    category: $('comp-category').value,
    carrier: $('comp-carrier').value,
    shipDate: $('comp-ship-date').value,
    notes: $('comp-notes').value.trim(),
  };

  const res = await fetch('/api/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Failed to add entry' }));
    errorEl.textContent = error;
    errorEl.classList.remove('hidden');
    return;
  }

  e.target.reset();
  await fetchCompanies();
});

fetchCompanies();
