var Utils = class {
    static Download(filename, text, type="text/plain") {
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

    static CopyToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
    }
}