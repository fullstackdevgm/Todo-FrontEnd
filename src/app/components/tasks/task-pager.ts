import { Injectable } from '@angular/core'

import { TCTaskService } from '../../services/tc-task.service'
import { TCTaskitoService } from '../../services/tc-taskito.service'
import { PaywallService } from '../../services/paywall.service'
import { TCList } from '../../classes/tc-list'
import { TCTask } from '../../classes/tc-task'
import { TCTaskito } from '../../classes/tc-taskito'
import { TCSmartList } from '../../classes/tc-smart-list'
import { TCObject } from '../../classes/tc-object'
import { TaskType } from '../../tc-utils'

import { Observable, Subject, Subscription } from 'rxjs'

abstract class TaskPageTrackingModule { 
    public readonly pagedTasksLoaded  : Observable<{ tasks : TCTask[], page : number }>
    protected _pagedTasksLoaded : Subject<{ tasks : TCTask[], page : number }> = new Subject<{ tasks : TCTask[], page : number }>()

    public readonly pagedTaskitosLoaded  : Observable<{ taskitos : TCTaskito[], page : number }>
    protected _pagedTaskitosLoaded : Subject<{ taskitos : TCTaskito[], page : number }> = new Subject<{ taskitos : TCTaskito[], page : number }>()

    protected _currentPage : number = 0
    protected _pageBeingLoaded : number = 0
    protected _loadCompletedTasks : boolean = false

    public readonly pageSize = 20
    protected currentPageSize : number
    public get loadCompletedTasks() : boolean {
        return this._loadCompletedTasks
    }
    public get currentPage() : number { 
        return this._currentPage
    }
    public get pageBeingLoaded() : number {
        return this._pageBeingLoaded
    }

    constructor() {
        this.pagedTasksLoaded = this._pagedTasksLoaded
        this.pagedTaskitosLoaded = this._pagedTaskitosLoaded
        this.currentPageSize = this.pageSize
    }

    abstract tasksRemote(page : number) : Observable<TCTask[]>
    abstract completedTasksRemote(page : number) : Observable<TCTask[]>
    abstract createResetCopy() : TaskPageTrackingModule
    abstract get loadsTaskitos() : boolean

    getTasks() : Observable<void> {
        const obs = this.tasksRemote(this.currentPage)
        this.setupTaskHandling(obs)
        return obs.map(tasks => {})
    }

    getCompletedTasks() : Observable<void> {
        const obs = this.completedTasksRemote(this.currentPage)
        this.setupCompletedTaskHandling(obs)
        return obs.map(tasks => {})
    }

    public procedeToLoadCompletedTasks(firstPageSize : number = this.pageSize) : Observable<void>  {
        this._loadCompletedTasks = true
        this._currentPage = 0
        this.currentPageSize = firstPageSize
        return this.nextPage()
    }

    protected setupTaskHandling(observable : Observable<TCTask[]>) {
        observable.first()
            .filter(tasks => tasks.length < this.pageSize && tasks.length > 0)
            .subscribe(tasks => {
                this.procedeToLoadCompletedTasks(this.pageSize)
            })

        observable.first()
            .filter(tasks => tasks.length > 0)
            .subscribe(tasks => this.gotTasks(tasks))

        observable.first().subscribe(tasks => this._pageBeingLoaded = this._currentPage)
    }

    protected setupCompletedTaskHandling(observable : Observable<TCTask[]>) {
        observable.first().subscribe(tasks => this.gotTasks(tasks))
    }

    protected gotTasks(tasks : TCTask[]) {
        this._pageBeingLoaded = this._currentPage
        this._pagedTasksLoaded.next({ tasks : tasks, page : this.currentPage })
    }

    public nextPage() : Observable<void> {
        const result = this.loadCompletedTasks ? this.getCompletedTasks() : this.getTasks()

        this._currentPage++
        this.currentPageSize = this.pageSize

        return result.first()
    }

