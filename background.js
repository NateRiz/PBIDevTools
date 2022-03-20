var isKeepingSessionAlive = false;
var sessionUrl = ""
var bearerToken = ""
var routingHint = ""
var useLocalAnaheim = false

function isPbiReportUrl(url) {
  /**
   * This extension will run only on powerbi (service) domains or for local development.
   * 'rdlreports' for reports. 'datasets' for quicktable
   */
	return /.*powerbi.*\.(net|com).*\/(rdlreports|datasets)\/.*/.test(url) ||
  /.*portal\.analysis\.windows-int\.net.*\/(rdlreports|datasets)\/.*/.test(url)
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
      // return;
    }
    chrome.tabs.sendMessage(response.tabId, response);
	}, {
		urls: [
			"*://*.pbidedicated.windows.net/*/ping", // ping (hostmode)
			"*://*.pbidedicated.windows-int.net/*/ping", // ping (hostmode)
      "*://*.pbidedicated.windows.net/*/render", // ping (hostmode)
			"*://*.pbidedicated.windows-int.net/*/render", // ping (hostmode)
		  "*://*.analysis.windows.net/*/session", // session (raid)
		  "*://*.analysis-df.windows.net/*/session", // session (raid)
		]}, ["responseHeaders"]);
}

function addBeforeSendHeadersListener(){
  /**
   * For caching bearer token, ping url. 
   */
  chrome.webRequest.onBeforeSendHeaders.addListener(function(requestHeaders){
    if (requestHeaders.tabId == -1){
      //case of this script making a GET call
      return;
    }
    chrome.tabs.sendMessage(requestHeaders.tabId, requestHeaders);
  
  },
  {urls: [
    "*://*.pbidedicated.windows.net/*",
    "*://*.pbidedicated.windows-int.net/*",
    "*://*.analysis-df.windows.net/*",
    "*://*.analysis.windows.net/*",
    "*://*.powerbi.com/*"
  ]}, ["requestHeaders"]);
}

function onAnaheimLoad(tabId){
  chrome.webNavigation.getAllFrames({tabId:tabId},function(frames){
    frames.forEach((frame)=>{
      if(frame.parentFrameId === 0 && frame.url !== "about:blank"){
        startScriptExecution('DevToolbar', ['./Anaheim.js'], tabId, frame.frameId)
      }
    })
  });
}

function addBeforeRequestListener(){
  /**
   * Post: Gets TTL from anaheim and updates anaheim accordingly. Also gets some debug info from Track calls
   */
  chrome.webRequest.onBeforeRequest.addListener(function(request){
    if((/index.*js/).test(request.url) && request.tabId !== -1){
      onAnaheimLoad(request.tabId)
      if(useLocalAnaheim){
        return {redirectUrl: "https://localhost:4200/index.js"}
      }
    }

    if(request.method === "DELETE" && request.tabId !== -1){
      if (/.*\/session\/[a-z0-9]*$/.test(request.url))
      chrome.tabs.sendMessage(request.tabId, "DeleteSession")
    }

    if (request.method !== "POST"){
      return;
    }

    if (request.requestBody && request.requestBody.raw){
      var postedString = decodeURIComponent(new Uint8Array(request.requestBody.raw[0].bytes).reduce(function (data, byte) {
        return data + String.fromCharCode(byte);
      }, ''))
      try{
        chrome.tabs.sendMessage(request.tabId, JSON.parse(postedString));
      }catch{
        console.log(`couldnt parse json for request body: ${postedString}`)
      }
    }
  },
  {
    urls: [
      "*://*.pbidedicated.windows.net/*",
      "*://*.pbidedicated.windows-int.net/*",
      "*://*.dc.services.visualstudio.com/v2/track",
      "*://*.content.powerapps.com/*", // Redirecting Anaheim cdn
      "*://*.powerbi.com/*",
      "*://*.analysis-df.windows.net/*",
    ]}, ["requestBody"])
}

function addOnErrorOccurredListener(){
  chrome.webRequest.onErrorOccurred.addListener(function(response){
    message = {"LocalAnaheimError": response.error}
    chrome.tabs.sendMessage(response.tabId, message);
  },
  {
    urls: [
      "https://localhost:4200/index.js",
    ]}, [])
}

