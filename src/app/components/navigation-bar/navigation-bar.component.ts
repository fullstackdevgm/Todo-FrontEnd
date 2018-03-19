import {Component, ElementRef, OnInit, HostListener, TemplateRef, ViewChild, Output, EventEmitter}  from '@angular/core'
import {Router} from '@angular/router'
import {NgbDropdownConfig, NgbModal} from '@ng-bootstrap/ng-bootstrap';

import { TCAccount }                from '../../classes/tc-account'
import { TCAccountService }         from '../../services/tc-account.service'
import { TCAuthenticationService }  from '../../services/tc-authentication.service'
import { TCAppSettingsService }     from '../../services/tc-app-settings.service'
import { TCSyncService }            from '../../services/tc-sync.service'
import { TCInvitationService }      from '../../services/tc-invitation.service'
import { TCListService }            from '../../services/tc-list.service'
import { SearchService }            from '../../services/search.service'
import { AppMenuIdentifier, AppMenuService} from '../../services/app-menu.service'

import { SettingsComponent }        from '../settings/settings.component'
import { SignOutConfirmationComponent } from './sign-out-confirmation.component'
import { environment }              from '../../../environments/environment'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'
import { TaskEditService, TaskEditEvent } from '../../services/task-edit.service'
import { TCTask }                   from '../../classes/tc-task'
import { InvitationInfo }           from '../../tc-types'
import { Utils, TaskEditState }     from '../../tc-utils'

const {version:appVersion} = require('../../../../package.json')

@Component({
    selector: 'navigation-bar',
    templateUrl: 'navigation-bar.component.html',
    styleUrls: ['navigation-bar.component.css'],
    providers: [NgbDropdownConfig]
})

export class NavigationBarComponent {
    @ViewChild("confirmationResultModalContent") confirmationResultModalTemplate: TemplateRef <Object>
    @ViewChild("search") searchElement : ElementRef

    displayName : string = 'Welcome'
    confirmationEmail : string = null
    confirmationEmailResultTitle : string = null
    confirmationEmailResultMessage : string = null
    invitedMessages : InvitationInfo[] = []
    account : TCAccount = null
    isElectron : boolean = true
    legacyUrl : string = Utils.LEGACY_WEB_URL
    showSyncMessage : boolean = false
    syncMessage : string = null

    appVersion : string = ''

    private hotkeySubscription: Subscription
    private taskEditSubscription : Subscription
    private invitationSubscription : Subscription
    private syncMessageSubscription : Subscription
    private syncLoadStatusSubscription : Subscription
    private syncStartSubscription : Subscription
    private syncCompletedSubscription : Subscription
    private syncErrorSubscription : Subscription
    private currentEditedTask : TCTask = null

    @Output() toggleSidebar: EventEmitter<boolean> = new EventEmitter<boolean>()

