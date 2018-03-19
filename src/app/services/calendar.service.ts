import { Injectable } from '@angular/core'
import { Headers, RequestOptions, URLSearchParams } from '@angular/http'

import { TCTask } from '../classes/tc-task'
import { NgbDateStruct, NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap'
import { Observable, Subscription, ReplaySubject, Subject } from 'rxjs'
import * as moment from 'moment'
import { TCSmartListService } from './tc-smart-list.service'
import { TCListService } from './tc-list.service'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCAuthenticationService } from './tc-authentication.service'
import { TCUserSettingsService } from '../services/tc-user-settings.service'
import { TCUserSettings, TCUserSettingsUpdate } from '../classes/tc-user-settings'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'


const I18N_VALUES = {
    'en': {
        weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    }
}

@Injectable()
export class I18n {
    language = 'en'
}

@Injectable()
export class TCDatepickerI18n extends NgbDatepickerI18n {

    constructor(private _i18n : I18n) {
        super()
    }

    getWeekdayShortName(weekday : number) : string {
        return I18N_VALUES[this._i18n.language].weekdays[weekday - 1]
    }
    getMonthShortName(month : number) : string {
        return I18N_VALUES[this._i18n.language].monthsShort[month - 1]
    }
    getMonthFullName(month : number) : string {
        return I18N_VALUES[this._i18n.language].months[month - 1]
    }
}

@Injectable()
export class CalendarService extends TCBaseService {
    private readonly _selectedDates : ReplaySubject<Date[]> = new ReplaySubject<Date[]>(1)

    private _userSettings : TCUserSettings
    private settingsSub : Subscription

    get selectedDates() : Observable<Date[]> {
        return this._selectedDates
    }

    private _currentMonth : { year : number, month : number } = null
    set currentMonth(month : { year : number, month : number }) {
        this._currentMonth = month

        if (!month) {
            this._overdueDates.next([])
            return
        }

        this.loadCalendarDates()
    }

    private _calendarStatus : ReplaySubject<boolean>
    public get calendarStatus() : Observable<boolean> {
        return this._calendarStatus
    }

    private readonly _overdueDates : ReplaySubject<NgbDateStruct[]> = new ReplaySubject<NgbDateStruct[]>(1)
    get overdueDates() : Observable<NgbDateStruct[]> {
        return this._overdueDates
    }

    private listId : string = null
    private smartListId : string = null

    private static SelectedDatesKey : string = 'selectedDates'
    private static ShowCalendarKey : string = 'showCalendar'

    private listSub : Subscription 
    private smartListSub : Subscription
    private smartListUpdateSub : Subscription

    constructor(
        readonly tcHttp : TCHttp,
        private readonly errorService : TCErrorService,
        private readonly listService : TCListService,
        private readonly smartListService : TCSmartListService,
        private readonly auth : TCAuthenticationService,
        private userSettingsService : TCUserSettingsService
    ) {
        super(tcHttp, errorService)

        this.setupSubscribers()

        this.auth.authStateChanged.subscribe(change => {
            if (this.auth.isLoggedOut()) {
                this.unsubscribe()
                return
            }

            this.setupSubscribers()
        })

        this.settingsSub = this.userSettingsService.settings.subscribe(settings => {
            this._userSettings = settings
            this.clearSelectedDates(true)

            // Loading the calendar status is dependent on having user settings
            // because the setting is stored by userid.
            this.loadCalendarStatus()

            // Also get the selected dates loaded if any were previously saved
            this.loadSelectedDates()
        })

        this._calendarStatus = new ReplaySubject()
    }

    private unsubscribe() {
        this.listSub.unsubscribe()
        this.smartListSub.unsubscribe()
        this.smartListUpdateSub.unsubscribe()
        this.settingsSub.unsubscribe()

        this.smartListId = null
        this.listId = null
    }

    private setupSubscribers() {
        this.listSub = this.listService.selectedList
            .filter(list => list.identifier != this.listId)
            .subscribe(list => {
                this.smartListId = null
                this.listId = list.identifier
                this.loadCalendarDates()
            })

        this.smartListSub = this.smartListService.smartListSelected
            .filter(smartList => smartList.identifier != this.smartListId)
            .subscribe(smartList => {
                this.listId = null
                this.smartListId = smartList.identifier
                this.loadCalendarDates()
            })

        this.smartListUpdateSub = this.smartListService.smartListUpdated.subscribe(smartlist => {
            if (smartlist.identifier == this.smartListId) {
                this.loadCalendarDates()
            }
        })
    }

    // Selects a single specific date, removing any other selected dates
    selectDate(date : Date) {
        this._selectedDates.next([date])
        this.storeSelectedDates()
    }

    // Selects a range of dates, removing any other selected dates
    selectDateRange(start : Date, end : Date) {
        this._selectedDates.next(this.interpolateDates(start, end))
        this.storeSelectedDates()
    }

