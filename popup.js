document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const btnFollowing = document.getElementById('btn-following');
  const btnFollowers = document.getElementById('btn-followers');
  const statusText = document.getElementById('status-text');
  
  // Download Buttons
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnDownloadTxt = document.getElementById('btn-download-txt');
  
  // Tabs
  const tabScan = document.getElementById('tab-btn-scan');
  const tabHistory = document.getElementById('tab-btn-history');
  const viewScan = document.getElementById('view-scan');
  const viewHistory = document.getElementById('view-history');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // State
  let currentTraitors = [];

  // --- 1. INITIALIZATION ---
  chrome.storage.local.get(['following', 'followers'], (result) => {
    if(result.following) updateUI('following', result.following.length);
    if(result.followers) updateUI('followers', result.followers.length);
    if(result.following && result.followers) {
        const traitors = calculateDiff(result.following, result.followers);
        renderDiffResult(traitors, false); 
    }
  });

  // --- 2. TAB LOGIC ---
  tabScan.addEventListener('click', () => {
    tabScan.classList.add('active');
    tabHistory.classList.remove('active');
    viewScan.style.display = 'block';
    viewHistory.style.display = 'none';
  });

  tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('active');
    tabScan.classList.remove('active');
    viewHistory.style.display = 'block';
    viewScan.style.display = 'none';
    loadHistoryUI();
  });

  // --- 3. SCRAPER LOGIC ---
  btnFollowing.addEventListener('click', () => injectScraper('following'));
  btnFollowers.addEventListener('click', () => injectScraper('followers'));

  function injectScraper(listType) {
    statusText.innerHTML = `<span style="color:#0095F6">Scraping ${listType}... Please wait & keep popup open.</span>`;
    chrome.storage.local.set({ currentScrapeType: listType });

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['scraper.js']
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ERROR") {
      statusText.innerHTML = `<span style="color:#FF3040">${message.message}</span>`;
    } 
    else if (message.type === "PROGRESS") {
      statusText.innerHTML = `Scanning... Found <strong>${message.count}</strong> users.`;
    } 
    else if (message.type === "DONE") {
      chrome.storage.local.get(['currentScrapeType'], (result) => {
        const type = result.currentScrapeType;
        let data = {};
        data[type] = message.users;
        
        chrome.storage.local.set(data, () => {
          updateUI(type, message.users.length);
          
          chrome.storage.local.get(['following', 'followers'], (res) => {
            if (res.following && res.followers) {
                const traitors = calculateDiff(res.following, res.followers);
                renderDiffResult(traitors, true); 
            }
            statusText.innerHTML = (type === 'following') 
              ? "<strong>Following Done!</strong> Now open 'Followers' and click Step 2."
              : "<strong>All Done!</strong> Results calculated and saved.";
          });
        });
      });
    }
  });

  function updateUI(type, count) {
    document.getElementById(`count-${type}`).innerText = `${count} scraped`;
    document.getElementById(`btn-${type}`).innerText = `Re-Scrape ${type}`;
  }

  // --- 4. DIFF & DOWNLOAD LOGIC ---

  function calculateDiff(following, followers) {
    const followingSet = following;
    const followersSet = new Set(followers);
    return followingSet.filter(user => !followersSet.has(user));
  }

  function renderDiffResult(traitors, shouldSave) {
    currentTraitors = traitors; // Save to global variable for download
    
    const resultsArea = document.getElementById('results-area');
    const diffList = document.getElementById('diff-list');
    const diffCount = document.getElementById('diff-count');

    resultsArea.style.display = 'block';
    diffCount.innerText = traitors.length;
    
    diffList.innerHTML = '';
    
    traitors.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-row';
      const link = document.createElement('a');
      link.className = 'user-link';
      link.href = `https://www.instagram.com/${user}/`;
      link.target = '_blank';
      link.innerText = user;
      div.appendChild(link);
      diffList.appendChild(div);
    });

    if (shouldSave) addToHistory(traitors);
  }

  // --- DOWNLOAD FUNCTIONS ---
  btnDownloadCsv.addEventListener('click', () => {
    if(!currentTraitors.length) return;
    const csvContent = "data:text/csv;charset=utf-8," + "Username,Profile URL\n" + 
        currentTraitors.map(u => `${u},https://instagram.com/${u}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traitors_list_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnDownloadTxt.addEventListener('click', () => {
    if(!currentTraitors.length) return;
    const txtContent = "People not following you back:\n\n" + currentTraitors.join("\n");
    
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `traitors_list_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });


  // --- 5. HISTORY ---
  function addToHistory(traitors) {
    if(traitors.length === 0) return;
    
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      count: traitors.length,
      users: traitors
    };

    chrome.storage.local.get({ history: [] }, (result) => {
      const currentHistory = result.history;
      if (currentHistory.length > 0) {
        if (currentHistory[0].count === record.count && 
            JSON.stringify(currentHistory[0].users) === JSON.stringify(record.users)) {
          return;
        }
      }
      const newHistory = [record, ...result.history];
      chrome.storage.local.set({ history: newHistory });
    });
  }

  function loadHistoryUI() {
    const historyList = document.getElementById('history-list');
    chrome.storage.local.get({ history: [] }, (result) => {
      const history = result.history;
      
      if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #555; font-size: 12px;">No history found.</p>';
        return;
      }

      historyList.innerHTML = ''; 

      history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const userLinksHTML = item.users.map(u => 
          `<div class="user-row"><a class="user-link" href="https://www.instagram.com/${u}/" target="_blank">${u}</a></div>`
        ).join('');

        div.innerHTML = `
          <div class="history-header">
            <span class="history-date">${item.date}</span>
            <span class="history-count">${item.count} Traitors</span>
          </div>
          <div class="history-details" style="display:none;">
            ${userLinksHTML}
          </div>
        `;
        
        div.querySelector('.history-header').addEventListener('click', () => {
          const details = div.querySelector('.history-details');
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
        });

        historyList.appendChild(div);
      });
    });
  }

  btnClearHistory.addEventListener('click', () => {
    if(confirm('Delete all history?')) {
        chrome.storage.local.set({ history: [] }, () => {
            loadHistoryUI();
        });
    }
  });

});