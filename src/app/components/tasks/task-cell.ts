import { TCTask } from '../../classes/tc-task'
import { TCTaskito } from '../../classes/tc-taskito'
import { TaskPager } from './task-pager'
import { TCTaskService } from '../../services/tc-task.service'
import { TaskEditService } from '../../services/task-edit.service'
import { TCTaskitoService } from '../../services/tc-taskito.service'
import { TaskPriority } from '../../tc-utils'
import { Observable } from 'rxjs'
import * as moment from 'moment'

export const TaskSortFunctions = {
    sortByDueDate : (a : TCTask, b : TCTask) : number => {
        const getComparableDate = (task : TCTask) => {
            if (task.shownStartDate) {
                return moment(task.shownStartDate).startOf('day').toDate()
            }
            else if (task.dueDateHasTime) {
                return new Date (task.shownDueDate)
            }
            else if (task.shownDueDate) {
                return moment(task.shownDueDate).endOf('day').toDate()
            }
            return null
        }

        const aDate = getComparableDate(a)
        const bDate = getComparableDate(b)

        if (aDate && !bDate) return -1
        if (bDate && !aDate) return 1

        if (aDate < bDate) return -1
        else if (aDate > bDate) return 1
        return 0
    },

    sortByPriority : (a : TCTask, b : TCTask) : number => {
        if (a.priority != b.priority) {
            if (a.priority == TaskPriority.None) return 1
            else if (b.priority == TaskPriority.None) return -1
            else if (a.priority < b.priority) return -1
            else if (a.priority > b.priority) return 1
        }
        return 0
    },

    sortAlphabetically : (a : TCTask, b : TCTask) : number => {
        return a.name.localeCompare(b.name)
    },

    sortBySortOrder : (a : TCTask, b : TCTask) : number => {
        return a.sortOrder - b.sortOrder
    }
}

export const TaskitoSortFunctions = {
    sortAlphabetically : (a : TCTaskito, b : TCTaskito) : number => {
        return a.name.localeCompare(b.name)
    },

    sortBySortOrder : (a : TCTaskito, b : TCTaskito) : number => {
        return a.sortOrder - b.sortOrder
    }
}

export interface TaskCell {
    task : TCTask,
    subtasks : TaskCell[],
    taskitos : TCTaskito[],
    showSubtasks : boolean,
    subtaskCount : number,
    loadSubtasks() : void,
    reloadSubtasks() : void,
    setSortType(order : number) : void,
    sortSubtasks() : void,
    addSubtask(task : TCTask) : void,
    sortTaskitos() : void,
    addTaskito(tasito : TCTaskito) : void,
    getSubtaskCount() : void,
    loadCompletedSubtasks() : void,
    onSync() : void
}

export class TaskCellImpl implements TaskCell {
    subtasks : TaskCell[] = []
    taskitos : TCTaskito[] = []
    private _subtaskCount : number = 0
    get subtaskCount() : number {
        return this._subtaskCount
    }

    private _showSubtasks = false
    // Defensive programming: avoid allowing non-projects to set or return true.
    get showSubtasks() : boolean {
        return (this.task.isProject || this.task.isChecklist) && this._showSubtasks
    }
    set showSubtasks(val : boolean) {
        this._showSubtasks = val && (this.task.isProject || this.task.isChecklist)
    }

    private createSubtaskChecklistCell(task : TCTask) : TaskCell {
        if (!task.isChecklist) return null
        const pager = TaskPager.PagerForChecklist(task, {taskitoService : this.taskitoService, taskService: this.taskService, paywallService: null})

        return new TaskCellImpl(task, pager, this.taskEditService, this.taskService)
    }

    private readonly sortTypeHierarchies = {
        dueDatePriority : [
            TaskSortFunctions.sortByDueDate, 
            TaskSortFunctions.sortByPriority, 
            TaskSortFunctions.sortBySortOrder, 
            TaskSortFunctions.sortAlphabetically
        ],
        priorityDueDate : [
            TaskSortFunctions.sortByPriority, 
            TaskSortFunctions.sortByDueDate, 
            TaskSortFunctions.sortBySortOrder, 
            TaskSortFunctions.sortAlphabetically
        ],
        alphabetically  : [
            TaskSortFunctions.sortAlphabetically,
            TaskSortFunctions.sortByPriority,
            TaskSortFunctions.sortByDueDate
        ]
    }

