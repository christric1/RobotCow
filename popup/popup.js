document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const dateInput = document.getElementById('dateInput');
    const priceInput = document.getElementById('priceInput');
    const seatArea = document.getElementById('seatArea');
    const findButton = document.getElementById('findButton');
    const status = document.getElementById('status');

    // Set default values
    document.getElementById('dateInput').value = '2025-01-10';
    document.getElementById('priceInput').value = '3600';
    document.getElementById('seatArea').value = '2B';


    // Event listeners
    findButton.addEventListener('click', async () => {
        const selectedDate = dateInput.value;
        const selectedPrice = priceInput.value;
        const selectedSeat = seatArea.value.toUpperCase();

        if (!selectedDate || !selectedPrice || !selectedSeat) {
            status.textContent = '請填寫所有欄位！';
            return;
        }

        // Send message to the background.js
        chrome.runtime.sendMessage({
            action: 'startBooking',
            data: {
                date: formatDate(selectedDate),
                price: selectedPrice,
                area: selectedSeat
            }
        }, response => {
            status.textContent = response.message;
        });
  });

    // Listen for messages from the background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'statusUpdate') {
            status.textContent = request.data.status;
        }
    });

    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }
});

