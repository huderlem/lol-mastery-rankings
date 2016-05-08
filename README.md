LoL Mastery Ranks
===================
LoL Mastery Ranks is a Node.js web application created for the Riot API Challenge (April 2016). Its purpose is to show summoners how they stack up against their opponents in terms of champion mastery points.  It provides two views:

 1. For a given summoner, lists their rank for each champion compared to all other players.
 2. For a given champion, lists the top summoners.

Live site in action: [lol-mastery.huderlem.com](http://lol-mastery.huderlem.com/)

----------


Installation
-------------

 1. Install Node.js
 2. Install MySQL
 3. Clone this repository
 4. Install project dependencies defined in package.json by running `npm install`
 5. With the `mysql` service running, execute the database creation script.
	   `mysql < database/create-db.sql`
 6. Create a config file called `default.json` in the `config` folder.  Simply replace the values in `example-config.json` to build `default.json`.  (Note, when deploying to a production environment, the config file needs to be called `production.json`.  `default.json` is used in the non-production environment.)
 7. Run the app with `node app.js`.  You should be able to view the app running locally at [localhost:3000](http://localhost:3000)

Technical Info
-------------

I used this API Challenge as an opportunity to learn some new technologies. This app's stack uses the following:

* Node.js - server logic
* MySQL - database
* Pug - HTML templating
* JQuery - client-side scripting
* Bootstrap - HTML styling
* The Riot API (duh)

Moving Forward / What I Learned
-------------

One limitation of this application is that it only knows about summoners who have been populated in the database. Whenever a new summoner is searched, it populated his/her mastery rankings data. Without scraping Riot's data to get a list of known summoners, the data population is rather limited.  I also believe that there will be some scaling issues if the number of populated summoners grows significantly.  This is because the data retrieval is running a stored procedure that is sorting all known data for each champion.  This can be addressed by caching these results, and only computing the ranking data at fixed intervals, rather than on every request.

This app exposes two endpoints that return JSON data for the rankings. This data could easily be incorporated into other apps. For example, one could leverage these endpoints to create a Chrome extension for op.gg, so you could view the opposing team's mastery ranks.

The decision to use Node.js was due to the fact that it's probably the most popular web technology I hadn't used.  After this project, I'm left with mixed feelings about it.  On one hand, it was extremely easy to get a simple app up and running. All it took was a few `npm` installs, and a couple endpoint definitions for the server. It was also very easy to interact with the Riot API, since JSON and JavaScript objects go hand-in-hand.  On the other hand, I quickly found myself in a callback nightmare, due to the asynchronous nature of Node.js--and this is a small app!  The majority of my programming experience has been with synchronous functions. The way I tend to break code up into meaningful, logical functions didn't seem to mesh with how Node.js works.  Passing a callback through a long chain of function calls will undoubtedly prove difficult to maintain if the app were to grow in scope.

I also learned how to deploy a full-stack web application to a Digital Ocean server. This involved unexpected challenges such as:

 1. Creating a reverse proxy using Nginx to forward HTTP requests to the running app.
 2. Setting up a DNS record for the app.
 3. Ensuring the app was running under appropriate credentials.
