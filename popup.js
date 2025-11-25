document.addEventListener('DOMContentLoaded', () => {
  const btnFollowing = document.getElementById('btn-following');
  const btnFollowers = document.getElementById('btn-followers');
  const statusText = document.getElementById('status-text');
  
  // Load saved data on startup
  chrome.storage.local.get(['following', 'followers'], (result) => {
    if(result.following) updateUI('following', result.following.length);
    if(result.followers) updateUI('followers', result.followers.length);
    checkDiff(result.following, result.followers);
  });

  // Button Listeners
  btnFollowing.addEventListener('click', () => injectScraper('following'));
  btnFollowers.addEventListener('click', () => injectScraper('followers'));

  // Function to run scraper
  function injectScraper(listType) {
    statusText.innerHTML = `<span style="color:#0095F6">Scraping ${listType}... Please keep this popup open.</span>`;
    
    // Save which list we are currently scraping
    chrome.storage.local.set({ currentScrapeType: listType });

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['scraper.js']
      });
    });
  }

  // Listen for messages from scraper.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ERROR") {
      statusText.innerHTML = `<span style="color:red">${message.message}</span>`;
    } 
    else if (message.type === "PROGRESS") {
      statusText.innerHTML = `Scanning... Found <strong>${message.count}</strong> users.`;
    } 
    else if (message.type === "DONE") {
      chrome.storage.local.get(['currentScrapeType'], (result) => {
        const type = result.currentScrapeType;
        
        // Save the result list
        let data = {};
        data[type] = message.users;
        chrome.storage.local.set(data, () => {
          updateUI(type, message.users.length);
          
          // Check if we can run the diff now
          chrome.storage.local.get(['following', 'followers'], (res) => {
            checkDiff(res.following, res.followers);
            
            // Update Instructions for next step
            if(type === 'following') {
              statusText.innerHTML = "<strong>Done!</strong> Now close that list, open 'Followers', and click Step 2.";
            } else {
              statusText.innerHTML = "<strong>Done!</strong> Check the results below.";
            }
          });
        });
      });
    }
  });

  function updateUI(type, count) {
    document.getElementById(`count-${type}`).innerText = `${count} scraped`;
    document.getElementById(`btn-${type}`).innerText = `Re-Scrape ${type}`;
  }

  function checkDiff(following, followers) {
    if (!following || !followers) return; // Wait until we have both

    const followingSet = following;
    const followersSet = new Set(followers);
    
    // The Diff Logic: Who is in Following but NOT in Followers
    const traitors = followingSet.filter(user => !followersSet.has(user));

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
  }
});