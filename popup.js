// 저장된 거래 내역 데이터
let transactionData = [];

// DOM 요소
const accountNameInput = document.getElementById('account-name');
const addAccountBtn = document.getElementById('add-account-btn');
const accountSelect = document.getElementById('account-select');
const invoiceBtn = document.getElementById('invoice-btn');
const extractBtn = document.getElementById('extract-btn');
const statusDiv = document.getElementById('status');
const dataTable = document.getElementById('data-table');
const recordCount = document.getElementById('record-count');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');

// 초기화 함수
function initialize() {
  // 저장된 계정 목록 로드
  chrome.storage.local.get(['accounts', 'transactions'], (result) => {
    // 계정 목록 로드
    const accounts = result.accounts || [];
    updateAccountDropdown(accounts);
    
    // 거래 내역 로드
    if (result.transactions) {
      transactionData = result.transactions;
      updateDataTable();
    }
  });
  
  // 이벤트 리스너 등록
  addAccountBtn.addEventListener('click', addAccount);
  invoiceBtn.addEventListener('click', downloadInvoices);
  extractBtn.addEventListener('click', extractBillingData);
  clearBtn.addEventListener('click', clearData);
  saveBtn.addEventListener('click', saveToExcel);
  
  // 백그라운드로부터의 메시지 수신
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateStatus') {
      showStatus(message.message, message.type);
    }
  });
}

// 계정 추가 함수
function addAccount() {
  const accountName = accountNameInput.value.trim();
  if (!accountName) {
    showStatus('계정명을 입력해주세요.', 'error');
    return;
  }
  
  // 현재 계정 목록 가져오기
  chrome.storage.local.get(['accounts'], (result) => {
    const accounts = result.accounts || [];
    
    // 중복 체크
    if (accounts.includes(accountName)) {
      showStatus('이미 존재하는 계정명입니다.', 'error');
      return;
    }
    
    // 계정 추가
    accounts.push(accountName);
    chrome.storage.local.set({ accounts }, () => {
      showStatus(`계정 '${accountName}'이(가) 추가되었습니다.`, 'success');
      accountNameInput.value = '';
      updateAccountDropdown(accounts);
    });
  });
}

// 계정 드롭다운 업데이트
function updateAccountDropdown(accounts) {
  // 기존 옵션 제거
  while (accountSelect.options.length > 1) {
    accountSelect.remove(1);
  }
  
  // 새 옵션 추가
  accounts.forEach(account => {
    const option = document.createElement('option');
    option.value = account;
    option.textContent = account;
    accountSelect.appendChild(option);
  });
}

// 인보이스 다운로드 함수
function downloadInvoices() {
  const selectedAccount = accountSelect.value;
  if (!selectedAccount) {
    showStatus('계정을 선택해주세요.', 'error');
    return;
  }
  
  showStatus('인보이스 추출 중...', '');
  
  // 현재 탭에서 직접 스크립트 실행
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: extractInvoiceInfo
    }).then((results) => {
      if (!results || !results[0] || !results[0].result) {
        showStatus('인보이스 정보를 추출할 수 없습니다.', 'error');
        return;
      }
      
      const extractionResult = results[0].result;
      
      if (!extractionResult.success || !extractionResult.data || extractionResult.data.length === 0) {
        showStatus('인보이스를 찾을 수 없습니다.', 'error');
        return;
      }
      
      showStatus(`${extractionResult.data.length}개의 인보이스 다운로드 시작...`, '');
      
      // 인보이스 자동 다운로드 시작
      chrome.runtime.sendMessage({
        action: 'startInvoiceDownloads',
        invoices: extractionResult.data,
        accountName: selectedAccount
      });
    }).catch((error) => {
      showStatus('인보이스 추출 실패: ' + error.message, 'error');
      console.error('인보이스 추출 오류:', error);
    });
  });
}

