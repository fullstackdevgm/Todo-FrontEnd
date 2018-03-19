import { Injectable, OnInit }     from '@angular/core'
import { environment } from '../../environments/environment'
import { Subject } from 'rxjs/Rx'

declare var electron : any

export interface AppMenuAction {
    menuItemID: string
}

export const AppMenuIdentifier = {
    Find                    : 'find',
    Preferences             : 'preferences',
    TaskCreate              : 'task-create',
    TaskSync                : 'task-sync',
    TaskComplete            : 'task-complete',
    TaskRemoveDueDate       : 'task-remove-due-date',
    TaskConvertToNormal     : 'task-convert-to-normal',
    TaskConvertToProject    : 'task-convert-to-project',
    TaskConvertToChecklist  : 'task-convert-to-checklist',
    TaskSetPriorityHigh     : 'task-set-priority-high',
    TaskSetPriorityMedium   : 'task-set-priority-medium',
    TaskSetPriorityLow      : 'task-set-priority-low',
    TaskSetPriorityNone     : 'task-set-priority-none'
}

@Injectable()
export class AppMenuService {

    public readonly actions : Subject<AppMenuAction>

    private electronMenu : any

    constructor(
    ) {
        this.actions = new Subject<AppMenuAction>()

        if (environment.isElectron) {
            this.electronMenu = electron.remote.Menu.getApplicationMenu()
            electron.ipcRenderer.on('app-menu-action', (event, menuItemID) => {
                // Publish the action to subscribers
                this.actions.next({menuItemID: menuItemID})
            })
        }
    }

    enableMenuItems(items : Array<string>) : void {
        if (!environment.isElectron) { return }
        items.forEach(idendifier => {
            let electronMenuItem = this.getElectronMenuItemFromIdentifier(idendifier)
            if (electronMenuItem) {
                electronMenuItem.enabled = true
            }
        })
    }

    disableMenuItems(items : Array<string>) : void {
        if (!environment.isElectron) { return }
        items.forEach(idendifier => {
            let electronMenuItem = this.getElectronMenuItemFromIdentifier(idendifier)
            if (electronMenuItem) {
                electronMenuItem.enabled = false
            }
        })
    }

    private getElectronMenuItemFromIdentifier(identifier : string) : any {
        if (!this.electronMenu) {
            return null
        }

        let items = this.electronMenu.items

        if (!items) {
            return null
        }

        return this.findMenuItemWithIdentifier(identifier, items)
    }

    private findMenuItemWithIdentifier(identifier: string, menuItems : any) : any {
        if (!identifier || !menuItems) {
            return null
        }

        for (var i = 0; i < menuItems.length; i++) {
            let item = menuItems[i]
            let itemID = item.id
            if (itemID && itemID == identifier) {
                return item
            }

            if (item.submenu) {
                let foundItem = this.findMenuItemWithIdentifier(identifier, item.submenu.items)
                if (foundItem) {
                    return foundItem
                }
            }
        }

        return null
    }
}

