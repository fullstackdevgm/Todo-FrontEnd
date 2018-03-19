import * as moment from 'moment'
import 'moment-timezone'
import {environment} from '../environments/environment'


declare var electron : any

export enum TaskPriority {
    High = 1,
	Medium = 5,
	Low = 9,
	None = 0
}

// Several of these task types are no longer used, but are
// still in the enum to make sure everything receives the proper
// value
export enum TaskType
{
    Normal = 0,
    Project,		// new task type that has subtasks
    CallContact,
    SMSContact,
    EmailContact,
    VisitLocation,
    URL,
    Checklist,		// new task type that has simple subtasks
    Custom,			// imported via third party app (AppigoPasteboard)
    Internal
}

export enum TaskRecurrenceType {
    None = 0,
	Weekly,
	Monthly,
	Yearly,
	Daily,
	Biweekly,
	Bimonthly,
	Semiannually,
	Quarterly,
	WithParent,
	Advanced = 50
}

export enum RepeatFromType {
    DueDate = 0,
    CompletionDate = 1,
}

export enum AdvancedRecurrenceType {
    EveryXDaysWeeksMonths = 0,
	TheXOfEachMonth,
	EveryMonTueEtc,
	Unknown
}

export enum TaskLocationAlertType
{
	None = 0,
	Arriving,
	Leaving
}

export enum DefaultDueDate {
    None = 0,
	Today,
	Tomorrow,
	InTwoDays,
	InThreeDays,
	InFourDays,
	InFiveDays,
	InSixDays,
	InOneWeek
}

export enum TaskEditState {
    Beginning,
    Finished,
    AfterSync
}

export enum Platform {
    Web,
    Windows,
    Apple,
    // Just throwing these in here because I can
    Android,
    Linux,
    Other
}

export enum ListMembershipType {
    Viewer = 0,
    Member = 1,
    Owner  = 2
}

// Information codes that can be provided to explain why a 
// the lists are being published. This allows subscribers
// to decide whether or not they should act on the published
// lists. (Implemented to resolve a bug that happened when
// reordering lists).
export enum ListPublishInformation {
    None, 
    Reordered,
    HasExcluded,
    HasDeleted,
    ListDeleted,
    AfterSync
}

export const kUnfiledTaskListID = "9F6338F5-94C7-4B04-8E24-8F829UNFILED"

export const MaxNoteSearchTermLength = 128

export class Utils {
    static readonly ALL_USERS_ID = "4BD35E04-8885-4546-8AC3-A42CCDCCEALL"
    static readonly UNASSIGNED_ID = "142F63FA-F450-4F0E-A5E4-E0UNASSIGNED"
    static readonly ME_USER_ID = "ME"
    static readonly LEGACY_WEB_URL = "https://legacy.todo-cloud.com/"
    
