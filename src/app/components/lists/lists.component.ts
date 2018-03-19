import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, Output, EventEmitter }  from '@angular/core'
import { Router } from '@angular/router'
import { ContextMenuService, ContextMenuComponent} from 'ngx-contextmenu'
import { DragulaService } from 'ng2-dragula'
import { TaskEditService, TaskEditEvent } from '../../services/task-edit.service'

import { TCSyncService } from '../../services/tc-sync.service'
import { TCListService, ListPublication } from '../../services/tc-list.service'
import { TCList } from '../../classes/tc-list'

import { TCListMembershipService } from '../../services/tc-list-membership.service'
import { ListMembershipType } from '../../tc-utils'
import { TCListMembership } from '../../classes/tc-list-membership'

import { TCTaskService } from '../../services/tc-task.service'
import { TCTask } from '../../classes/tc-task'

import { TCSmartListService } from '../../services/tc-smart-list.service'
import { TCSmartList } from '../../classes/tc-smart-list'

import { TCUserSettingsService } from '../../services/tc-user-settings.service'
import { TCUserSettings } from '../../classes/tc-user-settings'

import { TCAppSettingsService } from '../../services/tc-app-settings.service'
import { PaywallService } from '../../services/paywall.service'

import { NgbModal, NgbModalRef }  from '@ng-bootstrap/ng-bootstrap'
import { ListEditComponent }      from '../list-edit/list-edit.component'
import { SmartListEditComponent } from '../smart-list-edit/smart-list-edit.component'
import { SmartListDeleteConfirmationComponent } from '../list-property-editors/smart-list-delete-confirmation/smart-list-delete-confirmation.component'
import { ListDeleteConfirmationComponent }      from '../list-property-editors/list-delete-confirmation/list-delete-confirmation.component'

import { TCErrorService, TCError }    from '../../services/tc-error.service'

import { Utils, ListPublishInformation, TaskEditState } from '../../tc-utils'

import { Subscription, Subject } from 'rxjs'
import { environment } from 'environments/environment.test';

interface SmartListInfo {
    taskInfo : { count : number, overdue : number },
    smartList: TCSmartList
}

interface ListInfo {
    isSpacer : boolean,
    hidden   : boolean,
    taskInfo : { count : number, overdue : number },
    shared   : boolean,
    list     : TCList
}

type ListLoadState = {
    smartListsLoaded? : boolean,
    listsLoaded? : boolean
}

@Component({
    selector: 'lists',
    templateUrl: 'lists.component.html',
    styleUrls: [
        './../../../../node_modules/dragula/dist/dragula.css',
        'lists.component.css'
    ]
})
export class ListsComponent implements OnInit, OnDestroy {
    mainLists  : ListInfo[] = []
    smartLists : SmartListInfo[] = []
    userLists  : ListInfo[] = []

    listEditFormToggle     : boolean = false
    listCreationInProgress : boolean = false

    selectedList : TCList | TCSmartList = null

    private deleteConfirmationModalRef: NgbModalRef = null

    private listSubscription : Subscription
    private smartListSubscription : Subscription
    private taskCountSubscription : Subscription
    private taskEditSubscription : Subscription
    private listSelectedSubscription : Subscription
    private smartListSelectedSubscription : Subscription
    private syncCompletedSubscription : Subscription

    private currentEditedTask : TCTask = null

    private listLoadSubject = new Subject<ListLoadState>()
    private listsLoadedState = {
        smartListsLoaded : false,
        listsLoaded : false
    }

    @ViewChild('mainListMenu') public mainListMenu: ContextMenuComponent
    @ViewChild('smartListMenu') public smartListMenu: ContextMenuComponent
    @ViewChild('userListMenu') public userListMenu: ContextMenuComponent

    @Output() changeStateListsMenu : EventEmitter<boolean> = new EventEmitter<boolean>()

