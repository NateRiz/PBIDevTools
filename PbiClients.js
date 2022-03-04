if (window.PbiDevPbiClientsInjected === undefined){
    window.PbiDevPbiClientsInjected = false
    var isKeepingSessionAlive = false;
    var clusterUrl = ""
    var rdlWorkloadUrl = ""
    var rootActivityId = ""
    var bearerToken = ""
    var routingHint = ""
    var renderId = ""
    var apiBaseUrl = ""
    var lastExportID = ""
    var lastExportFilename = ""
    var dataProviders = []
    var connectionStrings = []
    var dataSourceIndex = 0
    var isRenderComplete = false
    var isPerfTesting = false
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

function expireSession() {
    chrome.runtime.sendMessage({
        sessionUrl: rdlWorkloadUrl,
        bearerToken: bearerToken,
        routingHint: routingHint,
        expireSession: true
    },
    function(){updateSessionToolbar()}
    )
}

function updateSessionToolbar() {
    /**
     * When the session is deleted, set the dev toolbar to red / expired to reflect it
     */
    var sessionStatus = document.querySelector("#PbiDevSessionStatus")
    sessionStatus.textContent = "Expired"

    var sessionIndicator = document.querySelector("#PbiDevSessionContainer")
    sessionIndicator.style.borderLeftColor = "#ee0000"
}

function deleteModal(){
    var devTools = document.querySelector(".PbiDevContainer")
    if (devTools !== null){
        devTools.parentElement.removeChild(devTools)
    }
    window.PbiDevPbiClientsInjected = undefined
}

function disableScreenForPerfTest(){
    root = document.querySelector("#rootContent");

}

function createModal(){
    fetch(chrome.runtime.getURL('/debugWindow.html')).then(r => r.text()).then(html => {
        root = document.querySelector("#rootContent");
        root.insertAdjacentHTML('beforeend', html);

        document.querySelector("#PbiDevExpireNow").onclick = expireSession
        document.querySelector("#PbiDevPingToggle").onclick = toggleKeepSessionAlive
        var apiExportButton = document.querySelector("#PbiDevAPIExport")
        apiExportButton.onclick = APIExport
        var apiGetStatusButton = document.querySelector("#PbiDevAPIGetStatus")
        apiGetStatusButton.onclick = APIGetStatus
        var apiSaveButton = document.querySelector("#PbiDevAPISave")
        apiSaveButton.onclick = APISave
        document.querySelector("#PbiDevDownloadRdl").onclick = downloadRdl

        var apiUrls = {
            "msit.powerbi.com":"https://api.powerbi.com",
            "dxt.powerbi.com":"https://dxtapi.powerbi.com",
            "powerbi-df.analysis-df.windows.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "powerbi-wow-int3.analysis-df.windows.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "powerbi-idog.analysis.windows-int.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "portal.analysis.windows-int.net":"https://biazure-int-edog-redirect.analysis-df.windows.net",
            "daily.powerbi.com":"https://dailyapi.powerbi.com"
        }
        var domain = window.location.hostname
        if (domain in apiUrls){
            apiBaseUrl = apiUrls[domain]
        }else{
            apiExportButton.disabled = true
            apiGetStatusButton.disabled = true
            apiSaveButton.disabled = true
        }
        document.querySelector("#PbiDevAPIUrl").textContent = (apiExportButton.disabled ? "Ring not supported." : apiBaseUrl)

        var copyImages = document.querySelectorAll(".PbiDevCopy")
        copyImages.forEach(function(image){
            image.src = chrome.runtime.getURL("./copy.png");
            image.onclick = function(){
                var siblingId = image.id.replace("Copy","")
                var text = document.querySelector("#" + siblingId)
                copyToClipboard(text.textContent);
            }
        })

        document.querySelector("#PbiDevBearerTokenCopy").onclick = () => copyToClipboard(getBearerToken());

        var kustoButton = document.querySelector("#PbiDevKustoCopy")
        kustoButton.src = chrome.runtime.getURL("./kusto.png")
        kustoButton.onclick = () => {
            copyToClipboard(getKustoQuery())
        }

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

        document.querySelector("#PbiDevStartPerf").onclick = () => {
            var testAmount = document.querySelector("#PbiDevTestAmount").value
            clearSessionStorage()
            createSessionStorage()
            reloadPageForPerf(1, Number(testAmount) || 999)
        }

        disablePageIfPerfTesting()
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

function isExportAPIEnabled(){
    return apiBaseUrl !== ""
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
    toggleKeepSessionAlive()

}

function toggleKeepSessionAlive(){
    isKeepingSessionAlive = !document.querySelector("#PbiDevPingToggle").checked
    chrome.runtime.sendMessage({"isKeepingSessionAlive":isKeepingSessionAlive})
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
        img.src = chrome.runtime.getURL("./debug16.png");
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

function updateSessionTimer(timeSinceLastInteractionMs){
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

function clearSessionStorage(){
    window.sessionStorage.removeItem('PbiDevPerf')
}

function createSessionStorage(){
    window.sessionStorage.setItem('PbiDevPerf', JSON.stringify({
        "timeRenderingms": [],
        "timeProcessingms": []
    }))
}

function addPerfMeasurementToSessionStorage(rendering, processing){
    data = window.sessionStorage.getItem('PbiDevPerf')
    json = JSON.parse(data)

    if (json !== null){
        json["timeRenderingms"].push(rendering)
        json["timeProcessingms"].push(processing)
    }
    window.sessionStorage.setItem('PbiDevPerf', JSON.stringify(json))
}

function reloadPageForPerf(currentTestNumber, totalTestAmount) {
    url = new URL(document.URL)
    url.searchParams.set("PbiDevCurrent", currentTestNumber)
    url.searchParams.set("PbiDevEnd", totalTestAmount)
    var nextPage = url.href
    window.location = nextPage
}

function disablePageIfPerfTesting(){
    url = new URL(document.URL)
    var curRender = Number(url.searchParams.get("PbiDevCurrent") || -1)
    var endRender = Number(url.searchParams.get("PbiDevEnd") || -1)
    isPerfTesting = curRender !== -1 && endRender !== -1
    if (!isPerfTesting){
        return;
    }
    
    setAllowSessionExpiration(false)
    document.querySelector("#PbiDevScreenBlock").hidden = false
    document.querySelector("#PbiDevTestStatus").textContent = `${curRender} of ${endRender}`
}

function endPerformanceTests(){
    createAndDownloadPerfReport(()=>{
        url = new URL(document.URL)
        url.searchParams.delete("PbiDevCurrent")
        url.searchParams.delete("PbiDevEnd")
        var nextPage = url.href
        window.location = nextPage
    })
}

function percentile(list, p) {
    p = Number(p);
    list = list.slice().sort(function (a, b) {
      a = Number.isNaN(a) ? Number.NEGATIVE_INFINITY : a;
      b = Number.isNaN(b) ? Number.NEGATIVE_INFINITY : b;
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    });
  
    if (p === 0) return list[0];
    var kIndex = Math.ceil(list.length * (p / 100)) - 1;
    return list[kIndex];
  }

function createAndDownloadPerfReport(onCompletion){
    data = window.sessionStorage.getItem('PbiDevPerf')
    json = JSON.parse(data)
    renderingData = []
    processingData = []

    if (json !== null){
        renderingData = json["timeRenderingms"]
        processingData = json["timeProcessingms"]
    }

    fetch(chrome.extension.getURL('/Performance.rdl'))
    .then((resp) => resp.text())
    .then((resp) => {
        build=""
        renderingData.forEach(function (val, idx) {
            build+=`<Data ColumnIndex="0" RowIndex="${idx}">${val}</Data>\n`
        })
        resp = resp.replace('{PbiDevRenderMatrix}', build)

        build=""
        renderingData.forEach(function (val, idx) {
            build+=`&lt;Row&gt; &lt;RenderEnterData&gt;${val}&lt;/RenderEnterData&gt; &lt;/Row&gt;\n`
        })
        resp = resp.replace('{PbiDevRenderData}', build)

        build=""
        processingData.forEach(function (val, idx) {
            build+=`<Data ColumnIndex="1" RowIndex="${idx}">${val}</Data>\n`
        })
        resp = resp.replace('{PbiDevProcessMatrix}', build)

        build=""
        processingData.forEach(function (val, idx) {
            build+=`&lt;Row&gt; &lt;ProcessingEnterData&gt;${val}&lt;/ProcessingEnterData&gt; &lt;/Row&gt;\n`
        })
        resp = resp.replace('{PbiDevProcessData}', build)
        
        resp = resp.replace("{rendermin}", Math.min(...renderingData))
        resp = resp.replace("{rendermax}", Math.max(...renderingData))
        resp = resp.replace("{renderrange}", Math.max(...renderingData)-Math.min(...renderingData))
        resp = resp.replace("{renderavg}", renderingData.reduce((a, b) => a + b) / renderingData.length)
        resp = resp.replace("{render50}", percentile(renderingData, 50))
        resp = resp.replace("{render75}", percentile(renderingData, 75))
        resp = resp.replace("{render96}", percentile(renderingData, 96))
        resp = resp.replace("{render99}", percentile(renderingData, 99))

        resp = resp.replace("{processingmin}", Math.min(...processingData))
        resp = resp.replace("{processingmax}", Math.max(...processingData))
        resp = resp.replace("{processingrange}", Math.max(...processingData)-Math.min(...processingData))
        resp = resp.replace("{processingavg}", processingData.reduce((a, b) => a + b) / processingData.length)
        resp = resp.replace("{processing50}", percentile(processingData, 50))
        resp = resp.replace("{processing75}", percentile(processingData, 75))
        resp = resp.replace("{processing96}", percentile(processingData, 96))
        resp = resp.replace("{processing99}", percentile(processingData, 99))

        download("Performance.rdl", resp)
        
        csv = `RenderingTime_ms,${renderingData.join(",")}\nProcessingTime_ms,${processingData.join(",")}`

        download("Performance.csv", csv)

        console.log(resp)
        onCompletion()
    })
}

function pollRenderStatus(){
    if (isRenderComplete || rdlWorkloadUrl === "" || renderId === "" || bearerToken === ""){
        return;
    }

    chrome.runtime.sendMessage({
        url: `${rdlWorkloadUrl}/render/${renderId}`,
        bearerToken: bearerToken,
        routingHint: routingHint,
        pollRenderStatus: true
    }, function(response){
        if (response.status !== "running"){
            onRenderComplete(response)
        }
    })
}

function onRenderComplete(response){
    isRenderComplete = true
    var timeProcessingLabel = document.querySelector("#PbiDevTimeProcessing")
    var timeRenderingLabel = document.querySelector("#PbiDevTimeRendering")
    var contentSizeLabel = document.querySelector("#PbiDevContentSize")

    timeProcessingLabel.textContent = response.timeProcessingms
    timeRenderingLabel.textContent = response.timeRenderingms
    contentSizeLabel.textContent = response.contentSize

    if (isPerfTesting){
        var nextRender = Number(url.searchParams.get("PbiDevCurrent"))+1
        var endRender = Number(url.searchParams.get("PbiDevEnd"))
        addPerfMeasurementToSessionStorage(Number(response.timeRenderingms), Number(response.timeProcessingms))

        if (nextRender <= endRender){
            reloadPageForPerf(nextRender, endRender)
        }
        else {
            endPerformanceTests()
        }
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
        updateSessionToolbar()
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
        updateSessionTimer(message["timeSinceLastInteractionMs"]);
        pollRenderStatus()
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
    disableScreenForPerfTest();
}

main();