    static readonly BaseListIconNames : string[] = [
        "0733-video-camera",
        "0734-chat",
        "0735-phone",
        "0742-wrench",
        "0743-printer",
        "0744-locked",
        "0745-unlocked",
        "0748-heart",
        "0750-home",
        "0751-eye",
        "0752-credit-card",
        "0753-signpost",
        "0754-scale",
        "0755-filing-cabinet",
        "0756-bell",
        "0757-paper-airplane",
        "0758-megaphone",
        "0761-gift",
        "0762-shopping-bag",
        "0767-photo-1",
        "0768-female",
        "0769-male",
        "0770-paper-clip",
        "0776-recycle",
        "0777-thumbs-up",
        "0778-thumbs-down",
        "0780-building",
        "0781-ships-wheel",
        "0782-compass",
        "0783-combination-lock",
        "0785-floppy-disk",
        "0788-video-film-strip",
        "0790-golf",
        "0791-warning",
        "0792-tv",
        "0793-service-bell",
        "0794-chart",
        "0795-gauge",
        "0796-clock-2",
        "0799-beverage",
        "0800-umbrella",
        "0801-bird-house",
        "0802-dog-house",
        "0803-large-house",
        "0805-mailbox",
        "0806-parcel",
        "0807-package",
        "0809-clipboard",
        "0812-hiking",
        "0813-train",
        "0814-bus",
        "0815-car",
        "0816-satellite",
        "0817-costume",
        "0818-flower-pot",
        "0819-washing-machine",
        "0820-bathtub",
        "0821-stamp",
        "0822-photo-2",
        "0823-birthday-cake",
        "0824-headphone",
        "0825-microphone",
        "0826-money-1",
        "0827-money-2",
        "0828-shield",
        "0829-safety-pin",
        "0832-pencil",
        "0833-diamond",
        "0834-bolt",
        "0835-screw",
        "0836-anchor",
        "0837-palette",
        "0838-dice",
        "0839-mobile-phone",
        "0840-stopwatch-2",
        "0842-chat-bubbles",
        "0844-trumpet",
        "0845-location-target",
        "0846-sun-1",
        "0847-moon",
        "0848-piano",
        "0849-radar",
        "0850-calculator",
        "0851-calendar",
        "0852-map",
        "0853-fence",
        "0855-door",
        "0856-lightning-bolt",
        "0857-rocket",
        "0858-line-chart",
        "0859-bar-chart",
        "0860-glasses",
        "0861-sun-2",
        "0862-sun-cloud",
        "0863-cloud-2",
        "0864-rain-cloud",
        "0865-storm-cloud",
        "0866-snow-cloud",
        "0867-swords",
        "0868-atom",
        "0869-pin",
        "0870-smile",
        "0871-handtruck",
        "0872-podium",
        "0873-magic-wand",
        "0874-newspaper",
        "0875-skull",
        "0876-store",
        "0877-slingshot",
        "0878-binoculars",
        "0879-mountains",
        "0880-bank",
        "0881-globe",
        "0882-mug",
        "0883-beaker",
        "0884-ruler",
        "0885-trailer",
        "0886-ice-cream-cone",
        "0887-notepad",
        "0891-shuffle",
        "0892-bandaid",
        "0893-airplane",
        "0894-t-shirt",
        "0895-user-group",
        "0896-road-sign",
        "0897-graduation-cap",
        "0898-music-note",
        "0899-key",
        "0900-telescope",
        "4000-shopping-cart",
        "4001-guitar",
        "4002-electric-guitar",
        "4003-slc-temple",
        "4004-soccer-ball",
        "4005-tennis-ball",
        "4006-offroad",
        "4007-fly-hook",
        "4009-hammer",
        "4010-bike-chain",
        "4011-football",
        "4012-list-normal",
        "4013-dollar-sign",
        "4014-mesa-temple",
        "4015-quill-pen",
        "4016-typewriter",
        "4017-baseball",
        "4018-jack-o-lantern",
        "4019-barbells"
    ]

    static readonly TodoColors = [
        '#f44336',
        '#ef9a9a',
        '#ef5350',
        '#e53935',
        '#c62828',

        '#e91e63',
        '#f48fb1',
        '#ec407a',
        '#d81b60',
        '#ad1457',

        '#9c27b0',
        '#ce93d8',
        '#ab47bc',
        '#8e24aa',
        '#6a1b9a',

        '#673ab7',
        '#b39ddb',
        '#7e57c2',
        '#5e35b1',
        '#4527a0',

        '#607d8b',
        '#b0bec5',
        '#78909c',
        '#546e7a',
        '#37474f',

        '#2196f3',
        '#90caf9',
        '#42a5f5',
        '#1e88e5',
        '#1565c0',

        '#3f51b5',
        '#9fa8da',
        '#5c6bc0',
        '#3949ab',
        '#283593',

        '#03a9f4',
        '#81d4fa',
        '#29b6f6',
        '#039be5',
        '#0277bd',

        '#00bcd4',
        '#80deea',
        '#26c6da',
        '#00acc1',
        '#00838f',

        '#009688',
        '#80cbc4',
        '#26a69a',
        '#00897b',
        '#00695c',

        '#4caf50',
        '#a5d6a7',
        '#66bb6a',
        '#43a047',
        '#2e7d32',

        '#8bc34a',
        '#c5e1a5',
        '#9ccc65',
        '#7cb342',
        '#558b2f',

        '#cddc39',
        '#e6ee9c',
        '#d4e157',
        '#c0ca33',
        '#9e9d24',

        '#ffeb3b',
        '#fff59d',
        '#ffee58',
        '#fdd835',
        '#f9a825',

        '#ffc107',
        '#ffe082',
        '#ffca28',
        '#ffb300',
        '#ff8f00',

        '#ff9800',
        '#ffcc80',
        '#ffa726',
        '#fb8c00',
        '#ef6c00',

        '#ff5722',
        '#ffab91',
        '#ff7043',
        '#f4511e',
        '#d84315',

        '#795548',
        '#bcaaa4',
        '#8d6e63',
        '#6d4c41',
        '#4e342e',

        '#9e9e9e',
        '#eeeeee',
        '#bdbdbd',
        '#757575',
        '#424242'
    ]

