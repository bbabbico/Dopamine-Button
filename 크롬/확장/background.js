const API_BASE = 'http://localhost:3000';
const POLL_INTERVAL_MS = 1800;

async function postJob(payload) {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`작업 생성 실패: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function getJob(jobId) {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(`작업 조회 실패: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, message);
  }
}

function watchJob(jobId) {
  const timer = setInterval(async () => {
    try {
      const job = await getJob(jobId);
      if (job.status === 'done') {
        clearInterval(timer);
        await sendToActiveTab({ action: 'APPLY_SERVER_ACTIONS', payload: job.result });
      }
      if (job.status === 'failed') {
        clearInterval(timer);
        console.error('[Lion] 작업 실패', job.error);
      }
    } catch (error) {
      clearInterval(timer);
      console.error('[Lion] 폴링 실패', error);
    }
  }, POLL_INTERVAL_MS);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'START_ANALYSIS') return;

  (async () => {
    try {
      const created = await postJob(message.payload);

      await sendToActiveTab({
        action: 'START_LOCAL_SCAN',
        payload: {
          burstCount: message.payload?.options?.localBurstCount ?? 8
        }
      });

      watchJob(created.jobId);
      sendResponse({ ok: true, jobId: created.jobId });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});
