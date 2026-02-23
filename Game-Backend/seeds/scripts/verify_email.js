const sUserName = new URLSearchParams(window.location.search).get('sUserName');
const sFrontendUrl = new URLSearchParams(window.location.search).get('sFrontendUrl');

if (sUserName) document.getElementById('sUserName').innerText = sUserName;
if (sFrontendUrl) document.getElementById('sFrontendUrl').href = `${sFrontendUrl}/login`;