    // Add a date to the already selected dates
    addDateToSelection(date : Date) {
        this.selectedDates.first().subscribe(dates => {
            if (dates.find(d => 
                date.getFullYear() == d.getFullYear() &&
                date.getMonth() == d.getMonth() &&
                date.getDate() == d.getDate())
            ) return

            const newDates = dates.concat([date])
            this._selectedDates.next(newDates)
        })

        this.storeSelectedDates()
    }

    // Add a range of dates to the already selected dates
    addDateRangeToSelection(start : Date, end : Date) {
        this.selectedDates.first().subscribe(dates => {
            const filteredDates = this.interpolateDates(start, end).filter(a => {
                return dates.find(b => 
                    a.getFullYear() == b.getFullYear() &&
                    a.getMonth() == b.getMonth() &&
                    a.getDate() == b.getDate()
                ) == null
            })
            const newDates = dates.concat(filteredDates)
            this._selectedDates.next(newDates)
        })

        this.storeSelectedDates()
    }

    // Clear all selected dates
    clearSelectedDates(removeLocalStorage : boolean = false) {
        this._selectedDates.next([])
        if(removeLocalStorage) localStorage.removeItem(`${CalendarService.SelectedDatesKey}/${this._userSettings.userId}`)
    }

    private getTaskCountsForDates(startDate : Date, endDate : Date, listId : string, smartListId : string) : Observable<any>{
        const url = `${environment.baseApiUrl}/tasks/date_count`
        const headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
        const params = new URLSearchParams()
        params.set('begin_date', startDate.toISOString().slice(0,10))
        params.set('end_date',   endDate.toISOString().slice(0,10))
        if (listId) params.set('listid', listId)
        if (smartListId) params.set('smart_listid', smartListId)

        const options = new RequestOptions({
            search  : params,
            headers : headers
        })
        const result = this.tcHttp
            .get(url, options).share().first()
            .map(response => {
                if(!response.ok) return Observable.throw(response.json() || 'Service error')

                return response.json()
            })
            .catch(err => this.handleError(err))

        return result
    }

    loadCalendarDates() {
        if ((!this.listId && !this.smartListId) || !this._currentMonth) return
        const firstDay = new Date(this._currentMonth.year, this._currentMonth.month - 1, 1)
        firstDay.setDate(firstDay.getDate() - 7)
        const lastDay = new Date(this._currentMonth.year, this._currentMonth.month, 0)
        lastDay.setDate(lastDay.getDate() + 7)

        this.getTaskCountsForDates(firstDay, lastDay, this.listId, this.smartListId).subscribe(result => {
            const dueDates = Object.keys(result.dates).map(str => {
                const split = str.split('-').map(s => Number.parseInt(s))
                return {
                    year : split[0],
                    month : split[1],
                    day : split[2]
                }
            })
            this._overdueDates.next(dueDates)
        })
    }

    private interpolateDates(start : Date, end : Date) : Date[] {
        if (start == end) return [new Date(start)]
        const begin  : Date = end > start ? start : end
        const finish : Date = end > start ? end   : start

        const dates : Date[] = [begin]

        let previous = begin
        while (
            previous.getFullYear() <= finish.getFullYear() && 
            previous.getMonth() <= finish.getMonth() && 
            previous.getDate() < finish.getDate()
        ) {
            const current = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1)
            dates.push(current)
            previous = current
        }

        return dates
    }

    storeSelectedDates() {
        this.selectedDates.first().subscribe(dates => {
            if(dates.length < 0) {
                localStorage.removeItem(`${CalendarService.SelectedDatesKey}/${this._userSettings.userId}`)
            } else {
                localStorage.setItem(`${CalendarService.SelectedDatesKey}/${this._userSettings.userId}`, JSON.stringify(dates))
            }
        })
    }

    loadSelectedDates() {
        if(this._userSettings) {
            this.clearSelectedDates()
            const dateStrings = JSON.parse(localStorage.getItem(`${CalendarService.SelectedDatesKey}/${this._userSettings.userId}`))
            if(dateStrings && dateStrings.length > 0) {
                const dates = dateStrings.map(dt => {return new Date(dt)})
                this._selectedDates.next(dates)
            }
        }
    }

    setCalendarStatus(showCalendar : boolean) {
        this._calendarStatus.next(showCalendar)
        let key = `${CalendarService.ShowCalendarKey}/${this._userSettings.userId}`
        localStorage.setItem(key, JSON.stringify(showCalendar))
    }

    loadCalendarStatus() {
        if (this._userSettings || environment.isElectron) {
            let key = `${CalendarService.ShowCalendarKey}/${this._userSettings.userId}`
            const showCalendarString = localStorage.getItem(key)
            const calendarStatus = showCalendarString ? showCalendarString == 'true' : true
            this._calendarStatus.next(calendarStatus)
            if(!calendarStatus) this.clearSelectedDates()
        }
    }
}