    constructor(
        private listService      : TCListService,
        private readonly listMembershipService : TCListMembershipService,
        private smartListService : TCSmartListService,
        private taskService      : TCTaskService,
        private settingsService  : TCUserSettingsService,
        private appSettingsService: TCAppSettingsService,
        private readonly syncService : TCSyncService,
        private readonly paywallService : PaywallService,
        private readonly taskEditService : TaskEditService,
        private modalService     : NgbModal,
        private contextMenuService: ContextMenuService,
        private dragulaService   : DragulaService
    ) {
        dragulaService.setOptions('smartLists', {
            invalid: (el, handle) => el.classList.contains('no-drag'),
            accepts: function (el, target, source, sibling) {
                return sibling === null || !sibling.classList.contains('no-drag')
            }

        });
        dragulaService.dropModel.subscribe((value) => {
            let bagName = value[0]
            if (bagName == 'smartLists') {
                this.sortSmartListsOnDrop()
            } else if (bagName == 'userLists') {
                this.sortTaskLists();
            }
        });
    }
    
    ngOnInit() : void {
        this.listLoadSubject.filter(state => {
            this.listsLoadedState.listsLoaded = this.listsLoadedState.listsLoaded || state.listsLoaded
            this.listsLoadedState.smartListsLoaded = this.listsLoadedState.smartListsLoaded || state.smartListsLoaded

            return this.listsLoadedState.listsLoaded && this.listsLoadedState.smartListsLoaded
        })
        .subscribe(state => {
            this.taskService.getTaskCounts()
        })

        const findSelectedListFunction = (lists : any[]) => {
            const selectedListID : string = this.appSettingsService.getSelectedListID()

            // Already found the selected list
            if (this.selectedList && this.selectedList.identifier == selectedListID) return 
            this.selectedList = lists.find((list) => selectedListID == list.identifier)

            // No saved list id, or ID not found.
            // Set selected list to Everything smart list
            if (!this.selectedList) {
                this.selectedList = this.smartLists
                    .map((info : SmartListInfo) => info.smartList)
                    .find((list : TCSmartList) => list.isEverythingSmartList)
            }

            if(this.selectedList) this.selectList(this.selectedList)
        }

        const filterAfterSyncFunc = pub => {
            return pub.info.find(info => info == ListPublishInformation.AfterSync) == null
        }
        this.listSubscription = this.listService.lists.filter(filterAfterSyncFunc).subscribe((pub : ListPublication) => {
            const listsDidReorder = pub.info.reduce((accum, info) => info == ListPublishInformation.Reordered || accum, false)
            if (listsDidReorder) return

            this.settingsService.settings.first().subscribe((settings) => {
                const mappedLists : ListInfo[] = pub.lists.map((list : TCList) => {
                    return { 
                        isSpacer : false,
                        hidden   : settings.allListFilter.has(list.identifier),
                        taskInfo : {
                            count   : 0,
                            overdue : 0
                        },
                        shared   : false,
                        list     : list
                    }
                })

                const inbox = mappedLists.find((info : any) => info.list.identifier == settings.userInbox || info.list.identifier == 'INBOX')
                // inbox.list.iconName = 'twf-inbox'
                this.mainLists = inbox ? [inbox] : []

                let someUserLists = mappedLists
                    .filter((info) => {
                        const result = inbox && info.list.identifier != inbox.list.identifier
                        return result
                    } )
                    .sort((a, b) => a.list.sortOrder - b.list.sortOrder )

                this.listMembershipService.getlistMemberCounts().subscribe(counts => {
                    someUserLists.forEach(info => {
                        const count = counts.find(count => count.listid == info.list.identifier)
                        info.shared = count && count.count > 1
                    })
                })
                
                this.userLists = this.userListsWithSpacers(someUserLists)
                findSelectedListFunction(pub.lists)
            })

            this.listLoadSubject.next({ listsLoaded : true })
        })
        this.listService.getLists(false, false)
    
        this.smartListSubscription = this.smartListService.smartLists.subscribe(pub => {
            const listsDidReorder = pub.info.reduce((accum, info) => info == ListPublishInformation.Reordered || accum, false)
            if (listsDidReorder) return

            const mappedSmartLists : SmartListInfo[] = pub.smartLists.map((smartList : TCSmartList) => {
                return { 
                    taskInfo : {
                        count : 0,
                        overdue : 0
                    },
                    smartList : smartList
                }
            })
            this.smartLists = mappedSmartLists
            findSelectedListFunction(pub.smartLists)

            this.listLoadSubject.next({ smartListsLoaded : true })
        })
        this.smartListService.willDeleteSmartList.subscribe((deleted : TCSmartList) => this.smartListDeleted(deleted) )
        this.smartListService.getSmartLists()

        this.taskCountSubscription = this.taskService.taskCounts.subscribe(counts => {
            const listCountFunction = (list : ListInfo) => {
                const count = counts.listTaskCounts.find(e => !list.isSpacer && e.listid == list.list.identifier)
                if (count) {
                    list.taskInfo.count = count.active
                    list.taskInfo.overdue = count.overdue
                }
            }

            this.userLists.forEach(listCountFunction)
            this.mainLists.forEach(listCountFunction)

            this.smartLists.forEach((smartList : SmartListInfo) => {
                const count = counts.smartListTaskCounts.find(e => e.listid == smartList.smartList.identifier)
                if (count) {
                    smartList.taskInfo.count = count.active
                    smartList.taskInfo.overdue = count.overdue
                }
            })
        })

        this.taskEditSubscription = this.taskEditService.editedTask.subscribe((event : TaskEditEvent) => {
            if (event.state == TaskEditState.Beginning) {
                this.currentEditedTask = event.task
            }
            else if (event.state == TaskEditState.Finished) {
                this.currentEditedTask = null
            }
        })
        
        const listSelectedFunction = (list : TCList | TCSmartList) => {
            this.updateSelectedList(list)
            
            if (this.listsLoadedState.listsLoaded && this.listsLoadedState.smartListsLoaded) {
                this.taskService.getTaskCounts()
            }

            if (window.innerWidth <= 767) {
                this.changeStateListsMenu.emit(false)
            }
        }

        this.listSelectedSubscription = this.listService.selectedList.subscribe(listSelectedFunction)
        this.smartListSelectedSubscription = this.smartListService.smartListSelected.subscribe(listSelectedFunction)

        this.syncCompletedSubscription = this.syncService.syncCompleted.subscribe(() => {
            let listsUpdated = false
            let smartListsUpdated = false

            const listUpdateCompletion = () => {
                if (!listsUpdated || !smartListsUpdated) return
                this.taskService.getTaskCounts()
            }

            this.smartListService.getSmartLists(false).first().subscribe(smartLists => {
                interface Comparison {
                    intersection : {info : SmartListInfo, smartList: TCSmartList}[], 
                    add : TCSmartList[], 
                    remove : TCSmartList[]
                }

                const comparison : Comparison = this.smartLists.reduce((accum, current) => {
                    if (!current.smartList) return accum

                    const existingListIndex = smartLists.findIndex(smartList => {
                        return smartList.identifier == current.smartList.identifier
                    })

                    if (existingListIndex > -1) {
                        const existingList = smartLists[existingListIndex]
                        accum.intersection.push({info: current, smartList: existingList})
                        smartLists.splice(existingListIndex, 1)
                    }
                    else {
                        accum.remove.push(current.smartList)
                    }

                    return accum
                }, { 
                    intersection: new Array<{info : SmartListInfo, smartList: TCSmartList}>(), 
                    remove: new Array<TCSmartList>(), 
                    add: new Array<TCSmartList>() 
                })

                comparison.add = smartLists

                comparison.intersection.forEach(result => {
                    result.info.smartList = result.smartList
                })
                let deletedSelectedList = false
                comparison.remove.forEach(smartList => {
                    if (this.selectedList.identifier == smartList.identifier) {
                        deletedSelectedList = true
                    }
                    this.smartLists = this.smartLists.filter(info => info.smartList.identifier != smartList.identifier)
                })
                if (deletedSelectedList) {
                    this.appSettingsService.clearSelectedListID()
                    this.selectedList = null
                    findSelectedListFunction([])
                }
                
                let theSmartLists = this.smartLists
                    .concat(comparison.add.map(list => {
                        return {
                            taskInfo : { count : 0, overdue : 0 },
                            smartList     : list
                        }
                    }))

                
                theSmartLists = theSmartLists.sort((a, b) => a.smartList.sortOrder - b.smartList.sortOrder)
                this.smartLists = theSmartLists

                smartListsUpdated = true
                listUpdateCompletion()
            })

            this.listService.getLists(false, false, true).first().subscribe(lists => {
                interface Comparison {
                    intersection : {info : ListInfo, list: TCList}[], 
                    add : TCList[], 
                    remove : TCList[],
                    inbox : TCList
                }

                const comparison : Comparison = this.userLists.reduce((accum, current) => {
                    if (!current.list) return accum

                    const existingListIndex = lists.findIndex(list => {
                        return list.identifier == current.list.identifier
                    })

                    if (existingListIndex > -1) {
                        const existingList = lists[existingListIndex]
                        accum.intersection.push({info: current, list: existingList})
                        lists.splice(existingListIndex, 1)
                    }
                    else {
                        accum.remove.push(current.list)
                    }

                    return accum
                }, { 
                    intersection: new Array<{info : ListInfo, list: TCList}>(), 
                    remove: new Array<TCList>(), 
                    add: new Array<TCList>(),
                    inbox: null 
                })

                const existingInboxIndex = lists.findIndex(list => {
                    return list.identifier == "INBOX"
                })

                if (existingInboxIndex > -1) {
                    const existingList = lists[existingInboxIndex]
                    existingList.name = "Inbox"
                    comparison.inbox = existingList
                    lists.splice(existingInboxIndex, 1)
                }

                comparison.add = lists

                if (comparison.inbox && this.mainLists[0]) {
                    this.mainLists[0].list = comparison.inbox
                }
                comparison.intersection.forEach(result => {
                    result.info.list = result.list
                })

                let deletedSelectedList = false
                comparison.remove.forEach(list => {
                    if (this.selectedList.identifier == list.identifier) {
                        deletedSelectedList = true
                    }
                    this.userLists = this.userLists.filter(info => info.isSpacer || info.list.identifier != list.identifier)
                })

                if (deletedSelectedList) {
                    this.appSettingsService.clearSelectedListID()
                    this.selectedList = null
                    findSelectedListFunction([])
                }
                
                let userLists = this.userLists
                    .filter(info => !info.isSpacer)
                    .concat(comparison.add.map(list => {
                        return {
                            isSpacer : false,
                            hidden   : false,
                            taskInfo : { count : 0, overdue : 0 },
                            shared   : false,
                            list     : list
                        }
                    }))

                userLists = userLists.sort((a, b) => a.list.sortOrder - b.list.sortOrder)

                this.userLists = this.userListsWithSpacers(userLists)
                this.listMembershipService.getlistMemberCounts().subscribe(counts => {
                    userLists.forEach(info => {
                        const count = counts.find(count => count.listid == info.list.identifier)
                        info.shared = count && count.count > 1
                    })
                })

                listsUpdated = true
                listUpdateCompletion()
            })
        })
    }

