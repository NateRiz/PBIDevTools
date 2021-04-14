
var requestHeadersCache = {};
var sessionUrl = "";
var pingUrl = "";
var isArtificialPing = false;

function toggleModal(){
    var modal = document.querySelector(".PbiDevContainer")
    if(!modal){
        return;
    }
    var display = modal.style.display
    display = (display == "none" ? "block" : "none");
    modal.style.display = display
}

function createModal(){
    fetch(chrome.runtime.getURL('/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);

        document.querySelector("#PbiDevExpireNow").onclick = expireSession
        document.querySelector("#PbiDevPingToggle").onclick = toggleArtificialPing

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

    });
}

function toggleArtificialPing(){
    isArtificialPing = !document.querySelector("#PbiDevPingToggle").checked
    url = (isArtificialPing ? sessionUrl : "")
    chrome.runtime.sendMessage({"deleteSessionUrl":url})
}

function artificialPing(){
    // Fake ping every 30 seconds to keep the session alive.
    if(!isArtificialPing){
        return;
    }

    _data = "{'reportVisible':'false','timeSinceLastInteractionMs':'0'}"
    var _headers = {}
    Object.assign(_headers, requestHeadersCache)
    _headers["x-artificial-ping"]=true
    $.ajax({
        url : pingUrl,
        method : 'POST',
        headers: _headers,
        data: _data,
        contentType: "application/json",
        error: function(request, status, error){
            alert("Error attempting artificial ping: " + request.status.toString())
        }
   })

}

function expireSession(){
    $.ajax({
        url : sessionUrl,
        method : 'DELETE',
        headers: requestHeadersCache,
        error: function(request, status, error){
            alert("Error while deleting session: " + request.status.toString())
        },
        success: function (data, text){
            alert("Successfully deleted session.")
        }
   })
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
        headers = message["requestHeaders"];
        headers.forEach(pair => {
            if (pair["name"] != "User-Agent"){
                requestHeadersCache[pair["name"]]=pair["value"];
            }
        })
        delete requestHeadersCache["sec-ch-ua"]
        delete requestHeadersCache["sec-ch-ua-mobile"]
        pingUrl = message["url"]
        sessionUrl = pingUrl.replace("/ping", "");
        return;
    }
    if(message.timeSinceLastInteractionMs){
        updateSessionTimer(message["timeSinceLastInteractionMs"]);
    }


    if(!Array.isArray(message)){
        return;
    }

    properties = undefined;
    message.forEach(trace => {
        if (properties){
            return;
        }
        properties = trace.data?.baseData?.properties;
        for(var key in properties){
            if (key in textIds){
                updateToolbarResult(textIds[key], properties[key])
            }
        }
    })

} 

function main() {
    if (isAlreadyInjected() || !isPageLoaded()){
        return;
    }

    chrome.runtime.onMessage.addListener(networkDispatcher)
    createDebugButton();
    createModal()

    setInterval(artificialPing, 10000)
}

main();

