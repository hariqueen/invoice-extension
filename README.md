# Invoice Downloader Extension

OpenAI 플랫폼(Stripe 기반)의 청구서(인보이스)를 자동으로 수집하고 PDF 파일로 일괄 다운로드할 수 있는 Chrome 확장 프로그램입니다.  
재경팀, 회계팀에서 매월 반복되는 청구서 수집 업무를 자동화하여 업무 효율을 극대화할 수 있도록 설계되었습니다.

---

## 주요 기능 (Key Features)

- 여러 개의 OpenAI 계정에 대한 청구서 내역 자동 수집 및 다운로드
- Chrome 확장 프로그램에서 직접 계정 관리 가능 (드롭다운 기반)
- 각 인보이스를 개별 PDF로 저장 (파일명 형식: `Invoice-XXXXXX.pdf`)
- 실시간 진행 상태 및 다운로드 결과 알림 제공
- Manifest V3 기반으로 최신 보안 정책에 완벽하게 대응

---

## 사용 대상 (Use Case)

- OpenAI API 사용 비용 정산을 담당하는 **재무/회계팀**
- 여러 계정의 청구서를 **월별 수집 및 전표화 작업**하는 기업
- ERP 연동을 위한 **PDF 수집 전처리 자동화** 도구가 필요한 경우

---

## ⚙️ How It Works

1. OpenAI [Billing 페이지](https://platform.openai.com/account/billing)로 이동합니다.
2. 확장 프로그램을 클릭한 뒤 계정을 선택하거나 추가합니다.
3. **[인보이스 다운로드]** 버튼을 클릭하면 자동으로 Stripe 인보이스 페이지를 열어 PDF를 다운로드합니다.
4. 모든 인보이스는 자동으로 저장되며, 진행상황은 실시간으로 표시됩니다.

---

## 🛠️ Tech Stack

- JavaScript (ES6)
- Chrome Extensions API (Manifest V3)
- Native DOM interaction
- `chrome.tabs`, `chrome.scripting`, `chrome.downloads` APIs

---

## 🗂 프로젝트 구조

invoice-extension/
├── background.js # 다운로드 프로세스 관리
├── content.js # Stripe 페이지 상의 버튼 감지 및 클릭 자동화
├── popup.html # 계정 선택/추가용 UI
├── popup.js # 계정 저장, 이벤트 처리
├── styles.css # UI 스타일 정의
├── manifest.json # 확장 프로그램 메타 정보
└── README.md # 프로젝트 설명


## Companion Project

이 확장 프로그램은 회사 내부 재경팀 자동화 프로젝트의 일부이며,  
업로드된 청구서 PDF와 별도로 전달받은 재무 데이터를 병합하는 웹사이트도 개발 중입니다.

👉 [invoice-merge-site](https://github.com/hariqueen/invoice-merge-site) _(개발 예정)_

---

## 📄 라이선스 (License)

MIT License © 2025 [Hari Kim](https://github.com/hariqueen)