    static readonly MainColors = [
        '#2196f3',
        '#9c27b0',
        '#f44336',
        '#ff9800',
        '#ffeb3b',
        '#4caf50',
    ]

    static readonly SortTypeNames = [
        'Due date, Priority',
        'Priority, Due date',
        'Alphabetical'
    ]

    static readonly DueDateNames = [
        'None',         // 0
        'Today',        // 1
        'Tomorrow',     // 2
        'In Two Days',  // 3
        'In Three Days',// 4 
        'In Four Days', // 5
        'In Five Days', // 6
        'In Six Days',  // 7
        'In One Week'   // 8
    ]

    static readonly SmartListFilter = {
        Everything: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"1month\"},\"showListForTasks\":true}",
        Focus: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"dueDate\":{\"type\":\"before\",\"relation\":\"relative\",\"period\":\"day\",\"value\":3}}],\"showListForTasks\":true}",
        Important: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"1day\"},\"filterGroups\":[{\"starred\":true}],\"showListForTasks\":true}",
        Someday: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"1day\"},\"filterGroups\":[{\"dueDate\":{\"type\":\"none\"}}],\"showListForTasks\":true}",
        AssignedToYou: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"assignment\":[\"ME\"]}]}",
        NextSevenDays: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"dueDate\":{\"type\":\"before\",\"relation\":\"relative\",\"period\":\"week\",\"value\":1}}]}",
        Today: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"dueDate\":{\"type\":\"is\",\"relation\":\"relative\",\"period\":\"day\",\"value\":0}}]}",
        Overdue: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"dueDate\":{\"type\":\"before\",\"relation\":\"relative\",\"period\":\"day\",\"value\":0}}],\"excludeStartDates\":true}",
        Projects: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"taskType\":[\"project\"]}]}",
        RecentlyModified: "{\"completedTasks\":{\"type\":\"all\",\"period\":\"3days\"},\"filterGroups\":[{\"modifiedDate\":{\"type\":\"after\",\"relation\":\"relative\",\"period\":\"day\",\"value\":-3}}]}"
    }

    static readonly CompletedTasksType = {
        "all"       : "Active and completed",
        "active"    : "Active only",
        "completed" : "Completed only"
    }
    
    private static componentToHex(c : number) : string {
        let hex : string = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    public static rgbToHex(rgb? : string) : string {
        if(rgb) {
            let array:string[] = rgb.split(',')
            let r:number = +array[0]
            let g:number = +array[1]
            let b:number = +array[2]

            return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b)
        }
        return '#2196f3'
    }

    public static hexToRgb(hex) {
        const components = Utils.hexToRgbComponents(hex)
        return components != null ? `${components.r}, ${components.g}, ${components.b}` : null
    }

    public static hexToRgbComponents(hex : string) : { r : number, g : number, b : number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        const components = result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
        return components
    }

    public static iconNameToCss(iconName : string, confirmExists : boolean = true) : string {
        if (!iconName || (confirmExists && !(Utils.BaseListIconNames.find((e) => e == iconName)))) {
            iconName = '4012-list-normal'
        }

        return `twf-${iconName}`
    }

    public static cssToIconName(css : string) : string {
        const pieces = css.split('-')
        if (pieces.length == 1 && pieces[0] == "") return css

        return pieces.reduce((accum, current, index) => {
            if (index == 0) return ''
            return index == 1 ? current : `${accum}-${current}`
        }, '')
    }