function addTabUpdateListener(){
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    getFeatureStatusFromStorage("UseLocalAnaheim", (isFeatureEnabled) => {useLocalAnaheim = isFeatureEnabled;})
    
    if(changeInfo.url){
      // Navigating to a different page. Clean up leftover html.
      chrome.tabs.sendMessage(tabId, "CleanupOnNavigate");
    }

    //Below here are all non Chrome://xyz urls
    if (isChromeLocalUrl(tab.url)){
      return
    }

    //Below here are only pbi reports
    if (!isPbiReportUrl(tab.url)) {
      return
    }

    startScriptExecution('UseLocalAnaheim', ['./LocalAnaheim.js'], tabId)
    startScriptExecution('DevToolbar', ['./exportApi.js', './PbiClients.js'], tabId, 0, ()=>{
      chrome.scripting.insertCSS({target: {tabId: tabId}, files: ["style.css"]});
    })
	});
}

function expireSession(request, sendResponse){
  const response = fetch(request.sessionUrl, {
    method: 'DELETE',
    headers: {
       'Authorization': request.bearerToken,
       'x-ms-routing-hint': request.routingHint
    }}).then(() => sendResponse());
}

function pollRenderStatus(request, sendResponse){
  fetch(request.url, {
      method: 'GET',
      headers: {
        'Authorization': request.bearerToken,
        'x-ms-routing-hint': request.routingHint
      }
  }).then((response) => {
    return response.json()
  }).then((response) =>{
    sendResponse(response)
  })
}

function addContentListener(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.isKeepingSessionAlive){
        //Mirror it back so that it gets sent to the iframe
        chrome.tabs.sendMessage(sender.tab.id, request);
      }
      else if (request.sessionUrl){
        expireSession(request, sendResponse);
      }
      else if (request.pollRenderStatus){
        pollRenderStatus(request, sendResponse)
        return true;
      }
    }
  );
}

function startScriptExecution(featureName, scriptFilePaths, tabId, frameId=0, callback){
  /**
   * Recursively executes all scripts passed in if the feature is enabled. Scripts are executed in order
   * @param {string} featureName name of the feature that will get checked in chrome storage
   * @param {Array[string]} scriptFilePaths all JS filepaths to get executed in order
   * @param {number} tabId tab to execute in
   * @param {number} frameId optional frame to execute inside the tab. Default 0 is top level.
   * @param {function} callback optional callback to run after all scripts execute
   */

  getFeatureStatusFromStorage(featureName, (isFeatureEnabled) =>{
    if(isFeatureEnabled){
      chrome.scripting.executeScript({
        target: {tabId: tabId, frameIds: [frameId]},
        files: scriptFilePaths
      },
      callback
      );
    }
  })

}

function getFeatureStatusFromStorage(featureName, callback){
  /**
   * Gets features from chrome cloud storage and executes callback with the result.
   * featureNames are disabled unless explicitly true.
   */
  chrome.storage.sync.get([featureName], function(data){
    var isFeatureEnabled = (data[featureName] === true)
    callback(isFeatureEnabled)
  });
}

function addActionListener(){
  /**
   * Popup menu when the extension's icon is clicked.
   */
  chrome.action.onClicked.addListener(function(tab) {
    chrome.action.setPopup({"popup":"./popup.html"})
  });
}

function addOnInstallListener(){
  chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
      chrome.storage.sync.get(["DevToolbar"], function(data){
        if (data.DevToolbar !== undefined){
          return;
        }
        chrome.storage.sync.set({"DevToolbar": true})
        chrome.storage.sync.set({"UseLocalAnaheim": false})
      })
    }
  });
}

function main() {
  addActionListener();
  addBeforeSendHeadersListener();
  addHeadersReceivedListener();
  addBeforeRequestListener();
  addContentListener();
  addOnErrorOccurredListener();
  addTabUpdateListener();
  addOnInstallListener();
}

main()
/*
TODO:
- feature switches
- autofill TSG
- private chrome extensions
- auth into adhoc accounts 
- fix edog raid
- train
- faster way to get auth token besides ping
- css being injected many many times
- debug bar scrollable
*/