    public repeat() : Observable<TCTask[]> {
        const resultSubject = new Subject<TCTask[]>()
        let repeatedPage  : number = 0
        let loadCompleted : boolean = false
        let retrievedTasks : TCTask[] = []

        const getNextRepeatPage = () => {
            if (!(repeatedPage < this.currentPage || !loadCompleted && this.loadCompletedTasks)) return

            getRemoteTasks(loadCompleted ? 
                this.completedTasksRemote(repeatedPage) : 
                this.tasksRemote(repeatedPage)
            )
            repeatedPage++
        }

        const getRemoteTasks = (obs : Observable<TCTask[]>) => {
            let gotTasks = false
            const first = obs.first()

            first
                .filter(tasks => tasks.length < this.pageSize && !loadCompleted)
                .subscribe(tasks => {
                    loadCompleted = true
                    repeatedPage = 0
                })

            first
                .filter(tasks => tasks.length > 0)
                .subscribe(tasks => {
                    retrievedTasks = retrievedTasks.concat(tasks)
                    gotTasks = true
                })

            first
                .filter(tasks => repeatedPage == this.currentPage && loadCompleted == this.loadCompletedTasks)
                .subscribe(tasks => {
                    resultSubject.next(retrievedTasks)
                    resultSubject.complete()
                })

            first.subscribe({
                next : () => {},
                complete : () => {
                    getNextRepeatPage()
                }
            })
        }

        const pagerHasLoadedPages = this.currentPage > 0 || this.loadCompletedTasks

        if (pagerHasLoadedPages) {
            getNextRepeatPage()
        }

        return resultSubject
    }

    public repeatTaskitos() : Observable<TCTaskito[]> {
        const result = new Subject<TCTaskito[]>()
        result.complete()
        return result
    }
}

class ListTaskPageTrackingModule extends TaskPageTrackingModule{
    public readonly currentList : TCList
    get loadsTaskitos() : boolean { return false }

    constructor(
        private taskService : TCTaskService,
        list : TCList
    ) {
        super()
        this.currentList = list
    }

    tasksRemote(page : number) {
        return this.taskService.tasksForList(this.currentList, page, this.currentPageSize)
    }

    completedTasksRemote(page : number) {
        return this.taskService.completedTasksForList(this.currentList, page, this.currentPageSize)
    }

    createResetCopy() : ListTaskPageTrackingModule {
        return new ListTaskPageTrackingModule(this.taskService, this.currentList)
    }
}

class SmartListPageTrackingModule extends TaskPageTrackingModule {
    public readonly currentSmartList : TCSmartList
    get loadsTaskitos() : boolean { return false }

    constructor(
        private taskService : TCTaskService,
        smartList : TCSmartList
    ) {
        super()
        this.currentSmartList = smartList
    }

    protected setupTaskHandling(observable : Observable<TCTask[]>) {
        if (this.currentSmartList.completedTaskFilter.type != "active") {
            super.setupTaskHandling(observable)
            return
        }

        observable.first()
            .filter(tasks => tasks.length < this.pageSize)
            .subscribe(tasks => {
                this._loadCompletedTasks = true
                this._currentPage = 0
                // Basically, don't call nextPage() automatically
            })

        observable.first()
            .filter(tasks => tasks.length > 0)
            .subscribe(tasks => this.gotTasks(tasks))

        observable.first().subscribe(tasks => this._pageBeingLoaded = this._currentPage)
    }

    tasksRemote(page : number) {
        return this.taskService.tasksForSmartList(this.currentSmartList, page, this.currentPageSize)
    }

    completedTasksRemote(page : number) {
        return this.taskService.completedTasksForSmartList(this.currentSmartList, page, this.currentPageSize)
    }

    createResetCopy() : SmartListPageTrackingModule {
        return new SmartListPageTrackingModule(this.taskService, this.currentSmartList)
    }
}

class SearchTaskPageTrackingModule extends TaskPageTrackingModule {
    public readonly currentTerm : string
    get loadsTaskitos() : boolean { return false }