    ngOnDestroy() {
        this.dragulaService.destroy('smartLists')
        this.dragulaService.destroy('userLists')

        this.listSubscription.unsubscribe()
        this.smartListSubscription.unsubscribe()
        this.taskCountSubscription.unsubscribe()
        this.taskEditSubscription.unsubscribe()
        this.listSelectedSubscription.unsubscribe()
        this.smartListSelectedSubscription.unsubscribe()
        this.syncCompletedSubscription.unsubscribe()
        
        this.listLoadSubject.complete()
    }

    selectList(list : TCList | TCSmartList) {
        if (list instanceof TCList) {
            this.listService.selectList(list)
        }
        else {
            if (!(list as TCSmartList).isEverythingSmartList) {
                this.paywallService.paywallCheck("Viewing custom smart lists is a premium feature.",
                    () => this.smartListService.selectSmartList(list)
                )
            }
            else {
                this.smartListService.selectSmartList(list)
            }
        }
    }

    private updateSelectedList(list : TCList | TCSmartList) {
        this.selectedList = list
        this.appSettingsService.setSelectedList(list)
    }

    private isSelectedList(list : TCSmartList | TCList) {
        if (!this.selectedList) return false
        return this.selectedList.identifier == list.identifier
    }
    
    private openSmartListEditorModal() : SmartListEditComponent {
        const modalRef = this.modalService.open(SmartListEditComponent, {backdrop: 'static', keyboard: false})
        const editComponent : SmartListEditComponent = modalRef.componentInstance as SmartListEditComponent

        return editComponent
    }