    private sortTypeHierarchy : ((a : TCTask, b : TCTask) => number)[] = this.sortTypeHierarchies.dueDatePriority
    private taskitoSortHierarchy : ((a : TCTaskito, b : TCTaskito) =>number)[] = [
        TaskitoSortFunctions.sortBySortOrder,
        TaskitoSortFunctions.sortAlphabetically
    ]

    constructor(
        public task : TCTask,
        public readonly pager : TaskPager = null,
        private readonly taskEditService : TaskEditService = null,
        private taskService : TCTaskService = null,
        private taskitoService : TCTaskitoService = null
    ) {
        if (this.task.isProject || this.task.isChecklist) this.getSubtaskCount()
        if (!pager) return

        this.pager.pagedTasksLoaded.subscribe(result => {
            // Add results to subtasks
            this.subtasks = this.subtasks.concat(result.tasks.map(t => {
                if (t.isChecklist) {
                    return this.createSubtaskChecklistCell(t)
                }
                return new TaskCellImpl(t)
            }))

            this.sortSubtasks()

            // Completed tasks are paged in manually via the prompt
            if (this.pager.loadingCompletedTasks) return

            // Go until all the subtasks are retrieved.
            // If there is no next page, this will be a no-op.
            this.pager.nextPage()
        })

        this.pager.pagedTaskitosLoaded.subscribe(result => {
            this.taskitos = this.taskitos.concat(result.taskitos)
            this.sortTaskitos()
            
            // Completed tasks are paged in manually via the prompt
            if (this.pager.loadingCompletedTasks) return

            this.pager.nextPage()
        })
    }

    loadSubtasks() {
        const shouldLoadSubatsks = this.task.isProject ||
            (this.task.isChecklist && !this.pager.loadingCompletedTasks)
        if (!shouldLoadSubatsks) return
        this.pager.nextPage()
    }

    reloadSubtasks() {
        if (!this.task.isParent) return

        this.subtasks = []
        this.taskitos = []
        this.pager.reset()
        this.loadSubtasks()
        this.getSubtaskCount()
    }

    setSortType(type : number) {
        if (type < 0 || type > 2) return
        
        switch(type) {
            case 0: { 
                this.sortTypeHierarchy = this.sortTypeHierarchies.dueDatePriority 
                break
            }
            case 1: { 
                this.sortTypeHierarchy = this.sortTypeHierarchies.priorityDueDate 
                break
            }
            case 2: { 
                this.sortTypeHierarchy = this.sortTypeHierarchies.alphabetically 
                break
            }
        }
    }

    private makeSortFunction<T extends TCTask | TCTaskito>(sortHierarchy : ((a : T, b : T) => number)[]) : ((a : T, b : T) => number) {
        return (a, b) => {
            // Sort all completed tasks to be beneath all uncompleted tasks
            if (a.isCompleted && !b.isCompleted) return 1
            else if (!a.isCompleted && b.isCompleted) return -1
            
            if (a.isCompleted && b.isCompleted) {
                // If both completed, compare by completion date. Most recent come first.
                if (a.completionDate < b.completionDate) return 1
                else if (a.completionDate > b.completionDate) return -1
            } else {
                // Run the rest of the sorting functions as defined in this.sortTypeHierarchy
                for (const currentSortFunction of sortHierarchy)  {
                    const sortResult = currentSortFunction(a, b)
                    if (sortResult != 0) return sortResult
                }
            }

            return 0
        }
    }

    sortSubtasks() {
        const taskSortFunction = this.makeSortFunction(this.sortTypeHierarchy)
        this.subtasks.sort((a, b) => {
            return taskSortFunction(a.task, b.task)
        })
    }

    sortTaskitos() {
        this.taskitos.sort(this.makeSortFunction(this.taskitoSortHierarchy))
    }

    addSubtask(task : TCTask) {
        const newCell : TaskCell = ((task : TCTask) : TaskCell => {
            if (task.isChecklist) {
                return this.createSubtaskChecklistCell(task)
            }
            return new TaskCellImpl(task)
        })(task)

        this.subtasks.push(newCell)
        this.sortSubtasks()
    }

    addTaskito(taskito : TCTaskito) {
        this.taskitos.push(taskito)
        this.sortTaskitos()
    }

