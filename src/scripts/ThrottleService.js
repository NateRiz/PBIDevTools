var ThrottleService = class {
    constructor(){}

    CreateModal(){
        document.querySelector("#PbiDevThrottleButton").onclick = () => { throttleService.SpamRequests() }
    }

    SpamRequests(){
        var numRequests = parseInt(document.querySelector("#PbiDevThrottleAmount").value)
        if (isNaN(numRequests)){
            return;
        }
    
        for(var i = 0; i < numRequests; i++){
            this.Spam()
        }
    }
    
    Spam(){
        var reportId = window.location.href.split("?")[0].substr(-36)
        var sessionUrl = `https://${clusterUrl}/explore/rdlreports/${reportId}/session`
        fetch(sessionUrl, {
            headers: {
                "User-Agent":"Whatever",
                "Content-type":"application/json",
                "authorization": bearerToken
            },
            method: "POST",
            body: JSON.stringify({"hostType":"Web", "userDefinedCapabilities":{}})
        })
    }
}