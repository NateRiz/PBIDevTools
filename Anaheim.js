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
}

function backgroundListener(message, sender, sendResponse){
    if (message.isKeepingSessionAlive !== undefined){
        isKeepingSessionAlive = message.isKeepingSessionAlive
    }
}

function blockPingWorker(){
    var script = document.createElement('script');
    script.type = "module"
    script.textContent = `window.Worker = undefined`;
    (document.head||document.documentElement).appendChild(script);
    script.remove();
}

function main(){
    blockPingWorker()
    chrome.runtime.onMessage.addListener(backgroundListener);
    setInterval(keepSessionAlive, 30000);

}

main()