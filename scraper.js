(async function() {
  // 1. HELPER: Find the exact element that has the scrollbar
  function findScrollableElement(modal) {
    // Get all divs inside the modal
    const divs = modal.querySelectorAll('div');
    
    for (const div of divs) {
      const style = window.getComputedStyle(div);
      // We look for a div that is set to scroll vertically
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        // Double check: does it actually have content taller than itself?
        if (div.scrollHeight > div.clientHeight) {
            return div;
        }
      }
    }
    // Fallback: If the list is short, it might not have a scrollbar yet, 
    // but the one with "overflow: hidden auto" is usually the target.
    return modal.querySelector('div[style*="overflow: hidden auto"]');
  }

  // 2. MAIN LOGIC
  const modal = document.querySelector('div[role="dialog"]');
  
  if (!modal) {
    chrome.runtime.sendMessage({ type: "ERROR", message: "Please open a Following/Followers list first!" });
    return;
  }

  const scrollBox = findScrollableElement(modal);

  if (!scrollBox) {
    chrome.runtime.sendMessage({ type: "ERROR", message: "Could not find the scrollable list. Try scrolling manually once." });
    return;
  }

  chrome.runtime.sendMessage({ type: "STATUS", message: "List found. Starting scroll..." });

  let users = new Set();
  let lastHeight = 0;
  let retries = 0;
  const MAX_RETRIES = 3; 

  // 3. THE SCROLL LOOP
  // We use a pseudo-recursive function to handle the async pausing smoothly
  async function scrollAndScrape() {
    
    // A. Scrape currently visible users
    // (We do this every loop because Instagram unloads top elements to save memory)
    const links = scrollBox.querySelectorAll('a[role="link"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      // Look for /username/ pattern
      const match = href.match(/^\/([a-zA-Z0-9_.]+)\/$/);
      if (match) {
        users.add(match[1]);
      }
    });

    // B. Send update to popup
    chrome.runtime.sendMessage({ type: "PROGRESS", count: users.size });

    // C. Scroll Logic
    const previousHeight = scrollBox.scrollHeight;
    
    // Scroll to bottom
    scrollBox.scrollTo(0, scrollBox.scrollHeight);
    
    // IMPORTANT: Dispatch a manual scroll event. 
    // Instagram's React needs this to know we moved.
    scrollBox.dispatchEvent(new Event('scroll', { bubbles: true }));

    // D. Wait for network request (Randomized to be safer)
    const waitTime = Math.floor(Math.random() * 800) + 1200; // 1.2s to 2.0s
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // E. Check if we grew
    const newHeight = scrollBox.scrollHeight;

    // F. Decide to continue or stop
    if (newHeight === previousHeight) {
      retries++;
      // Try a small wiggle just in case it got stuck
      scrollBox.scrollTo(0, scrollBox.scrollHeight - 100);
      await new Promise(resolve => setTimeout(resolve, 500));
      scrollBox.scrollTo(0, scrollBox.scrollHeight);
      
      if (retries >= MAX_RETRIES) {
        console.log("Reached bottom or stuck.");
        chrome.runtime.sendMessage({ type: "DONE", users: Array.from(users) });
        return; // STOP
      }
    } else {
      retries = 0; // Reset retries if we successfully found new content
    }

    // G. Loop
    scrollAndScrape();
  }

  // Start the process
  scrollAndScrape();

})();