    private smartListDeleted(deleted : TCSmartList) {
        if(this.selectedList.identifier == deleted.identifier) this.selectList(this.smartLists.find(smartListInfo => smartListInfo.smartList.isEverythingSmartList).smartList)
        this.smartLists = this.smartLists.filter((smartListInfo : SmartListInfo) => {
            return smartListInfo.smartList.identifier != deleted.identifier 
        })
    }

    createSmartList(smartList : TCSmartList, completion? : (savedList : TCSmartList) => void) {
        smartList.sortOrder = this.smartLists.length > 0 ? this.smartLists[this.smartLists.length - 1].smartList.sortOrder + 1 : 0
        let displayedList = {
            taskInfo : {
                count  : 0,
                overdue: 0
            },
            smartList: smartList
        }
        this.smartLists.push(displayedList)
        
        this.smartListService.create(smartList).subscribe((savedList : TCSmartList) => {
            const mapped = this.smartLists.map((listInfo) => {
                if (listInfo === displayedList) {
                    return {
                        taskInfo : displayedList.taskInfo,
                        smartList: savedList
                    }
                }
                return listInfo
            })
            this.smartLists = mapped
            if (completion) completion(savedList)
            this.taskService.getTaskCounts()
        })
    }

    addSmartList() {
        this.settingsService.settings.first().subscribe((settings : TCUserSettings) => {
            const smartList = new TCSmartList()
            smartList.defaultList = ""
            const editComponent = this.openSmartListEditorModal()
            const sortOrder = this.smartLists.length > 0 ? this.smartLists[this.smartLists.length - 1].smartList.sortOrder + 1 : 0
            editComponent.smartList = smartList
            editComponent.showSmartListCreate = true
            editComponent.showDuplicateButton = false
            editComponent.defaultListName = this.mainLists[0].list.name
            editComponent.sortOrder = sortOrder
            
            editComponent.updatedSmartList.subscribe((updateEvent : any) => {
                this.updateSmartList(updateEvent)
            })
            editComponent.readyToCreate.subscribe((smartList : TCSmartList) => {
                this.selectList(smartList)
            })
        })

        return false // To prevent <a> from navigating away
    }

