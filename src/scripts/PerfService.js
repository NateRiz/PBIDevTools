var PerfService = class{
    constructor(){}

    CreateModal(){
        document.querySelector("#PbiDevStartPerf").onclick = () => {
            var testAmount = document.querySelector("#PbiDevTestAmount").value
            this.ClearSessionStorage()
            this.CreateSessionStorage()
            this.ReloadPageForPerf(1, Number(testAmount) || 999)
        }

        document.querySelector("#PbiDevPerfEnd").onclick = () => this.EndPerformanceTests()
    }

    DisablePageIfPerfTesting(){
        var url = new URL(document.URL)
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

    ClearSessionStorage(){
        window.sessionStorage.removeItem('PbiDevPerf')
    }
    
    CreateSessionStorage(){
        window.sessionStorage.setItem('PbiDevPerf', JSON.stringify({
            "timeRenderingms": [],
            "timeProcessingms": []
        }))
    }

    AddPerfMeasurementToSessionStorage(rendering, processing){
        var data = window.sessionStorage.getItem('PbiDevPerf')
        var json = JSON.parse(data)
    
        if (json !== null){
            json["timeRenderingms"].push(rendering)
            json["timeProcessingms"].push(processing)
        }
        window.sessionStorage.setItem('PbiDevPerf', JSON.stringify(json))
    }

    ReloadPageForPerf(currentTestNumber, totalTestAmount) {
        var url = new URL(document.URL)
        url.searchParams.set("PbiDevCurrent", currentTestNumber)
        url.searchParams.set("PbiDevEnd", totalTestAmount)
        var nextPage = url.href
        window.location = nextPage
    }

    EndPerformanceTests() {
        this.CreateAndDownloadPerfReport(()=>{
            var url = new URL(document.URL)
            url.searchParams.delete("PbiDevCurrent")
            url.searchParams.delete("PbiDevEnd")
            var nextPage = url.href
            window.location = nextPage
        })
    }


    Percentile(list, p) {
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
    
    CreateAndDownloadPerfReport(onCompletion){
        var data = window.sessionStorage.getItem('PbiDevPerf')
        var json = JSON.parse(data)
        var renderingData = []
        var processingData = []
    
        if (json === null || json["timeRenderingms"].length == 0){
            onCompletion()
        }
    
        renderingData = json["timeRenderingms"]
        processingData = json["timeProcessingms"]
        
        fetch(chrome.extension.getURL('./src/res/Performance.rdl'))
        .then((resp) => resp.text())
        .then((resp) => {
            var build=""
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
            resp = resp.replace("{render50}", this.Percentile(renderingData, 50))
            resp = resp.replace("{render75}", this.Percentile(renderingData, 75))
            resp = resp.replace("{render96}", this.Percentile(renderingData, 96))
            resp = resp.replace("{render99}", this.Percentile(renderingData, 99))
    
            resp = resp.replace("{processingmin}", Math.min(...processingData))
            resp = resp.replace("{processingmax}", Math.max(...processingData))
            resp = resp.replace("{processingrange}", Math.max(...processingData)-Math.min(...processingData))
            resp = resp.replace("{processingavg}", processingData.reduce((a, b) => a + b) / processingData.length)
            resp = resp.replace("{processing50}", this.Percentile(processingData, 50))
            resp = resp.replace("{processing75}", this.Percentile(processingData, 75))
            resp = resp.replace("{processing96}", this.Percentile(processingData, 96))
            resp = resp.replace("{processing99}", this.Percentile(processingData, 99))
    
            download("Performance.rdl", resp)
            
            var csv = `RenderingTime_ms,${renderingData.join(",")}\nProcessingTime_ms,${processingData.join(",")}`
    
            download("Performance.csv", csv)
            onCompletion()
        })
    }
    
    PollRenderStatus(){
        if (isRenderComplete || rdlWorkloadUrl === "" || renderId === "" || bearerToken === ""){
            return;
        }
    
        chrome.runtime.sendMessage({
            url: `${rdlWorkloadUrl}/render/${renderId}`,
            bearerToken: bearerToken,
            routingHint: routingHint,
            pollRenderStatus: true
        }, (response) => {
            if (response.status !== "running"){
                this.OnRenderComplete(response)
            }
        })
    }
    
    OnRenderComplete(response){
        isRenderComplete = true
        var timeProcessingLabel = document.querySelector("#PbiDevTimeProcessing")
        var timeRenderingLabel = document.querySelector("#PbiDevTimeRendering")
        var contentSizeLabel = document.querySelector("#PbiDevContentSize")
    
        timeProcessingLabel.textContent = response.timeProcessingms
        timeRenderingLabel.textContent = response.timeRenderingms
        contentSizeLabel.textContent = response.contentSize
    
        if (isPerfTesting){
            var url = new URL(document.URL)
            var nextRender = Number(url.searchParams.get("PbiDevCurrent"))+1
            var endRender = Number(url.searchParams.get("PbiDevEnd"))
            this.AddPerfMeasurementToSessionStorage(Number(response.timeRenderingms), Number(response.timeProcessingms))
    
            if (nextRender <= endRender){
                this.ReloadPageForPerf(nextRender, endRender)
            }
            else {
                this.EndPerformanceTests()
            }
        }
    }
    

}