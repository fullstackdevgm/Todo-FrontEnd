import {NgModule}       from '@angular/core'
import {BrowserModule}  from '@angular/platform-browser'
import {FormsModule}    from '@angular/forms'
import {DragulaModule}    from 'ng2-dragula'
import {HttpModule, Http, RequestOptions} from '@angular/http'
import { AgmCoreModule } from '@agm/core'
import { HotkeyModule }  from 'angular2-hotkeys'
import { environment } from '../environments/environment'

import { PerfectScrollbarModule, PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap'

import {AppRoutingModule} from './app-routing.module'

import { AuthGuard }         from './guards/auth.guard'
import { provideAuth, AuthHttp, AuthConfig } from 'angular2-jwt'
import { TCHttp } from './tc-http'

// UI Components (keep these alphabetized)
import {AcceptInvitationComponent} from './components/accept-invitation/accept-invitation.component'
import {AdvancedRecurrenceDayOfTheWeekComponent} from './components/task-edit/task-edit-advanced-recurrence/advanced-recurrence-day-of-the-week.component'
import {AdvancedRecurrenceEachMonth} from './components/task-edit/task-edit-advanced-recurrence/advanced-recurrence-each-month.component'
import {AdvancedRecurrenceEveryXPeriodComponent} from './components/task-edit/task-edit-advanced-recurrence/advanced-recurrence-every-x-period.component'
import {AppComponent}           from './app.component'
import {EditNotificationsComponent} from './components/list-property-editors/notifications/edit-notifications.component'
import {HomeComponent}          from './components/home/home.component'
import {LandingComponent}       from './components/landing/landing.component'
import {ListsComponent}         from './components/lists/lists.component'
import {ListDeleteConfirmationComponent} from './components/list-property-editors/list-delete-confirmation/list-delete-confirmation.component'
import {ListEditAddPersonComponent}      from './components/list-property-editors/add-person-list/add-person-list.component'
import {ListEditComponent}      from './components/list-edit/list-edit.component'
import {ListEditColorComponent} from './components/list-property-editors/colors/list-change-color.component'
import {ListEditDefaultDueDateComponent}from './components/list-property-editors/default-due-date/list-edit-default-due-date.component'
import {ListEditIconComponent}          from './components/list-property-editors/icons/list-change-icons.component'
import {ListEditNotificationsComponent} from './components/list-property-editors/notifications/list-edit-notifications.component'
import {ListEditSortTypeComponent}      from './components/list-property-editors/sort-type/list-edit-sort-type.component'
import {ListShareComponent}     from './components/list-property-editors/share-list/share-list.component'
import {LoginComponent}         from './components/login/login.component'
import {MainCalendarComponent}  from './components/main-calendar/main-calendar.component'
import {NavigationBarComponent} from './components/navigation-bar/navigation-bar.component'
import {NotImplementedComponent}from './components/not-implemented/not-implemented.component'
import {RedirectComponent}      from './components/static-page/redirect.component'
import {RegisterComponent}      from './components/register/register.component'
import {ResetPasswordComponent} from './components/reset-password/reset-password.component'
import {SectionHeaderComponent} from './components/section-header/section-header.component'
import {SettingsComponent}      from './components/settings/settings.component'
import {SettingsAboutComponent}      from './components/settings/section-about/section-about.component'
import {SettingsTeamingComponent}      from './components/settings/section-teaming/section-teaming.component'
import {SettingsAccountComponent}      from './components/settings/section-account/section-account.component'
import {SettingsGeneralComponent}      from './components/settings/section-general/section-general.component'
import {SettingsNotificationComponent}      from './components/settings/section-notification/section-notification.component'
import {SettingsPremiumComponent}       from './components/settings/section-premium/section-premium.component'
import {SettingsTaskCreationComponent}      from './components/settings/section-task-creation/section-task-creation.component'
import {SignOutConfirmationComponent} from './components/navigation-bar/sign-out-confirmation.component'
import {SmartListCompletedTasksComponent} from './components/list-property-editors/smart-list-completed-tasks/smart-list-completed-tasks.component'
import {SmartListCreateComponent} from './components/smart-list-create/smart-list-create.component'
import {SmartListDateFilterComponent} from './components/list-property-editors/smart-list-filters/smart-list-date-filter.component'
import {SmartListDefaultListComponent} from './components/list-property-editors/smart-list-default-list/smart-list-default-list.component'
import {SmartListDeleteConfirmationComponent} from './components/list-property-editors/smart-list-delete-confirmation/smart-list-delete-confirmation.component'
import {SmartListEditComponent}        from './components/smart-list-edit/smart-list-edit.component'
import {SmartListEditFilterRow}        from './components/smart-list-edit/smart-list-edit-filter-row.component'
import {SmartListFiltersComponent}     from './components/list-property-editors/smart-list-filters/smart-list-filters.component'
import {SmartListPropertyTypeFilterComponent} from './components/list-property-editors/smart-list-filters/smart-list-property-type-filter.component'
import {SmartListRestoreEverythingConfirmationComponent} from './components/list-property-editors/smart-list-restore-everything-confirmation/smart-list-restore-everything-confirmation.component'
import {SmartListSearchTermFilterComponent} from './components/list-property-editors/smart-list-filters/smart-list-search-term-filter.component'
import {SmartListTagsFilterComponent}  from './components/list-property-editors/smart-list-filters/smart-list-tags-filter.component'
import {SmartListTaskSourcesComponent} from './components/list-property-editors/smart-list-task-sources/smart-list-task-sources.component'
import {SmartListUserAssignmentFilterComponent} from './components/list-property-editors/smart-list-filters/smart-list-assignment-filter.component'
import {StaticPageComponent}    from './components/static-page/static-page.component'
import {PagePrivacyComponent}   from './components/static-page/privacy/privacy.component'
import {PageTermsComponent}     from './components/static-page/terms/terms.component'
import {TagDeleteConfirmationComponent} from './components/tags/tag-delete-confirmation.component'
import {TagEditorComponent}     from './components/tags/tag-editor.component'
import {TaskComponent}          from './components/task/task.component'
import {TaskCreateComponent}    from './components/tasks/task-create.component'
import {TaskDeleteConfirmationComponent}    from './components/task/task-delete-confirmation/task-delete-confirmation.component'
import {TaskNoteEditPopupComponent}    from './components/task-edit/task-note-edit-popup/task-note-edit-popup.component'
import {TaskEditComponent}      from './components/task-edit/task-edit.component'
import {TaskEditAssign}         from './components/task-edit/task-edit-assign.component'
import {TaskEditListSelectComponent} from './components/task-edit/task-edit-list-select.component'
import {TaskEditLocationAlertComponent} from './components/task-edit/task-edit-location-alert.component'
import {TaskEditNotificationOffsetPicker} from './components/task-edit/task-edit-notification-offset-picker.component'
import {TaskitoComponent}       from './components/task/taskito/taskito.component'
import {TasksComponent}         from './components/tasks/tasks.component'
import {VerifyEmailComponent}   from './components/verify-email/verify-email.component'

// Services
import { AppMenuService }          from './services/app-menu.service'
import { TCAccountService }        from './services/tc-account.service'
import { TCErrorService }          from './services/tc-error.service'
import { TCUserSettingsService }   from './services/tc-user-settings.service'
import { TCSubscriptionService }   from './services/tc-subscription.service'
import { TCAppSettingsService }    from './services/tc-app-settings.service'
import { TCAuthenticationService } from './services/tc-authentication.service'
import { TCTaskitoService }        from './services/tc-taskito.service'
import { TCTaskService }           from './services/tc-task.service'
import { TCListService }           from './services/tc-list.service'
import { TCSmartListService }      from './services/tc-smart-list.service'
import { TCTaskNotificationService } from './services/tc-task-notification.service'
import { TCCommentService }        from './services/tc-comment.service'
import { TCLocationService }       from './services/tc-location.service'
import { TCTagService }            from './services/tc-tag.service'
import { TaskCompletionService }   from './services/task-completion.service'
import { TaskitoCompletionService }from './services/taskito-completion.service'
import { AlertService }            from './services/alert.service'
import { SystemMessageService }    from './services/system-message.service'
import { TaskEditService }         from './services/task-edit.service'
import { PaywallService }          from './services/paywall.service'
import { TCListMembershipService } from './services/tc-list-membership.service'
import { TCInvitationService }     from './services/tc-invitation.service'
import { CalendarService }         from './services/calendar.service'
import { SearchService }           from './services/search.service'
import { TCSyncService }           from './services/tc-sync.service'
import { TCHotkeyService }         from './services/tc-hotkey.service'

import './rxjs-extensions'

//Custom Pipes
import { DatexPipe, MapToIterable, DateToTimePickerModel, TimeAgoPipe, FixUnderscoresPipe, LightenDarkenColorPipe } from './classes/tc-pipes'

//Libs
import {DndModule} from 'ng2-dnd';
import {ContextMenuModule} from 'ngx-contextmenu'
import {ToastModule} from 'ng2-toastr/ng2-toastr';
import {LinkyModule} from 'angular-linky'

export function authTCHttpServiceFactory(http: Http, options: RequestOptions, authService: TCAuthenticationService) {
    return new TCHttp(authService, new AuthConfig({}), http, options)
}

export function authHttpServiceFactory(http: Http, options: RequestOptions) {
    return new AuthHttp( new AuthConfig({}), http, options)
}


@NgModule({
    imports: [
        BrowserModule,
        DragulaModule,
        FormsModule,
        HotkeyModule.forRoot(),
        HttpModule,
        NgbModule.forRoot(),
        AppRoutingModule,
        DndModule.forRoot(),
        ContextMenuModule.forRoot({
            useBootstrap4: true,
        }),
        ToastModule.forRoot(),
        PerfectScrollbarModule.forRoot({
            suppressScrollX: true
        }),
        AgmCoreModule.forRoot({
            apiKey: environment.googleMapsAPIKey,
            libraries: ['places']
        }),
        LinkyModule
    ],
    declarations: [
        AcceptInvitationComponent,
        AdvancedRecurrenceDayOfTheWeekComponent,
        AdvancedRecurrenceEachMonth,
        AdvancedRecurrenceEveryXPeriodComponent,
        AppComponent,
        DateToTimePickerModel,
        EditNotificationsComponent,
        FixUnderscoresPipe,
        HomeComponent,
        LandingComponent,
        LightenDarkenColorPipe,
        ListsComponent,
        ListDeleteConfirmationComponent,
        ListEditComponent,
        ListEditAddPersonComponent,
        ListEditColorComponent,
        ListEditDefaultDueDateComponent,
        ListEditIconComponent,
        ListEditNotificationsComponent,
        ListEditSortTypeComponent,
        ListShareComponent,
        LoginComponent,
        MainCalendarComponent,
        MapToIterable,
        NavigationBarComponent,
        NotImplementedComponent,
        RedirectComponent,
        RegisterComponent,
        ResetPasswordComponent,
        SectionHeaderComponent,
        SettingsComponent,
        SettingsAboutComponent,
        SettingsTeamingComponent,
        SettingsAccountComponent,
        SettingsGeneralComponent,
        SettingsNotificationComponent,
        SettingsPremiumComponent,
        SettingsTaskCreationComponent,
        SignOutConfirmationComponent,
        SmartListCompletedTasksComponent,
        SmartListCreateComponent,
        SmartListDateFilterComponent,
        SmartListDefaultListComponent,
        SmartListDeleteConfirmationComponent,
        SmartListEditComponent,
        SmartListEditFilterRow,
        SmartListFiltersComponent,
        SmartListPropertyTypeFilterComponent,
        SmartListRestoreEverythingConfirmationComponent,
        SmartListSearchTermFilterComponent,
        SmartListTagsFilterComponent,
        SmartListTaskSourcesComponent,
        SmartListUserAssignmentFilterComponent,
        StaticPageComponent,
        PagePrivacyComponent,
        PageTermsComponent,
        TagDeleteConfirmationComponent,
        TagEditorComponent,
        TaskComponent,
        TaskCreateComponent,
        TaskDeleteConfirmationComponent,
        TaskNoteEditPopupComponent,
        TaskEditComponent,
        TaskEditAssign,
        TaskEditListSelectComponent,
        TaskEditLocationAlertComponent,
        TaskEditNotificationOffsetPicker,
        TaskitoComponent,
        TasksComponent,
        TimeAgoPipe,
        VerifyEmailComponent,
        DatexPipe
    ],
    entryComponents: [
        SignOutConfirmationComponent,
        SmartListDeleteConfirmationComponent,
        ListDeleteConfirmationComponent,
        ListEditComponent,
        SettingsComponent,
        SmartListEditComponent,
        TaskDeleteConfirmationComponent,
        TaskNoteEditPopupComponent,
        TagDeleteConfirmationComponent
    ],
    providers: [
        AuthGuard,
        AppMenuService,
        TCErrorService,
        TCTaskitoService,
        TCTaskService,
        TCListService,
        TCSmartListService,
        TCAccountService,
        TCUserSettingsService,
        TCSubscriptionService,
        TCAppSettingsService,
        TCAuthenticationService,
        TCTaskNotificationService,
        TCCommentService,
        TCLocationService,
        TCTagService,
        TCListMembershipService,
        TCInvitationService,
        TaskCompletionService,
        TaskitoCompletionService,
        AlertService,
        SystemMessageService,
        TaskEditService,
        PaywallService,
        CalendarService,
        SearchService,
        TCSyncService,
        TCHotkeyService,
        {
            provide: TCHttp,
            useFactory: authTCHttpServiceFactory,
            deps: [ Http, RequestOptions, TCAuthenticationService ]
        },
        {
            provide: AuthHttp,
            useFactory: authHttpServiceFactory,
            deps: [ Http, RequestOptions ]
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {

}
