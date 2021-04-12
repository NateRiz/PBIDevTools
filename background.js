function isPbiReportUrl(url) {
	return /.*powerbi\.com.*\/rdlreports\/.*/.test(url)
}

function addNetworkListener(){
	chrome.webRequest.onHeadersReceived.addListener(function(response) {
    if (response["method"] != "POST"){
      return;
    }
    chrome.tabs.sendMessage(response.tabId, response);
	}, {
		urls: [
			"*://*.pbidedicated.windows.net/*/ping",
		  "*://*.analysis.windows.net/*/session",
      "*://*.powerbi.com/*"
		]}, ["responseHeaders"]);

  chrome.webRequest.onBeforeRequest.addListener(function(request){
    if (request["method"] != "POST"){
      return;
    }
    if (request.requestBody && request.requestBody.raw){
      var postedString = decodeURIComponent(String.fromCharCode.apply(null,
          new Uint8Array(request.requestBody.raw[0].bytes)));
          chrome.tabs.sendMessage(request.tabId, JSON.parse(postedString));
      }
  },
  {
    urls: ["<all_urls>"]}, ["blocking", "requestBody"])
}

function main() {
  addNetworkListener();

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		chrome.tabs.get(tabId, current_tab_info => {
			if (!isPbiReportUrl(current_tab_info.url)) {
				return
			}
      if(changeInfo.status === "complete"){
        chrome.tabs.insertCSS(tabId, {file:"style.css"});
      }
			chrome.tabs.executeScript(tabId, {
				file: './foreground.js'
			}, () => {});
		});
	});
}

main()