    constructor(
        private taskService : TCTaskService,
        term : string
    ) {
        super()
        this.currentTerm = term
    }

    tasksRemote(page : number) {
        return this.taskService.searchTasks(this.currentTerm, page, this.currentPageSize, false)
    }

    completedTasksRemote(page : number) {
        return this.taskService.searchTasks(this.currentTerm, page, this.currentPageSize, true)
    }

    createResetCopy() : SearchTaskPageTrackingModule {
        return new SearchTaskPageTrackingModule(this.taskService, this.currentTerm)
    }
}

abstract class ParentTaskPageTrackingModule extends TaskPageTrackingModule {
    public readonly parentTask : TCTask
    get loadsTaskitos() : boolean { return false }

    constructor(
        parentTask : TCTask
    ) {
        super()
        this.parentTask = parentTask
    }
}

class ProjectTaskPageTrackingModule extends ParentTaskPageTrackingModule {
    constructor (
        private taskService : TCTaskService, 
        parentTask : TCTask
    ) {
        super(parentTask)
    }

    protected setupTaskHandling(observable : Observable<TCTask[]>) {
        observable.first()
            .filter(tasks => tasks.length < this.pageSize)
            .subscribe(tasks => {
                this.procedeToLoadCompletedTasks(this.pageSize)
            })

        observable.first()
            .filter(tasks => tasks.length > 0)
            .subscribe(tasks => this.gotTasks(tasks))

        observable.first().subscribe(tasks => this._pageBeingLoaded = this._currentPage)
    }

    tasksRemote(page : number) {
        return this.taskService.subtasksForProject(this.parentTask, page, this.currentPageSize)
    }

    completedTasksRemote(page : number) {
        return this.taskService.completedSubtasksForProject(this.parentTask, page, this.currentPageSize)
    }

    createResetCopy() : ProjectTaskPageTrackingModule {
        return new ProjectTaskPageTrackingModule(this.taskService, this.parentTask)
    }
}

class ChecklistTaskPageTrackingModule extends ParentTaskPageTrackingModule {
    get loadsTaskitos() : boolean { return true }

    constructor (
        private taskitoService : TCTaskitoService,
        parentTask : TCTask
    ) {
        super(parentTask)
    }

    tasksRemote() { return null }

    completedTasksRemote() { return null}

    getTasks() { return null }

    getCompletedTasks() { return null }

    nextPage() {
        const result = this.taskitoService
            .itemsForChecklist(this.parentTask, this.currentPage, this.loadCompletedTasks)
            .first()
            .finally(() => {
                this._pageBeingLoaded = this._currentPage
            })

        if (this.loadCompletedTasks) {
            result.subscribe(taskitos => {
                this._pagedTaskitosLoaded.next({ taskitos : taskitos, page : this.currentPage })
            })
        }
        else {
            result.subscribe(taskitos => {
                if (taskitos.length != this.pageSize) {
                    this._loadCompletedTasks = true
                    this._currentPage = 0
                }
                this._pagedTaskitosLoaded.next({ taskitos : taskitos, page : this.currentPage })
            })
        }

        this._currentPage++

        return result.map(taskitos => {}).first()
    }

    createResetCopy() : ChecklistTaskPageTrackingModule {
        return new ChecklistTaskPageTrackingModule(this.taskitoService, this.parentTask)
    }

