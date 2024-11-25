/*
    Note:

    1. 單向溝通：
    Popup ⟶ Background：chrome.runtime.sendMessage()
    Background ⟶ Content：chrome.tabs.sendMessage()
    Content ⟶ Background：chrome.runtime.sendMessage()

    2. 雙向溝通（請求/回應）：
    Popup ⟷ Background：chrome.runtime.sendMessage() / sendResponse
    Background ⟷ Content：chrome.tabs.sendMessage() / sendResponse

    3. 間接溝通：
    Popup ⟷ Content：需要透過 Background 中轉
*/

// Delays execution for a specified number of milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Booking sites
const BOOKING_SITES = [
    {
        pattern: 'kham.com',
        site: 'kham'
    }
];

// Booking steps
const STEPS = {
    KHAM: {
        SELECTING_DATE: 'selecting_date',
        SELECTING_SEAT: 'selecting_seat',
    },
    INIT: 'initializing',
    COMPLETED: 'completed',
    NULL: 'null',
};

// Booking state and info
const bookingInfo = {
    currentStep: STEPS.NULL,
    bookingData: {
        date: null,
        price: null,
        area: null
    },
    site: null,
    tabId: null,
};

/**
 * Get the booking site based on the given URL
 * @param {string} url URL of the booking page
 * @returns {string} The booking site, or 'NULL' if no match is found
 */
function getBookingSite(url) {
    const lowerUrl = url.toLowerCase();
    const matchedPattern = BOOKING_SITES.find(element => 
        lowerUrl.includes(element.pattern)
    );
    return matchedPattern ? matchedPattern.site : 'NULL';
}

async function executeKhamBooking(tabId) {
    // Initialize booking steps
    if (bookingInfo.currentStep === STEPS.INIT) {
        bookingInfo.currentStep = STEPS.KHAM.SELECTING_DATE;
    }

    console.log("Kham booking step: " + bookingInfo.currentStep);

    // Execute booking steps
    switch (bookingInfo.currentStep) {

        // Selecting date
        case STEPS.KHAM.SELECTING_DATE:
            const clickResult = await chrome.tabs.sendMessage(tabId, {
                action: 'findAndClickButton',
                data: bookingInfo.bookingData
            });

            if (clickResult.success) {
                bookingInfo.currentStep = STEPS.KHAM.SELECTING_SEAT;
                return { success: true, message: 'Success: clicking button' };
            }
            return { success: false, message: 'Failed: clicking button' };
        
        // Selecting seat 
        case STEPS.KHAM.SELECTING_SEAT:
            const seatResult = await chrome.tabs.sendMessage(tabId, {
                action: 'selectSeat',
                data: bookingInfo.bookingData
            });

            if (seatResult.success) {
                bookingInfo.currentStep = STEPS.COMPLETED;
                return { success: true, message: 'Success: selecting seat' };
            }
            return { success: false, message: 'Failed: selecting seat' };
        
        // Completed
        case STEPS.COMPLETED:
            return { success: true, message: 'Success: booking completed' };

        default:
            return { success: false, message: 'Unknown booking step' };
    }
}

/**
 * Execute the booking process based on the site
 * @param {number} tabId Tab ID of the booking page
 * @returns {Promise<{success: boolean, message: string}>} The result of the booking process
 */
async function executeBooking(tabId) {
    const site = bookingInfo.site;

    // Execute booking process based on the site
    if (site === 'kham') {
        const response = await executeKhamBooking(tabId);
        return response;
    } else {
        return {
            success: false,
            message: 'Failed: unknown booking site'
        };
    }
}

async function handleBooking(data, tab) {
    // Initialize booking info
    bookingInfo.bookingData = {
        date: String(data.date),
        price: String(data.price),
        area: String(data.area)
    };
    bookingInfo.site = getBookingSite(tab.url);
    bookingInfo.tabId = tab.id;
    bookingInfo.currentStep = STEPS.INIT;
    console.log('Booking info:', bookingInfo);

    // Execute booking process  
    const response = await executeBooking(tab.id);
    return response;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === bookingInfo.tabId && 
        changeInfo.status === "complete" && 
        bookingInfo.currentStep !== STEPS.COMPLETED) {
        (async () => {
            await sleep(2000);
            await executeBooking(tabId);
        })();
    }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startBooking') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            handleBooking(request.data, currentTab)
                .then(sendResponse)
                .catch(error => {
                    sendResponse({ 
                        success: false, 
                        message: error.message 
                    });
                });
        });
        return true;
    }
});