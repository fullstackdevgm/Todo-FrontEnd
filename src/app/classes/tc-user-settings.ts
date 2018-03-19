import { TCObject } from './tc-object'
import { DefaultDueDate } from '../tc-utils'
import { ListEmailNotificationModel } from '../tc-types'
import { environment } from '../../environments/environment'

const TASK_NOTIFICATIONS_MASK = 1
const USER_NOTIFICATIONS_MASK = 2
const COMMENT_NOTIFICATIONS_MASK = 4
const ASSIGNED_ONLY_MASK = 8

export class TCUserSettings extends TCObject {
   
    // Fields are in alphabetical order, first by type, then by name
    // readonly fields are promoted to being first in name sorting
    public enableGoogleAnalyticsTracking : boolean
    public focusIgnoreStartDates    : boolean
    public focusShowStarredTasks    : boolean
    public focusShowSubtasks        : boolean
    public focusShowUndueTasks      : boolean
    public showOverdueSection       : boolean
    public skipTaskChecklistParsing : boolean
    public skipTaskContextParsing   : boolean
    public skipTaskDateParsing      : boolean
    public skipTaskListParsing      : boolean
    public skipTaskPriorityParsing  : boolean
    public skipTaskProjectParsing   : boolean
    public skipTaskStartDateParsing : boolean
    public skipTaskTagParsing       : boolean
    public tagFilterWithAnd         : boolean
    
    public allListHideDashboard     : number
    public defaultDueDate           : DefaultDueDate = DefaultDueDate.Today
    public emailNotificationDefaults: ListEmailNotificationModel
    public focusHideTaskDate        : number
    public focusHideTaskPriority    : number
    public focusShowCompletedDate   : number
    public newFeatureFlags          : number
    public starredListHideDashboard : number
    public startDateFilter          : number
    public taskSortOrder            : number = 0

    public readonly userId          : string
    public allListFilter            : Set<string> = new Set<string>()
    public focusListFilterString    : string
    public referralCode             : string
    public taskCreationEmail        : string
    public timezone                 : string
    private readonly _userInbox     : string
    get userInbox() : string {
        return environment.isElectron ? "INBOX" : this._userInbox
    }

    constructor(json? : any) {
        super()
        if (!json) return

        // Fields are assigned in the same order they were declared
        this.assignIfExists(json.enable_google_analytics_tracking, 'enableGoogleAnalyticsTracking', (val)=> Boolean(val))
        this.assignIfExists(json.focus_ignores_start_dates, 'focusIgnoreStartDates', (val)=> Boolean(val))
        this.assignIfExists(json.focus_show_starred_tasks, 'focusShowStarredTasks', (val)=> Boolean(val))
        this.assignIfExists(json.focus_show_subtasks, 'focusShowSubtasks', (val)=> Boolean(val))
        this.assignIfExists(json.focus_show_undue_tasks, 'focusShowUndueTasks', (val)=> Boolean(val))
        this.assignIfExists(json.show_overdue_section, 'showOverdueSection', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_checklist_parsing, 'skipTaskChecklistParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_context_parsing, 'skipTaskContextParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_date_parsing, 'skipTaskDateParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_list_parsing, 'skipTaskListParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_priority_parsing, 'skipTaskPriorityParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_project_parsing, 'skipTaskProjectParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_startdate_parsing, 'skipTaskStartDateParsing', (val)=> Boolean(val))
        this.assignIfExists(json.skip_task_tag_parsing, 'skipTaskTagParsing', (val)=> Boolean(val))
        this.assignIfExists(json.tag_filter_with_and, 'tagFilterWithAnd', (val)=> Boolean(val))
        
        this.assignIfExists(json.all_list_hide_dashboard, 'allListHideDashboard')
        this.assignIfExists(json.default_duedate, 'defaultDueDate')
        this.parseEmailNotifications(this.cleanValue(json.email_notification_defaults))
        this.assignIfExists(json.focus_hide_task_date, 'focusHideTaskDate')
        this.assignIfExists(json.focus_hide_task_priority, 'focusHideTaskPriority')
        this.assignIfExists(json.focus_show_completed_date, 'focusShowCompletedDate')
        this.assignIfExists(json.new_feature_flags, 'newFeatureFlags')
        this.assignIfExists(json.starred_list_hide_dashboard, 'starredListHideDashboard')
        this.assignIfExists(json.start_date_filter, 'startDateFilter')
        this.assignIfExists(json.task_sort_order, 'taskSortOrder')

        this.assignIfExists(json.userid, 'userId')
        this.allListFilter = json.all_list_filter_string ? 
            new Set<string>((json.all_list_filter_string.split(',')).map((e: string) =>  e.trim() ).filter((e: string ) => e.length > 0)) :
            new Set<string>()
        
        this.assignIfExists(json.focus_list_filter_string, 'focusListFilterString')
        this.assignIfExists(json.referral_code, 'referralCode')
        this.assignIfExists(json.task_creation_email, 'taskCreationEmail')
        this.assignIfExists(json.timezone, 'timezone')
        this.assignIfExists(json.user_inbox, '_userInbox')
    }

