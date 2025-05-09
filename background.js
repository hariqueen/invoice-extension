const activeInvoiceTabs = new Map();
let pendingDownloads = 0;
let downloadStartTime = null;
let downloadWatcherId = null;

function sendMessageToPopup(message) {
  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        console.log('팝업에 메시지 전송 실패 (무시됨):', chrome.runtime.lastError.message);
      } else {
        console.log('팝업에 메시지 전송 성공:', message);
      }
    });
  } catch (error) {
    console.log('메시지 전송 중 오류 (무시됨):', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('확장 프로그램이 설치되었습니다.');
  setupDownloadListeners();
});

function setupDownloadListeners() {
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
      console.log(`다운로드 ID ${delta.id} 완료됨`);
      if (pendingDownloads > 0) pendingDownloads--;
      console.log(`남은 다운로드: ${pendingDownloads}`);
      if (pendingDownloads === 0 && activeInvoiceTabs.size === 0) {
        clearInterval(downloadWatcherId);
        downloadWatcherId = null;
        sendMessageToPopup({ action: 'updateStatus', message: '모든 인보이스 다운로드가 완료되었습니다.', type: 'success' });
      }
    }
  });
}

function startDownloadWatcher() {
  if (downloadWatcherId) clearInterval(downloadWatcherId);
  downloadStartTime = Date.now();
  downloadWatcherId = setInterval(() => {
    const elapsed = Date.now() - downloadStartTime;
    console.log(`다운로드 감시 중: ${Math.round(elapsed / 1000)}초 경과, 대기 중인 탭: ${activeInvoiceTabs.size}, 남은 다운로드: ${pendingDownloads}`);
    if (activeInvoiceTabs.size === 0 && pendingDownloads <= 0) {
      clearInterval(downloadWatcherId);
      downloadWatcherId = null;
      sendMessageToPopup({ action: 'updateStatus', message: '모든 인보이스 다운로드가 완료되었습니다.', type: 'success' });
    }
  }, 5000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message);
  if (message.action === 'startInvoiceDownloads') {
    processInvoiceDownloads(message.invoices, message.accountName);
    sendResponse({ status: 'startedDownloads' });
  }
  else if (message.action === 'invoiceDownloadStarted') {
    if (sender.tab) {
      activeInvoiceTabs.set(sender.tab.id, { url: message.url, status: 'downloading' });
    }
    downloadStartTime = Date.now();
    sendResponse({ status: 'recorded' });
  }
  else if (message.action === 'closeTab') {
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
      activeInvoiceTabs.delete(sender.tab.id);
      if (activeInvoiceTabs.size === 0 && pendingDownloads <= 0 && downloadWatcherId) {
        clearInterval(downloadWatcherId);
        downloadWatcherId = null;
        sendMessageToPopup({ action: 'updateStatus', message: '모든 인보이스 다운로드가 완료되었습니다.', type: 'success' });
      }
    }
    sendResponse({ status: 'closingTab' });
  }
  else if (message.action === 'downloadButtonNotFound') {
    console.error('다운로드 버튼을 찾지 못함:', message.url);
    if (sender.tab) {
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id);
        activeInvoiceTabs.delete(sender.tab.id);
      }, 2000);
    }
    sendMessageToPopup({ action: 'updateStatus', message: '다운로드 버튼을 찾지 못했습니다.', type: 'error' });
    sendResponse({ status: 'failed' });
  }
  else if (message.action === 'downloadComplete') {
    if (pendingDownloads > 0) pendingDownloads--;
    if (pendingDownloads === 0 && activeInvoiceTabs.size === 0 && downloadWatcherId) {
      clearInterval(downloadWatcherId);
      downloadWatcherId = null;
      sendMessageToPopup({ action: 'updateStatus', message: '모든 인보이스 다운로드가 완료되었습니다.', type: 'success' });
    }
    sendResponse({ status: 'noted' });
  }
  return true;
});

async function processInvoiceDownloads(invoices, accountName) {
  if (!invoices || invoices.length === 0) return;
  pendingDownloads = invoices.length;
  startDownloadWatcher();
  sendMessageToPopup({ action: 'updateStatus', message: `${invoices.length}개의 인보이스 다운로드 중...`, type: 'info' });
  for (const invoice of invoices) {
    if (!invoice || !invoice.viewLink) {
      pendingDownloads--;
      continue;
    }
    try {
      chrome.tabs.create({ url: invoice.viewLink, active: false }, (tab) => {
        activeInvoiceTabs.set(tab.id, { url: invoice.viewLink, status: 'loading' });
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('탭 생성 오류:', error);
      pendingDownloads--;
    }
  }
}