    editSmartList(smartList : TCSmartList, listIndex : number) {
        const editComponent = this.openSmartListEditorModal()
        editComponent.smartList = smartList;
        editComponent.showDuplicateButton = true

        editComponent.updatedSmartList.subscribe((updateEvent : any) => {
            // this.updateSmartList(updateEvent)
            // this.updateSelectedList(updateEvent.list)
        })
        editComponent.duplicatedSmartList.subscribe((duplicatedList : TCSmartList) => {
            this.createSmartList(duplicatedList)
        })
    }

    deleteConfirmationSmartList(smartList : TCSmartList) {
        const modalRef = this.modalService.open(SmartListDeleteConfirmationComponent)
        const deleteComponent : SmartListDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.smartList = smartList
        deleteComponent.inSmartListEditor = false

        return false
    }

    private openListEditorModal() : ListEditComponent {
        const modalRef = this.modalService.open(ListEditComponent, {backdrop: 'static', keyboard: false})
        const editComponent : ListEditComponent = modalRef.componentInstance as ListEditComponent

        modalRef.result.then(result => {
            if (editComponent.listInit) this.selectList(editComponent.list)
        }).catch(result => {
            if (editComponent.listInit) this.selectList(editComponent.list)
        })
        return editComponent
    }

    addList() {
        // Create a new list with no constructor parameters. An identifier and timestamp will be assigned by the backend.
        const list = new TCList()
        let lastSortOrder = this.lastSortOrder()
        list.sortOrder = lastSortOrder + 1
        list.color = Utils.randomListColor()

        let displayedList = {
            isSpacer : false,
            hidden   : false,
            taskInfo : {
                count  : 0,
                overdue: 0
            },
            shared   : false,
            list     : list
        }
        this.userLists.push(displayedList)

        this.settingsService.settings.first().subscribe(settings => {
            list.emailNotifications = Object.assign({}, settings.emailNotificationDefaults)

            this.listService.create(list).first().subscribe((savedList : TCList) => {
                // Change the saved list to have any edits that were made since the
                // add request was made.
                savedList.color = list.color
                savedList.iconName = list.iconName
                savedList.name = list.name
    
                // Swap the saved list in for the list being edited.
                const editComponent = this.openListEditorModal()
                editComponent.list = savedList
                editComponent.listInit = true
                editComponent.saveButtonActive = true
    
                editComponent.updatedList.subscribe((updateEvent : any) => {
                    this.updateList(updateEvent)
                })
            })
        })
        return false // To prevent <a> from navigating away
    }