    public static randomListIcon() {
        let listIconNamesCount = Utils.BaseListIconNames.length
        let randomIndex = Math.floor(Math.random() * listIconNamesCount)
        let randomListIconName = Utils.BaseListIconNames[randomIndex]
        return randomListIconName
    }

    public static randomListColor() {
        let colorCount = Utils.TodoColors.length
        let randomIndex = Math.floor(Math.random() * colorCount)
        let randomColor = Utils.TodoColors[randomIndex]
        return randomColor
    }

    public static allIconNamesAsCss() : string[] {
        return Utils.BaseListIconNames.map((e) => Utils.iconNameToCss(e, false) )
    }

    public static smartListIconNameToCSS(name : string) : string {
        const mapping = {
            "menu-everything" : "twf-everything-smart-list",
            "menu-focus"      : "twf-focus-smart-list",
            "menu-important"  : "twf-important-smart-list",
            "menu-someday"    : "twf-someday-smart-list"
        }
        const css = mapping[name]
        return css ? css : "twf-custom-smart-List"
    }

    public static smartListIconCssToName(css : string) : string {
        const mapping = {
            "twf-everything-smart-list" : "menu-everything",
            "twf-focus-smart-list"      : "menu-focus",
            "twf-important-smart-list"  : "menu-important",
            "twf-someday-smart-list"    : "menu-someday"
        }
        const name = mapping[css]
        return name
    }

    public static dateToTimestamp(date : Date) : number{
        var timestamp = date ? Math.floor(date.getTime() / 1000) : 0
        if (!timestamp || Number.isNaN(timestamp)) { 
            timestamp = 0
        }

        return timestamp
    }

    public static normalizedDate(date : Date) : Date {
        const userTimeZone = moment.tz.guess()
        const localDate = moment.tz(date, userTimeZone)
        const localDay = localDate.date()
        const localMonth = localDate.month()
        const localYear = localDate.year()
        const gmtDate = moment.tz("Etc/GMT")
        gmtDate.date(localDay)
        gmtDate.month(localMonth)
        gmtDate.year(localYear)
        gmtDate.hour(12)
        gmtDate.minute(0)
        gmtDate.second(0)
        gmtDate.millisecond(0)

        return gmtDate.toDate()
    }

    // Takes a date in GMT and converts it to 00:00:00 on that date in local time
    public static denormalizedDateFromGMTDate(gmtDate : Date) : Date {
        if (!gmtDate) { return null }
        const gmtMoment = moment.tz(gmtDate.getTime(), "Etc/GMT")
        const localDate = gmtMoment.clone().tz(moment.tz.guess())
        localDate.date(gmtMoment.date())
        localDate.month(gmtMoment.month())
        localDate.year(gmtMoment.year())
        localDate.hour(0)
        localDate.minute(0)
        localDate.second(0)
        localDate.millisecond(0)
         
        return localDate.toDate()
    }

