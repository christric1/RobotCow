document.addEventListener('DOMContentLoaded', function() {
  // Get Dom elements
  const dateInput = document.getElementById('dateInput');
  const priceInput = document.getElementById('priceInput');
  const seatArea = document.getElementById('seatArea');
  const findButton = document.getElementById('findButton');
  const status = document.getElementById('status');

  // Event listeners
  findButton.addEventListener('click', async () => {
    const selectedDate = dateInput.value;
    const selectedPrice = priceInput.value;
    const selectedSeat = seatArea.value.toUpperCase();

    if (!selectedDate || !selectedPrice || !selectedSeat) {
        status.textContent = '請填寫所有欄位！';
        return;
    }

    const formattedDate = formatDate(selectedDate);
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // ==================== Step1: ===================
    // Select the target date and click the button
    const clickResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: findAndClickButton,
        args: [formattedDate, selectedPrice, selectedSeat]
    });

    if (clickResult[0].result !== 0) {
        status.textContent = '選擇指定日期場次失敗!';
        return;
    }

    // ==================== Step2: ===================
    // Select the target seat section and ticket price 
    // await new Promise(resolve => setTimeout(resolve, 1000));
    const seatResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: selectSeat,
        args: [selectedPrice, selectedSeat]
    });

    if (seatResult[0].result !== 0) {
      status.textContent = '選擇指定座位區域失敗!';
      return;
    }

    // ==================== Step3: ===================

  });

  function formatDate(dateString) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
  }
});

function findAndClickButton(targetDate) {
  const rows = document.querySelectorAll('tr');
  for (const row of rows) {
    const dateCell = row.querySelector('td');
    if (!dateCell) continue;
    const dateText = dateCell.textContent.trim().split('(')[0].trim();
    
    if (dateText.includes(targetDate)) {
      const buttons = row.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent.trim() === '立即訂購') {
          button.click();
          console.log('成功點擊購票按鈕');
          return 0;
        }
      }
      console.log('找到日期但無法點擊按鈕');
      return -1;
    }
  }
  console.log('找不到指定日期場次');
  return -1;
}

function selectSeat(targetPrice, targetSeat) {
  const seatElements = document.querySelectorAll('.status_tr:not(.Soldout) td[data-title="票區："]'); 
  console.log(`剩餘 ${seatElements.length} 個票區`);

  // Print target seat info
  console.log(`開始執行搶票...`);
  console.log(`目標票價: ${targetPrice}`);
  console.log(`目標座位: ${targetSeat}`);

  // Prioity1: 
  for (const seat of seatElements) {
    const text = seat.textContent;
    const seatInfo = parseSeatInfo(text);

    if(seatInfo === null) {
      continue;
    }
    
    if (seatInfo.price === targetPrice && seatInfo.area === targetSeat) {
      seat.click();
      console.log(`已選擇 ${targetPrice}元 ${targetSeat} 區域的座位`);
      return;
    }
  }

  function parseSeatInfo(text) {
    const regex = /(\d+樓)?(紫|藍|紅|黃)?(\w+)區(\d+)元/;
    const match = text.match(regex);
    if (match) {
        const area = match[3];  
        const price = match[4]; 
        return { area, price };
    } else {
        return null;
    }
  }
}