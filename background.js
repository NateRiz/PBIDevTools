var deleteSessionUrl = ""

function isPbiReportUrl(url) {
	return /.*powerbi.*\.(net|com).*\/rdlreports\/.*/.test(url)
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
    if (request["method"] == "DELETE"){
      if(request.url == deleteSessionUrl){
        return {cancel: true};
      }
    }
    if (request["method"] != "POST"){
      return;
    }
    if (request.requestBody && request.requestBody.raw){
      var postedString = decodeURIComponent(String.fromCharCode.apply(null,
          new Uint8Array(request.requestBody.raw[0].bytes)));
            try{
              chrome.tabs.sendMessage(request.tabId, JSON.parse(postedString));
            } catch(err){
              
            }
      }
  },
  {
    urls: ["<all_urls>"]}, ["blocking", "requestBody"])

    chrome.webRequest.onBeforeSendHeaders.addListener(function(requestHeaders){
      if (requestHeaders["method"] != "POST"){
        return;
      }
      chrome.tabs.sendMessage(requestHeaders.tabId, requestHeaders);
      
    },
    {urls: [
			"*://*.pbidedicated.windows.net/*/ping",
      "*://*.powerbi.com/*"
		]}, ["requestHeaders"])
}

function addContentListener(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.deleteSessionUrl){
        deleteSessionUrl = request.deleteSessionUrl
      }
    }
  );
}

function main() {
  chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.browserAction.setPopup({"popup":"./popup.html"})
  });

  addNetworkListener();
  addContentListener();

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    chrome.tabs.executeScript(tabId, { file: './activityTypeParser.js' }, () => {});

		chrome.tabs.get(tabId, current_tab_info => {
			if (!isPbiReportUrl(current_tab_info.url)) {
				return
			}
      if(changeInfo.status === "complete"){
        chrome.tabs.insertCSS(tabId, {file:"style.css"});
      }
      chrome.tabs.executeScript(tabId, { file: "./jquery-2.2.0.min.js" }, function() {
        chrome.tabs.executeScript(tabId, { file: './foreground.js' }, () => {});
      });
		});
	});
}

main()
/*
TODO:
- copy to kusto query
- feature switches
- autofill TSG
- exportTo
- private chrome extensions
- info tooltips on toolbar features
- auth into adhoc accounts 
*/