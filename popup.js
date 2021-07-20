function main(){
    var isDevToolbarEnabled = false
    var isUseLocalAnaheimEnabled = false
    var activityTypes = {}

    fetch(chrome.extension.getURL('/activities.json'))
    .then((resp) => resp.json())
    .then(function (jsonData) {
        console.log("LOADED")
        activityTypes = jsonData
    })

    chrome.storage.sync.get(["DevToolbar", "UseLocalAnaheim"], function(data){
        isDevToolbarEnabled = (data.DevToolbar===true)
        isUseLocalAnaheimEnabled = (data.UseLocalAnaheim===true)

        devToolbarSlider = document.querySelector("#PbiDevDevToolbar")
        devToolbarSlider.checked = isDevToolbarEnabled

        localAnaheimToolbarSlider = document.querySelector("#PbiDevLocalAnaheim")
        localAnaheimToolbarSlider.checked = isUseLocalAnaheimEnabled

        devToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"DevToolbar": devToolbarSlider.checked})
        }
        localAnaheimToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"UseLocalAnaheim": localAnaheimToolbarSlider.checked})
        }
    })

    var activityTypeInput = document.querySelector("#PbiDevActivityTypeInput")
    var activityTypeResult = document.querySelector("#PbiDevActivityTypeResult")
    if (activityTypeInput !== null && activityTypeResult !== null){
        activityTypeInput.oninput = function () {
            var activityType = activityTypeInput.value.toUpperCase()
            if (activityType.length != 4){
                return
            }

            activityTypeResult.value = (activityTypes[activityType] === undefined ? "Not Found" : activityTypes[activityType])
        }
    }
}

document.addEventListener("DOMContentLoaded", function(event) { 
    main()
});