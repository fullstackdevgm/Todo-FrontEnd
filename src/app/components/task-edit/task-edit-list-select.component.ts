import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core'

import { TCTask } from '../../classes/tc-task'
import { TCList } from '../../classes/tc-list'
import { TCListService } from '../../services/tc-list.service'
import { TCTaskService } from '../../services/tc-task.service'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'

import { Subscription } from 'rxjs/Rx'

interface ListInfo {
    taskInfo : { count : number, overdue : number },
    list     : TCList
}
@Component({
    selector : 'task-edit-list-select',
    templateUrl : 'task-edit-list-select.component.html',
    styleUrls : ['task-edit-list-select.component.css']
})
export class TaskEditListSelectComponent implements OnInit, OnDestroy {
    @Input() task : TCTask
    
    @Output() selectedList : EventEmitter<TCList> = new EventEmitter<TCList>()
    
    lists : ListInfo[]
    private subscription : Subscription
    private settingsSub : Subscription

    constructor(
        private listsService : TCListService,
        private settingsService  : TCUserSettingsService,
        private taskService  : TCTaskService
    ) {}

    ngOnInit() {
        this.subscription = this.listsService.lists.subscribe(pub => {
            this.settingsSub = this.settingsService.settings.first().subscribe(settings => {
                this.lists = pub.lists.map((list : TCList) => {
                    return {
                        hidden   : settings.allListFilter.has(list.identifier),
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
        this.subscription.unsubscribe()
        this.settingsSub.unsubscribe()
    }

    selectList(list : TCList) {
        if (this.task.isSubtask) return
            
        this.task.listId = list.identifier
        this.selectedList.emit(list)
    }
}