    editList(list : TCList) : ListEditComponent {
        const editComponent = this.openListEditorModal()
        editComponent.list = list;
        editComponent.saveButtonActive = true
        if(this.mainLists[0].list.identifier === list.identifier){
            editComponent.isMainList = true
        }
        editComponent.updatedList.subscribe((updateEvent : any) => {
            // this.updateList(updateEvent)
        })

        return editComponent
    }

    shareList(list : TCList) {
        const component = this.editList(list)
        component.showEditSharing = true
    }

    showDeleteListConfirmationModal(listInfo : ListInfo) {
        this.deleteConfirmationModalRef = this.modalService.open(ListDeleteConfirmationComponent)
        const deleteComponent : ListDeleteConfirmationComponent = this.deleteConfirmationModalRef.componentInstance

        deleteComponent.list = listInfo.list
        deleteComponent.deletePressed.subscribe(list => {
            this.deleteTaskList(list)

            if (!this.currentEditedTask || list.identifier != this.currentEditedTask.listId) return
            this.taskEditService.finishEditTask(this.currentEditedTask)
        })

        return false
    }

    updateList(updateEvent : any) : void {
        const mapped = this.userLists.map((listInfo) => {
            if (listInfo.list && listInfo.list.identifier == updateEvent.list.identifier) {
                return {
                    isSpacer : false,
                    hidden   : listInfo.hidden,
                    taskInfo : listInfo.taskInfo,
                    shared   : listInfo.shared,
                    list     : updateEvent.list
                }
            }
            return listInfo
        })

        this.userLists = mapped
    }

    updateSmartList(updateEvent : any) : void {
        const mapped = this.smartLists.map((listInfo) => {
            if (listInfo.smartList.identifier == updateEvent.list.identifier) {
                return {
                    isSpacer : false,
                    taskInfo : listInfo.taskInfo,
                    smartList: updateEvent.list
                }
            }
            return listInfo
        })

        this.smartLists = mapped
    }

