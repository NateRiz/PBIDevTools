function isPbiReportUrl(url) {
	return /.*powerbi.*\.(net|com).*\/rdlreports\/.*/.test(url)
}

function isChromeLocalUrl(url) {
  return /chrome:\/\/.*/.test(url)
}

function addHeadersReceivedListener(){
  /**
   * Fills in info for debug toolbar
   */
  chrome.webRequest.onHeadersReceived.addListener(function(response) {
    if (response["method"] != "POST"){
      return;
    }
    chrome.tabs.sendMessage(response.tabId, response);
	}, {
		urls: [
			"*://*.pbidedicated.windows.net/*/ping", // ping (hostmode)
		  "*://*.analysis.windows.net/*/session", // session (raid)
		]}, ["responseHeaders"]);
}

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

function addBeforeRequestListener(){
  /**
   * Post: Gets TTL from anaheim and updates anaheim accordingly. Also gets some debug info from Track calls
   */
  chrome.webRequest.onBeforeRequest.addListener(function(request){
    if (request["method"] != "POST"){
      return;
    }
    if (request.requestBody && request.requestBody.raw){
      var postedString = decodeURIComponent(String.fromCharCode.apply(null,
          new Uint8Array(request.requestBody.raw[0].bytes)));
          try{
            chrome.tabs.sendMessage(request.tabId, JSON.parse(postedString));
          }catch{}
      }
  },
  {
    urls: [
      "*://*.pbidedicated.windows.net/*",
      "*://*.dc.services.visualstudio.com/v2/track"
    ]}, ["requestBody"])
}

function addTabUpdateListener(){
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (isChromeLocalUrl(tab.url)){
      return
    }

    //Below here are all non Chrome://xyz urls
    startScriptExecution('ActivityTypeTooltips', ['./activityTypeParser.js'], tabId)
    
    //Below here are only pbi reports
    if (!isPbiReportUrl(tab.url)) {
      return
    }

    chrome.webNavigation.getAllFrames({tabId:tabId},function(frames){
      frames.forEach((frame)=>{
        if(frame.parentFrameId == 0){
          startScriptExecution('DevToolbar', ['./Anaheim.js'], tabId, frame.frameId)
        }
      })
    });

    startScriptExecution('DevToolbar', ['./jquery-2.2.0.min.js', './PbiClients.js'], tabId, 0, ()=>{
      chrome.tabs.insertCSS(tabId, {'file':"style.css"});
    })

	});
}

function addContentListener(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.isKeepingSessionAlive){
        //Mirror it back so that it gets sent to the iframe
        chrome.tabs.sendMessage(sender.tab.id, request);
      }
    }
  );
}

function startScriptExecution(featureName, scriptFilePaths, tabId, frameId=0, callback=()=>{}, bypass=false){
  /**
   * Recursively executes all scripts passed in if the feature is enabled. Scripts are executed in order
   * @param {string} featureName name of the feature that will get checked in chrome storage
   * @param {Array[string]} scriptFilePaths all JS filepaths to get executed in order
   * @param {number} tabId tab to execute in
   * @param {number} frameId optional frame to execute inside the tab. Default 0 is top level.
   * @param {function} callback optional callback to run after all scripts execute
   * @param {boolean} bypass if there are multiple scripts, bypass checking feature status multiple times
   */
  let func = ()=>{
    scriptPath = scriptFilePaths.shift()
    chrome.tabs.executeScript(tabId, {'file': scriptPath, 'frameId': frameId}, () => {
      if (scriptFilePaths.length){
        startScriptExecution(featureName, scriptFilePaths,tabId, frameId, callback, true)
      }else{
        callback()
      }
    });
  };

  if(bypass){
    func()
  }else{
    getFeatureStatusFromStorage(featureName, func)
  }
}

function getFeatureStatusFromStorage(featureName, callback){
  /**
   * Gets features from chrome cloud storage and executes callback only if enabled.
   * featureNames are assumed to be enabled unless explicitly false. (even undefined/null is enabled)
   */
  chrome.storage.sync.get([featureName], function(data){
    var isFeatureEnabled = !(data[featureName] === false)
    if (isFeatureEnabled){
      callback()
    }
    return isFeatureEnabled;
  });
}

function addBrowserActionListener(){
  /**
   * Popup menu when the extension's icon is clicked.
   */
  chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.browserAction.setPopup({"popup":"./popup.html"})
  });
}

function main() {
  addBrowserActionListener();
  addHeadersReceivedListener();
  addBeforeRequestListener();
  addContentListener();
  addTabUpdateListener();
}

main()
/*
TODO:
- copy to kusto query
- feature switches
- autofill TSG
- exportTo
- private chrome extensions
- auth into adhoc accounts 
- fix edog raid
- train
- fix activities json loading in multiple times
*/