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
    document.querySelector("#AnaheimHost")?.dispatchEvent(keyboardEvent);
    window.Worker = undefined
    console.log("worker removed")

}

function backgroundListener(message, sender, sendResponse){
    if (message.isKeepingSessionAlive !== undefined){
        isKeepingSessionAlive = message.isKeepingSessionAlive
    }
}

function main(){
    chrome.runtime.onMessage.addListener(backgroundListener);
    setInterval(keepSessionAlive, 30000);
    window.Worker = undefined


}

main()