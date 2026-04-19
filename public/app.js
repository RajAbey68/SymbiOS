const identity = "HUMAN_REVIEWER_01";
const API_BASE = '/api/v1/execution';

async function fetchIntents() {
    try {
        const response = await fetch(`${API_BASE}/pending`);
        const data = await response.json();
        renderIntents(data);
    } catch (error) {
        console.error('Failed to fetch intents:', error);
        showToast('Error connecting to SymbiOS Backend', 'danger');
    }
}

function renderIntents(intents) {
    const container = document.getElementById('intent-queue');
    
    if (!intents || intents.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending interventions. System operating within governed autonomous thresholds.</div>';
        return;
    }

    container.innerHTML = intents.map(intent => `
        <div class="intent-card" id="card-${intent.id}">
            <div class="card-header">
                <div>
                    <div class="intent-title">${intent.taskId}</div>
                    <div class="intent-meta">Tenant: ${intent.tenantId}</div>
                </div>
                <span class="badge ${intent.confidenceScore < 0.9 ? 'badge-danger' : 'badge-warning'}">
                    ${(intent.confidenceScore * 100).toFixed(0)}% Conf
                </span>
            </div>
            
            <div class="reason-box">
                ${intent.reviewReason || 'Policy Threshold Triggered'}
            </div>

            <div style="font-size: 0.8rem; margin-bottom: 20px;">
                <strong>Maker:</strong> ${intent.makerIdentity}<br>
                <strong>Payload:</strong> <pre style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 5px;">${JSON.stringify(intent.proposedPayload, null, 2)}</pre>
            </div>

            <div class="actions">
                <button class="btn btn-approve" onclick="resolveIntent('${intent.id}', 'APPROVE')">Approve Execution</button>
                <button class="btn btn-reject" onclick="resolveIntent('${intent.id}', 'REJECT')">Reject</button>
            </div>
        </div>
    `).join('');
}

async function resolveIntent(intentId, decision) {
    try {
        const response = await fetch(`${API_BASE}/review/${intentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-maker-identity': identity
            },
            body: JSON.stringify({ decision })
        });

        if (response.ok) {
            const card = document.getElementById(`card-${intentId}`);
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
                fetchIntents();
                showToast(`Intent ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} successfully.`, 'success');
            }, 300);
        } else {
            const error = await response.json();
            showToast(error.message || 'Governance Error', 'danger');
        }
    } catch (error) {
        showToast('Network failure during review.', 'danger');
    }
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.style.color = '#000';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.marginBottom = '10px';
    toast.style.fontWeight = '700';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    toast.style.animation = 'slideIn 0.3s ease-out';
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Initial Load
fetchIntents();
// Refresh every 30 seconds
setInterval(fetchIntents, 30000);
