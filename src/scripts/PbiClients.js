if (window.PbiDevPbiClientsInjected === undefined){
    window.PbiDevPbiClientsInjected = false
    var clusterUrl = ""
    var rdlWorkloadUrl = ""
    var rootActivityId = ""
    var bearerToken = ""
    var routingHint = ""
    var renderId = ""
    var dataProviders = []
    var connectionStrings = []
    var dataSourceIndex = 0
    var isRenderComplete = false
    var isPerfTesting = false
    var exportApiService = new ExportApiService()
    var sessionService = new SessionService()
    var perfService = new PerfService(sessionService)
    var rdlService = new RdlService()
}

function isPingUrl(url){
    return /.*pbidedicated.window.*.net.*ping/.test(url)
}

function isPollRenderUrl(url){
    return /.*pbidedicated.window.*.net.*render\//.test(url)
}

function toggleModal(){
    var modal = document.querySelector(".PbiDevContainer")
    if(!modal){
        return;
    }
    var display = modal.style.display
    display = (display == "none" ? "block" : "none");
    modal.style.display = display
}

function deleteModal(){
    var devTools = document.querySelector(".PbiDevContainer")
    if (devTools !== null){
        devTools.parentElement.removeChild(devTools)
    }
    window.PbiDevPbiClientsInjected = undefined
}

function createModal(){
    fetch(chrome.runtime.getURL('./src/pages/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);

        exportApiService.CreateModal()
        sessionService.CreateModal()
        perfService.CreateModal()
        rdlService.CreateModal()

        document.querySelector("#PbiDevDownloadRdl").onclick = () => rdlService.DownloadRdl()

        var copyImages = document.querySelectorAll(".PbiDevCopy")
        copyImages.forEach(function(image){
            image.src = chrome.runtime.getURL("./src/images/copy.png");
            image.onclick = function(){
                var siblingId = image.id.replace("Copy","")
                var text = document.querySelector("#" + siblingId)
                Utils.CopyToClipboard(text.textContent);
            }
        })

        document.querySelector("#PbiDevBearerTokenCopy").onclick = () => Utils.CopyToClipboard(getBearerToken());

        var kustoButton = document.querySelector("#PbiDevKustoCopy")
        kustoButton.src = chrome.runtime.getURL("./src/images/kusto.png")
        kustoButton.onclick = () => {
            Utils.CopyToClipboard(getKustoQuery())
        }

        fetch(chrome.extension.getURL('/VERSION.txt'))
        .then((resp) => resp.text())
        .then((resp) => document.querySelector("#PbiDevVersion").textContent = resp)
    });
}

function getBearerToken(){
    return bearerToken;
}

function getKustoQuery(){
    if(rootActivityId === undefined){
        return;
    }
    var domain = window.location.hostname
    var isTestRing = domain.includes("analysis")
    var preprod = isTestRing ? "pre" : ""
    var database = isTestRing ? "BIAzureKustoPPE" : "BIAzureKustoProd"
    return `cluster('Biazure').database('${database}').TraceUnionProd
    | where TIMESTAMP > ago(1d)
    | where RootActivityId == "${rootActivityId}"
    
    cluster('Biazure').database('${database}').ASTraceUnionProd
    | where TIMESTAMP >ago(1d)
    | where ParentActivityId == "${rootActivityId}"
    
    cluster('Biazure').database('${database}').pbi_web_${preprod}prod("customEvents")
    | where timestamp > ago(1d)
    | extend c = parsejson(customDimensions)
    | where c.rid == "${rootActivityId}"
    
    cluster('Biazure').database('${database}').RdlClientOpen
    | where timestamp > ago(1d)
    | where rId == "${rootActivityId}"`.replace(/  +/g, '')
}

function onReceivedAuthToken(){
    rdlService.PopulateRdlDebugInfo()
    document.querySelectorAll(".PbiDevDependsOnAuthorization").forEach((btn)=>btn.classList.remove("PbiDevDependsOnAuthorization"))
}

