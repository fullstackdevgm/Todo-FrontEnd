import {Component, OnInit, OnDestroy, ViewContainerRef, ViewChild }  from '@angular/core'
import {Router} from '@angular/router'
import { NgbDatepickerConfig, NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap'
import { CalendarService }            from '../../services/calendar.service'
import { TCAccount }                  from '../../classes/tc-account'
import { TCAccountService }           from '../../services/tc-account.service'
import { TCAuthenticationService }    from '../../services/tc-authentication.service'
import { TCErrorService, TCError }    from '../../services/tc-error.service'
import { TCListService }              from '../../services/tc-list.service'
import { AlertService }               from '../../services/alert.service'
import { SystemMessageService }       from '../../services/system-message.service'
import { TaskEditService }            from '../../services/task-edit.service'
import { TCSystemNotification }       from '../../classes/tc-system-notification'
import { TCAppSettingsService }       from '../../services/tc-app-settings.service'
import { TCSyncService }              from '../../services/tc-sync.service'
import { TCListMembershipService }    from '../../services/tc-list-membership.service'
import { I18n, TCDatepickerI18n }     from '../../services/calendar.service'

// import {ToastsManager}              from 'ng2-toastr/ng2-toastr'

import { Subscription } from 'rxjs'
import { TaskEditState } from '../../tc-utils'

@Component({
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.css'],
    host: {
        '(window:resize)': 'updateContainerHeight()'
    },
    providers: [I18n, {provide: NgbDatepickerI18n, useClass: TCDatepickerI18n}]
})
export class HomeComponent implements OnInit, OnDestroy {
    userID      : string = ''
    userName    : string = ''
    firstName   : string = ''
    lastName    : string = ''
    displayName : string = ''

    systemMessage : TCSystemNotification = null
    dismissSystemMessage : boolean = false
    openSidebar : boolean = false
    showTaskEdit : boolean = false
    showMainCalendar : boolean = true
    showCalendarDateFilter : boolean = false
    showInitialSyncOverlay : boolean = false
    initialSyncError : boolean = false
    syncMessage : string = null

    private systemMessageSubscription : Subscription
    private accountSubscription : Subscription
    private editTaskSubscription : Subscription
    private syncMessageSubscription : Subscription
    private calendarStatusSubscription : Subscription
    private syncLoadStatusSubscription : Subscription
    private syncCompletedSubscription : Subscription
    private syncErrorSubscription : Subscription

    @ViewChild('mainContainer') viewMainContainer

    constructor(
        private router: Router,
        private accountService: TCAccountService,
        private authService: TCAuthenticationService,
        private errService: TCErrorService,
        private listService : TCListService,
        private readonly syncService : TCSyncService,
        private readonly listMembershipService : TCListMembershipService,
        private readonly alertService : AlertService,
        private readonly systemMessageService : SystemMessageService,
        private readonly taskEditService : TaskEditService,
        // private toastr : ToastsManager,
        private vcr : ViewContainerRef,
        private appSettingsService: TCAppSettingsService,
        
        private calendarService : CalendarService,
        calendarConfig : NgbDatepickerConfig
    ) {
        // this.toastr.setRootViewContainerRef(vcr)

        // this.errService.errors.subscribe((errorMessage) => {
        //     this.showError(errorMessage)
        // })

        calendarConfig.firstDayOfWeek = parseInt(this.appSettingsService.calendarFirstDayDP)
        calendarConfig.navigation = 'arrows'
    }

    ngOnInit() {
        this.accountSubscription = this.accountService.account.subscribe((account : TCAccount) => {
            this.userID = account.userID
            this.userName = account.userName
            this.firstName = account.firstName
            this.lastName = account.lastName
            this.displayName = account.displayName()
        })

        this.systemMessageSubscription = this.systemMessageService.systemMessage.subscribe(message => {
            // Continue to dismiss the message if it's already dismissed and it's the same message
            this.dismissSystemMessage = this.dismissSystemMessage && message.identifier == this.systemMessage.identifier
            this.systemMessage = message
        })

        this.editTaskSubscription = this.taskEditService.editedTask
            .map(info => info.state)
            .filter(state => state != TaskEditState.AfterSync)
            .subscribe(state => {
                this.showTaskEdit = state == TaskEditState.Beginning
            })

        this.showInitialSyncOverlay = !this.syncService.initialSyncComplete
        this.syncCompletedSubscription = this.syncService.syncCompleted.subscribe(() => {
            this.showInitialSyncOverlay = false
        })

        this.syncErrorSubscription = this.syncService.syncErrorReceived.subscribe((err) => {
            this.initialSyncError = true
            this.syncMessage = "There has been an error syncing your data."
        })

        this.syncLoadStatusSubscription = this.syncService.syncLoadStatusReceived.subscribe((loadStatus) => {
            const totalTasks = loadStatus.taskCounts.activeTasks + loadStatus.taskCounts.completedTasks
            const syncedTasks = loadStatus.taskCounts.processedTasks
            let percentComplete = totalTasks > 0 ? (syncedTasks / totalTasks) * 100 : 0
            // In the off chance that our task counts were off by just a little bit,
            // don't show a percentage that is over 100%.
            if (percentComplete > 100) { percentComplete = 100 }

            this.syncMessage = `Synchronizing tasks: ${Math.round(percentComplete)}% complete`
        })

        this.syncMessageSubscription = this.syncService.syncMessageReceived.subscribe((message) => {
            this.syncMessage = message
        })

        this.calendarStatusSubscription = this.calendarService.calendarStatus.subscribe((calendarStatus) => {
            this.showMainCalendar = calendarStatus
        })

        this.listMembershipService.getAllSharedListMembers()

        this.alertService.startAlerts()
        this.updateContainerHeight()
    }

    ngOnDestroy() {
        this.systemMessageSubscription.unsubscribe()
        this.accountSubscription.unsubscribe()
        this.editTaskSubscription.unsubscribe()
        this.calendarStatusSubscription.unsubscribe()
        this.syncMessageSubscription.unsubscribe()
        this.syncLoadStatusSubscription.unsubscribe()
        this.syncErrorSubscription.unsubscribe()
        this.syncCompletedSubscription.unsubscribe()
    }

    ngAfterContentChecked() {
        this.updateContainerHeight()
    }

    showError(error : TCError) {
        // let toastrOptions = {
        //     dismiss: 'controlled',
        //     showCloseButton: true,
        //     newestOnTop: true
        // }
        // this.toastr.clearAllToasts() // Clear out any errors that are showing
        // this.toastr.error(error.message, error.title, toastrOptions)
    }

    continuePastInitialSyncError() {
        this.showInitialSyncOverlay = false
    }

    updateContainerHeight() {
        if (this.viewMainContainer) {
            this.viewMainContainer.nativeElement.style.height = window.innerHeight - 52 + 'px'
        }
    }
    onToggleSidebar() {
        this.openSidebar = !this.openSidebar
    }

    changeStateListsMenu(state: boolean) {
        this.openSidebar = state
    }

    toggleCalendar() {
        this.showMainCalendar = !this.showMainCalendar
        this.calendarService.setCalendarStatus(this.showMainCalendar)
        if(this.showMainCalendar) {
            this.calendarService.loadSelectedDates()
        } else {
            this.calendarService.storeSelectedDates()
            this.calendarService.clearSelectedDates()
        }
    }
}
