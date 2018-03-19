import { TaskCreationInformation } from './task-create.component'
import { TasksComponent } from './tasks.component'

import { TCObject } from '../../classes/tc-object'
import { TCList } from '../../classes/tc-list'
import { TCSmartList } from '../../classes/tc-smart-list'
import { TCTask } from '../../classes/tc-task'
import { TCTaskito } from '../../classes/tc-taskito'
import { TCUserSettings } from '../../classes/tc-user-settings'
import { TaskPriority, TaskType, DefaultDueDate, TaskEditState } from '../../tc-utils'

import { TCTaskService } from '../../services/tc-task.service'
import { TCListService } from '../../services/tc-list.service'
import { TCSmartListService } from '../../services/tc-smart-list.service'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'

import { TaskPager } from './task-pager'
import { Utils } from '../../tc-utils'
import { SearchSource } from '../../tc-types'
import { Subscription } from 'rxjs'

export abstract class TaskSource {
    public abstract get taskCreationInformation() : TaskCreationInformation

    public get shouldReloadOnTaskEdit() : boolean {
        return false
    }

    public get showSubtasks() : boolean {
        return false
    }

    public get reloadOnListDelete() : boolean {
        return false
    }

    public readonly abstract pager : TaskPager

    constructor(
        public readonly source : TCObject | SearchSource,
        public readonly sortType : number,
        protected settings : TCUserSettings
    ) {}

    abstract onTaskListChanged(component : TasksComponent, task : TCTask, list : TCList) 
    abstract shouldSortTask(task : TCTask) : boolean
}

export class ListTaskSource extends TaskSource {
    get taskCreationInformation() : TaskCreationInformation {
        const sourceDueDate = this.source.identifier == this.settings.userInbox ? this.settings.defaultDueDate : this.source.defaultDueDate
        return {
            listId : this.source.identifier,
            parentIsChecklist : false,
            defaultDueDate : this.source.defaultDueDate >= 0 ? sourceDueDate : this.settings.defaultDueDate
        }
    }

    constructor(
        public readonly source : TCList,
        sortType : number,
        public readonly pager : TaskPager,
        private readonly listService : TCListService,
        userSettings : TCUserSettings
    ) {
        super(source, sortType, userSettings)
    }

    onTaskListChanged(component : TasksComponent, task : TCTask, list : TCList) {
        component.removeSelectedTaskFromSection()
        if (this.source.identifier == list.identifier) {
            component.resortSelectedTask()
        }
    }

    shouldSortTask(task : TCTask) : boolean {
        return task.listId == this.source.identifier
    }
}

export class SmartListTaskSource extends TaskSource {
    get taskCreationInformation() : TaskCreationInformation {
        const result = {
            listId : this.source.defaultList,
            parentIsChecklist : false,
            defaultDueDate : this.source.defaultDueDate >= 0 ? this.source.defaultDueDate : this.settings.defaultDueDate
        }

        if (!result.listId || result.listId.length == 0) {
            result.listId = this.settingsService.defaultListID
        }

        return result
    }

    get shouldReloadOnTaskEdit() : boolean {
        return true
    }

    public get showSubtasks() : boolean {
        return this.source.showSubtasks
    }

    public get reloadOnListDelete() : boolean {
        return true
    }

    constructor(
        public readonly source : TCSmartList, 
        sortType : number,
        public readonly pager : TaskPager,
        private readonly smartListService : TCSmartListService,
        userSettings : TCUserSettings,
        private readonly settingsService : TCUserSettingsService
    ) {
        super(source, sortType, userSettings)
    }

    onTaskListChanged(component : TasksComponent, task : TCTask, list : TCList) {
        // Do nothing, on task changed, the smart list is reloaded. This is
        // the only way to get the modified task into the proper place in a smart
        // list without implementing all the smart list logic client side.
    }

    shouldSortTask(task : TCTask) : boolean {
        // Normally no, (smart lists must reload from data service) but we do want to sort in completed tasks.
        return false || task.isCompleted
    }
}

export class SearchTaskSource extends TaskSource {
    public get taskCreationInformation() : TaskCreationInformation {
        return {
            listId : this.settings.userInbox,
            parentTask : null,
            parentIsChecklist : null,
            defaultDueDate : this.settings.defaultDueDate
        }
    }

    constructor(
        term : string,
        public readonly pager : TaskPager,
        userSettings : TCUserSettings
    ) {
        super({
            name : `Search: ${term}`,
            showListForTasks : true,
            iconName : "twf-search",
            color : Utils.rgbToHex("93,162,227"),
            identifier : "SEARCH"
        }, userSettings.taskSortOrder, userSettings)
    }

    onTaskListChanged(component : TasksComponent, task : TCTask, list : TCList) {
        // null-op, this is irrelevant to search.
    }
    shouldSortTask(task : TCTask) : boolean {
        // Search results will be sorted by the app default.
        return true
    }
}
