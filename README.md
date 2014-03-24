Proxy for Scenario
==================
I design this simple node application to make a mock api for UI devs when the backend is not ready or down.<br />
This one can also be used for UI tests, to just test a UI application, mocking the API.<br />

For now, it's only accept JSON requests and responses.

_____________________________________________________________________________________________
##Current version
-Current stable version is 1.0<br />
-Current RC version is 1.1-RC1<br />
-Current beta version is 1.1.1
####Changes in 1.1.1 :
- Add missing images
- Fix bug to match entry (bodyIn in wrong type)
####Changes in 1.1 :
[ISSUES](https://github.com/PierreLeresteux/ProxyScenario/issues?milestone=1&page=1&state=closed "Issues closed") <br />

##How it works

####Installation
run this command to download all dependencies :
<pre>
npm install
</pre>

####Run
Very simple, use with node to and start the server by running this command
<pre>
node http-proxy.js
</pre>

When you make for the first time a request, the app search in DB if a previous request match. If not, call the real API and store the response for the future. (It's like a static cache). This search can be disabled by set the bypass property to "On" in the web interface).

The application is just a proxy to a real api (change the baseUrl/basePort value to target the api you want to store).

You can also have access to a web interface through the port 3000 and configure all properties (real time switch for url/port, status offline/online, bypass and proxy port. For the admin port, you need to restart the node server)

