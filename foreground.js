
var requestHeadersCache = {}
var sessionUrl = ""

function toggleModal(){
    var modal = document.querySelector(".PbiDevContainer")
    if(!modal){
        return;
    }
    var display = modal.style.display
    display = (display == "none" ? "block" : "none");
    modal.style.display = display
}

function expireSession(){
    $.ajax({
        url : sessionUrl,
        method : 'DELETE',
        headers: requestHeadersCache
   })
    console.log(requestHeadersCache)
}

function createModal(){
    fetch(chrome.runtime.getURL('/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);

        document.querySelector("#PbiDevExpireNow").onclick = expireSession

        var copyImages = document.querySelectorAll(".PbiDevCopy")
        copyImages.forEach(function(image){
            image.src = chrome.runtime.getURL("./copy.png");
        })

        var raidCopy = document.querySelector("#PbiDevRaidCopy")
        raidCopy.onclick = function(){
            var raid = document.querySelector("#PbiDevRaid")
            var textArea = document.createElement("textarea");
            textArea.value = raid.textContent;
            document.body.appendChild(textArea);
            textArea.select()
            document.execCommand("copy")
            textArea.remove();
        }
    });
}

function createDebugButton(button) {
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
    updateToolbarResult("PBiDevTTLFG", time)

    mins = Math.floor(backgroundTimeout / 60)
    secs = backgroundTimeout % 60
    time = mins.toString().padStart(2, '0')+":"+secs.toString().padStart(2, '0')
    updateToolbarResult("PBiDevTTLBG", time)
}

function networkDispatcher(message, sender, sendResponse){
    textIds = {
        "requestid": "PbiDevRaid",
        "x-ms-routing-hint": "PbiDevHostMode"
    };
    if ("responseHeaders" in message){
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
    if("requestHeaders" in message){
        requestHeadersCache = message["requestHeaders"]
        sessionUrl = message["url"].replace("/ping", "")
        requestHeadersCache.push({'name':'Access-Control-Allow-Origin','value':sessionUrl});
        return;
    }
    if(message["timeSinceLastInteractionMs"]){
        updateSessionTimer(message["timeSinceLastInteractionMs"])
    }

} 

function main() {
    if (isAlreadyInjected() || !isPageLoaded()){
        return;
    }

    chrome.runtime.onMessage.addListener(networkDispatcher)

    var button = document.querySelector("#feedbackMenuBtn");
    createDebugButton(button);
    createModal()
}

main();

