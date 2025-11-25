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
  // Load saved scan data to show counts on buttons
  chrome.storage.local.get(['following', 'followers'], (result) => {
    if(result.following) updateUI('following', result.following.length);
    if(result.followers) updateUI('followers', result.followers.length);
    // We don't auto-calculate diff on load anymore to prevent duplicate history entries
    // But if we wanted to show the last result, we could.
    if(result.following && result.followers) {
        renderDiffResult(calculateDiff(result.following, result.followers), false); // false = don't save to history
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

  // Handle messages from scraper.js
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
          
          // Check for Diff
          chrome.storage.local.get(['following', 'followers'], (res) => {
            if (res.following && res.followers) {
                const traitors = calculateDiff(res.following, res.followers);
                
                // Only save to history if we just finished the Followers scan (Step 2)
                // or if we just finished Following and already had Followers.
                // To avoid duplicates, let's strictly save when specific actions complete.
                // Simplest: Save every time a new diff is successfully calculated after a scrape.
                renderDiffResult(traitors, true); // true = save to history
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
    // Who is in Following but NOT in Followers
    return followingSet.filter(user => !followersSet.has(user));
  }

  function renderDiffResult(traitors, shouldSave) {
    const resultsArea = document.getElementById('results-area');
    const diffList = document.getElementById('diff-list');
    const diffCount = document.getElementById('diff-count');

    resultsArea.style.display = 'block';
    diffCount.innerText = traitors.length;
    
    diffList.innerHTML = '';
    traitors.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-row';
      div.innerText = user;
      diffList.appendChild(div);
    });

    if (shouldSave) {
      addToHistory(traitors);
    }
  }

  function addToHistory(traitors) {
    // prevent saving empty or duplicate spam (optional, keeping it simple here)
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      count: traitors.length,
      users: traitors
    };

    chrome.storage.local.get({ history: [] }, (result) => {
      const newHistory = [record, ...result.history]; // Add to top
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

      historyList.innerHTML = ''; // Clear current list

      history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Header (Clickable)
        div.innerHTML = `
          <div class="history-header">
            <span class="history-date">${item.date}</span>
            <span class="history-count">${item.count} Traitors</span>
          </div>
          <div class="history-details" style="display:none;">
            ${item.users.join('<br>')}
          </div>
        `;
        
        // Toggle details on click
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