    sortSmartLists(movedSmartList : TCSmartList, movedIndex : number) {
        const smartLists : TCSmartList[] = this.smartLists.map((smartListInfo) => smartListInfo.smartList)

        movedSmartList.sortOrder = 0
        let previousList = smartLists[movedIndex - 1]
        let nextList = smartLists[movedIndex + 1]
        
        if (movedIndex == 0) {
            movedSmartList.sortType = movedIndex
        }
        else if (previousList && (nextList.sortOrder - previousList.sortOrder) == 1) {
            movedSmartList.sortOrder = previousList.sortOrder + 1
        }
        else if(nextList) {
            movedSmartList.sortOrder = nextList.sortOrder
        }

        smartLists.forEach((list : TCSmartList, index : number) => {
            if (index > movedIndex && index > 0) {
                list.sortOrder = smartLists[index - 1].sortOrder + 1
            }
        })

        for (let smartList of smartLists) {
            this.smartListService.update(smartList).subscribe((updatedList : TCSmartList) => {
                smartList = updatedList
            })
        }
    }

    sortSmartListsOnDrop(){
        const smartLists : TCSmartList[] = this.smartLists.map((smartListInfo) => smartListInfo.smartList)

        smartLists.forEach((smartList : TCSmartList, index : number) => {
            // Only change if needed (to preserve network activity)
            let newSortOrder = index + 1 // 1-based index
            if (smartList.sortOrder != newSortOrder) {
                smartList.sortOrder = newSortOrder
                this.smartListService.update(smartList, [ListPublishInformation.Reordered]).subscribe((updatedList : TCSmartList) => {
                    smartList = updatedList
                })
            }
        })
    }

    sortTaskLists() {
        // Go through the lists and trim out spacers from the beginning
        // or end of the list. Also trim out spacers that are next to each
        // other.
        let prevListInfo : ListInfo = null
        const finalIndex = this.userLists.length - 1

        let newLists = this.userLists.filter((listInfo : ListInfo, index : number, lists : ListInfo[]) : boolean => {
            if (index == 0 && listInfo.isSpacer) {
                return false
            }

            if (prevListInfo && prevListInfo.isSpacer && listInfo.isSpacer) {
                prevListInfo = null // Null this out so at least one spacer stays
                return false
            }

            if (index == finalIndex && listInfo.isSpacer) {
                return false
            }

            prevListInfo = listInfo

            return true
        })

        // Replace the user lists with the newly-filtered lists
        this.userLists = newLists

        // We don't know the original location of the movedListInfo, so
        // we actually have to save _every_ list. Conveniently, we can
        // use the index of each list position in this.userLists as the
        // sort order (starting with a sort order value of 1)
        this.userLists.forEach((listInfo : ListInfo, index : number) => {
            const newSortOrder = index + 1 // 1-based index
            if (listInfo.isSpacer || listInfo.list.sortOrder == newSortOrder) return
            
            listInfo.list.sortOrder = newSortOrder
            this.listService.update(listInfo.list, [ListPublishInformation.Reordered]).first().subscribe((updatedList : TCList) => {
                listInfo.list = updatedList
            })
        })
    }

    private lastSortOrder() {
        let lastUserList = Array.from(this.userLists).reverse().find((listInfo : ListInfo) => !(listInfo.isSpacer))
        return lastUserList ? lastUserList.list.sortOrder : 0
    }

    private userListsWithSpacers(lists : ListInfo[]) : ListInfo[] {
        if (!lists) return []

        let prevListInfo : ListInfo
        let prevSpacedListInfo : ListInfo

        return lists.reduce((accumulator : ListInfo[], currentList : ListInfo, index : number) : ListInfo[] => {
            if (index != 0) {
                const sortOrderDifference = currentList.list.sortOrder - prevListInfo.list.sortOrder

                if (sortOrderDifference > 1 && prevSpacedListInfo.isSpacer == false) {
                    accumulator.push({
                        isSpacer : true,
                        hidden   : false,
                        taskInfo : null,
                        shared   : false,
                        list     : null
                    })
                }
            }

            accumulator.push(currentList)

            prevListInfo = currentList
            prevSpacedListInfo = currentList

            return accumulator
        }, [])
    }

