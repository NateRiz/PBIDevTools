var ExportApiService = class {
    constructor(){
        this.apiBaseUrl = ""
        this.lastExportID = ""
        this.lastExportFilename = ""
    }

    APIExport(){
        if (!this.IsExportAPIEnabled() && bearerToken){
            return;
        }
        var statusCode = -1
        var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
        var exportStatusLabel = document.querySelector("#PbiDevAPIExportStatus")
        var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
        var resultTextArea = document.querySelector("#PbiDevAPIResult")
        var body = document.querySelector("#PbiDevAPIBody").value
        var url = window.location.href
        var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
        var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
        var apiUrl = `${this.apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exportTo`
    
        fetch(apiUrl, {
            method: 'POST',
            headers: {'Authorization': bearerToken,'Content-Type': 'application/json'},
            body: body
        }).then((response) => {
            statusCode = response.status
            requestIdLabel.textContent = response.headers.get('requestid')
            statusCodeLabel.textContent = response.status
            return response.json()
        }).then((data) => {
            resultTextArea.value = JSON.stringify(data, null, 4)
            if (statusCode == 202){
                this.lastExportID = data["id"]
                exportStatusLabel.textContent = data["status"]
            }
        })
    }
    
    APIGetStatus(){
        if (!this.IsExportAPIEnabled() || this.lastExportID === ""){
            return;
        }
        var statusCode = -1
        var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
        var exportStatusLabel = document.querySelector("#PbiDevAPIExportStatus")
        var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
        var resultTextArea = document.querySelector("#PbiDevAPIResult")
        var url = window.location.href
        var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
        var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
        var apiUrl = `${this.apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${this.lastExportID}`
    
        fetch(apiUrl, {
            method: 'GET',
            headers: {'Authorization': bearerToken}
        }).then((response) => {
            statusCode = response.status
            requestIdLabel.textContent = response.headers.get('requestid')
            statusCodeLabel.textContent = response.status
            return response.json()
        }).then((data) => {
            resultTextArea.value = JSON.stringify(data, null, 4)
            if (statusCode == 200 || statusCode == 202){
                this.lastExportFilename = data["reportName"] + data["resourceFileExtension"]
                exportStatusLabel.textContent = data["status"]
            }
        })
    }
    
    APISave(){
        if (!this.IsExportAPIEnabled() || this.lastExportID === ""){
            return;
        }
        var statusCode = -1
        var statusCodeLabel = document.querySelector("#PbiDevAPIStatusCode")
        var requestIdLabel = document.querySelector("#PbiDevAPIRequestId")
        var url = window.location.href
        var groupId = url.match(/groups\/(.*)\/rdlreports/)[1]
        var reportId = url.match(/rdlreports\/([a-zA-Z0-9-]*)/)[1]
        var apiUrl = `${this.apiBaseUrl}/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${this.lastExportID}/file`
    
        //Update the filename
        this.APIGetStatus()
    
        fetch(apiUrl, {
            method: 'GET',
            headers: {'Authorization': bearerToken}
        }).then((response) => {
            statusCode = response.status
            requestIdLabel.textContent = response.headers.get('requestid')
            statusCodeLabel.textContent = response.status
            return response.blob()
        }).then((blob) => { 
            var filename = this.lastExportFilename ? this.lastExportFilename : 'Download'
            download(filename, blob, "application/json")
        })
    }

    IsExportAPIEnabled(){
        return this.apiBaseUrl !== ""
    }

    GetApiBaseUrl(){
        return this.apiBaseUrl
    }

    SetApiBaseUrl(url){
        this.apiBaseUrl = url
    }
    
}