    public static capitalizeSentence(str : string) : string {
        return str.replace(/.+?[\.\?\!](\s|$)/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1)
        })
    }
    
    public static capitalizeWord(str : string) : string {
        return str.replace(/([a-zA-Z]+)[\s\:\!\?\.]/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1)
        })
    }

    public static toAbsoluteLink(baseURL : string) : string {
        if (!(baseURL.includes('http://') || baseURL.includes('https://'))) {
            return 'http://' + baseURL
        }

        return baseURL
    }

    public static secondsToMilliseconds(seconds : number) : number {
        return seconds * 1000
    }

    public static minutesToSeconds(minutes : number) : number {
        return minutes * 60
    }

    public static minutesToMilliseconds(minutes : number) : number {
        return Utils.secondsToMilliseconds(Utils.minutesToSeconds(minutes))
    }

    public static hoursToMinutes(hours : number) : number {
        return hours * 60
    }

    public static hoursToSeconds(hours : number) : number {
        return Utils.minutesToSeconds(Utils.hoursToMinutes(hours))
    }

    public static hoursToMilliseconds(hours : number) {
        return Utils.minutesToMilliseconds(Utils.hoursToMinutes(hours))
    }

    public static get isMacOS() : boolean {
        if(window.navigator.userAgent.indexOf('Mac OS') > 0) return true
        return false
    }

    public static get currentPlatform() : Platform {
        var os = require('os')
        if (!os) {
            console.log('web')
            return Platform.Web
        }

        const platformDictionary = {
            "browser": Platform.Web,
            "darwin" : Platform.Apple,
            "win32"  : Platform.Windows,
            "linux"  : Platform.Linux,
            "android": Platform.Android
        }
        const platformKey = os.platform()
        const result = platformDictionary[platformKey]

        return !(result === undefined || result === null) ? result : Platform.Other
    }

    public static isValidEmail(email : string) {
        let emailRegexp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return emailRegexp.test(email) ? true : false
    }

    public static isDarkColor(hex) {
        let color = this.hexToRgbComponents(hex)
        let yiq = ((color.r * 299) + (color.g * 587) + (color.b * 114)) / 1000
        return (yiq >= 170)
    }

    public static parseErrorMessage(err : string) {
        if (!err || err.length == 0) {
            return `An error occurred. Please try again.`
        }

        if (err.startsWith(`AccountMaintenance`)) {
            return `This account is currently under maintenance.`
        }
        if (err.startsWith(`AccountNotFound`)) {
            return `The account could not be found.`
        }
        if (err.startsWith(`AccountSettingsNotFound`)) {
            return `The account settings could not be found.`
        }
        if (err.startsWith(`BestMatchLocaleInvalid`)) {
            return `Invalid locale.`
        }
        if (err.startsWith(`CommentNotFound`)) {
            return `The comment could not be found.`
        }
        if (err.startsWith(`DatabaseError`)) {
            return `An internal service error occurred. Please try again later.`
        }
        if (err.startsWith(`EmailServiceError`)) {
            return `An error occurred sending an email.`
        }
        if (err.startsWith(`EmailTemplateError`)) {
            return `An error occurred preparing an email.`
        }
        if (err.startsWith(`EmailVerificationNotFound`)) {
            return `A problem occurred verifying your email address. Please try again later.`
        }
        if (err.startsWith(`FirstNameLengthExceeded`)) {
            return `The first name provided is too long.`
        }
        if (err.startsWith(`ImageNotFound`)) {
            return `An image could not be found.`
        }
        if (err.startsWith(`ImageTypeUnknown`)) {
            return `An image type could not be determined.`
        }
        if (err.startsWith(`ImageTypeUnsupported`)) {
            return `Supported image types are *.jpg or *.png.`
        }
        if (err.startsWith(`InvalidParent`)) {
            return `The task is not a project or checklist.`
        }
        if (err.startsWith(`LastNameLengthExceeded`)) {
            return `The last name provided is too long.`
        }
        if (err.startsWith(`LastOwner`)) {
            return `You cannot remove the last owner of the shared list.`
        }
        if (err.startsWith(`ListNotFound`)) {
            return `A list could not be found.`
        }
        if (err.startsWith(`ListMembershipNotEmpty`)) {
            return `Please remove other members of the shared list and try again.`
        }
        if (err.startsWith(`ListMembershipNotFound`)) {
            return `A problem occurred because a shared list member could not be found.`
        }
        if (err.startsWith(`ListMembershipNotFound`)) {
            return `You are not a member of the shared list.`
        }
        if (err.startsWith(`LocaleInvalid`)) {
            return `Invalid locale.`
        }
        if (err.startsWith(`MandrillEmailServiceError`)) {
            return `An error occurred sending an email.`
        }
        if (err.startsWith(`MissingParameters`)) {
            return `Missing parameters.`
        }
        if (err.startsWith(`PasswordLengthExceeded`)) {
            return `Password is too long.`
        }
        if (err.startsWith(`PasswordInvalid`)) {
            return `Your password is invalid.`
        }
        if (err.startsWith(`PasswordsNotSame`)) {
            return `Passwords do not match.`
        }
        if (err.startsWith(`PasswordResetExpired`)) {
            return `The password reset time has expired. Please try to reset the password again.`
        }
        if (err.startsWith(`PasswordResetNotFound`)) {
            return `Password reset was not enabled for this account. Please try to reset the password again.`
        }
        if (err.startsWith(`PasswordTooShort`)) {
            return `Password is too short.`
        }
        if (err.startsWith(`PaymentHasIAPError`)) {
            return `The specified account has a recurring existing in-app purchase subscription configured.`
        }
        if (err.startsWith(`PaymentInvalidCharge`)) {
            return `The total charge specified does not match the subscription type.`
        }
        if (err.startsWith(`PaymentNotFound`)) {
            return `The specified payment could not be found.`
        }
        if (err.startsWith(`PaymentProcessingError`)) {
            return `An error occurred communicating with the payment processing service.`
        }
        if (err.startsWith(`ServerError`)) {
            return `A service error occurrec. Please try again later.`
        }
        if (err.startsWith(`SubscriptionNotFound`)) {
            return `An account subscription could not be found.`
        }
        if (err.startsWith(`SubscriptionPurchaseNotEligible`)) {
            return `The subscription is not yet eligible for extension.`
        }
        if (err.startsWith(`SubscriptionTypeInvalid`)) {
            return `An invalid subscription type was specified.`
        }
        if (err.startsWith(`SyncError`)) {
            return `A synchronization error occurred. Please try again.`
        }
        if (err.startsWith(`SyncProtocolVersionUnsupported`)) {
            return `Unsupported sync protocol version. Please upgrade your app to a new version.`
        }
        if (err.startsWith(`SyncServerDataReset`)) {
            return `Task data was reset on the server. Prompt the customer with a choice of what to do next.`
        }
        if (err.startsWith(`TaskAlreadyCompleted`)) {
            return `The specified task is already completed.`
        }
        if (err.startsWith(`TaskNotCompleted`)) {
            return `The specified task is not completed.`
        }
        if (err.startsWith(`TaskNotFound`)) {
            return `The specified task could not be found.`
        }
        if (err.startsWith(`TeamNotFound`)) {
            return `The specified team could not be found.`
        }
        if (err.startsWith(`TimezoneInvalid`)) {
            return `An invalid time zone was specified.`
        }
        if (err.startsWith(`Unauthorized`)) {
            return `You are not authorized to access this resource or operation.`
        }
        if (err.startsWith(`UnknownError`)) {
            return `An unknown error occurred.`
        }
        if (err.startsWith(`UsernameInvalid`)) {
            return `Invalid email specified for username.`
        }
        if (err.startsWith(`UsernameInvalidWithPlusCharacter`)) {
            return `Invalid email specified for username. Cannot use + character.`
        }
        if (err.startsWith(`UsernameLengthExceeded`)) {
            return `The username provided is too long.`
        }
        if (err.startsWith(`UserSettingsNotFound`)) {
            return `The account settings could not be found.`
        }
        if (err.startsWith(`UsernameUnavailable`)) {
            return `The specified username is not available.`
        }

        return `An error occurred. Please try again.`
    }

    public static lengthInUtf8Bytes(str : string) : number {
        // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
        var m = encodeURIComponent(str).match(/%[89ABab]/g)
        return str.length + (m ? m.length : 0)
    }

    public static truncateToFit(input : string, maxLength : number) : string {
        var truncatedString = input
        while (this.lengthInUtf8Bytes(truncatedString) > maxLength) {
            // Remove one full character (even multi-byte) at a time
            truncatedString = truncatedString.slice(0, -1).trim()
        }
      
        return truncatedString
    }

    public static openLink(relativeUrl : string) {
        if (environment.isElectron) {
            return this.openInDefaultBrowser(relativeUrl)
        }

        window.open(relativeUrl, '_blank')
        return false
    }

    private static openInDefaultBrowser(relativeUrl : string) {
        if (!environment.isElectron) return

        const url = `https://www.todo-cloud.com${relativeUrl}`
        electron.shell.openExternal(url)
        return false
    }

    public static openUrlInDefaultBrowser(url : string) {
        if (!environment.isElectron) return

        electron.shell.openExternal(url)
        return false
    }
}

if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
        enumerable: false,
        value: function(obj) {
            var newArr = this.filter(function(el) {
                return el == obj;
            });
            return newArr.length > 0;
        }
    });
}