function createDebugButton(button) {
    var button = document.querySelector("#feedbackMenuBtn");

    //Clone button to remove click functionality
    debugButton = button.cloneNode(true);
    parent = button.parentNode;
    parent.removeChild(button);

    //Insert after Help button
    parent.insertBefore(debugButton, document.querySelector("#helpMenuBtn").nextSibling)

    //Replace Image
    var smiley = debugButton.querySelector(".pbi-glyph-smiley")
    if (smiley !== null){
        smiley.classList.remove("pbi-glyph-smiley")
        const img = document.createElement("img");
        img.src = chrome.runtime.getURL("./src/images/debug16.png");
        img.id = "PBIDevToolImageId"
        smiley.appendChild(img);
    }
    
    var debugButton = document.querySelector("#feedbackMenuBtn")

    //new functionality
    debugButton.onclick = toggleModal;
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

    if (id === "PbiDevCluster"){
        value = value.match(/https:\/\/(.*)-redirect/)[1]
    }

    var node = document.querySelector("#"+id)
    if (node){
        node.textContent = value;
    }
}

function networkDispatcher(message, sender, sendResponse){
    textIds = {
        "requestid": "PbiDevRaid",
        "x-ms-routing-hint": "PbiDevHostMode",
        "cluster":"PbiDevCluster",
        "userObjectId":"PbiDevUser",
        "tenantObjectId":"PbiDevTenant",
        "reportViewerVersion":"PbiDevReportViewer"
    };

    if (message === "CleanupOnNavigate"){
        deleteModal()
    }

    if (message === "DeleteSession"){
        sessionService.UpdateSessionToolbar()
    }

    if (message.url !== undefined && isPollRenderUrl(message.url)){
    }

    if (message.responseHeaders){
        message.responseHeaders.forEach(header => {
            if (!("name" in header && "value" in header)){
                return;
            }
            if (header["name"] == "operation-location"){
                renderId = header["value"].substr(-32)
            }
            if (header["name"] in textIds){
                if (header["name"] === 'requestid'){
                    rootActivityId = header['value']
                    clusterUrl = new URL(message.url).hostname
                }
                updateToolbarResult(textIds[header["name"]], header["value"])
            }
        });
        return;
    }

    if(message.requestHeaders){
        if (!rdlWorkloadUrl && isPingUrl(message.url)){
            rdlWorkloadUrl = message.url.replace("/ping","")
            var auth = message.requestHeaders.find(header => header["name"].toLowerCase() === "authorization")
            bearerToken = auth["value"]
            updateToolbarResult("PbiDevBearerToken", `${bearerToken.slice(0, 15)}...${bearerToken.slice(-5)}`)
            updateToolbarResult("PbiDevCapacity", rdlWorkloadUrl.substr(rdlWorkloadUrl.indexOf("capacities/")+11, 36))
            updateToolbarResult("PbiDevSession", rdlWorkloadUrl.substr(-32))
            var xmsRoutingHint = message.requestHeaders.find(header => header["name"] === "x-ms-routing-hint")
            routingHint = xmsRoutingHint["value"]
            onReceivedAuthToken()
        }
    }

    // Every time we ping we check render status.
    if(message.timeSinceLastInteractionMs){
        sessionService.UpdateSessionTimer(message["timeSinceLastInteractionMs"]);
        perfService.PollRenderStatus()
    }

    if(!Array.isArray(message)){
        return;
    }

    properties = undefined;
    message.forEach(trace => {
        if (properties || !trace.data?.baseData?.name?.startsWith("RS.Fresno")){
            return;
        }
        properties = trace.data?.baseData?.properties;
        for(var key in properties){
            if (key in textIds){
                updateToolbarResult(textIds[key], properties[key]);
            }
        }
    })
} 

function main() {
    if (window.PbiDevPbiClientsInjected === true || !isPageLoaded()){
        return;
    }
    window.PbiDevPbiClientsInjected = true
    chrome.runtime.onMessage.addListener(networkDispatcher);
    createDebugButton();
    createModal();
}

main();

