# Lines Police Server - CAD

![lines police server logo](lines-police-server.png)

[![build](https://travis-ci.com/Linesmerrill/police-cad.svg?branch=master)](https://travis-ci.com/Linesmerrill/police-cad)
[![Repository](https://img.shields.io/github/tag/linesmerrill/police-cad.svg?color=blue)](https://github.com/linesmerrill/police-cad)
[![dependency status](https://david-dm.org/linesmerrill/police-cad.svg)](https://david-dm.org/linesmerrill/police-cad)


This is a easy to setup and use police server CAD. Includes a signup/login for both Civilians and Police Officers. Also this is mobile friendly.

### Requirements : 
1.  Node.js
1.  MongoDB


### Getting Started with Code  : 
1.  [Set Up MongoDB](#setting-up-mongodb) and start mongodb
1.  Clone repo from https://github.com/Linesmerrill/police-cad.git
1.  Run `npm install`
1.  Run `node app`
1.  Go to http://localhost:8080/

### Setting up MongoDB
1. Install mongodb via brew. `brew install mongodb`
1. Start mongodb via brew. `brew services restart mongodb`

### Accessing the Database
1. Locally this will use the knoldus db (or whatever you specify manually)
1. launch mongo via your command-line: `mongo`
1. Use `show dbs` to see all that are available. You should see `knoldus` in the list.
1. Lets use that db: `use knoldus`.
