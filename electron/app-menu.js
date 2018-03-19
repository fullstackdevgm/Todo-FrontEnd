const { app, BrowserWindow, globalShortcut, Menu, ipcMain } = require('electron')

const MenuActionEvent = 'app-menu-action'
const MenuIdentifier = {
    Find: 'find',
    Preferences: 'preferences',
    TaskCreate: 'task-create',
    TaskSync: 'task-sync',
    TaskComplete: 'task-complete',
    TaskRemoveDueDate: 'task-remove-due-date',
    TaskConvertToNormal: 'task-convert-to-normal',
    TaskConvertToProject: 'task-convert-to-project',
    TaskConvertToChecklist: 'task-convert-to-checklist',
    TaskSetPriorityHigh: 'task-set-priority-high',
    TaskSetPriorityMedium: 'task-set-priority-medium',
    TaskSetPriorityLow: 'task-set-priority-low',
    TaskSetPriorityNone: 'task-set-priority-none'
}

exports.MenuActionEvent = MenuActionEvent
exports.MenuIdentifier = MenuIdentifier

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New Task',
                accelerator: process.platform === 'darwin' ? 'Ctrl+N' : 'Ctrl+Alt+N',
                click: handleCreateNewTaskShortcut,
                enabled: false,
                id: MenuIdentifier.TaskCreate
            },
            {type: 'separator'},
            {
                label: 'Synchronize',
                accelerator: process.platform === 'darwin' ? 'Ctrl+S' : 'Ctrl+Alt+S',
                click: handleSyncShortcut,
                enabled: false,
                id: MenuIdentifier.TaskSync
            }
        ]
    },
    {
      label: 'Edit',
      submenu: [
        {
            role: 'undo',
            id: 'undo'
        },
        {
            role: 'redo',
            id: 'redo'
        },
        {type: 'separator'},
        {
            role: 'cut',
            id: 'cut'
        },
        {
            role: 'copy',
            id: 'copy'
        },
        {
            role: 'paste',
            id: 'paste'
        },
        {
            role: 'delete',
            id: 'delete'
        },
        {
            role: 'selectall',
            id: 'selectall'
        },
        {type: 'separator'},
        {
          label: 'Find',
          accelerator: process.platform === 'darwin' ? 'Ctrl+F' : 'Ctrl+Alt+F',
          click: handleSearchShortcut,
          id: MenuIdentifier.Find
        }
      ]
    },
    {
      label: 'Task',
      submenu: [
        {
          label: 'Complete',
          accelerator: process.platform === 'darwin' ? 'Ctrl+.' : 'Ctrl+Alt+.',
          click: handleCompleteTaskShortcut,
          enabled: false,
          id: MenuIdentifier.TaskComplete
        },
        {
          label: 'Remove Due Date',
          click: handleRemoveDueDateShortcut,
          enabled: false,
          id: MenuIdentifier.TaskRemoveDueDate
        },
        {type: 'separator'},
        {
          label: 'Convert to Normal',
          accelerator: 'Ctrl+Shift+N',
          click: handleConvertToNormalShortcut,
          enabled: false,
          id: MenuIdentifier.TaskConvertToNormal
        },
        {
          label: 'Convert to Project',
          accelerator: 'Ctrl+Shift+P',
          click: handleConvertToProjectShortcut,
          enabled: false,
          id: MenuIdentifier.TaskConvertToProject
        },
        {
          label: 'Convert to Checklist',
          accelerator: 'Ctrl+Shift+C',
          click: handleConvertToChecklistShortcut,
          enabled: false,
          id: MenuIdentifier.TaskConvertToChecklist
        },
        {type: 'separator'},
        {
          label: 'Priority',
          submenu: [
            {
              label: 'High',
              accelerator: 'Ctrl+Alt+3',
              click: handleSetHighPriorityShortcut,
              enabled: false,
              id: MenuIdentifier.TaskSetPriorityHigh
            },
            {
              label: 'Medium',
              accelerator: 'Ctrl+Alt+2',
              click: handleSetMediumPriorityShortcut,
              enabled: false,
              id: MenuIdentifier.TaskSetPriorityMedium
            },
            {
              label: 'Low',
              accelerator: 'Ctrl+Alt+1',
              click: handleSetLowPriorityShortcut,
              enabled: false,
              id: MenuIdentifier.TaskSetPriorityLow
            },
            {
              label: 'None',
              accelerator: 'Ctrl+Alt+0',
              click: handleSetNonePriorityShortcut,
              enabled: false,
              id: MenuIdentifier.TaskSetPriorityNone
            }
          ]
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {role: 'minimize'},
        {role: 'close'}
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click () {require('electron').shell.openExternal('http://support.appigo.com/') }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    menuTemplate.unshift({
      label: app.getName(),
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
            label: 'Preferences',
            accelerator: 'Command+,',
            click: handleAppSettingsShortcut,
            enabled: false,
            id: MenuIdentifier.Preferences
        },
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    })

    // Edit menu
    menuTemplate[2].submenu.push(
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'}
        ]
      }
    )

    // Window menu
    menuTemplate[4].submenu = [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'}
    ]
  }

