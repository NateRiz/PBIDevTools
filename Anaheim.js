var isKeepingSessionAlive = false;

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
    console.log("ping...")
    document.querySelector("#AnaheimHost").dispatchEvent(keyboardEvent);
}

function backgroundListener(message, sender, sendResponse){
    if (message.isKeepingSessionAlive !== undefined){
        isKeepingSessionAlive = message.isKeepingSessionAlive
    }
}

function main(){
    console.log("ttttttt")
    chrome.runtime.onMessage.addListener(backgroundListener);
    setInterval(keepSessionAlive, 30000);
}


main()