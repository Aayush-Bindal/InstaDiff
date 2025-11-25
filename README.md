# InstaDiff - Instagram Unfollower Tracker

**InstaDiff** is a lightweight, privacy-focused Chrome and **Firefox** WebExtension designed to identify users who do not follow you back on Instagram.

This tool operates locally in your browser, performing a list comparison ("diff") without requiring you to log in to third-party services or use any of Instagram's official APIs.

## Key Features

* **Cross-Browser Compatible:** Works seamlessly on **Chrome and Firefox**.
* **Privacy-Focused:** Requires **no login** and operates entirely within your browser environment. Your password and data are never transmitted to an external server.
* **Automatic Scraping:** Features robust auto-scroll logic (`scraper.js`) to accurately capture long "Following" and "Followers" lists, handling Instagram's lazy loading mechanism.
* **Persistent History:** A dedicated "History" tab tracks and stores previous scan results in your browser's local storage, allowing you to monitor changes over time.
* **Data Export:** Easily download the list of non-followers as a **CSV** (compatible with Excel/Sheets) or a plain **TXT** file.
* **Actionable Results:** Click any username in the results list to open their Instagram profile in a new tab.
* **Data Management:** A "Reset Scanner Data" button allows you to clear the actively scraped lists for a fresh scan.

***

## 🚀 Installation (Developer Mode)

Since this tool uses HTML scraping, it is intended for personal use and must be installed via Developer Mode on both browsers.

### For Google Chrome

1.  **Download the Code:** Clone or download the source code files.
2.  **Open Extensions:** Navigate to `chrome://extensions/`.
3.  **Enable Developer Mode:** Toggle the **Developer mode** switch in the upper right corner to **ON**.
4.  **Load Extension:** Click the **Load unpacked** button.
5.  **Select Folder:** Choose the main directory containing the extension files.

### For Mozilla Firefox

1.  **Download the Code:** Clone or download the source code files.
2.  **Open Debugging:** Navigate to `about:debugging#/runtime/this-firefox` in the address bar.
3.  **Load Add-on:** Click the **Load Temporary Add-on...** button.
4.  **Select Manifest:** Navigate to your `InstaDiff` folder and select the **`manifest.json`** file.

***

## 🛠 Usage Instructions

1.  **Navigate to Profile:** Go to your own profile page on **Instagram.com**.
2.  **Scrape Following (Step 1):**
    * Click on your **Following** count to open the modal list.
    * Open the InstaDiff extension popup and click the **Scrape Following** button.
    * Wait for the scraping and scrolling process to complete (status updates are shown in the popup).
3.  **Scrape Followers (Step 2):**
    * Close the "Following" modal.
    * Click on your **Followers** count to open that list.
    * Open the InstaDiff popup and click the **Scrape Followers** button.
4.  **View Results:** The list of "Traitors" (users you follow who don't follow you back) will appear.
    * Click a name to visit their profile.
    * Use the **Download CSV** or **Download Text** buttons to export the list.
5.  **History:** Switch to the **History** tab to review previous scan results.

***

## 🛑 Important Disclaimer

* **Instagram ToS:** This tool performs client-side scraping. Use it responsibly and avoid excessive, rapid use, as Instagram may temporarily rate-limit your account.
* **Fragility:** Instagram's user interface is subject to frequent change. If the selectors used in `scraper.js` change, the scraping functionality may temporarily break until the code is updated.