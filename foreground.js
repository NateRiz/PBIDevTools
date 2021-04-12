function toggleModal(){

}

function createModal(){
    //var iFrame  = document.createElement ("iframe");
    //iFrame.src  = chrome.runtime.getURL('./debugWindow.html');
    //iFrame.classList.add("PbiDevIframe");
    //root.appendChild(iFrame);

    fetch(chrome.runtime.getURL('/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);
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
    console.log("Updating ", id, "with ", value);
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

function networkDispatcher(message, sender, sendResponse){
    console.log(message)
    textIds = {
        "requestid": "PbiDevRaid",
        "x-ms-routing-hint": "PbiDevHostMode"
    };
    message.responseHeaders.forEach(header => {
        if (!("name" in header && "value" in header)){
            return;
        }
        if (header["name"] in textIds){
            updateToolbarResult(textIds[header["name"]], header["value"])
        }
    });
} 

function main() {
    if (isAlreadyInjected() || !isPageLoaded()){
        console.log("Already injected or can't find sibling")
        return;
    }

    chrome.runtime.onMessage.addListener(networkDispatcher)

    var button = document.querySelector("#feedbackMenuBtn");
    console.log("Injecting Foreground...")
    createDebugButton(button);
    createModal()
}

main();

