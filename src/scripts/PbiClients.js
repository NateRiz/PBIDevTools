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
    var perfService = new PerfService()
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

        document.querySelector("#PbiDevDownloadRdl").onclick = downloadRdl

        var copyImages = document.querySelectorAll(".PbiDevCopy")
        copyImages.forEach(function(image){
            image.src = chrome.runtime.getURL("./src/images/copy.png");
            image.onclick = function(){
                var siblingId = image.id.replace("Copy","")
                var text = document.querySelector("#" + siblingId)
                copyToClipboard(text.textContent);
            }
        })

        document.querySelector("#PbiDevBearerTokenCopy").onclick = () => copyToClipboard(getBearerToken());

        var kustoButton = document.querySelector("#PbiDevKustoCopy")
        kustoButton.src = chrome.runtime.getURL("./src/images/kusto.png")
        kustoButton.onclick = () => {
            copyToClipboard(getKustoQuery())
        }

        var dataSourceNext = document.querySelector("#PbiDevDataSourceNext")
        dataSourceNext.onclick = ()=>{
            dataSourceIndex = (dataSourceIndex + 1) % dataProviders.length
            setDataSource(dataSourceIndex)
        }
        var dataSourcePrev = document.querySelector("#PbiDevDataSourcePrev")
        dataSourcePrev.onclick = ()=>{
            dataSourceIndex = ((dataSourceIndex - 1) === -1 ? dataProviders.length-1 : dataSourceIndex - 1)
            setDataSource(dataSourceIndex)
        }

        fetch(chrome.extension.getURL('/VERSION.txt'))
        .then((resp) => resp.text())
        .then((resp) => document.querySelector("#PbiDevVersion").textContent = resp)

        perfService.DisablePageIfPerfTesting()
    });
}

function getBearerToken(){
    return bearerToken;
}

function copyToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
}

function download(filename, text, type="text/plain") {
    // Create an invisible A element
    const a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);
  
    // Set the HREF to a Blob representation of the data to be downloaded
    a.href = window.URL.createObjectURL(
      new Blob([text], { type })
    );
  
    // Use download attribute to set set desired file name
    a.setAttribute("download", filename);
  
    // Trigger the download by simulating click
    a.click();
  
    // Cleanup
    window.URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
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

function fetchRdl(){
    if (!clusterUrl || !bearerToken){
        return
    }
    var reportId = window.location.href.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
    var url = `https://${clusterUrl}/export/reports/${reportId}/rdl`
    return fetch(url, {
        method: 'GET',
        headers: {'Authorization': bearerToken}
    }).then((response) => {
         return response.text()
    })
}

function downloadRdl(){
    fetchRdl().then((data)=>download("Download.rdl", data))
}

function setAllowSessionExpiration(isChecked){
    document.querySelector("#PbiDevPingToggle").checked = isChecked
    sessionService.ToggleKeepSessionAlive()

}

function onReceivedAuthToken(){
    populateRdlDebugInfo()
    document.querySelectorAll(".PbiDevDependsOnAuthorization").forEach((btn)=>btn.classList.remove("PbiDevDependsOnAuthorization"))
}

function populateRdlDebugInfo(){
    fetchRdl().then((rdl)=>{
        parser = new DOMParser();
        xmlDoc = parser.parseFromString(rdl, "text/xml");

        var dataProviderNodes = xmlDoc.getElementsByTagName("DataProvider")
        var connectionStringNodes = xmlDoc.getElementsByTagName("ConnectString")
        for(var i=0; i<dataProviderNodes.length; i++) {
            dataProviders.push(dataProviderNodes[i].childNodes[0].nodeValue)
            connectionStrings.push(connectionStringNodes[i].childNodes[0].nodeValue)
        }

        if (dataProviderNodes.length !== 0){
            setDataSource(0)
        }

        var numEmbeddedImages = xmlDoc.getElementsByTagName("EmbeddedImage").length
        document.querySelector("#PbiDevEmbeddedImages").textContent = numEmbeddedImages

    })
}

function setDataSource(idx){
    function createPair(key, value){
        var container = document.createElement("div")
        container.classList.add("PbiDevDebugPairOverflow")
        var span = document.createElement("span")
        span.classList.add("PbiDevDebugPairLeftOverflow")
        span.textContent = key
        var resultContainer = document.createElement("div")
        resultContainer.classList.add("PbiDevDebugResultContainerOverflow")
        var result = document.createElement("textarea")
        result.rows = "1"
        result.classList.add("PbiDevDebugResultOverflow")
        result.textContent = value

        container.appendChild(span)
        container.appendChild(resultContainer)
        resultContainer.appendChild(result)

        var dataSourceContainer = document.querySelector("#PbiDevDataSources")
        dataSourceContainer.appendChild(container)
    }

    var dataSourceContainer = document.querySelector("#PbiDevDataSources")
    dataSourceContainer.hidden = false
    while(dataSourceContainer.firstChild){
        dataSourceContainer.removeChild(dataSourceContainer.firstChild)
    }

    var dataSourceNav = document.querySelector("#PbiDevDataSourceNav")
    dataSourceNav.textContent = `${idx + 1} of ${dataProviders.length}`
    createPair("Data Provider:", dataProviders[idx])
    var properties = connectionStrings[idx].split(";")
    properties.forEach((prop)=>{
        var key, value
        [key, value] = prop.split("=")
        createPair(`${key}:`, value)
    })
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

