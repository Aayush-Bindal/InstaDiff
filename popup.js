document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const btnFollowing = document.getElementById('btn-following');
  const btnFollowers = document.getElementById('btn-followers');
  const statusText = document.getElementById('status-text');
  
  // Tabs
  const tabScan = document.getElementById('tab-btn-scan');
  const tabHistory = document.getElementById('tab-btn-history');
  const viewScan = document.getElementById('view-scan');
  const viewHistory = document.getElementById('view-history');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // --- 1. INITIALIZATION ---
  chrome.storage.local.get(['following', 'followers'], (result) => {
    if(result.following) updateUI('following', result.following.length);
    if(result.followers) updateUI('followers', result.followers.length);
    if(result.following && result.followers) {
        renderDiffResult(calculateDiff(result.following, result.followers), false); 
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
                // Save to history automatically if results found
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

  // --- 4. DIFF & HISTORY LOGIC ---

  function calculateDiff(following, followers) {
    const followingSet = following;
    const followersSet = new Set(followers);
    return followingSet.filter(user => !followersSet.has(user));
  }

  // Updated to create Clickable Links
  function renderDiffResult(traitors, shouldSave) {
    const resultsArea = document.getElementById('results-area');
    const diffList = document.getElementById('diff-list');
    const diffCount = document.getElementById('diff-count');

    resultsArea.style.display = 'block';
    diffCount.innerText = traitors.length;
    
    diffList.innerHTML = '';
    
    // Create Clickable Rows
    traitors.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-row';
      
      const link = document.createElement('a');
      link.className = 'user-link';
      link.href = `https://www.instagram.com/${user}/`;
      link.target = '_blank'; // Opens in new tab
      link.innerText = user;
      
      div.appendChild(link);
      diffList.appendChild(div);
    });

    if (shouldSave) {
      addToHistory(traitors);
    }
  }

  function addToHistory(traitors) {
    if(traitors.length === 0) return;
    
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      count: traitors.length,
      users: traitors
    };

    chrome.storage.local.get({ history: [] }, (result) => {
      // Avoid duplicate save if top entry is identical
      const currentHistory = result.history;
      if (currentHistory.length > 0) {
        // Simple check: same count and same first user
        if (currentHistory[0].count === record.count && 
            JSON.stringify(currentHistory[0].users) === JSON.stringify(record.users)) {
          return;
        }
      }
      
      const newHistory = [record, ...result.history];
      chrome.storage.local.set({ history: newHistory });
    });
  }

  // Updated History UI with Links
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
        
        // Generate clickable links for the details section
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

  // Clear History
  btnClearHistory.addEventListener('click', () => {
    if(confirm('Are you sure you want to delete all scan history?')) {
        chrome.storage.local.set({ history: [] }, () => {
            loadHistoryUI();
        });
    }
  });

});