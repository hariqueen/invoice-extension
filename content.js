console.log("Content script 로드됨 - OpenAI 빌링 내역 추출기");

const pageLoadTime = Date.now();
let downloadInProgress = false;

function getElementByXPath(xpath) {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function findDownloadButton() {
  const spans = document.querySelectorAll('span');
  for (const span of spans) {
    if (span.textContent.includes('청구서 다운로드')) {
      return span.closest('button');
    }
  }
  const xpath = '/html/body/div/div/div[1]/div/div[3]/div[1]/div/div[2]/table/tbody/tr[4]/td/div/button[1]';
  return getElementByXPath(xpath);
}

function forceClick(button) {
  if (!button) return false;
  try {
    button.click();
    return true;
  } catch {
    return false;
  }
}

function showNotification(msg, type='info') {
  const note = document.createElement('div');
  note.textContent = msg;
  note.style.position = 'fixed';
  note.style.top = '10px';
  note.style.left = '50%';
  note.style.transform = 'translateX(-50%)';
  note.style.padding = '8px 16px';
  note.style.zIndex = '9999';
  note.style.borderRadius = '4px';
  note.style.color = 'white';
  note.style.fontWeight = 'bold';
  note.style.backgroundColor = type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'blue';
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 2500);
}

function autoDownloadInvoice() {
  if (downloadInProgress) return;
  downloadInProgress = true;
  console.log("자동 다운로드 시작 - URL:", window.location.href);

  if (!window.location.href.includes('invoice.stripe.com')) {
    downloadInProgress = false;
    return;
  }

  chrome.runtime.sendMessage({ action: 'invoiceDownloadStarted', url: window.location.href });

  const btn = findDownloadButton();
  if (btn) {
    btn.style.border = '2px solid red';
    const clicked = forceClick(btn);

    if (clicked) {
      showNotification("다운로드 시작됨", "success");
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'downloadComplete', method: 'buttonClick' });
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'closeTab' });
        }, 1500);
      }, 1000);
    } else {
      showNotification("버튼 클릭 실패", "error");
      chrome.runtime.sendMessage({ action: 'downloadButtonNotFound', url: window.location.href });
    }
  } else {
    console.error("다운로드 버튼을 찾을 수 없음");
    showNotification("다운로드 버튼 없음", "error");
    chrome.runtime.sendMessage({ action: 'downloadButtonNotFound', url: window.location.href });
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'closeTab' });
    }, 2000);
  }
}

window.addEventListener('load', () => {
  console.log("페이지 로드 완료", Date.now() - pageLoadTime, "ms 경과");
  setTimeout(() => autoDownloadInvoice(), 1500);
});
