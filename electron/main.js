// Setup environment variables for the server. (Could easily be loaded from a configuration file.)
const electronEnvironment = require('./environment.json')
for (const key in electronEnvironment) {
  process.env[key] = electronEnvironment[key]
}

const os = require('os')
const { app, BrowserWindow, dialog, crashReporter } = require('electron')
const Config = require('electron-config')
const config = new Config()
const { autoUpdater } = require('electron-updater')
if (process.platform === 'darwin') {
  process.env.TC_API_KEY = 'vkRODyrNSx8xJFqztq1qM24k7CKM62YnfDGeMz50'
} else {
  process.env.TC_API_KEY = 'NfPsGd1Qjs8ZwFoxOjdzv2Dpe8UrfWsG40uT0Iz9'
}

var autoUpdateTimer = null
const autoUpdateInterval = 86400 // Check for an update every 24 hours

// Set up the Electron App *before* we initialize Express.js
// so that Express.js will have access to the correct location
// to store the SQLite DB file.

// Use a different userData directory based on the deployment type we are
// running in. For 'PROD' don't make any changes, but for 'DEV',
// 'TEST', and 'BETA' change the suffix of the directory.
process.env.TODO_DATA_DIRECTORY = app.getPath("userData")
if (process.env.TC_DEPLOYMENT_TYPE != 'PROD') {
  process.env.TODO_DATA_DIRECTORY = `${process.env.TODO_DATA_DIRECTORY}-${process.env.TC_DEPLOYMENT_TYPE}`
  app.setPath("userData", process.env.TODO_DATA_DIRECTORY)
}

var homeDirectory = app.getPath('home')

const server = require('todo-api/server')

const appMenu = require('./app-menu')

const log4js = require('log4js')
const path = require('path')
const logFile = path.join(process.env.TODO_DATA_DIRECTORY, 'todo.log')
var logLevel = 'error'
try {
  const advancedSettings = require(path.join(homeDirectory, '.todo', 'advanced-settings.json'))
  if (advancedSettings && advancedSettings.logging_level) {
    logLevel = advancedSettings.logging_level
    console.info(`Overriding default logging level from ~/.todo/advanced-settings.json: ${logLevel}`)
  }
} catch (error) {
  console.error(`Error parsing ~/.todo/advanced-settings.json: ${error.message}`)
}

const appenders = {
  out : { type: 'stdout' },
  'todo-api': { type: 'file', filename: logFile, daysToKeep: 7}
}
const appenderArray = ['todo-api']
if (process.env.TC_DEPLOYMENT_TYPE != 'PROD') {
  appenderArray.push('out')
}

log4js.configure({
  appenders: appenders,
  categories: { default: { appenders: appenderArray, level: logLevel}}
})
const logger = log4js.getLogger('todo-api')

console.log(`temp dir: ${app.getPath('temp')}`)

// Start a crash reporter that will log crashes
crashReporter.start({
  productName: `TodoCloud`,
  companyName: `Appigo, Inc.`,
  submitURL: `none`,
  uploadToServer: false
})

autoUpdater.logger = logger

autoUpdater.on("error", function(err) {
  logger.debug(`autoUpdater: Error: ${error}`)
})

autoUpdater.on("checking-for-update", function() {
  logger.debug(`autoUpdater: Checking for update...`)
})

autoUpdater.on("update-downloaded", function() {
  logger.debug(`autoUpdater: Update Downloaded`)
})

autoUpdater.on("update-available", function() {
  logger.debug(`autoUpdater: Update Available`)
})

autoUpdater.on("update-not-available", function() {
  logger.debug(`autoUpdater: Update NOT available`)
})

autoUpdater.on("download-progress", function(progressInfo) {
  logger.debug(`autoUpdater: Progress: ${progressInfo.percent}%`)
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function initializeApp () {
  // Set up the application menu
  appMenu.setUpAppMenu()

  let opts = {show: false}
  let winBounds = config.get('winBounds')
  if (winBounds) {
    Object.assign(opts, winBounds)
  } else {
    Object.assign(opts, {width: 1280, height: 720})
  }
  Object.assign(opts, {minWidth: 320, minHeight: 640})
  
  // Create the browser window.
  mainWindow = new BrowserWindow(opts)

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    // Open the DevTools.
    if (process.env.TC_DEPLOYMENT_TYPE == 'DEV' || process.env.TC_DEPLOYMENT_TYPE == 'TEST') {
      mainWindow.webContents.openDevTools()
    }
  })

  // Emitted when the window is about to be closed
  mainWindow.on('close', () => {
    // Save the window size and position
    config.set('winBounds', mainWindow.getBounds())

    return true
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}


//
// Auto Updater Code - Mostly handled by electron-builder and electron-publisher-s3
// and does not require a separate API.

// autoUpdater.on('checking-for-update', function() {
//   logger.debug(`Auto Updater: Checking for auto update...`)
// })

// autoUpdater.on('error', function(err) {
//   logger.debug(`Auto Updater: Error checking for auto update: ${err.message}`)
// })

// autoUpdater.on('update-available', function() {
//   logger.debug(`Auto Updater: Update IS available`)
// })

autoUpdater.on('update-not-available', function() {
  logger.debug(`Auto Updater: An update is NOT available`)

  // Set up the timer 
  autoUpdateTimer = setTimeout(() => {
    try {
      logger.info(`calling autoUpdater.checkForUpdatesAndNotify()...`)
      autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      console.warn(`Could not check for app update: ${error.message}`)
    }
  }, autoUpdateInterval * 1000)
})

//autoUpdater.on('update-downloaded', processAutoUpdaterDownload)

// function processAutoUpdaterDownload(event, releaseNotes, releaseName, releaseDate, updateURL) {
//   logger.debug(`Auto Updater: Update downloaded: ${updateURL}`)

//   const dialogOpts = {
//     type: 'info',
//     buttons: ['Restart', 'Later'],
//     title: 'Application Update',
//     message: `${releaseName} (version: ${releaseNotes})`,
//     detail: 'A new version has been downloaded. Restart the application to apply the update.'
//   }

//   dialog.showMessageBox(dialogOpts, (response) => {
//     if (response === 0) autoUpdater.quitAndInstall()
//   })
  
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
  initializeApp()

  autoUpdateTimer = setTimeout(() => {
    try {
      // Initial app launch check
      logger.info(`calling autoUpdater.checkForUpdatesAndNotify()...`)
      autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      console.warn(`Could not check for app update: ${error.message}`)
    }
  }, 10000) // check after 10 seconds have passed
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    initializeApp()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

