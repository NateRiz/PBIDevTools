function main(){
    isDevToolbarEnabled = false
    isActivityTypeTooltipsEnabled = false
    isUseLocalAnaheimEnabled = false

    chrome.storage.sync.get(["DevToolbar", "ActivityTypeTooltips", "UseLocalAnaheim"], function(data){
        isDevToolbarEnabled = (data.DevToolbar===true)
        isActivityTypeTooltipsEnabled = (data.ActivityTypeTooltips===true)
        isUseLocalAnaheimEnabled = (data.UseLocalAnaheim===true)

        devToolbarSlider = document.querySelector("#PbiDevDevToolbar")
        devToolbarSlider.checked = isDevToolbarEnabled

        activityTypeToolbarSlider = document.querySelector("#PbiDevActivityType")
        activityTypeToolbarSlider.checked = isActivityTypeTooltipsEnabled

        localAnaheimToolbarSlider = document.querySelector("#PbiDevLocalAnaheim")
        localAnaheimToolbarSlider.checked = isUseLocalAnaheimEnabled

        devToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"DevToolbar": devToolbarSlider.checked})
        }
        activityTypeToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"ActivityTypeTooltips": activityTypeToolbarSlider.checked})
        }
        localAnaheimToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"UseLocalAnaheim": localAnaheimToolbarSlider.checked})
        }
    })
}

document.addEventListener("DOMContentLoaded", function(event) { 
    main()
});