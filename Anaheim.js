var isKeepingSessionAlive = false;

function isAnaheimIframe(){
    return document.querySelector("#AnaheimHost") !== null
}

function keepSessionAlive(){
    if(!isKeepingSessionAlive){
        return;
    }
    var keyboardEvent = new KeyboardEvent(
        'keydown',
        {
            bubbles: true,
            cancelable: true,
        }
    )
    document.querySelector("#AnaheimHost").dispatchEvent(keyboardEvent);
}

function backgroundListener(message, sender, sendResponse){
    if (message.isKeepingSessionAlive !== undefined){
        isKeepingSessionAlive = message.isKeepingSessionAlive
    }
}

function main(){
    if(!isAnaheimIframe){
        return
    }
    chrome.runtime.onMessage.addListener(backgroundListener);
    setInterval(keepSessionAlive, 30000);
}


main()