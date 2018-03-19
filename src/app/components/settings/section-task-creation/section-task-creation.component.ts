import { Component, OnInit, OnDestroy }  from '@angular/core'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'
import { TCUserSettings, TCUserSettingsUpdate } from '../../../classes/tc-user-settings'
import { TCListService } from '../../../services/tc-list.service'
import { TCTaskService } from '../../../services/tc-task.service'
import { TCList } from '../../../classes/tc-list'
import { Utils, DefaultDueDate } from '../../../tc-utils'
import { Subscription } from 'rxjs'

enum TaskCreationSetting {
    None, DueDate, List
}

interface ListInfo {
    taskInfo : { count : number, overdue : number },
    list     : TCList
}

@Component({
    selector: 'section-task-creation',
    templateUrl: 'section-task-creation.component.html',
    styleUrls: [
        '../../task-edit/task-edit-list-select.component.css',
        '../../../../assets/css/settings.css',
        'section-task-creation.component.css'
    ]

})
export class SettingsTaskCreationComponent implements OnInit, OnDestroy{
    TaskCreationSetting = TaskCreationSetting

    private userSettingsSub : Subscription
    private listSub         : Subscription

    userSettings : TCUserSettings
    lists : ListInfo[]
    currentList : ListInfo
    DefaultDueDate = DefaultDueDate

    rows : { title : string, setting : TaskCreationSetting, text : () => string }[] = [
        {
            title : "Due Date",
            setting : TaskCreationSetting.DueDate,
            text : () => {
                const dueDate = this.dueDates[this.userSettings.defaultDueDate]
                return dueDate ? dueDate.title : 'Unknown'
            }
        },
        {
            title : "List",
            setting: TaskCreationSetting.List,
            text : () => {
                const info = this.lists.find(e => e.list.identifier == this.userSettingsService.defaultListID)
                return info ? info.list.name : 'Unknown'
            }
        }
    ]

    dueDates : { title : string, dueDate : DefaultDueDate }[] = [
        { title : 'None',           dueDate : DefaultDueDate.None},
        { title : 'Today',          dueDate : DefaultDueDate.Today},
        { title : 'Tomorrow',       dueDate : DefaultDueDate.Tomorrow},
        { title : 'In Two Days',    dueDate : DefaultDueDate.InTwoDays},
        { title : 'In Three Days',  dueDate : DefaultDueDate.InThreeDays},
        { title : 'In Four Days',   dueDate : DefaultDueDate.InFourDays},
        { title : 'In Five Days',   dueDate : DefaultDueDate.InFiveDays},
        { title : 'In Six Days',    dueDate : DefaultDueDate.InSixDays},
        { title : 'In One Week',    dueDate : DefaultDueDate.InOneWeek}
    ]

    constructor(
        private userSettingsService : TCUserSettingsService,
        private listService : TCListService,
        private taskService : TCTaskService
    ) {}

    ngOnInit() {
        this.userSettingsSub = this.userSettingsService.settings.subscribe(settings => {
            this.userSettings = settings
        })

        this.listSub = this.listService.lists.subscribe(pub => {
            this.lists = pub.lists.map((list : TCList) => {
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
        this.getCurrentList()

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
        this.userSettingsSub.unsubscribe()
        this.listSub.unsubscribe()
    }

    setDueDate(value : DefaultDueDate) {
        this.userSettings.defaultDueDate = value
        const settingsUpdate = new TCUserSettingsUpdate()
        settingsUpdate.defaultDueDate = this.userSettings.defaultDueDate
        this.userSettingsService.update(settingsUpdate).first().subscribe(updated => {})
    }

    setDefaultListID(value : string) {
        this.userSettingsService.defaultListID = value
        this.getCurrentList()
    }

    getCurrentList() {
        this.currentList = this.lists.find(e => e.list.identifier == this.userSettingsService.defaultListID)
        if (!this.currentList && this.lists.length > 0) {
            this.currentList = this.lists[0]
        }
    }
}
