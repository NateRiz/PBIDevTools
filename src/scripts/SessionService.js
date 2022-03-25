var SessionService = class{
    constructor(){}

    ExpireSession() {
        chrome.runtime.sendMessage({
            sessionUrl: rdlWorkloadUrl,
            bearerToken: bearerToken,
            routingHint: routingHint,
            expireSession: true
        },
        ()=>this.UpdateSessionToolbar()
        )
    }

    UpdateSessionToolbar() {
        /**
         * When the session is deleted, set the dev toolbar to red / expired to reflect it
         */
        var sessionStatus = document.querySelector("#PbiDevSessionStatus")
        sessionStatus.textContent = "Expired"
    
        var sessionIndicator = document.querySelector("#PbiDevSessionContainer")
        sessionIndicator.style.borderLeftColor = "#ee0000"
    }

    ToggleKeepSessionAlive(){
        var isKeepingSessionAlive = !document.querySelector("#PbiDevPingToggle").checked
        chrome.runtime.sendMessage({"isKeepingSessionAlive":isKeepingSessionAlive})
    }

    UpdateSessionTimer(timeSinceLastInteractionMs){
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

    CreateModal(){
        document.querySelector("#PbiDevExpireNow").onclick = () => sessionService.ExpireSession()
        document.querySelector("#PbiDevPingToggle").onclick = () => sessionService.ToggleKeepSessionAlive()

        var sessionExpireInfo = document.querySelectorAll(".PbiDevInfo")
        sessionExpireInfo.forEach((img)=>{
            img.src = chrome.runtime.getURL("./src/images/info.png")
            var tooltip = document.querySelector("#"+ img.id +"Tooltip")
            tooltip.style.display = "none";
            img.onclick = function(){
                if (!tooltip){return;}
                var display = tooltip.style.display
                display = (display == "none" ? "block" : "none");
                tooltip.style.display = display
            }
        })
    }
}