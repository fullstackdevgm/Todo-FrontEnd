# todo-xplat
A cross-platform app for Todo Cloud.

## Overview
Todo Cloud xPlat is written with the Angular 2 framework. The goal of this app is to provide a write-once, run anywhere experience.

#### Web App
The app will run as a web app served from Amazon Web Services.

#### Desktop App
The app will be packaged using an [Electron](http://electron.atom.io/) wrapper and be distributed as a fully-functional native app for Windows and Mac.

In order to build the app properly, `electron-packager` must be installed globally so that it's recognized as a command-line tool:
```
npm install electron-packager -g
```

On MacOS, install `appdmg` globally:
```
npm install appdmg -g
```

#### Data Layer
The **data layer** will be abstracted so that the UI makes **exactly** the same calls via the same **Angular Services** whether the app is running as a web app or a desktop app. When the app is running on the web, the data calls will be directed to the existing Todo Cloud Web Service currently running on Amazon EC2. When the app is running on a desktop, the task data will be retrieved from a local SQLite database.

#### Synchronization
An extra **synchronization** module will be included in the desktop app. The sync module will synchronize task data changes to the Todo Cloud Web Service just like the current iOS and Android apps work. The Todo Cloud Sync API will be used: [https://sync.todo-cloud.com/sync2/](https://sync.todo-cloud.com/sync2/)

## Getting Started

### Prerequisites
1. Install **angular-cli**: `sudo npm install -g angular-cli@latest`
2. Set up the environment by installing all needed packages: `npm install`

## Starting the Server/App

In the root directory of the project, run:

`npm start`

The app will run in your browser at [http://localhost:4200](http://localhost:4200)

## Building Desktop Apps for Production

### Prerequisites

1. Install **electron-builder** globally: `sudo install -g electron-builder`

### Building for macOS distribution

Run one of:

TEST environment (pori.todo-cloud.com): `npm run package-test`

BETA environment (beta.todo-cloud.com): `npm run package-beta`

PRODUCTION environment (www.todo-cloud.com): `npm run package-prod`

## Coding & Naming Conventions

Generally, we will follow the practices described in the [Angular 2 Style Guide](https://angular.io/styleguide). For additional reference, you can look at the [Angular 2 Tutorial](https://angular.io/docs/ts/latest/tutorial/).

#### File Naming
File names should always use lower dash case (AKA [kebab-case](https://angular.io/docs/ts/latest/guide/glossary.html#kebab-case)) so we don't have to worry about case sensitivity on the server or in source control. We also specify the type of the file by using a keyword. Here are a few examples:

* **app.component.ts** - uses the **component** keyword
* **app-routing.module.ts** - uses the **module** keyword and also shows an example of using a *dash* for a multi-worded name
* **task.service.ts** - uses the **service** keyword to indicate that it's a service that provides tasks
* **tcobject.ts** - no keyword is used when defining a class

#### Components
Generally it's a good idea to separate the HTML, CSS, and TypeScript into separate files. For example, here's our **LandingComponent** (which is the *class name* of our landing page component), separated out into three different files:

* landing.component.ts
* landing.component.html
* landing.component.css

#### Directory Structure Guidelines

Adapted from recommendations from an article found on [scotch.io](https://scotch.io/tutorials/angularjs-best-practices-directory-structure):

```
electron/
---- files needed to build an Electron app
src/
---- app/
-------- app.component.ts
-------- app.component.html
-------- app.module.ts
-------- app-routing.module.ts
-------- main.ts
-------- classes/		// all our base classes here
------------ tc-task.ts
------------ tc-list.ts
------------ etc.
-------- components/	// each component is treated as a mini Angular app
------------ landing/
---------------- landing.component.ts
---------------- landing.component.html
---------------- landing.component.css
------------ sign-in/
---------------- sign-in.component.ts
---------------- sign-in.component.html
---------------- sign-in.component.css
-------- services/
------------ authentication/
---------------- tc-authentication.service.ts
------------ tasks/
---------------- tc-tasks.service.ts
------------ lists/
---------------- tc-lists.service.ts
-------- shared/		// components that are used in multiple places are put in here
------------ list-picker/
---------------- list-picker.component.ts
---------------- list-picker.component.html
---------------- list-picker.component.css
---- assets/
-------- img/	// images and icons for our app
-------- css/	// all styles and related files (SCSS or LESS files)
------------ styles.css					// our main CSS style file
-------- js/	// JavaScript files written for your app that are not for Angular specifically
-------- libs/	// Third-party libraries
---- index.html
---- main.ts
---- system.config.js (don't think this is needed anymore)
---- test.ts
---- tsconfig.json
angular-cli.json
package.json
README.md
tslint.json
```


## Deploying

### TO-DO: Determine how to prepare for deployment
#### Draft (work in progress)
I think what we'll be able to do is:

`npm start` (runs `ng serve` and you can access the app in your browser at http://localhost:4200)

`npm run build` (builds everything into `/dist/`)

`npm run electron` (runs the app inside the Electron environment)

`npm run package` (packages up the app in a Mac app and places it in `/dist-app/`)


## Third Party Libraries we need to acknowledge

https://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/