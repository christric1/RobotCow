// Kham booking script
console.log("Debug: Kham booking script loaded");

async function waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Wait for ${selector} timed out`);
}

async function findAndClickButton(targetDate) {
    // Row with date
    const rows = document.querySelectorAll('tr');

    // Find the button that matches the target date
    for (const row of rows) {
        const dateCell = row.querySelector('td');
        if (!dateCell) continue;
        
        const dateText = dateCell.textContent.trim().split('(')[0].trim();
        if (dateText.includes(targetDate)) {
            const button = row.querySelector('button:not([disabled])');
            button.click();
            return { success: true, message: 'Success: clicking button' };
        }
    }

    // If no button is found
    return { success: false, message: 'Failed: Can\'t find button' };
}

async function selectSeat(targetPrice, targetSeat) {
    // Wait for the table to load
    await waitForElement('.status_tr');
    const seatElements = document.querySelectorAll('.status_tr:not(.Soldout) td[data-title="票區："]');
    
    // Find the seat that matches the target price and area
    for (const seat of Array.from(seatElements)) {
        const seatInfo = parseSeatInfo(seat.textContent);
        if (!seatInfo) continue;
        
        // Convert targetPrice to number for comparison
        if (seatInfo.price === Number(targetPrice) && seatInfo.area === targetSeat) {
            seat.click();
            return { success: true, message: `選擇座位: ${targetPrice}元 ${targetSeat}區` };
        }
    }
    // If no seat is found
    return { success: false, message: 'Failed: Can\'t find seat' };
}

/**
 * Parse the seat information from the given text
 * @param {string} text The text to parse
 * @returns {Object|null} An object containing the area and price of the seat, or null if the text can't be parsed
 */
function parseSeatInfo(text) {
    const regex = /(\d+樓)?(紫|藍|紅|黃)?(\w+)區(\d+)元/;
    const match = text.match(regex);
    if (!match) return null;
    return {
        area: match[3],
        price: parseInt(match[4], 10)
    };
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const date = request.data.date;
    const price = request.data.price;
    const area = request.data.area;

    switch (request.action) {
        case 'findAndClickButton':
            findAndClickButton(date).then(sendResponse);
            break;
        case 'selectSeat':
            selectSeat(price, area).then(sendResponse);
            break;
    }
    return true;
});