    repeatTaskitos() : Observable<TCTaskito[]> {
        const resultSubject = new Subject<TCTaskito[]>()
        let repeatedPage  : number = 0
        let loadCompleted : boolean = false
        let retrievedTaskitos : TCTaskito[] = []

        const getNextRepeatPage = () => {
            if (!(repeatedPage < this.currentPage || !loadCompleted && this.loadCompletedTasks)) return
            getRemoteTaskitos(this.taskitoService.itemsForChecklist(this.parentTask, repeatedPage, loadCompleted))
            repeatedPage++
        }

        const getRemoteTaskitos = (obs : Observable<TCTaskito[]>) => {
            const first = obs.first()

            first
                .filter(tasks => tasks.length < this.pageSize && !loadCompleted)
                .subscribe(tasks => {
                    loadCompleted = true
                    repeatedPage = 0
                })

            first
                .filter(tasks => tasks.length > 0)
                .subscribe(tasks => {
                    retrievedTaskitos = retrievedTaskitos.concat(tasks)
                })

            first
                .filter(tasks => repeatedPage == this.currentPage && loadCompleted == this.loadCompletedTasks)
                .subscribe(tasks => {
                    resultSubject.next(retrievedTaskitos)
                    resultSubject.complete()
                })

            first.subscribe({
                next : () => {},
                complete : () => {
                    getNextRepeatPage()
                }
            })
        }

        const pagerHasLoadedPages = this.currentPage > 0 || this.loadCompletedTasks

        if (pagerHasLoadedPages) {
            getNextRepeatPage()
        }

        return resultSubject
    }
}

export interface PagerServices {
    taskService : TCTaskService,
    taskitoService : TCTaskitoService,
    paywallService : PaywallService
}

export class TaskPager {
    private taskPageTracker : TaskPageTrackingModule
    
    public get loadingCompletedTasks() : boolean {
        return this.taskPageTracker.loadCompletedTasks
    }
    public get pageBeingLoaded() : number {
        return this.taskPageTracker.pageBeingLoaded
    }

    private _hasNextPage : boolean = true
    public get hasNextPage() : boolean {
        return this._hasNextPage
    }
    public set hasNextPage(hasNext : boolean) {
        this._hasNextPage = hasNext
        this.determineNextPageFunction()
    }

    public get showLoadMoreCompletedTasksButton() : boolean {
        return this.taskPageTracker && this.taskPageTracker.loadCompletedTasks && this.hasNextPage
    }

    public get pagedTasksLoaded() : Observable<{ tasks : TCTask[], page : number }> {
        return this._pagedTasksLoaded
    }
    private _pagedTasksLoaded = new Subject<{ tasks : TCTask[], page : number }>()

    public get pagedTaskitosLoaded() : Observable<{ taskitos : TCTaskito[], page : number }> {
        return this._pagedTaskitosLoaded
    }
    private _pagedTaskitosLoaded = new Subject<{ taskitos : TCTaskito[], page : number }>()

    private pagedTasksLoadedSub : Subscription

    private constructor(
        private readonly taskService : TCTaskService,
        private readonly taskitoService : TCTaskitoService,
        private readonly paywallService : PaywallService
    ) {
        Object.freeze(this.NextPageFunctions)
    }

    public static PagerForList(list : TCList, services : PagerServices) : TaskPager {
        const pager = new TaskPager(services.taskService, services.taskitoService, services.paywallService)
        pager.setCurrentList(list)
        return pager
    }

    public static PagerForSmartList(smartList : TCSmartList, services : PagerServices) : TaskPager {
        const pager = new TaskPager(services.taskService, services.taskitoService, services.paywallService)
        pager.setCurrentSmartList(smartList)
        return pager
    }

    public static PagerForProject(project : TCTask, services : PagerServices) : TaskPager {
        if (!project.isProject) return null

        const pager = new TaskPager(services.taskService, services.taskitoService, services.paywallService)
        pager.setCurrentProject(project)
        return pager
    }

    public static PagerForChecklist(checklist : TCTask, services : PagerServices) : TaskPager {
        if (!checklist.isChecklist) return null

        const pager = new TaskPager(services.taskService, services.taskitoService, services.paywallService)
        pager.setCurrentChecklist(checklist)
        return pager
    }

    public static PagerForSearch(term : string, services : PagerServices) : TaskPager {
        const pager = new TaskPager(services.taskService, services.taskitoService, services.paywallService)
        pager.setCurrentSearch(term)
        return pager
    }

