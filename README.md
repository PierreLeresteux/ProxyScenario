Proxy for Scenario
==================

I design this simple node application to make a mock api for UI devs when the backend is not ready or down.<br />
This one can also be used for UI tests, to just test a UI application, mocking the API.

-----------------

How it works
------------

Very simple, use with node to and start the server (node http-proxy.js)

Two ports are availables :
* 8000 : to record a request
* 8080 : to call the recorded requests

The application is just a proxy to a real api (change the baseUrl value to target the api you want to store).

