function isPbiReportUrl(url) {
	return /.*powerbi\.com.*\/rdlreports\/.*/.test(url)
}

function addNetworkListener(){
	chrome.webRequest.onHeadersReceived.addListener(function(response) {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, function(tabs) {
			if (response["method"] != "POST") {
				return
			}
      chrome.tabs.sendMessage(tabs[0].id, response);
		});
	}, {
		urls: [
			"<all_urls>"
		]
	}, ["responseHeaders"]);
}

function main() {
  addNetworkListener();

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		chrome.tabs.get(tabId, current_tab_info => {
			if (!isPbiReportUrl(current_tab_info.url)) {
				return
			}
      if(changeInfo.status === "complete"){
        chrome.tabs.insertCSS({file:"style.css"});
      }
			chrome.tabs.executeScript(tabId, {
				file: './foreground.js'
			}, () => {});
		});
	});
}

main()