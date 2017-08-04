// code that gets injected into the target page
// keep this as simple as possible

var selection = window.getSelection();
if (!selection.isCollapsed) {
    chrome.runtime.sendMessage(selection.toString())
} 

//document.execCommand('Copy');
// this does not work 
// neither in the pdf plugin page
// nor in pdf preview of gmail..