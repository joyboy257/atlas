export type AtlasWorkbenchIdentity = Readonly<{
  project_name: string;
  project_hash: string;
}>;

export function renderAtlasWorkbench(identity: AtlasWorkbenchIdentity): string {
  const projectName = escapeHtml(identity.project_name);
  const projectHash = escapeHtml(identity.project_hash);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Atlas Front Desk Workbench</title>
  <style>
    :root {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #f5f7fb;
      background: #090b10;
      font-synthesis: none;
      --surface: rgba(22, 26, 35, 0.86);
      --surface-strong: #171b24;
      --border: rgba(255, 255, 255, 0.09);
      --muted: #9da7b7;
      --accent: #9ff7d8;
      --accent-strong: #55d6aa;
      --warning: #ffd48a;
      --danger: #ff9b9b;
      --info: #9fc8ff;
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 18% -10%, rgba(85, 214, 170, 0.14), transparent 32rem),
        radial-gradient(circle at 105% 8%, rgba(87, 131, 255, 0.12), transparent 34rem),
        #090b10;
    }
    button, textarea, input { font: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .45; }
    .shell { width: min(1560px, 100%); margin: 0 auto; padding: 24px; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 20px;
      padding: 18px 20px; border: 1px solid var(--border); border-radius: var(--radius);
      background: rgba(13, 16, 22, .84); backdrop-filter: blur(18px); position: sticky; top: 12px; z-index: 20;
    }
    .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; background: linear-gradient(145deg, #b8ffe6, #4acba2); color: #07110e; font-weight: 900; box-shadow: 0 8px 28px rgba(85,214,170,.22); }
    h1 { margin: 0; font-size: clamp(18px, 2vw, 24px); letter-spacing: -.03em; }
    .subtitle { margin: 3px 0 0; color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .identity { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .pill { padding: 7px 10px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); background: rgba(255,255,255,.03); font-size: 12px; }
    .pill.live { color: var(--accent); border-color: rgba(85,214,170,.28); }
    .hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 18px; margin-top: 18px; }
    .panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); backdrop-filter: blur(14px); overflow: hidden; }
    .panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 17px 18px 13px; border-bottom: 1px solid var(--border); }
    .panel-title { margin: 0; font-size: 14px; letter-spacing: .01em; }
    .panel-kicker { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .conversation { min-height: 560px; display: grid; grid-template-rows: auto 1fr auto; }
    .messages { padding: 18px; display: flex; flex-direction: column; gap: 12px; min-height: 300px; max-height: 560px; overflow: auto; }
    .empty { margin: auto; max-width: 390px; text-align: center; color: var(--muted); line-height: 1.65; }
    .bubble { max-width: min(85%, 620px); padding: 12px 14px; border-radius: 15px; border: 1px solid var(--border); line-height: 1.5; white-space: pre-wrap; }
    .bubble.customer { align-self: flex-end; background: rgba(159,200,255,.10); border-bottom-right-radius: 5px; }
    .bubble.atlas { align-self: flex-start; background: rgba(159,247,216,.08); border-bottom-left-radius: 5px; }
    .bubble .meta { color: var(--muted); font-size: 11px; margin-bottom: 5px; }
    .composer { border-top: 1px solid var(--border); padding: 14px; background: rgba(7,9,13,.42); }
    textarea { width: 100%; min-height: 82px; resize: vertical; border: 1px solid var(--border); border-radius: 13px; padding: 12px 13px; background: #0c0f15; color: #fff; outline: none; }
    textarea:focus { border-color: rgba(85,214,170,.5); box-shadow: 0 0 0 3px rgba(85,214,170,.08); }
    .composer-row { margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .checks { display: flex; gap: 14px; color: var(--muted); font-size: 12px; }
    label { display: inline-flex; gap: 7px; align-items: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .button { border: 1px solid var(--border); border-radius: 11px; padding: 9px 13px; color: #f7f9fb; background: rgba(255,255,255,.045); transition: transform .15s ease, border-color .15s ease, background .15s ease; }
    .button:hover:not(:disabled) { transform: translateY(-1px); border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.075); }
    .button.primary { color: #07110e; border-color: transparent; background: var(--accent); font-weight: 700; }
    .button.approve { color: var(--accent); border-color: rgba(85,214,170,.3); }
    .button.reject { color: var(--danger); border-color: rgba(255,155,155,.28); }
    .button.warning { color: var(--warning); border-color: rgba(255,212,138,.28); }
    .journey { display: grid; gap: 12px; align-content: start; }
    .next { padding: 16px 17px; background: linear-gradient(135deg, rgba(85,214,170,.14), rgba(87,131,255,.08)); border: 1px solid rgba(85,214,170,.2); border-radius: var(--radius); }
    .next .label { color: var(--accent); text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
    .next strong { display: block; margin-top: 7px; font-size: 15px; line-height: 1.45; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { min-height: 150px; padding: 15px; border-radius: 15px; border: 1px solid var(--border); background: rgba(10,13,18,.6); }
    .card h2 { margin: 0 0 10px; font-size: 12px; color: var(--muted); font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
    .value { margin: 0; color: #eef2f7; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .state { display: inline-flex; padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,.05); font-size: 11px; color: var(--muted); }
    .state.pending { color: var(--warning); background: rgba(255,212,138,.08); }
    .state.success { color: var(--accent); background: rgba(85,214,170,.08); }
    .state.blocked { color: var(--danger); background: rgba(255,155,155,.08); }
    .operator { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 11px; margin-top: 11px; border-top: 1px solid var(--border); }
    .evidence-grid { margin-top: 18px; display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 18px; }
    .scroll { max-height: 420px; overflow: auto; }
    .timeline, .receipts { margin: 0; padding: 14px 18px 18px; list-style: none; display: grid; gap: 10px; }
    .timeline li, .receipts li { padding: 11px 12px; border: 1px solid var(--border); border-radius: 12px; background: rgba(7,9,13,.5); }
    .event-type { color: var(--info); font: 12px ui-monospace, monospace; }
    .event-data { margin-top: 6px; color: var(--muted); font: 11px/1.5 ui-monospace, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .receipt-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .receipt-kind { color: var(--accent); font-size: 12px; font-weight: 700; }
    .receipt-id { color: var(--muted); font: 10px ui-monospace, monospace; overflow-wrap: anywhere; }
    .notice { margin: 18px 0 0; color: var(--muted); text-align: center; font-size: 11px; line-height: 1.5; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 1050px) { .hero, .evidence-grid { grid-template-columns: 1fr; } .conversation { min-height: 500px; } }
    @media (max-width: 680px) { .shell { padding: 12px; } .topbar { position: static; align-items: flex-start; } .identity { display: none; } .cards { grid-template-columns: 1fr; } .composer-row { align-items: stretch; } .actions { width: 100%; } .actions .button { flex: 1; } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="mark" aria-hidden="true">A</div>
        <div>
          <h1>Atlas Front Desk Workbench</h1>
          <p class="subtitle">${projectName} · governed local business messaging runtime</p>
        </div>
      </div>
      <div class="identity" aria-label="Runtime identity">
        <span class="pill live">● Local runtime</span>
        <span class="pill">Fixture model</span>
        <span class="pill" title="${projectHash}">${shortHash(identity.project_hash)}</span>
      </div>
    </header>

    <section class="hero" aria-label="First Agent Loop">
      <article class="panel conversation" id="customer-conversation">
        <div class="panel-header">
          <div><h2 class="panel-title">Customer conversation</h2><div class="panel-kicker">Normalized inbound messages and committed outbound responses</div></div>
          <button class="button" id="reset-view" type="button">Refresh state</button>
        </div>
        <div class="messages" id="messages" aria-live="polite">
          <div class="empty" id="empty-conversation">Send the default booking-change request. Atlas will retrieve approved knowledge, propose a governed tool, and pause for a real operator decision.</div>
        </div>
        <form class="composer" id="message-form">
          <label class="sr-only" for="message-text">Customer message</label>
          <textarea id="message-text">Can I move booking BK-100 to Friday?</textarea>
          <div class="composer-row">
            <div class="checks">
              <label><input id="consent" type="checkbox" checked> Consent</label>
              <label><input id="window" type="checkbox" checked> Window open</label>
            </div>
            <div class="actions">
              <button class="button" id="replay-message" type="button" disabled>Replay duplicate</button>
              <button class="button primary" id="send-message" type="submit">Send customer message</button>
            </div>
          </div>
        </form>
      </article>

      <aside class="journey" aria-label="Governed decision state">
        <div class="next" id="next-action"><span class="label">One next action</span><strong id="next-action-text">Send the customer message.</strong></div>
        <div class="cards">
          <section class="card" id="retrieved-evidence"><h2>Retrieved evidence</h2><pre class="value" id="evidence-value">Not retrieved</pre></section>
          <section class="card" id="tool-proposal"><h2>Tool proposal</h2><pre class="value" id="proposal-value">No proposal</pre></section>
          <section class="card" id="policy-decision"><h2>Policy decision</h2><pre class="value" id="policy-value">Not evaluated</pre></section>
          <section class="card" id="approval-state">
            <h2>Approval</h2><span class="state" id="approval-pill">Not requested</span><pre class="value" id="approval-value"></pre>
            <div class="operator">
              <button class="button approve" id="approve-action" type="button" disabled>Approve</button>
              <button class="button reject" id="reject-action" type="button" disabled>Reject</button>
            </div>
          </section>
          <section class="card" id="handoff-state">
            <h2>Human handoff</h2><span class="state" id="handoff-pill">Automated</span><pre class="value" id="handoff-value">No takeover</pre>
            <div class="operator"><button class="button warning" id="takeover" type="button" disabled>Take over</button></div>
          </section>
          <section class="card" id="delivery-state">
            <h2>Provider delivery</h2><span class="state" id="delivery-pill">No outbox item</span><pre class="value" id="delivery-value"></pre>
            <div class="operator"><button class="button approve" id="deliver" type="button" disabled>Simulate delivered</button><button class="button" id="fail-delivery" type="button" disabled>Transient failure</button></div>
          </section>
          <section class="card" id="business-outcome"><h2>Business outcome</h2><pre class="value" id="outcome-value">No committed outcome</pre></section>
          <section class="card"><h2>Runtime authority</h2><pre class="value">Atlas native\nProject: ${projectName}\nHash: ${projectHash}\nCredentials: none</pre></section>
        </div>
      </aside>
    </section>

    <section class="evidence-grid" aria-label="Trace and receipt evidence">
      <article class="panel" id="trace-events">
        <div class="panel-header"><div><h2 class="panel-title">Trace events</h2><div class="panel-kicker">Evidence → proposal → policy → approval → action → delivery</div></div><span class="pill" id="trace-count">0 events</span></div>
        <div class="scroll"><ol class="timeline" id="timeline"><li><span class="event-type">No trace yet</span></li></ol></div>
      </article>
      <article class="panel" id="receipt-chain">
        <div class="panel-header"><div><h2 class="panel-title">Receipt chain</h2><div class="panel-kicker">Source-bound proof for each governed transition</div></div><span class="pill" id="receipt-count">0 receipts</span></div>
        <div class="scroll"><ol class="receipts" id="receipts"><li><span class="receipt-kind">No receipts yet</span></li></ol></div>
      </article>
    </section>
    <p class="notice">The deterministic fixture model and simulated provider exercise real Atlas governance contracts. This workbench does not claim live provider, staging, or production behavior.</p>
  </main>

  <script>
    (() => {
      'use strict';
      const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
      const session = { lastMessage: null, lastTurn: null, lastCommit: null, sequence: 0, busy: false };

      const api = async (path, options = {}) => {
        const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
        const body = await response.json();
        if (!response.ok || body.ok === false) {
          const error = new Error(body.error?.message || 'Atlas request failed');
          error.details = body.error || {};
          throw error;
        }
        return body.data;
      };

      const setJson = (id, value, fallback) => {
        ui[id].textContent = value == null ? fallback : JSON.stringify(value, null, 2);
      };
      const stateClass = (value) => ['approved', 'committed', 'completed', 'delivered', 'read', 'allowed'].includes(value) ? 'success' : ['blocked', 'rejected', 'cancelled', 'failed'].includes(value) ? 'blocked' : value === 'pending' || value === 'approval_pending' || value === 'retry_scheduled' ? 'pending' : '';
      const setPill = (id, text, value = text) => { ui[id].textContent = text; ui[id].className = 'state ' + stateClass(value); };
      const next = (text) => { ui['next-action-text'].textContent = text || 'Inspect the current trace.'; };
      const appendBubble = (role, text, meta) => {
        ui['empty-conversation']?.remove();
        const bubble = document.createElement('div');
        bubble.className = 'bubble ' + role;
        const details = document.createElement('div');
        details.className = 'meta'; details.textContent = meta;
        const body = document.createElement('div'); body.textContent = text;
        bubble.append(details, body); ui.messages.append(bubble); ui.messages.scrollTop = ui.messages.scrollHeight;
      };
      const setBusy = (busy) => {
        session.busy = busy;
        ui['send-message'].disabled = busy;
        for (const id of ['approve-action','reject-action','takeover','deliver','fail-delivery','replay-message']) {
          if (busy) ui[id].disabled = true;
        }
      };
      const restoreControls = () => {
        const approval = session.lastTurn?.approval;
        const outbox = session.lastCommit?.outbox;
        ui['approve-action'].disabled = !approval || approval.status !== 'pending';
        ui['reject-action'].disabled = !approval || approval.status !== 'pending';
        ui.takeover.disabled = !session.lastTurn?.message?.conversation_id;
        ui.deliver.disabled = !outbox || !['queued','retry_scheduled','sent'].includes(outbox.state);
        ui['fail-delivery'].disabled = !outbox || !['queued','retry_scheduled'].includes(outbox.state);
        ui['replay-message'].disabled = !session.lastMessage;
      };
      const renderTrace = (trace) => {
        const events = trace?.events || [];
        ui.timeline.replaceChildren();
        ui['trace-count'].textContent = events.length + (events.length === 1 ? ' event' : ' events');
        if (!events.length) {
          const li = document.createElement('li'); li.textContent = 'No trace yet'; ui.timeline.append(li); return;
        }
        for (const event of events) {
          const li = document.createElement('li');
          const type = document.createElement('div'); type.className = 'event-type'; type.textContent = event.type;
          const data = document.createElement('div'); data.className = 'event-data'; data.textContent = JSON.stringify(event.data, null, 2);
          li.append(type, data); ui.timeline.append(li);
        }
      };
      const renderReceipts = (receipts) => {
        const values = receipts || [];
        ui.receipts.replaceChildren();
        ui['receipt-count'].textContent = values.length + (values.length === 1 ? ' receipt' : ' receipts');
        if (!values.length) {
          const li = document.createElement('li'); li.textContent = 'No receipts yet'; ui.receipts.append(li); return;
        }
        for (const receipt of values) {
          const li = document.createElement('li');
          const row = document.createElement('div'); row.className = 'receipt-row';
          const kind = document.createElement('span'); kind.className = 'receipt-kind'; kind.textContent = receipt.kind + ' · ' + receipt.outcome;
          const id = document.createElement('span'); id.className = 'receipt-id'; id.textContent = receipt.receipt_id;
          row.append(kind, id); li.append(row); ui.receipts.append(li);
        }
      };
      const renderTurn = (turn) => {
        session.lastTurn = turn;
        setJson('evidence-value', turn.evidence, 'Not retrieved');
        setJson('proposal-value', turn.proposal, 'No proposal');
        setJson('policy-value', turn.policy, 'Not evaluated');
        const approval = turn.approval;
        setPill('approval-pill', approval?.status || 'Not requested', approval?.status);
        setJson('approval-value', approval ? { id: approval.id, proposal_id: approval.proposal_id, operator_id: approval.operator_id } : null, '');
        const handoff = turn.status === 'handoff_required';
        setPill('handoff-pill', handoff ? 'Handoff required' : 'Automated', handoff ? 'blocked' : 'allowed');
        setJson('handoff-value', handoff ? { reason: turn.policy?.reason } : null, 'No takeover');
        renderTrace(turn.trace);
        renderReceipts(turn.receipts);
        next(turn.next_action);
        restoreControls();
      };
      const renderCommit = (commit) => {
        session.lastCommit = commit;
        setPill('approval-pill', commit.approval?.status || 'approved', commit.approval?.status || 'approved');
        setJson('approval-value', commit.approval, '');
        setJson('outcome-value', commit.action?.result, 'No committed outcome');
        setPill('delivery-pill', commit.outbox?.state || 'queued', commit.outbox?.state || 'queued');
        setJson('delivery-value', commit.outbox, '');
        renderTrace(commit.trace);
        renderReceipts(commit.receipts);
        appendBubble('atlas', commit.outbox?.body || 'The governed action committed.', 'Atlas · outcome committed');
        next(commit.next_action);
        restoreControls();
      };
      const refresh = async () => {
        const [state, receipts] = await Promise.all([api('/api/state'), api('/api/receipts')]);
        renderReceipts(receipts);
        const latestTrace = state.traces?.at(-1); if (latestTrace) renderTrace(latestTrace);
        const conversation = Object.values(state.conversations || {}).at(-1);
        if (conversation) {
          setPill('handoff-pill', conversation.state, conversation.state === 'human_handoff' || conversation.state === 'human_takeover' ? 'blocked' : 'allowed');
          setJson('handoff-value', { operator_id: conversation.operator_id, reason: conversation.handoff_reason }, 'No takeover');
        }
        const outbox = state.outbox?.at(-1);
        if (outbox) { setPill('delivery-pill', outbox.state, outbox.state); setJson('delivery-value', outbox, ''); }
        const action = state.actions?.at(-1);
        if (action) setJson('outcome-value', action.result, 'No committed outcome');
      };
      const perform = async (operation) => {
        if (session.busy) return;
        setBusy(true);
        try { await operation(); }
        catch (error) { next((error.details?.code || 'ERROR') + ': ' + error.message + (error.details?.next_action ? ' — ' + error.details.next_action : '')); }
        finally { setBusy(false); restoreControls(); }
      };

      ui['message-form'].addEventListener('submit', (event) => {
        event.preventDefault();
        perform(async () => {
          session.sequence += 1;
          const stamp = Date.now().toString(36);
          const message = {
            message_id: 'msg_workbench_' + stamp,
            conversation_id: 'conv_workbench_001',
            customer_id: 'cust_workbench_001',
            channel_id: 'local-web-chat',
            sequence: session.sequence,
            occurred_at: new Date().toISOString(),
            text: ui['message-text'].value.trim(),
            consent: ui.consent.checked,
            within_messaging_window: ui.window.checked
          };
          if (!message.text) throw new Error('Enter a customer message.');
          session.lastMessage = message;
          appendBubble('customer', message.text, 'Customer · inbound');
          const turn = await api('/api/messages/inbound', { method: 'POST', body: JSON.stringify(message) });
          renderTurn(turn);
        });
      });
      ui['replay-message'].addEventListener('click', () => perform(async () => {
        const replay = await api('/api/messages/inbound', { method: 'POST', body: JSON.stringify(session.lastMessage) });
        next(replay.replayed ? 'Duplicate safely replayed. Inspect the unchanged trace and receipts.' : replay.next_action);
      }));
      ui['approve-action'].addEventListener('click', () => perform(async () => {
        const approval = session.lastTurn?.approval; if (!approval) throw new Error('No pending approval.');
        const commit = await api('/api/approvals/' + encodeURIComponent(approval.id) + '/decision', { method: 'POST', body: JSON.stringify({ decision: 'approved', operator_id: 'operator_local' }) });
        renderCommit(commit);
      }));
      ui['reject-action'].addEventListener('click', () => perform(async () => {
        const approval = session.lastTurn?.approval; if (!approval) throw new Error('No pending approval.');
        const result = await api('/api/approvals/' + encodeURIComponent(approval.id) + '/decision', { method: 'POST', body: JSON.stringify({ decision: 'rejected', operator_id: 'operator_local', reason: 'Rejected in local workbench' }) });
        setPill('approval-pill', 'rejected', 'rejected'); renderTrace(result.trace); renderReceipts([...(session.lastTurn?.receipts || []), result.receipt]); next('Review the handoff and customer response.');
      }));
      ui.takeover.addEventListener('click', () => perform(async () => {
        const conversationId = session.lastTurn?.message?.conversation_id; if (!conversationId) throw new Error('No active conversation.');
        const result = await api('/api/conversations/' + encodeURIComponent(conversationId) + '/takeover', { method: 'POST', body: JSON.stringify({ operator_id: 'operator_local', reason: 'Taken over in local workbench' }) });
        setPill('handoff-pill', result.state, 'blocked'); setJson('handoff-value', result, ''); next('Continue the conversation as the human operator.'); await refresh();
      }));
      ui.deliver.addEventListener('click', () => perform(async () => {
        const outbox = session.lastCommit?.outbox; if (!outbox) throw new Error('No queued outbox message.');
        const result = await api('/api/outbox/' + encodeURIComponent(outbox.id) + '/attempt', { method: 'POST', body: JSON.stringify({ outcome: 'delivered', provider_message_id: 'provider_local_' + Date.now().toString(36) }) });
        session.lastCommit.outbox = result.delivery; setPill('delivery-pill', result.delivery.state, result.delivery.state); setJson('delivery-value', result.delivery, ''); next('Inspect the complete trace and receipt chain.'); await refresh();
      }));
      ui['fail-delivery'].addEventListener('click', () => perform(async () => {
        const outbox = session.lastCommit?.outbox; if (!outbox) throw new Error('No queued outbox message.');
        const result = await api('/api/outbox/' + encodeURIComponent(outbox.id) + '/attempt', { method: 'POST', body: JSON.stringify({ outcome: 'transient_failure', provider_code: 'WORKBENCH_TRANSIENT_FAILURE' }) });
        session.lastCommit.outbox = result.delivery; setPill('delivery-pill', result.delivery.state, result.delivery.state); setJson('delivery-value', result.delivery, ''); next('Wait for the retry window, then retry delivery.'); await refresh();
      }));
      ui['reset-view'].addEventListener('click', () => perform(refresh));
      perform(refresh);
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);
}

function shortHash(value: string): string {
  return escapeHtml(value.length > 24 ? `${value.slice(0, 14)}…${value.slice(-8)}` : value);
}