    protected parseEmailNotifications(value : number) : ListEmailNotificationModel {
        const result = {
            taskNotifications : false,
            userNotifications : false,
            commentNotifications : false,
            notifyAssignedOnly : false
        }
        if (!value) return result

        result.taskNotifications    = (value & TASK_NOTIFICATIONS_MASK) == 0
        result.userNotifications    = (value & USER_NOTIFICATIONS_MASK) == 0
        result.commentNotifications = (value & COMMENT_NOTIFICATIONS_MASK) == 0
        result.notifyAssignedOnly   = (value & ASSIGNED_ONLY_MASK) > 0

        return result
    }

    protected emailNotificationsToNumber() : number {
        let result = 0

        if (!this.emailNotificationDefaults.taskNotifications) result = result | TASK_NOTIFICATIONS_MASK
        if (!this.emailNotificationDefaults.userNotifications) result = result | USER_NOTIFICATIONS_MASK
        if (!this.emailNotificationDefaults.commentNotifications) result = result | COMMENT_NOTIFICATIONS_MASK
        if (this.emailNotificationDefaults.notifyAssignedOnly) result = result | ASSIGNED_ONLY_MASK

        return result
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            enable_google_analytics_tracking : this.enableGoogleAnalyticsTracking,
            focus_ignores_start_dates : this.focusIgnoreStartDates,
            focus_show_starred_tasks : this.focusShowStarredTasks,
            focus_show_subtasks : this.focusShowSubtasks,
            focus_show_undue_tasks : this.focusShowUndueTasks,
            show_overdue_section : this.showOverdueSection,
            skip_task_checklist_parsing : this.skipTaskChecklistParsing,
            skip_task_context_parsing : this.skipTaskContextParsing,
            skip_task_date_parsing : this.skipTaskDateParsing,
            skip_task_list_parsing : this.skipTaskListParsing,
            skip_task_priority_parsing : this.skipTaskPriorityParsing,
            skip_task_project_parsing : this.skipTaskProjectParsing,
            skip_task_startdate_parsing : this.skipTaskStartDateParsing,
            skip_task_tag_parsing : this.skipTaskTagParsing,
            tag_filter_with_and : this.tagFilterWithAnd,

            all_list_hide_dashboard : this.allListHideDashboard,
            default_duedate : this.defaultDueDate,
            email_notification_defaults : this.emailNotificationDefaults ? this.emailNotificationsToNumber() : undefined,
            focus_hide_task_date : this.focusHideTaskDate,
            focus_hide_task_priority : this.focusHideTaskPriority,
            focus_show_completed_date: this.focusShowCompletedDate,
            new_feature_flags : this.newFeatureFlags,
            starred_list_hide_dashboard : this.starredListHideDashboard,
            start_date_filter : this.startDateFilter,
            task_sort_order : this.taskSortOrder,

            userid : this.userId,
            all_list_filter_string : this.allListFilter ? 
                Array.from(this.allListFilter).reduce((accum, curr, index) => index == 0 ? curr : accum + `,${curr}`, '') :
                '',

            focus_list_filter_string : this.focusListFilterString,
            referral_code : this.referralCode,
            task_creation_email : this.taskCreationEmail,
            timezone : this.timezone,
            user_inbox : this._userInbox
        }
    }
}


export class TCUserSettingsUpdate extends TCUserSettings {

    constructor(json? : any) {
        super(json)

        // Gotta clear out assumptions made by the super class
        delete this.taskSortOrder
        delete this.defaultDueDate
        delete this.emailNotificationDefaults

        if (!json) return
        this.assignIfExists(json.default_duedate, 'defaultDueDate')
        this.assignIfExists(json.task_sort_order, 'taskSortOrder')

        if (json.email_notification_defaults) {
            this.emailNotificationDefaults = this.parseEmailNotifications(this.cleanValue(json.email_notification_defaults))
        }
    }

    requestBody() {
        let body = super.requestBody()

        if (this.taskSortOrder  === null || this.taskSortOrder  === undefined) delete body.task_sort_order
        if (this.defaultDueDate === null || this.defaultDueDate === undefined) delete body.default_duedate

        return body
    }
}