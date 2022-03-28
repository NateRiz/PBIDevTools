if (typeof window.isLocalAnaheimLoaded === 'undefined'){
    window.isLocalAnaheimLoaded = false;
}

function main(){
    var container = document.querySelector("#pbiThemed0");
    var notice = document.createElement("div")
    notice.id = "PbiDevLocalAnaheim"
    notice.style.backgroundColor = "#f2c811"
    notice.style.color = "black"
    notice.style.fontSize = "18px"
    notice.style.fontWeight = "bold"
    notice.style.textAlign = "center"
    notice.textContent = "== Using Anaheim From Localhost =="
    container.appendChild(notice)
    isLocalAnaheimLoaded = true;
}

function deleteNotice() {
    var notice = document.querySelector("#PbiDevLocalAnaheim")
    if(notice !== null){
        notice.parentElement.removeChild(notice)
    }
    window.isLocalAnaheimLoaded = undefined
}

function blockPingWorker(){
    // window.Worker = undefined
}

function backgroundListener(message, sender, sendResponse){
    if (message === "CleanupOnNavigate"){
        deleteNotice()
    }

    if(message.LocalAnaheimError != undefined){
        var notice = document.querySelector("#PbiDevLocalAnaheim")
        notice.style.backgroundColor = "#e65261"
        notice.textContent = `== Failed Loading Anaheim from https://localhost:4200/index.js with error: ${message.LocalAnaheimError} ==`
    }
}

if (!window.isLocalAnaheimLoaded && document.readyState === "complete"){
    blockPingWorker()
    main();
    chrome.runtime.onMessage.addListener(backgroundListener);
}