    public reset() {
        this.taskPageTracker = this.taskPageTracker.createResetCopy()
        this.setupPageSubscription(this.taskPageTracker.loadsTaskitos)
    }

    public nextPage(next? : () => void) {
        this.nextPageFunction(next)
    }

    public loadCompletedTasks(next? : () => void) {
        this.taskPageTracker.procedeToLoadCompletedTasks().subscribe(next ? next : () => {})
    }

    public onSync() : Observable<TCTask[]> {
        return this.taskPageTracker.repeat()
    }

    public onSyncTaskito() : Observable<TCTaskito[]> {
        return this.taskPageTracker.repeatTaskitos()
    }

    private readonly NextPageFunctions = {
        loadNextPage : (next? : () => void) => {
            if (!this.hasNextPage || this.taskPageTracker == null || this.pagedTasksLoaded == null) return
            this.nextPageFunction = this.NextPageFunctions.doNothing
            
            const wrappedNext = () => {
                next()
                this.nextPageFunction = this.NextPageFunctions.loadNextPage
            }

            const setupNext = () => {
                this.taskPageTracker.nextPage().subscribe(next ? wrappedNext : () => {})
            }

            if (this.paywallService && this.taskPageTracker.loadCompletedTasks && this.taskPageTracker.currentPage > 0) {
                this.paywallService.paywallCheck('A subscription is needed to load more completed tasks.', setupNext, wrappedNext)
                return
            }
            setupNext()
        },
        doNothing : (next? : () => void) => {}
    }
    private nextPageFunction : (next? : () => void) => void = this.NextPageFunctions.loadNextPage
    
    // Set the pager to start loading the given list.
    private setCurrentList(list : TCList) {
        this.taskPageTracker = new ListTaskPageTrackingModule(this.taskService, list)
        this.setupPageSubscription()
    }

    // Set the pager to start loading the given smart list.
    private setCurrentSmartList(smartList : TCSmartList) {
        this.taskPageTracker = new SmartListPageTrackingModule(this.taskService, smartList)
        this.setupPageSubscription()
    }

    // Set the pager to start loading the given project.
    private setCurrentProject(parentTask : TCTask) {
        this.taskPageTracker = new ProjectTaskPageTrackingModule(this.taskService, parentTask)
        this.setupPageSubscription()
    }

    // Set the pager to start loading the given checklist.
    private setCurrentChecklist(parentTask : TCTask) {
        this.taskPageTracker = new ChecklistTaskPageTrackingModule(this.taskitoService, parentTask)
        this.setupPageSubscription(true)
    }

    private setCurrentSearch(term : string) {
        this.taskPageTracker = new SearchTaskPageTrackingModule(this.taskService, term)
        this.setupPageSubscription()
    }

    private determineNextPageFunction() {
        this.nextPageFunction = this.hasNextPage ? this.NextPageFunctions.loadNextPage : this.NextPageFunctions.doNothing
    }

    private setupPageSubscription(forTaskitos : boolean = false) {
        this.hasNextPage = true

        if (this.pagedTasksLoadedSub) this.pagedTasksLoadedSub.unsubscribe()

        if (forTaskitos) {
            this.pagedTasksLoadedSub = this.taskPageTracker.pagedTaskitosLoaded.subscribe(result => {
                this.hasNextPage = 
                    (result.taskitos.length > 0 && !this.taskPageTracker.loadCompletedTasks) ||
                    (this.taskPageTracker.currentPage == 0 && this.taskPageTracker.loadCompletedTasks)
                this._pagedTaskitosLoaded.next(result)
            })
            return
        }

        this.pagedTasksLoadedSub = this.taskPageTracker.pagedTasksLoaded.subscribe(result => {
            this.hasNextPage = result.tasks.length > 0 || 
                (this.taskPageTracker.currentPage == 0 && this.taskPageTracker.loadCompletedTasks)

            this._pagedTasksLoaded.next(result)
        })
    }
}