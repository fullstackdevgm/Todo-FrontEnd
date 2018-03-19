import { Component, OnInit, OnDestroy }  from '@angular/core'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'
import { TCUserSettings, TCUserSettingsUpdate } from '../../../classes/tc-user-settings'
import { TCAppSettingsService }     from '../../../services/tc-app-settings.service'
import { TCListService } from '../../../services/tc-list.service'
import { TCTaskService } from '../../../services/tc-task.service'
import { TCList } from '../../../classes/tc-list'
import { Utils } from '../../../tc-utils'
import { Subscription } from 'rxjs'
import * as moment from 'moment'
import 'moment-timezone'

interface SettingRow {
    title : string,
    setting : GeneralSetting,
    text : () => string
}

interface ListInfo {
    taskInfo : { count : number, overdue : number },
    list     : TCList
}

enum GeneralSetting {
    None, ActiveLists, TaskSortOrder, TimeZone, StartWeekDay
}

@Component({
    selector: 'section-general',
    templateUrl: 'section-general.component.html',
    styleUrls: [
        '../../task-edit/task-edit-list-select.component.css',
        '../../../../assets/css/settings.css',
        'section-general.component.css']
})
export class SettingsGeneralComponent implements OnInit, OnDestroy {
    GeneralSetting = GeneralSetting

    currentSetting : GeneralSetting = GeneralSetting.None

    showListFilter : boolean = false
    showSortOrder : boolean = false

    lists : ListInfo[] = []
    settings : TCUserSettings

    rows : SettingRow[] = [
        { 
            title : "Active Lists", 
            setting : GeneralSetting.ActiveLists,
            text : () => this.hiddenListCount == 0 ? 'Show All' : `${this.hiddenListCount} hidden` 
        },
        { 
            title : "Task Sort Order", 
            setting : GeneralSetting.TaskSortOrder,
            text : () => {
                const result = Utils.SortTypeNames[this.settings.taskSortOrder]
                return result ? result : 'Unknown'
            }
        },
        {
            title : "Time Zone",
            setting : GeneralSetting.TimeZone,
            text : () => this.settings.timezone ? this.settings.timezone : `Not set`
        },
        {
            title : "Start Calendar Week On",
            setting : GeneralSetting.StartWeekDay,
            text : () => this.appSettingsService.calendarFirstDay ? this.appSettingsService.calendarFirstDay : `0`
        }
    ]

    private settingsSub : Subscription
    private listSub : Subscription

    sortTypeLabels : string[] = Utils.SortTypeNames
    availableTimeZones : string[] = moment.tz.names()
    days : string[] = moment.weekdays()

    constructor(
        private userSettingsService : TCUserSettingsService,
        private appSettingsService: TCAppSettingsService,
        private listService : TCListService,
        private taskService : TCTaskService
    ) {}

    ngOnInit() {
        this.settingsSub = this.userSettingsService.settings.subscribe(settings => {
            this.settings = settings
        })

        this.listSub = this.listService.getLists(true, false).first().subscribe(lists => {
            this.userSettingsService.settings.first().subscribe(settings => {
                const filteredLists = lists.filter(e => e.identifier != settings.userInbox)
                this.lists = filteredLists.map((list : TCList) => {
                    return {
                        taskInfo : {
                            count : 0,
                            overdue : 0
                        },
                        list : list
                    }
                })
                this.taskService.getTaskCounts()
            })
        })

        this.taskService.taskCounts.subscribe(counts => {
            const listCountFunction = (list : ListInfo) => {
                const count = counts.listTaskCounts.find(e => e.listid == list.list.identifier)
                if (count) {
                    list.taskInfo.count = count.active
                }
            }
            this.lists.forEach(listCountFunction)
        })
    }

    ngOnDestroy() {
        this.settingsSub.unsubscribe()
        this.listSub.unsubscribe()
    }
    
    selectSortOrder(sortOrder : number) {
        this.settings.taskSortOrder = sortOrder
        const settingsUpdate = new TCUserSettingsUpdate()
        settingsUpdate.taskSortOrder = this.settings.taskSortOrder
        this.userSettingsService.update(settingsUpdate).first().subscribe(updated => {})
    }

    isCurrentSortOrder(sortOrder : number) {
        return this.settings.taskSortOrder == sortOrder
    }

    selectTimeZone(timeZoneName : string) {
        this.settings.timezone = timeZoneName
        const settingsUpdate = new TCUserSettingsUpdate()
        settingsUpdate.timezone = this.settings.timezone
        this.userSettingsService.update(settingsUpdate).first().subscribe(updated => {})
    }

    setDefaultStartWeekDay(dayIndex : string){
        this.appSettingsService.calendarFirstDay = dayIndex
    }

    isCurrentTimeZone(timeZoneName : string) {
        return this.settings.timezone == timeZoneName
    }

    isUsingList(list : TCList) {
        return !this.settings.allListFilter.has(list.identifier)
    }

    updateListFilter(list : TCList) {
        if (this.lists.length - 1 === this.hiddenListCount && list.identifier === this.lists[0].list.identifier && this.isUsingList(list)) {
            return false
        }
        this.toggleListFilter(list)
        const settingsUpdate = new TCUserSettingsUpdate()
        settingsUpdate.allListFilter = new Set<string>(this.settings.allListFilter)
        this.userSettingsService.update(settingsUpdate)
            .first().flatMap(updated => {
                return this.listService.getLists(false, false)
            })
            .subscribe(result => this.taskService.getTaskCounts())

        if(this.lists.length  <= this.hiddenListCount){
            this.updateListFilter(this.lists[0].list)
        }
        this.listService.selectedList.first().subscribe(selectedList => {
           if(selectedList.identifier == list.identifier) {
             this.listService.getLists(true, false).first().subscribe(lists => {
               const inboxlist = lists.find(alist => alist.identifier == this.settings.userInbox)
               this.listService.selectList(inboxlist)
             })
           }
        })
    }

    toggleListFilter(list : TCList) {
        const filter = this.settings.allListFilter
        filter.has(list.identifier) ? filter.delete(list.identifier) : filter.add(list.identifier)
    }

    private get hiddenListCount() : number {
        return Array.from(this.settings.allListFilter)
            .reduce((accum : number, current : string) : number => {
                return this.lists.find(listInfo => listInfo.list.identifier == current) ? accum + 1 : accum
            }, 0)
    }
}