    constructor(
        private readonly router: Router,
        private readonly modalService: NgbModal,
        private readonly accountService: TCAccountService,
        private readonly authService: TCAuthenticationService,
        private readonly settingsService : TCAppSettingsService,
        private readonly syncService : TCSyncService,
        private readonly hotkeyService: TCHotkeyService,
        private readonly searchService : SearchService,
        private readonly taskEditService : TaskEditService,
        private readonly invitationService : TCInvitationService,
        private readonly appMenuService : AppMenuService,
        private readonly listService : TCListService
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnInit() {
        this.isElectron = environment.isElectron
        this.appVersion = appVersion

        this.syncStartSubscription = this.syncService.syncStarted.subscribe(() => {
            this.showSyncMessage = true
        })

        this.syncCompletedSubscription = this.syncService.syncCompleted.subscribe(() => {
            this.showSyncMessage = false
        })

        this.syncErrorSubscription = this.syncService.syncErrorReceived.subscribe((err) => {
            this.showSyncMessage = false
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

        this.accountService.account.subscribe((account : TCAccount) => {
            this.account = account
            this.displayName = account.displayName()
            if (!account.emailVerified) {
                this.confirmationEmail = account.userName
            } else {
                this.confirmationEmail = null
            }
        })

        this.appMenuService.enableMenuItems([
            AppMenuIdentifier.Preferences,
            AppMenuIdentifier.TaskSync,
            AppMenuIdentifier.Find
        ])
        this.appMenuService.actions.subscribe(action => {
            if (action.menuItemID == AppMenuIdentifier.Preferences) {
                this.showSettings()
            } else if (action.menuItemID == AppMenuIdentifier.TaskSync) {
                this.syncNow()
            } else if (action.menuItemID == AppMenuIdentifier.Find) {
                this.searchElement.nativeElement.select()
            }
        })
        this.taskEditSubscription = this.taskEditService.editedTask.subscribe((event : TaskEditEvent) => {
            if (event.state == TaskEditState.Beginning) {
                this.currentEditedTask = event.task
            }
            else if (event.state == TaskEditState.Finished) {
                this.currentEditedTask = null
            }
        })
        this.loadInvitations()
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
        this.taskEditSubscription.unsubscribe()
        this.invitationSubscription.unsubscribe()
        this.syncStartSubscription.unsubscribe()
        this.syncCompletedSubscription.unsubscribe()
        this.syncErrorSubscription.unsubscribe()
        this.syncMessageSubscription.unsubscribe()
        this.syncLoadStatusSubscription.unsubscribe()
    }

    resendEmailConfirmation(alertNotificationPopup) {
        alertNotificationPopup.close()

        this.accountService.resendVerificationEmail(this.account.userID).subscribe((result : boolean) => {
            if (result == true) {
                this.confirmationEmailResultTitle = "Check your email"
                this.confirmationEmailResultMessage = `We've sent you a new email (${this.confirmationEmail}). Follow the link in the email to confirm your email address.`
            } else {
                this.confirmationEmailResultTitle = "Please try again"
                this.confirmationEmailResultMessage = "There was a problem sending you a confirmation email. Please try again later."
            }
            this.modalService.open(this.confirmationResultModalTemplate)
        })
    }

    notImplemented() {
        this.modalService.open(`This is not yet implemented.`)
    }

    syncNow(){
        this.syncService.performSync().subscribe(response => {})
        return false
    }
    openSettingsModal() : SettingsComponent{
        const modalRef = this.modalService.open(SettingsComponent)
        const settingsComponent : SettingsComponent = modalRef.componentInstance as SettingsComponent

        return settingsComponent
    }
    showSettings(){
        const settingsComponent = this.openSettingsModal()
        settingsComponent.saveButtonActive = true
        if (this.currentEditedTask)
            this.taskEditService.finishEditTask(this.currentEditedTask)
    }

    logout() {
        const logoutFunc = () => {
            this.authService.logout(true)
            this.router.navigate(['/welcome/signin'])
        }

        if (environment.isElectron) {
            const modalRef = this.modalService.open(SignOutConfirmationComponent)
            const signOutConfirmation : SignOutConfirmationComponent = modalRef.componentInstance as SignOutConfirmationComponent

            signOutConfirmation.signOutPressed.subscribe(() => {
                modalRef.close()
                this.accountService.removeLocalAccount()
                logoutFunc()
            })
            return
        }

        logoutFunc()
    }

    clickToggleSidebar() {
        this.toggleSidebar.emit(true)
    }

    searchTask(searchTerm : string) {
        const trimmedSearchTerm = searchTerm.trim()
        if (!trimmedSearchTerm) return
        this.searchService.search(trimmedSearchTerm)
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        switch (hotkeyEvent.name) {
            case 'MacOS.NavBar.focusOnSearch':
                if (Utils.isMacOS) {
                    this.searchElement.nativeElement.select()
                }
                break
            case 'Other.NavBar.focusOnSearch':
                if (!Utils.isMacOS) {
                    this.searchElement.nativeElement.select()
                }
                break
            case 'NavBar.openSettings':
                this.showSettings()
                break
        }
    }

    acceptInvitation(info : InvitationInfo) {
        this.invitationService.acceptInvitation(info.invitation).subscribe(() => {
            this.loadInvitations()
            this.listService.getLists(false, false).first().subscribe(() => {})
        })
    }

    declineInvitation(info : InvitationInfo) {
        this.invitationService.deleteInvitation(info.invitation).subscribe(() => {
            this.loadInvitations()
            this.listService.getLists(false, false).first().subscribe(() => {})
        })
    }

    loadInvitations() {
        this.invitationSubscription = this.invitationService.getInvitations().first().subscribe(result => {
            this.invitedMessages = result.reduce((accum, current) => {
                const alreadyHaveInvitation = accum.find(info => info.invitation.listId == current.invitation.listId) != null
                if (!alreadyHaveInvitation) accum.push(current)
                return accum
            }, [])
        })
    }

    downloadApps(event, url) {
        event.preventDefault()
        if (environment.isElectron) {
            Utils.openUrlInDefaultBrowser(url)
        } else {
            window.open(url, '_blank')
        }
    }
}
