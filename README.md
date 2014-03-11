Proxy for Scenario
==================

I design this simple node application to make a mock api for UI devs when the backend is not ready or down.<br />
This one can also be used for UI tests, to just test a UI application, mocking the API.

-----------------

How it works
------------

Very simple, use with node to and start the server (node http-proxy.js)

The listen port is a parameter (default : 8080).

When you make for the first time a request, the app search in DB if a previous request match. If not, call the real API and store the response for the future. (It's like a static cache).

The application is just a proxy to a real api (change the baseUrl value to target the api you want to store).

You can also delete all entries, just start the application with the argument "eraseDB" :<br />
node http-proxy.js eraseDB

You can also run the application in offline mode (no call to the real api), with the argument : "offline" <br/>
node http-proxy.js offline

All arguments can be added ...<br/>
node http-proxy.js offline eraseDB<br/>

but offline and no entry in DB ... it's a not a good idea ! :-)
