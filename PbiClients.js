
if (haveVaraiablesBeenInitiated === undefined){
    var haveVaraiablesBeenInitiated = true
    var isKeepingSessionAlive = false;
    var sessionUrl = ""
    var bearerToken = ""
    var routingHint = ""
    var apiBaseUrl = ""
    var lastExportID = ""
}

function isPingUrl(url){
    return /.*pbidedicated.window.*.net.*ping/.test(url)
}

function isPingUrl(url){
    return /.*pbidedicated.window.*.net.*ping/.test(url)
}

function toggleModal(){
    var modal = document.querySelector(".PbiDevContainer")
    if(!modal){
        return;
    }
    var display = modal.style.display
    display = (display == "none" ? "block" : "none");
    modal.style.display = display
}

function expireSession() {
    chrome.runtime.sendMessage({
        sessionUrl: sessionUrl,
        bearerToken: bearerToken,
        routingHint: routingHint,
        expireSession: true
    })
    
}

function createModal(){
    fetch(chrome.runtime.getURL('/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);

        document.querySelector("#PbiDevExpireNow").onclick = expireSession
        document.querySelector("#PbiDevPingToggle").onclick = toggleKeepSessionAlive
        document.querySelector("#PbiDevAPIExport").onclick = APIExport
        document.querySelector("#PbiDevAPIGetStatus").onclick = APIGetStatus
        document.querySelector("#PbiDevAPISave").onclick = APISave

        var apiUrls = {
            "msit.powerbi.com":"https://api.powerbi.com",
            "dxt.powerbi.com":"https://dxtapi.powerbi.com",
            "powerbi-df.analysis-df.windows.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "powerbi-wow-int3.analysis-df.windows.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "daily.powerbi.com":"https://dailyapi.powerbi.com"
        }
        var domain = window.location.hostname
        if (domain in apiUrls){
            apiBaseUrl = apiUrls[domain]
        }
        document.querySelector("#PbiDevAPIUrl").textContent = (isExportAPIEnabled() ? apiBaseUrl : "Ring not supported.")

        var copyImages = document.querySelectorAll(".PbiDevCopy")
        copyImages.forEach(function(image){
            image.src = chrome.runtime.getURL("./copy.png");
            image.onclick = function(){
                var siblingId = image.id.replace("Copy","")
                var text = document.querySelector("#" + siblingId)
                var textArea = document.createElement("textarea");
                textArea.value = text.textContent;
                document.body.appendChild(textArea);
                textArea.select()
                document.execCommand("copy")
                textArea.remove();
            }
        })

        var sessionExpireInfo = document.querySelectorAll(".PbiDevInfo")
        sessionExpireInfo.forEach((img)=>{
            img.src = chrome.runtime.getURL("./info.png")
            var tooltip = document.querySelector("#"+ img.id +"Tooltip")
            tooltip.style.display = "none";
            img.onclick = function(){
                if (!tooltip){return;}
                var display = tooltip.style.display
                display = (display == "none" ? "block" : "none");
                tooltip.style.display = display
            }
        })

    });
}

function isExportAPIEnabled(){
    return apiBaseUrl !== ""
}

function APIExport(){
    if (!isExportAPIEnabled()){
        return;
    }
    var statusCode = -1
    var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
    var exportStatusLabel = document.querySelector("#PbiDevAPIExportStatus")
    var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
    var resultTextArea = document.querySelector("#PbiDevAPIResult")
    var body = document.querySelector("#PbiDevAPIBody").value
    var url = window.location.href
    var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
    var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
    var apiUrl = `${apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exportTo`

    fetch(apiUrl, {
        method: 'POST',
        headers: {'Authorization': bearerToken,'Content-Type': 'application/json'},
        body: body
    }).then((response) => {
        statusCode = response.status
        requestIdLabel.textContent = response.headers.get('requestid')
        statusCodeLabel.textContent = response.status
        return response.json()
    }).then((data) => {
        resultTextArea.value = JSON.stringify(data, null, 4)
        if (statusCode == 202){
            lastExportID = data["id"]
            exportStatusLabel.textContent = data["status"]
        }
    })
}

function APIGetStatus(){
    if (!isExportAPIEnabled() || lastExportID === ""){
        return;
    }
    var statusCode = -1
    var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
    var exportStatusLabel = document.querySelector("#PbiDevAPIExportStatus")
    var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
    var resultTextArea = document.querySelector("#PbiDevAPIResult")
    var url = window.location.href
    var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
    var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
    var apiUrl = `${apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${lastExportID}`

    fetch(apiUrl, {
        method: 'GET',
        headers: {'Authorization': bearerToken}
    }).then((response) => {
        statusCode = response.status
        requestIdLabel.textContent = response.headers.get('requestid')
        statusCodeLabel.textContent = response.status
        return response.json()
    }).then((data) => {
        resultTextArea.value = JSON.stringify(data, null, 4)
        if (statusCode == 200 || statusCode == 202){
            exportStatusLabel.textContent = data["status"]
        }
    })
}

