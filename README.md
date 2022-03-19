# PBIDevTools

## Table of Contenats
1. [Installation](#installation)
1. [Usage](#usage)

## Installation
---
```
git clone https://github.com/NateRiz/PBIDevTools
```
1. In Chrome or Edge: `chrome://extensions` or `edge://extensions`
1. Enable **Developer Mode**
1. Click **Load Unpacked** and navigate to root of **.\PbiDevTools**
1. [Optional]: Pin the extension by clicking the puzzle piece next to the url bar then the thumbtack next to PbiDevTools

## Usage
---
To enable a feature, click the PBIDevTools's extension icon and use the toggle. 
### Dev Toolbar
1. Render Information
1. RDL Information
1. Session Status
   1. Allow Session Expiration: If disabled, sends fake keydown events to the page to trick it into thinking the user is active
1. ExportTo API
1. Performance
   1. Gives performance for a specific render
   1. Specify # of tests and **Start** to auto run multiple renders (not simultaneously) and generate a CSV & rdl report for the performance. Cannot interact with the page during this.

### Use Local Anaheim
1. If enabled, will overlay your locally served instance of Anaheim over the page
   1. This is done by forcing a redirect from the CDN to localhost:4200
2. Note: It is likely buggy. Also disables PingWorker

### Activity Type Lookup
1. Just a big table from activity types : full activity name for quicker lookup. Scraped these one time, they are not updated with new activity types.
