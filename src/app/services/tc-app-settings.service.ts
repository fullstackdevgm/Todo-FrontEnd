import { Injectable } from '@angular/core'
import { Observable, ReplaySubject } from 'rxjs/Rx'

import { TCAppSettings } from '../classes/tc-app-settings'
import { TCList } from '../classes/tc-list'
import { TCSmartList } from '../classes/tc-smart-list'
import { TCUserSettingsService } from './tc-user-settings.service'
import { TCUserSettings } from '../classes/tc-user-settings'

@Injectable()
export class TCAppSettingsService {

    public static currentUserKey = 'currentUser'
    public static currentAccountKey = 'currentAccount'

    private static SelectedListKey : string = 'selectedList'
    private static DefaultListKey  : string = 'defaultList'

    private static CalendarFirstDay : string = 'calendarFirstDay'

    private _selectedListSubject : ReplaySubject<TCList | TCSmartList> = new ReplaySubject<TCList | TCSmartList>(1)
    public readonly selectedList : Observable<TCList | TCSmartList>

    private _appSettingsUpdated : ReplaySubject<TCAppSettings> = new ReplaySubject<TCAppSettings>(1)
    public readonly appSettingsUpdated : Observable<TCAppSettings>

    private _userSettings : TCUserSettings
    set userSettings(s : TCUserSettings) {
        this._userSettings = s
    }

    constructor(){
        this.selectedList = this._selectedListSubject
        this.appSettingsUpdated = this._appSettingsUpdated

        // Someday we'll get this from the server, but for now just mock one out.
        this._appSettingsUpdated.next(new TCAppSettings)
    }

    setSelectedList(list : TCList | TCSmartList) {
        localStorage.setItem(`${TCAppSettingsService.SelectedListKey}/${this._userSettings.userId}`, list.identifier)
        this._selectedListSubject.next(list)
    }

    getSelectedListID() : string {
        return localStorage.getItem(`${TCAppSettingsService.SelectedListKey}/${this._userSettings.userId}`)
    }

    set storedDefaultListID(identifier : string) {
        localStorage.setItem(`${TCAppSettingsService.DefaultListKey}/${this._userSettings.userId}`, identifier)
    }

    get storedDefaultListID() : string {
        const storedID = localStorage.getItem(`${TCAppSettingsService.DefaultListKey}/${this._userSettings.userId}`)
        return storedID
    }

    clearSelectedListID() {
        localStorage.removeItem(TCAppSettingsService.SelectedListKey)
    }

    set calendarFirstDay(index : string) {
        localStorage.setItem(TCAppSettingsService.CalendarFirstDay, index)
    }

    get calendarFirstDay() : string {
        const dayIndex = localStorage.getItem(TCAppSettingsService.CalendarFirstDay)
        if (dayIndex) {
            return dayIndex
        }
        return '0' //Sunday
    }

    get calendarFirstDayDP() : string {
        const dayIndex = localStorage.getItem(TCAppSettingsService.CalendarFirstDay)
        if (dayIndex) {
            if (dayIndex == '0') {
                return '7' //Sunday for DP
            }
            return dayIndex
        }
        return '7' //Sunday
    }
}