if (process.env.TC_DEPLOYMENT_TYPE != "PROD") {
  // Make a Debug menu available to hide and show the inspector panel
  menuTemplate.push(
    {
      label: 'Debug',
      id: 'debug',
      submenu: [
        {role: 'reload'},
        {role: 'forcereload'},
        {role: 'toggledevtools'}
      ]
    }
  )
}

exports.setUpAppMenu = function() {
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)

    // registerGlobalKeyboardShortcuts()
}

function handleSearchShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.Find)
}
function handleCreateNewTaskShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskCreate)
}
function handleSyncShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskSync)
}
function handleCompleteTaskShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskComplete)
}
function handleRemoveDueDateShortcut(menuItem, browserWindow, event) {
  browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskRemoveDueDate)
}
function handleSetHighPriorityShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskSetPriorityHigh)
}
function handleSetMediumPriorityShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskSetPriorityMedium)
}
function handleSetLowPriorityShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskSetPriorityLow)
}
function handleSetNonePriorityShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskSetPriorityNone)
}
function handleAppSettingsShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.Preferences)
}
function handleConvertToNormalShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskConvertToNormal)
}
function handleConvertToProjectShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskConvertToProject)
}
function handleConvertToChecklistShortcut(menuItem, browserWindow, event) {
    browserWindow.webContents.send(MenuActionEvent, MenuIdentifier.TaskConvertToChecklist)
}

// These are for shortcuts that get executed even when the app
// does NOT have focus. I don't think we want to have any of
// these right now, but I'm leaving this here for reference.
// function registerGlobalKeyboardShortcuts() {
//   const shortcutInfo = [
//     ['Ctrl+N', 'Ctrl+Alt+N', handleCreateNewTaskShortcut],
//     ['Ctrl+S', 'Ctrl+Alt+S', handleSyncShortcut],
//     ['Ctrl+F', 'Ctrl+Alt+F', handleSearchShortcut],
//     ['Ctrl+.', 'Ctrl+Alt+.', handleCompleteTaskShortcut],
//     ['Ctrl+Alt+3', 'Ctrl+Alt+3', handleSetHighPriorityShortcut],
//     ['Ctrl+Alt+2', 'Ctrl+Alt+2', handleSetMediumPriorityShortcut],
//     ['Ctrl+Alt+1', 'Ctrl+Alt+1', handleSetLowPriorityShortcut],
//     ['Ctrl+Alt+0', 'Ctrl+Alt+0', handleSetNonePriorityShortcut],
//     ['Ctrl+Shift+N', 'Ctrl+Shift+N', handleConvertToNormalShortcut],
//     ['Ctrl+Shift+P', 'Ctrl+Shift+P', handleConvertToProjectShortcut],
//     ['Ctrl+Shift+C', 'Ctrl+Shift+C', handleConvertToChecklistShortcut],
//     ['Command+,', 'Ctrl+Alt+,', handleAppSettingsShortcut],
//   ]

//   shortcutInfo.forEach(shortcut => {
//     if (process.platform == 'darwin') {
//       globalShortcut.register(shortcut[0], shortcut[2])
//     } else {
//       globalShortcut.register(shortcut[1], shortcut[2])
//     }
//   })
// }