    // I don't quite understand why the next line is needed, but the
    // ngx-contextmenu says it needs to be so.
    public canAddSpacerAboveListBound = this.canAddSpacerAboveList.bind(this)
    public canAddSpacerAboveList(listInfo : ListInfo) : boolean {
        if (!listInfo) return false
        if (listInfo.isSpacer) return false
        let listIndex = this.userLists.indexOf(listInfo)
        if (listIndex <= 0) {
            return false
        }

        let previousList = this.userLists[listIndex - 1]
        if (previousList.isSpacer) return false

        return true
    }

    public canDeleteSmartListBound = this.canDeleteSmartList.bind(this)
    public canDeleteSmartList(listInfo : SmartListInfo) : boolean {
        if (!listInfo) return false
        let smartList : TCSmartList = listInfo.smartList

        // We gotta figure out a better way to know that this is
        // the "Everything" list. But, right now, this is pretty much
        // the only thing we have (the special icon name).
        if (smartList.isEverythingSmartList) {
            return false
        }
        
        return true
    }

    deleteTaskList(list : TCList) {
        if (!list) return

        const deleteComponent : ListDeleteConfirmationComponent = this.deleteConfirmationModalRef.componentInstance
        this.listService.delete(list).subscribe(
            () => {
                deleteComponent.errorMessage = null
                if (this.selectedList && this.selectedList.identifier == list.identifier) {
                    this.selectList(this.mainLists[0].list)
                }
                this.deleteConfirmationModalRef.close()
            },
            err => {
                let aMessage = Utils.parseErrorMessage(err)
                deleteComponent.errorMessage = Utils.parseErrorMessage(err)
            }
        )
    }

    addSpacerAboveList(listInfo: ListInfo) {
        let listIndex = this.userLists.indexOf(listInfo)
        if (listIndex <= 0) {
            // Invalid situation or list not found
            return
        }

        this.userLists.splice(listIndex, 0, {
            isSpacer : true,
            hidden   : false,
            taskInfo : null,
            shared   : false,
            list     : null
        })

        this.userLists.forEach((listInfo : ListInfo, index : number) => {
            if (listInfo.isSpacer == false) {
                // Only change if needed (to preserve network activity)
                let newSortOrder = index + 1 // 1-based index
                if (listInfo.list.sortOrder != newSortOrder) {
                    listInfo.list.sortOrder = newSortOrder
                    this.listService.update(listInfo.list).subscribe((updatedList : TCList) => {
                        listInfo.list = updatedList
                    })
                }
            }
        })
    }

    deleteSpacer(listInfo : ListInfo) {
        let listIndex = this.userLists.indexOf(listInfo)
        if (listIndex <= 0) {
            // Invalid situation or list info not found
            return
        }

        // Delete the spacer from the UI
        this.userLists.splice(listIndex, 1) // Deletes 1 item at the specified index
        
        this.userLists.forEach((listInfo : ListInfo, index : number) => {
            if (listInfo.isSpacer == false) {
                // Only change if needed (to preserve network activity)
                let newSortOrder = index + 1 // 1-based index
                if (listInfo.list.sortOrder != newSortOrder) {
                    listInfo.list.sortOrder = newSortOrder
                    this.listService.update(listInfo.list).subscribe((updatedList : TCList) => {
                        listInfo.list = updatedList
                    })
                }
            }
        })
    }

    showMessage(message: string) {
        console.log(message)
    }
    public onContextMenu(event : MouseEvent, list : any, menu : string): void {
        this.contextMenuService.show.next({
            contextMenu: this[menu],
            event: event,
            item: list,
        })
        event.preventDefault()
        event.stopPropagation()
    }
}
