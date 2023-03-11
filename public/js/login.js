function stringifyQuery(queryObj) {
  var query = '';
  for (var key in queryObj) {
    if (query != '') { query += '&'; }
    query += encodeURIComponent(key) + "=" + encodeURIComponent(queryObj[key]);
  }
  return query;
}

window.addEventListener('load', function() {
  
  document.getElementById('login').addEventListener('click', function(event) {
    event.preventDefault();
    
    var clientID = document.querySelector('meta[name="client-id"]').getAttribute('content');
    
    // TODO: need to track state here
    // FIXME: without nonce here, this has a bad error message from the server
    
    //var url = 'https://accounts.google.com/o/oauth2/v2/auth?' + stringifyQuery({
    var url = 'http://localhost:8085/oauth2/authorize?' + stringifyQuery({
      //response_type: 'id_token',
      response_type: 'permission',
      client_id: clientID,
      xresponse_mode: 'web_message',
      redirect_uri: window.location.origin + '/oauth2/redirect',
      scope: 'profile', // required by google
      //nonce: 'TODO' // disallowed by google?
    });
    
    
    // NOTE: Google only likes storage relay URLs for permission response type???
    var url = 'https://accounts.google.com/o/oauth2/auth?redirect_uri=storagerelay%3A%2F%2Fhttp%2Flocalhost%3A3001%3Fid%3Dauth729645&response_type=permission%20id_token&scope=email%20profile%20openid&openid.realm=&client_id=97355295620-a4hma838augdoa0rbu1pc61ln3sqkgf6.apps.googleusercontent.com&ss_domain=http%3A%2F%2Flocalhost%3A3001&fetch_basic_profile=true&gsiwebsdk=2';
    
    window.open(url, '_login', 'top=' + (screen.height / 2 - 275) + ',left=' + (screen.width / 2 - 250) + ',width=500,height=550');
  });
  
  window.addEventListener('message', function(event) {
    console.log('GOT MESSAGE!');
    console.log(event);
    return;
    
    // TODO: make a strategy to POST id_token to backend
    
    if (event.origin !== window.location.origin) { return; }
    if (event.data.type !== 'authorization_response') { return; }
    
    event.source.close();
    
    var csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/oauth/receive/twitter?' + stringifyQuery(event.data.response), true);
    xhr.onload = function() {
      var json = JSON.parse(xhr.responseText);
      window.location.href = json.location;
    };
    xhr.send();
  });
  
});
