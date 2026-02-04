const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_Nyv1MuZFVPAR911MR-UTYIyiFmMlCwDYyGypn-AlDOrvLSf8rZBblxHckqbMIvG2/exec";
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('email').addEventListener('keydown', (e) => {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById('password').focus(); }
    });

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('att-date');
    if(dateInput) dateInput.value = today;
    
    const saved = localStorage.getItem('seds_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        initApp();
    }
});

let currentUser = null;
let teamMembers = [];
let adminData = [];

async function handleLogin() {
    // This now gets whatever is in the first box (Roll or Email)
    const usernameInput = document.getElementById('email').value; 
    const pass = document.getElementById('password').value;
    const btn = document.querySelector('.btn-primary');
    const err = document.getElementById('error-msg');

    if(!usernameInput || !pass) return;
    btn.innerText = "Authenticating..."; btn.disabled = true; err.innerText = "";

    try {
        const res = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "login", 
                username: usernameInput, // Send the Roll or Email here
                password: pass 
            }) 
        });
        const data = await res.json();
        if (data.status === "success") {
            currentUser = data;
            localStorage.setItem('seds_user', JSON.stringify(currentUser));
            initApp();
        } else {
            err.innerText = data.message;
        }
    } catch (e) { err.innerText = "Connection Failed."; }
    btn.innerText = "Secure Login"; btn.disabled = false;
}

function initApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    
    document.getElementById('welcome-msg').innerText = `Hello, ${currentUser.name}`;
    // NEW: Show Roll Number
    document.getElementById('user-roll').innerText = currentUser.roll || '';
    document.getElementById('role-badge').innerText = currentUser.role;
    document.getElementById('team-badge').innerText = currentUser.team;
    document.getElementById('header-avatar').src = currentUser.image || `https://ui-avatars.com/api/?name=${currentUser.name}`;

    if (currentUser.role === "Admin Pro") loadAdmin();
    else if (currentUser.role === "Member") loadMemberDashboard();
    else loadLeadDashboard();
}

function logout() { localStorage.clear(); location.reload(); }

// --- LEAD DASHBOARD ---
async function loadLeadDashboard() {
    document.getElementById('lead-dashboard').classList.remove('hidden');

    // 1. Load History Cache
    const cachedHist = localStorage.getItem('team_history');
    if (cachedHist) renderHistory(JSON.parse(cachedHist));

    // 2. Load Members
    const memRes = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "getMembers", team: currentUser.team, excludeRoll: currentUser.roll }) });
    const memData = await memRes.json();
    teamMembers = memData.members;
    renderGrid();

    // 3. Fetch Full History
    const histRes = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "getTeamHistory", team: currentUser.team }) });
    const histData = await histRes.json();
    localStorage.setItem('team_history', JSON.stringify(histData.history));
    renderHistory(histData.history);
}

// *** UPDATED: Render Full Tables for History ***
function renderHistory(history) {
    const container = document.getElementById('history-container');
    if (!history || history.length === 0) {
        container.innerHTML = "<p>No previous records found.</p>";
        return;
    }
    let html = "";
    history.forEach(item => {
        let rowsHtml = "";
        item.records.forEach(rec => {
            let statusColor = rec.status === 'AB' ? '#fee2e2' : '#dcfce7';
            let statusText = rec.status === 'AB' ? '#991b1b' : '#166534';
            rowsHtml += `<tr>
                <td>${rec.name}</td>
                <td>${rec.roll}</td>
                <td><span style="background:${statusColor}; color:${statusText}; padding:2px 6px; border-radius:4px;">${rec.status}</span></td>
                <td>${rec.reason || '-'}</td>
            </tr>`;
        });

        html += `<div style="background:#f9f9f9; padding:15px; border-radius:8px; border:1px solid #ddd; margin-bottom:20px;">
                    <div style="font-weight:bold; color:#4f46e5; margin-bottom:10px;">
                        ${item.date} <span style="float:right; color:#666;">Discussion: ${item.discussion.substring(0,30)}...</span>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:0.9em; background:white;">
                        <tr style="background:#eee; text-align:left;">
                            <th style="padding:8px;">Name</th>
                            <th style="padding:8px;">Roll</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Reason</th>
                        </tr>
                        ${rowsHtml}
                    </table>
                 </div>`;
    });
    container.innerHTML = html;
}

