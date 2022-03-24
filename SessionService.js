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

    CreateModal(){
        document.querySelector("#PbiDevExpireNow").onclick = () => sessionService.ExpireSession()
        document.querySelector("#PbiDevPingToggle").onclick = () => sessionService.ToggleKeepSessionAlive()

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
    }
}