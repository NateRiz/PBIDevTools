var RdlService = class{
    constructor(){
        this.rdl = ""
    }

    CreateModal(){
        var dataSourceNext = document.querySelector("#PbiDevDataSourceNext")
        dataSourceNext.onclick = ()=>{
            if (dataProviders.length == 0){
                return;
            }
            dataSourceIndex = (dataSourceIndex + 1) % dataProviders.length
            this.SetDataSource(dataSourceIndex)
        }
        var dataSourcePrev = document.querySelector("#PbiDevDataSourcePrev")
        dataSourcePrev.onclick = ()=>{
            if (dataProviders.length == 0){
                return;
            }
            dataSourceIndex = ((dataSourceIndex - 1) === -1 ? dataProviders.length-1 : dataSourceIndex - 1)
            this.SetDataSource(dataSourceIndex)
        }
    }

    
    FetchRdl(){
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

    DownloadRdl(){
        if (this.rdl === ""){
            this.FetchRdl().then((data)=>{
                this.rdl = data
                Utils.Download("Download.rdl", data)
            })
        }else{
            Utils.Download("Download.rdl", this.rdl)
        }
        
    }

    PopulateRdlDebugInfo(){
        this.FetchRdl().then((rdl)=>{
            this.rdl = rdl
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(rdl, "text/xml");
    
            var dataProviderNodes = xmlDoc.getElementsByTagName("DataProvider")
            var connectionStringNodes = xmlDoc.getElementsByTagName("ConnectString")
            for(var i=0; i<dataProviderNodes.length; i++) {
                dataProviders.push(dataProviderNodes[i].childNodes[0].nodeValue)
                connectionStrings.push(connectionStringNodes[i].childNodes[0].nodeValue)
            }
    
            if (dataProviderNodes.length !== 0){
                this.SetDataSource(0)
            }
    
            var numEmbeddedImages = xmlDoc.getElementsByTagName("EmbeddedImage").length
            document.querySelector("#PbiDevEmbeddedImages").textContent = numEmbeddedImages
    
        })
    }
    
    SetDataSource(idx){
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
}