function APISave(){
    if (!isExportAPIEnabled() || lastExportID === ""){
        return;
    }
    var statusCode = -1
    var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
    var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
    var url = window.location.href
    var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
    var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
    var apiUrl = `${apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${lastExportID}/file`

    fetch(apiUrl, {
        method: 'GET',
        headers: {'Authorization': bearerToken}
    }).then((response) => {
        statusCode = response.status
        requestIdLabel.textContent = response.headers.get('requestid')
        statusCodeLabel.textContent = response.status
        return response.blob()
    }).then((blob) => { 
        var file = window.URL.createObjectURL(blob)
        window.location.assign(file)
    })
}

function toggleKeepSessionAlive(){
    isKeepingSessionAlive = !document.querySelector("#PbiDevPingToggle").checked
    chrome.runtime.sendMessage({"isKeepingSessionAlive":isKeepingSessionAlive})
}

function enableDeleteSessionButton(){
    var deleteSessionButton = document.querySelector("#PbiDevExpireNow")
    if (deleteSessionButton){
        deleteSessionButton.disabled = false;
    }
}

function createDebugButton(button) {
    var button = document.querySelector("#feedbackMenuBtn");


    //Clone button to remove click functionality
    debugButton = button.cloneNode(true);
    parent = button.parentNode;
    parent.removeChild(button);

    //Replace Image
    var style = debugButton.querySelector(".pbi-glyph-smiley")
    style.classList.remove("pbi-glyph-smiley")
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("./debug16.png");
    img.id = "PBIDevToolImageId"
    style.appendChild(img);

    //new functionality
    debugButton.onclick = toggleModal;

    //Insert after Help button
    parent.insertBefore(debugButton, document.querySelector("#helpMenuBtn").nextSibling)
}

function isAlreadyInjected() {
    return document.querySelector("#PBIDevToolImageId") != null;
}

function isPageLoaded(){
    return [
        document.querySelector("#feedbackMenuBtn"),
        document.querySelector("#rootContent")
    ].every(function(x){
        return x != null;
    })
}

function updateToolbarResult(id, value){
    if (id === "PbiDevHostMode"){
        if (value.includes("autopremiumhost")){
            value = "AutoPremium"
        }else{
            value = "Classic"
        }
    }

    if (id === "PbiDevCluster"){
        value = value.match(/https:\/\/(.*)-redirect/)[1]
    }

    var node = document.querySelector("#"+id)
    if (node){
        node.textContent = value;
    }
}

function updateSessionTimer(timeSinceLastInteractionMs){
    var timeSinceLastInteractionSec = Math.round(timeSinceLastInteractionMs / 1000)

    var foregroundTimeout = 10 * 60 - timeSinceLastInteractionSec
    var backgroundTimeout = 60 * 60 - timeSinceLastInteractionSec
    
    var mins = Math.floor(foregroundTimeout / 60)
    var secs = foregroundTimeout % 60
    var time = mins.toString().padStart(2, '0')+":"+secs.toString().padStart(2, '0')
    updateToolbarResult("PbiDevTTLFG", time)

    mins = Math.floor(backgroundTimeout / 60)
    secs = backgroundTimeout % 60
    time = mins.toString().padStart(2, '0')+":"+secs.toString().padStart(2, '0')
    updateToolbarResult("PbiDevTTLBG", time)
}

function networkDispatcher(message, sender, sendResponse){
    textIds = {
        "requestid": "PbiDevRaid",
        "x-ms-routing-hint": "PbiDevHostMode",
        "cluster":"PbiDevCluster",
        "capacityId":"PbiDevCapacity",
        "sessionId":"PbiDevSession",
        "userObjectId":"PbiDevUser",
        "tenantObjectId":"PbiDevTenant",
        "reportViewerVersion":"PbiDevReportViewer"
    };
    if (message.responseHeaders){
        message.responseHeaders.forEach(header => {
            if (!("name" in header && "value" in header)){
                return;
            }
            if (header["name"] in textIds){
                updateToolbarResult(textIds[header["name"]], header["value"])
            }
        });
        return;
    }

    if(message.requestHeaders){
        if (!sessionUrl && isPingUrl(message.url)){
            sessionUrl = message.url.replace("/ping","")
            var auth = message.requestHeaders.find(header => header["name"] === "Authorization")
            bearerToken = auth["value"]
            var xmsRoutingHint = message.requestHeaders.find(header => header["name"] === "x-ms-routing-hint")
            routingHint = xmsRoutingHint["value"]
            enableDeleteSessionButton()
        }
    }
    if(message.timeSinceLastInteractionMs){
        updateSessionTimer(message["timeSinceLastInteractionMs"]);
    }

    if(!Array.isArray(message)){
        return;
    }

    properties = undefined;
    message.forEach(trace => {
        if (properties || !trace.data?.baseData?.name?.startsWith("RS.Fresno")){
            return;
        }
        properties = trace.data?.baseData?.properties;
        for(var key in properties){
            if (key in textIds){
                updateToolbarResult(textIds[key], properties[key]);
            }
        }
    })
} 

function main() {
    if (isAlreadyInjected() || !isPageLoaded()){
        return;
    }
    
    chrome.runtime.onMessage.addListener(networkDispatcher);
    createDebugButton();
    createModal();
}

main();