// 인보이스 정보 추출 함수 (페이지에서 직접 실행)
function extractInvoiceInfo() {
  try {
    // 결제 내역 테이블 찾기
    const table = document.querySelector('.billing-history-table');
    
    if (!table) {
      console.error('빌링 내역 테이블을 찾을 수 없습니다.');
      return { success: false, message: "빌링 내역 테이블을 찾을 수 없습니다." };
    }

    const rows = table.querySelectorAll('tbody tr');
    console.log('테이블 행 수:', rows.length);
    
    const transactions = [];

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      
      if (cells.length >= 5) {
        const invoiceId = cells[0].textContent.trim();
        let status = '';
        const statusElement = cells[1].querySelector('.billing-invoice-status');
        if (statusElement) {
          status = statusElement.textContent.trim();
        }
        const amount = cells[2].textContent.trim();
        const date = cells[3].textContent.trim();
        
        // "View" 링크 추출
        const viewLink = cells[4].querySelector('a')?.href;
        
        if (viewLink) {
          transactions.push({
            invoiceId,
            status,
            date,
            amount,
            viewLink
          });
          console.log(`행 ${index+1} 추출:`, date, amount, viewLink);
        }
      }
    });

    console.log('총 추출된 거래 수:', transactions.length);
    return { 
      success: true, 
      data: transactions,
      message: `${transactions.length}개의 거래 내역을 찾았습니다.`
    };
  } catch (error) {
    console.error('인보이스 정보 추출 중 오류:', error);
    return { success: false, message: `오류: ${error.message}` };
  }
}

// 빌링 내역 추출
function extractBillingData() {
  const selectedAccount = accountSelect.value;
  if (!selectedAccount) {
    showStatus('계정을 선택해주세요.', 'error');
    return;
  }
  
  showStatus('빌링 내역 추출 중...', '');
  
  // 현재 탭에서 직접 스크립트 실행
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: extractInvoiceInfo
    }).then((results) => {
      if (!results || !results[0] || !results[0].result) {
        showStatus('빌링 내역을 추출할 수 없습니다.', 'error');
        return;
      }
      
      const response = results[0].result;
      
      if (response && response.success) {
        // 추출된 데이터 처리
        const newTransactions = response.data.map(item => ({
          date: item.date,
          amount: item.amount,
          account: selectedAccount
        }));
        
        // 기존 데이터와 병합
        transactionData = [...transactionData, ...newTransactions];
        
        // 중복 제거 (날짜, 금액, 계정이 모두 동일한 항목)
        const uniqueTransactions = [];
        const seen = new Set();
        
        transactionData.forEach(item => {
          const key = `${item.date}|${item.amount}|${item.account}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueTransactions.push(item);
          }
        });
        
        transactionData = uniqueTransactions;
        
        // 저장 및 UI 업데이트
        chrome.storage.local.set({ transactions: transactionData }, () => {
          updateDataTable();
          showStatus(`${newTransactions.length}개의 거래 내역이 추가되었습니다.`, 'success');
        });
      } else {
        showStatus('빌링 내역 추출 실패: ' + (response ? response.message : '응답 없음'), 'error');
      }
    }).catch((error) => {
      showStatus('빌링 내역 추출 실패: ' + error.message, 'error');
      console.error('추출 오류:', error);
    });
  });
}

// 데이터 테이블 업데이트
function updateDataTable() {
  // 테이블 초기화
  const tbody = dataTable.querySelector('tbody');
  tbody.innerHTML = '';
  
  // 데이터 정렬 (날짜 기준 내림차순)
  const sortedData = [...transactionData].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // 테이블에 데이터 추가
  sortedData.forEach(item => {
    const row = document.createElement('tr');
    
    const dateCell = document.createElement('td');
    dateCell.textContent = item.date;
    row.appendChild(dateCell);
    
    const amountCell = document.createElement('td');
    amountCell.textContent = item.amount;
    row.appendChild(amountCell);
    
    const accountCell = document.createElement('td');
    accountCell.textContent = item.account;
    row.appendChild(accountCell);
    
    tbody.appendChild(row);
  });
  
  // 레코드 수 업데이트
  recordCount.textContent = `(${transactionData.length}건)`;
}

// 상태 메시지 표시
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type || '';
}

// 데이터 초기화
function clearData() {
  if (confirm('모든 거래 내역 데이터를 삭제하시겠습니까?')) {
    transactionData = [];
    chrome.storage.local.remove('transactions', () => {
      updateDataTable();
      showStatus('모든 거래 내역이 삭제되었습니다.', 'success');
    });
  }
}

// 엑셀로 저장
function saveToExcel() {
  if (transactionData.length === 0) {
    showStatus('저장할 데이터가 없습니다.', 'error');
    return;
  }
  
  // CSV 형식으로 변환
  const headers = ['날짜', '금액', '계정'];
  const csvContent = [
    headers.join(','),
    ...transactionData.map(item => 
      [
        `"${item.date}"`, 
        `"${item.amount}"`, 
        `"${item.account}"`
      ].join(',')
    )
  ].join('\n');
  
  // Blob 생성 및 다운로드
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `OpenAI_Billing_Data_${new Date().toISOString().slice(0, 10)}.csv`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  showStatus(`데이터가 저장되었습니다: ${filename}`, 'success');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);