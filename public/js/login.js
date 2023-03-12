function stringifyQuery(queryObj) {
  var query = '';
  for (var key in queryObj) {
    if (query != '') { query += '&'; }
    query += encodeURIComponent(key) + "=" + encodeURIComponent(queryObj[key]);
  }
  return query;
}

function randomString(length) {
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  var result = '';
  for (var i = length; i > 0; --i) { result += CHARS[Math.floor(Math.random() * CHARS.length)]; }
  return result;
}

var callbacks = {};


window.addEventListener('load', function() {
  var rpcToken = randomString(16);
  var clientID = document.querySelector('meta[name="client-id"]').getAttribute('content');
  
  function sendMessage(method, params, cb) {
    console.log('sending...');
    
  
    var message = {};
  
    var id = randomString(8);
    message.id = id;
    callbacks[id] = cb;
  
    message.method = method;
    message.params = params;
    message.rpcToken = rpcToken;
  
    console.log(message);
  
    window['idp'].contentWindow.postMessage(JSON.stringify(message), 'https://accounts.google.com'); // FIXME: DRY-up the origin
  }
  
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
    // NOTE: We get this message even without the embedded iframe when making popup
    
    console.log('GOT MESSAGE!');
    console.log(event);
    
    var data = JSON.parse(event.data);
    console.log(data);
    
    // FIXME: put this back.  removed because fireIdpEvent authResult after popup seems to lack it
    //if (data.rpcToken !== rpcToken) { return; }
    
    if (data.id) {
      var cb = callbacks[data.id];
      if (cb) {
        console.log('HAVE A CALLBACK!');
        cb(null, data.result);
        delete callbacks[data.id];
      }
      
    } else if (data.method == 'fireIdpEvent') {
      console.log('IDP EVENT');
      console.log(data.params.type);
      
      switch (data.params.type) {
      case 'idpReady':
        console.log('IDP READY');
        
        sendMessage('monitorClient', { clientId: clientID }, function(err, result) {
          console.log('MONITORING!!!!');
          console.log(result);
          
          var params = {
            crossSubDomains: true,
            domain: window.location.origin
          }
          
          sendMessage('getSessionSelector', params, function(err, result) {
            console.log('GOT SESSION SELECTOR');
            console.log(err);
            console.log(result);
            
            // NOTE: result seems to be undefined in cases where session slector was not previously set
            
            if (!result) { return; }
            
            
          });
          
        });
        
        break;
        
      case 'authResult':
        console.log('GOT AUTH RESULT');
        console.log(data.params);
        console.log(data.params.authResult);
        console.log(data.params.authResult.login_hint);
        
        //console.log('login_hint: ' + data.params.login_hint)
        console.log('clientID: ' + data.params.clientId)
        //console.log('clientID: ' + data.params.clientId)
        
        // NOTE: clientId is duplicated in authResult.  Not sure why its in authResult
        
        console.log('---');
        
        
        var params = {
          crossSubDomains: true,
          domain: window.location.origin,
          hint: data.params.authResult.login_hint,
          disabled: false
        }
        
        sendMessage('setSessionSelector', params, function(err, result) {
          console.log('SET SESSION SELECTOR');
          console.log(err);
          console.log(result);
          
        });
        
        
        // TODO: What is `data.params.id` here?
        break;
        
      }
    }
    
    
    
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
  
  var url = 'https://accounts.google.com/o/oauth2/iframe#' + stringifyQuery({
    origin: window.location.origin,
    rpcToken: rpcToken,
    clearCache: 1
  });
  console.log('url: ' + url);
  
  
  // Embed IDP IFrame into container page.
  var iframe = document.createElement('iframe');
  //iframe.style.display = "none";
  iframe.id = 'idp';
  iframe.sandbox = 'allow-scripts allow-same-origin'
  iframe.src = url;
  document.body.appendChild(iframe);
  
});