function renderGrid() {
    const grid = document.getElementById('members-grid'); grid.innerHTML = "";
    if(teamMembers.length === 0) { grid.innerHTML = "<p>No members.</p>"; return; }
    const frag = document.createDocumentFragment();
    teamMembers.forEach((m, i) => {
        const div = document.createElement('div');
        div.className = "student-card present"; div.id = `card-${i}`; div.dataset.status = "P";
        div.innerHTML = `<img src="${m.image}" onerror="this.src='https://via.placeholder.com/90'"><h3>${m.name}</h3><small>${m.roll}</small>
            <div class="status-toggles"><button class="toggle-btn active-p" onclick="toggle(${i}, 'P')">P</button><button class="toggle-btn" onclick="toggle(${i}, 'AB')">AB</button></div>
            <input type="text" id="reason-${i}" class="reason-input" placeholder="Reason...">`;
        frag.appendChild(div);
    });
    grid.appendChild(frag);
}

function toggle(i, status) {
    const card = document.getElementById(`card-${i}`); const btns = card.querySelectorAll('.toggle-btn');
    card.dataset.status = status;
    card.className = status === 'P' ? "student-card present" : "student-card absent";
    if(status === 'P') { btns[0].classList.add('active-p'); btns[1].classList.remove('active-ab'); }
    else { btns[0].classList.remove('active-p'); btns[1].classList.add('active-ab'); }
}

async function submitAttendance() {
    const discussion = document.getElementById('discussion-text').value;
    if (!discussion) return alert("Enter discussion points.");
    const records = teamMembers.map((m, i) => ({
        name: m.name, roll: m.roll, status: document.getElementById(`card-${i}`).dataset.status === 'P' ? 'Present' : 'Absent',
        reason: document.getElementById(`reason-${i}`).value
    }));
    const btn = document.getElementById('submit-btn'); btn.innerText = "Saving..."; btn.disabled = true;
    try {
        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "submitAttendance", team: currentUser.team, date: document.getElementById('att-date').value, discussion: discussion, records: records }) });
        alert("Saved!"); localStorage.removeItem('team_history'); location.reload();
    } catch (e) { alert("Error."); }
    btn.innerText = "Submit"; btn.disabled = false;
}

// --- MEMBER STATS ---
async function loadMemberDashboard() {
    document.getElementById('member-dashboard').classList.remove('hidden');
    const cachedStats = localStorage.getItem('member_stats');
    if (cachedStats) renderMemberStats(JSON.parse(cachedStats));
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "getMemberStats", roll: currentUser.roll }) });
    const data = await res.json();
    localStorage.setItem('member_stats', JSON.stringify(data));
    renderMemberStats(data);
}

function renderMemberStats(data) {
    document.getElementById('overall-percent').innerText = data.overallPercent + "%";
    const grid = document.getElementById('member-stats-grid'); grid.innerHTML = "";
    data.details.forEach(stat => {
        const div = document.createElement('div');
        div.className = "stat-card";
        div.innerHTML = `<h3>${stat.team}</h3><div style="font-size:1.5rem; color:#4f46e5; margin:10px 0;">${stat.percent}%</div>
            <div><b style="color:green">${stat.present} P</b> | <b style="color:red">${stat.absent} AB</b></div>`;
        grid.appendChild(div);
    });
}

// --- ADMIN LOGIC ---
async function loadAdmin() {
    document.getElementById('admin-dashboard').classList.remove('hidden');
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "getAdminData" }) });
    const data = await res.json();
    adminData = data.records;
    renderTable(adminData);
}

function renderTable(data) {
    const tbody = document.getElementById('table-body'); tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.date}</td><td><b>${row.team}</b></td><td>${row.name}</td><td><span class="tag-${row.status.toLowerCase()}">${row.status}</span></td><td><small>${row.discussion.substring(0,30)}...</small></td><td><small>${row.emailStatus}</small></td>`;
        tbody.appendChild(tr);
    });
}

function filterTable() {
    const textTerm = document.getElementById('filter-text').value.toLowerCase();
    const dateTerm = document.getElementById('filter-date').value;
    const filtered = adminData.filter(row => {
        const matchesText = row.name.toLowerCase().includes(textTerm) || row.team.toLowerCase().includes(textTerm);
        const matchesDate = dateTerm ? row.date.includes(dateTerm) : true;
        return matchesText && matchesDate;
    });
    renderTable(filtered);
}