    getSubtaskCount() {
        if (!this.task.isParent || !this.taskService) return

        this.taskService.getSubtaskCount(this.task).first().subscribe(result => {
            this._subtaskCount = result.count
        })
    }

    loadCompletedSubtasks() {
        if (!this.pager.loadingCompletedTasks) {
            this.pager.loadCompletedTasks()
            return
        }
        this.pager.nextPage()
    }

    onSync() {
        if (this.task.isChecklist) {
            this.checklistOnSync()
        }
        else if (this.task.isProject) {
            this.projectOnSync()
        }
    }

    private projectOnSync() {
        this.pager.onSync().first().subscribe((tasks : TCTask[]) => {
            console.log(`Reloaded ${tasks.length} subtasks`)
            interface Comparison {
                intersection : {
                    oldCell: TaskCell, 
                    task : TCTask
                }[], 
                add : TCTask[], 
                remove : TCTask[]
            }

            const comparison : Comparison = this.subtasks.reduce((accum, current) => {
                const existingTaskIndex = tasks.findIndex(task => task.identifier == current.task.identifier)

                if (existingTaskIndex > -1) {
                    const existingTask = tasks[existingTaskIndex]
                    accum.intersection.push({ oldCell: current, task: existingTask })
                    tasks.splice(existingTaskIndex, 1)
                }
                else {
                    accum.remove.push(current.task)
                }

                return accum
            }, { 
                intersection: new Array<{oldCell : TaskCell, task: TCTask}>(), 
                remove: new Array<TCTask>(), 
                add: new Array<TCTask>() 
            })

            comparison.add = tasks

            comparison.intersection.forEach(result => {
                if (result.oldCell.task.isChecklist != result.task.isChecklist) 
                {
                    this.subtasks = this.subtasks.filter(subtask => subtask.task.identifier != result.oldCell.task.identifier)
                    this.addSubtask(result.task)
                }
                else {
                    if (result.oldCell.task.shownDueDate != result.task.shownDueDate ||
                        result.oldCell.task.priority != result.task.priority ||
                        result.oldCell.task.name != result.task.name ||
                        result.oldCell.task.isCompleted != result.task.isCompleted) 
                    {
                        result.oldCell.task = result.task
                        this.sortSubtasks()
                    }
                    else {
                        result.oldCell.task = result.task
                    }

                    result.oldCell.onSync()

                    this.taskEditService.syncEditedTask(result.task)
                }
            })
            comparison.remove.forEach(remove => {
                this.subtasks = this.subtasks.filter(subtask => subtask.task.identifier != remove.identifier)
            })
            comparison.add.forEach(add => {
                this.addSubtask(add)
            })

            this.getSubtaskCount()
        })
    }

    private checklistOnSync() {
        this.pager.onSyncTaskito().first().subscribe((taskitos : TCTaskito[]) => {
            console.log(`Reloaded ${taskitos.length} items`)
            interface Comparison {
                intersection : {
                    oldTaskito: TCTaskito, 
                    taskito : TCTaskito
                }[], 
                add : TCTaskito[], 
                remove : TCTaskito[]
            }

            const comparison : Comparison = this.taskitos.reduce((accum, current) => {
                const existingTaskIndex = taskitos.findIndex(taskito => taskito.identifier == current.identifier)

                if (existingTaskIndex > -1) {
                    const existingTask = taskitos[existingTaskIndex]
                    accum.intersection.push({ oldTaskito: current, taskito: existingTask })
                    taskitos.splice(existingTaskIndex, 1)
                }
                else {
                    accum.remove.push(current)
                }

                return accum
            }, { 
                intersection: new Array<{oldTaskito : TCTaskito, taskito: TCTaskito}>(), 
                remove: new Array<TCTaskito>(), 
                add: new Array<TCTaskito>() 
            })

            comparison.add = taskitos

            comparison.intersection.forEach(result => {
                result.oldTaskito.name = result.taskito.name
                result.oldTaskito.parentId = result.taskito.parentId
                result.oldTaskito.completionDate = result.taskito.completionDate
                result.oldTaskito.sortOrder = result.taskito.sortOrder
            })
            comparison.remove.forEach(remove => {
                this.taskitos = this.taskitos.filter(taskito => taskito.identifier != remove.identifier)
            })
            comparison.add.forEach(add => {
                this.addTaskito(add)
            })

            this.sortTaskitos()
            this.getSubtaskCount()
        })
    }
}