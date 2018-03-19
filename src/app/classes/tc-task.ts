import {TCObject}   from './tc-object'
import { Utils, TaskPriority, TaskRecurrenceType, RepeatFromType, AdvancedRecurrenceType, TaskLocationAlertType } from '../tc-utils'
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber'
import { TaskType } from '../tc-utils'

const TaskTypeDataConstants = {
    headerTemplate : (typeName) => {
        return `---- Task Type: ${typeName} ----\n`
    },
    
    projectTypeIdentifier   : "Project",
    checklistTypeIdentifier : "Checklist",
    contactTypeIdentifier   : "Call",
    locationTypeIdentifier  : "Location",
    urlTypeIdentifier       : "URL",
    footer                  : "---- End Task Type ----",
    typeHasContact          : "---- Has Contact Info ----\n",

    keyURL      : 'url',
    keyLocation : 'location',
    keyContact  : 'contact',
    keyOther    : 'other',
    keyTopType  : 'Type',

    keyValueTemplate : (key, value) : string => {
        return `${key}: ${value}\n`
    },
    contactKeyTemplate : (value) : string => {
        return `${TaskTypeDataConstants.keyContact}: ${value}\n`
    }
}

interface LocationAlertCoordinates {
    latitude : number,
    longitude: number
}

interface LocationAlertComponents {
    type    : TaskLocationAlertType
    coords? : LocationAlertCoordinates
    info?   : string
}

export class TCTask extends TCObject {
    name : string = ''
    listId : string = ''
    parentId : string = null

    editing : boolean = false
    note : string = ''
    _startDate : Date = null
    _dueDate : Date = null
    _dueDateHasTime : boolean = false
    completionDate : Date = null
    _priority : TaskPriority = TaskPriority.None
    _taskType : number = 0
    typeData : string = null
    _starred : boolean = false
    assignedUserId : string = ''
    recurrenceType : TaskRecurrenceType = TaskRecurrenceType.None
    advancedRecurrenceType : string = ''
    locationAlert : string = ''
    sortOrder : number = 0

    _projectDueDate : Date = null
    _projectStartDate : Date = null
    _projectDueDateHasTime : boolean = false
    _projectPriority : TaskPriority = TaskPriority.None
    _projectStarred : boolean = false

    get isCompleted() : boolean {
        return (this.completionDate ? true : false) && this.completionDate.getTime() > 0
    }
    get hasDueDate() : boolean {
        if (this.isProject) {
            return (this._projectDueDate ? true : false) && this._projectDueDate.getTime() > 0
        }
        return (this._dueDate ? true : false) && this._dueDate.getTime() > 0
    }
    get hasStartDate() : boolean {
        if (this.isProject) {
            return (this._projectStartDate ? true : false) && this._projectStartDate.getTime() > 0
        }
        return (this.startDate ? true : false) && this.startDate.getTime() > 0
    }
    get shouldShowDueDate() : boolean {
        if (this.isProject) {
            return (this.shownDueDate ? true : false) && this.shownDueDate.getTime() > 0
        }
        return (this._dueDate ? true : false) && this._dueDate.getTime() > 0
    }
    get shouldShowStartDate() : boolean {
        if (this.isProject) {
            return (this.shownStartDate ? true : false) && this.shownStartDate.getTime() > 0
        }
        return (this.startDate ? true : false) && this.startDate.getTime() > 0
    }

    get dueDate() : Date {
        if (this.isProject) return this._projectDueDate
        return this.composedDueDate
    }
    set dueDate(date : Date) {
        if (this.isProject) {
            this._projectDueDate = date
            return
        }
        this.composedDueDate = date
    }

    get startDate() : Date {
        if (this.isProject) return this._projectStartDate
        return this.composedStartDate
    }
    set startDate(date : Date) {
        if (this.isProject) {
            this._projectStartDate = date
            return
        }
        this.composedStartDate = date
    }

    get dueDateHasTime() : boolean {
        if (this.isProject) return this._projectDueDateHasTime
        return this.composedDueDateHasTime
    }
    set dueDateHasTime(has : boolean) {
        if (this.isProject) {
            this._projectDueDateHasTime = has
            return
        }
        this.composedDueDateHasTime = has
    }

    get starred() : boolean {
        return (this.isProject && this._projectStarred) || 
            (!this.isProject && this.composedStarred)
    }
    set starred(star : boolean) {
        if (this.isProject) {
            this._projectStarred = star
            return
        }
        this.composedStarred = star
    }

    get priority() : TaskPriority {
        if (this.isProject) return this._projectPriority
        return this.composedPriority
    }
    set priority(p : TaskPriority) {
        if (this.isProject) {
            this._projectPriority = p
            return
        }
        this.composedPriority = p
    }

    get composedDueDate() : Date {
        return this._dueDate
    }
    set composedDueDate(date : Date)  {
        this._dueDate = date
    }

    get composedStartDate() : Date {
        return this._startDate
    }
    set composedStartDate(date : Date)  {
        this._startDate = date
    }

    get composedDueDateHasTime() : boolean {
        return this._dueDateHasTime
    }
    set composedDueDateHasTime(has : boolean) {
        this._dueDateHasTime = has
    }

    get composedStarred() : boolean {
        return this._starred
    }
    set composedStarred(starred : boolean) {
        this._starred = starred
    }

    get composedPriority() : TaskPriority {
        return this._priority
    }
    set composedPriority(priority : TaskPriority) {
        this._priority = priority
    }

    get shownDueDate() : Date {
        if (!this.isProject) return this.composedDueDate

        if (this.composedDueDate == null) {
            return this._projectDueDate
        }
        if (this._projectDueDate == null) {
            return this.composedDueDate
        }
        if (this.composedDueDate < this._projectDueDate) {
            return this.composedDueDate
        }
        return this._projectDueDate
    }

    get shownStartDate() : Date {
        if (!this.isProject) return this.composedStartDate
        
        if (this.composedStartDate == null) {
            return this._projectStartDate
        }
        if (this._projectStartDate == null) {
            return this.composedStartDate
        }
        if (this.composedStartDate < this._projectStartDate) {
            return this.composedStartDate
        }
        return this._projectStartDate
    }

    get taskTypeHasActionData() : boolean {
        return this.taskTypeHasContactInfo || 
            this.taskTypeHasOnlyPhoneInfo || 
            this.taskTypeHasURLInfo || 
            this.taskTypeHasLocationInfo
    }

    get taskTypeHasContactInfo() : boolean {
        if (!this.typeData) return false

        return this.typeData.search(`${TaskTypeDataConstants.keyContact}: `) >= 0  && // search returns -1 if regex is not found
            !this.taskTypeHasOnlyPhoneInfo &&
            !this.taskTypeHasLocationInfo &&
            !this.taskTypeHasURLInfo
    }
    get taskTypeHasOnlyPhoneInfo() : boolean {
        if (!this.typeData) return false

        const otherInfo   = this.getTaskTypeDataForKey(TaskTypeDataConstants.keyOther)
        const contactInfo = this.getTaskTypeDataForKey(TaskTypeDataConstants.keyContact)
        const infoExists  = otherInfo && contactInfo
        const infoIsEqual = otherInfo == contactInfo

        return infoExists && infoIsEqual
    }
    get taskTypeHasURLInfo() : boolean {
        if (!this.typeData) return false

        return this.typeData.search(`${TaskTypeDataConstants.keyURL}: `) >= 0 // search returns -1 if regex is not found
    }
    get taskTypeHasLocationInfo() : boolean {
        if (!this.typeData) return false

        return this.typeData.search(`${TaskTypeDataConstants.keyLocation}: `) >= 0 // search returns -1 if regex is not found
    }

    get taskTypeFromTypeData() : string {
        const initial = this.getTaskTypeDataForKey(TaskTypeDataConstants.keyTopType)
        if (initial) {
            const values = initial.match(/\S+/g) || []
            return values[0]
        }
        return null
    }
    
    get taskTypeContactValue() : string {
        return this.getTaskTypeDataForKey(TaskTypeDataConstants.keyContact)
    }
    get taskTypePhoneNumber() : string {
        return this.getTaskTypeDataForKey(TaskTypeDataConstants.keyOther)
    }
    get taskTypePhoneNumberLink() : string {
        const basePhoneNumber = this.taskTypePhoneNumber
        const phoneUtil = PhoneNumberUtil.getInstance()

        let phoneNumberLink = '#'
        try {
            phoneNumberLink = 'tel:' + phoneUtil.format(phoneUtil.parse(basePhoneNumber, 'US'), PhoneNumberFormat.INTERNATIONAL)
        } catch (error) {
            console.log(`Invalid phone number (${basePhoneNumber}) on task (${this.name}): ${error}`)
        }

        return phoneNumberLink
    }
    get taskTypeURL() : string {
        return this.getTaskTypeDataForKey(TaskTypeDataConstants.keyURL)
    }
    get taskTypeURLLink() : string {
        return Utils.toAbsoluteLink(this.taskTypeURL)
    }
    get taskTypeLocation() : string {
        return this.getTaskTypeDataForKey(TaskTypeDataConstants.keyLocation)
    }
    get taskTypeLocationLink() : string {
        return `http://maps.google.com/?q=${this.taskTypeLocation}`
    }

    set taskTypeURL(url : string) {
        if (!url) {
            this.removeTaskTypeData()
            return
        }

        let typeIdentifer = TaskTypeDataConstants.urlTypeIdentifier
        if (this.taskTypeFromTypeData == TaskTypeDataConstants.projectTypeIdentifier ||
            this.taskTypeFromTypeData == TaskTypeDataConstants.checklistTypeIdentifier) {
            typeIdentifer = this.taskTypeFromTypeData
        }

        this.typeData = TaskTypeDataConstants.headerTemplate(typeIdentifer)
        this.typeData += TaskTypeDataConstants.contactKeyTemplate(url)
        this.typeData += TaskTypeDataConstants.keyValueTemplate(TaskTypeDataConstants.keyURL, url)
        this.typeData += TaskTypeDataConstants.footer

        if (!this.isChecklist && !this.isProject) {
            this._taskType = TaskType.URL
        }
    }
    set taskTypePhoneNumber(phone : string) {
        if (!phone) {
            this.removeTaskTypeData()
            return
        }

        let typeIdentifer = TaskTypeDataConstants.contactTypeIdentifier
        if (this.taskTypeFromTypeData == TaskTypeDataConstants.projectTypeIdentifier ||
            this.taskTypeFromTypeData == TaskTypeDataConstants.checklistTypeIdentifier) {
            typeIdentifer = this.taskTypeFromTypeData
        }

        this.typeData = TaskTypeDataConstants.headerTemplate(typeIdentifer)
        this.typeData += TaskTypeDataConstants.typeHasContact
        this.typeData += TaskTypeDataConstants.contactKeyTemplate(phone)
        this.typeData += TaskTypeDataConstants.keyValueTemplate(TaskTypeDataConstants.keyOther, phone)
        this.typeData += TaskTypeDataConstants.footer

        if (!this.isChecklist && !this.isProject) {
            this._taskType = TaskType.CallContact
        }
    }
    set taskTypeLocation(location : string) {
        if (!location || location.length == 0) {
            this.removeTaskTypeData()
            return
        }

        let typeIdentifer = TaskTypeDataConstants.locationTypeIdentifier
        if (this.taskTypeFromTypeData == TaskTypeDataConstants.projectTypeIdentifier ||
            this.taskTypeFromTypeData == TaskTypeDataConstants.checklistTypeIdentifier) {
            typeIdentifer = this.taskTypeFromTypeData
        }

        this.typeData = TaskTypeDataConstants.headerTemplate(typeIdentifer)
        this.typeData += TaskTypeDataConstants.contactKeyTemplate(location)
        this.typeData += TaskTypeDataConstants.keyValueTemplate(TaskTypeDataConstants.keyLocation, location)
        this.typeData += TaskTypeDataConstants.footer

        if (!this.isChecklist && !this.isProject) {
            this._taskType = TaskType.VisitLocation
        }
    }

    // TO-DO: I don't actually know yet how this works on browsers so I'm deferring them until later
    // set taskTypeContactInformation(contact : any) {}

    get hasLocationAlert() : boolean {
        return this.locationAlert != null && this.locationAlert.length > 0
    }

    get locationAlertCoords() : LocationAlertCoordinates {
        return this.locationAlertComponents.coords
    }
    get locationAlertType() : TaskLocationAlertType {
        return this.locationAlertComponents.type
    }
    get locationAlertAdditionalInfoString() : string {
        return this.locationAlertComponents.info
    }

    set locationAlertCoords(coords : LocationAlertCoordinates)  {
        const components = this.locationAlertComponents
        const coordsString = `${coords.latitude},${coords.longitude}`
        
        this.locationAlert  = `${components.type == TaskLocationAlertType.Arriving ? '>' : '<'}:`
        this.locationAlert += `${coordsString}:`
        this.locationAlert += `${components.info ? components.info : ''}`
    }
    set locationAlertType(type : TaskLocationAlertType)  {
        const components = this.locationAlertComponents
        const coordsString = components.coords ? `${components.coords.latitude},${components.coords.longitude}` : ''
        
        this.locationAlert  = `${type == TaskLocationAlertType.Arriving ? '>' : '<'}:`
        this.locationAlert += `${coordsString}:`
        this.locationAlert += `${components.info ? components.info : ''}`
    }
    set locationAlertAdditionalInfoString(info : string)  {
        const components = this.locationAlertComponents
        const coordsString = components.coords ? `${components.coords.latitude},${components.coords.longitude}` : ''
        
        this.locationAlert  = `${components.type == TaskLocationAlertType.Arriving ? '>' : '<'}:`
        this.locationAlert += `${coordsString}:`
        this.locationAlert += `${info ? info : ''}`
    }

    get isRegular() : boolean {
        return this.taskType == TaskType.Normal
    }
    get isProject() : boolean {
        return this.taskType == TaskType.Project
    }
    get isChecklist() : boolean {
        return this.taskType == TaskType.Checklist
    }
    get isParent() : boolean {
        return this.isProject || this.isChecklist
    }
    get isSubtask() : boolean {
        return this.parentId != null && this.parentId.length > 0
    }

    private get locationAlertComponents() : LocationAlertComponents {
        const result = {
            type : TaskLocationAlertType.None,
            coords : undefined,
            info : undefined
        }
        const splitLocationAlertString = this.locationAlert.split(':')
        if (splitLocationAlertString.length >= 3) {
            result.info = splitLocationAlertString.slice(3).reduce((accum, current) => {
                return `${accum}:${current}`
            }, splitLocationAlertString[2])
        }
        if (splitLocationAlertString.length >= 2) {
            const splitCoordString = splitLocationAlertString[1].split(',')

            if (splitCoordString.length > 1) {
                result.coords = {
                    latitude : Number(splitCoordString[0]),
                    longitude : Number(splitCoordString[1])
                }
            }
        } 
        if (splitLocationAlertString.length >= 1) {
            result.type = splitLocationAlertString[0] == '>' ? TaskLocationAlertType.Arriving : TaskLocationAlertType.Leaving
        }

        return result
    }

    get taskType() : TaskType {
        return this._taskType
    }
    set taskType(type : TaskType) {
        this._taskType = type
        if (type == TaskType.Checklist || type == TaskType.Project) {
            const typeIdentifier = type == TaskType.Project ? 
                    TaskTypeDataConstants.projectTypeIdentifier : 
                    TaskTypeDataConstants.checklistTypeIdentifier
            if (!this.typeData) {
                this.typeData = TaskTypeDataConstants.headerTemplate(typeIdentifier)
                this.typeData += TaskTypeDataConstants.footer
            }
            else {
                this.setTaskTypeDataHeader(typeIdentifier)
            }
        }
        else if (this.taskTypeHasActionData) {
            if (this.taskTypeHasContactInfo) this.setTaskTypeDataHeader(TaskTypeDataConstants.contactTypeIdentifier)
            else if (this.taskTypeHasLocationInfo) this.setTaskTypeDataHeader(TaskTypeDataConstants.locationTypeIdentifier)
            else if (this.taskTypeHasURLInfo) this.setTaskTypeDataHeader(TaskTypeDataConstants.urlTypeIdentifier)
            else if (this.taskTypeHasOnlyPhoneInfo) this.setTaskTypeDataHeader(TaskTypeDataConstants.contactTypeIdentifier)
        }
        else {
            this.typeData = ''
        }
    }

    get hasUserAssignment() : boolean {
        return this.assignedUserId && this.assignedUserId.length > 0
    }

    constructor(taskData? : any) {
        super(taskData != null ? taskData.taskid : null, taskData != null ? taskData.timestamp : null)

        if (taskData) {
            const priorityValidator = (priority : number) => {
                return priority == TaskPriority.High || priority == TaskPriority.Medium || priority == TaskPriority.Low ? priority : TaskPriority.None
            }
            this.assignIfExists(taskData.name, 'name')
            this.assignIfExists(taskData.listid, 'listId')
            this.assignIfExists(taskData.parentid, 'parentId')
            this.assignIfExists(taskData.note, 'note')
            this.assignIfExists(taskData.startdate, '_startDate', (timestamp : number) => Utils.denormalizedDateFromGMTDate(this.timestampToDate(timestamp)))
            this.assignIfExists(taskData.duedate, '_dueDate', (timestamp : number) => this.cleanBoolean(taskData.due_date_has_time) ? this.timestampToDate(timestamp) : Utils.denormalizedDateFromGMTDate(this.timestampToDate(timestamp)))
            this.assignIfExists(this.cleanBoolean(taskData.due_date_has_time), '_dueDateHasTime')
            this.assignIfExists(taskData.completiondate, 'completionDate', (timestamp : number) => this.timestampToDate(timestamp))
            this.assignIfExists(taskData.priority, 'priority', priorityValidator)
            this.assignIfExists(taskData.task_type, '_taskType')
            this.assignIfExists(taskData.type_data, 'typeData', (data : string) => data.length == 0 ? '' : data)
            this.assignIfExists(this.cleanBoolean(taskData.starred), '_starred')
            this.assignIfExists(taskData.assigned_userid, 'assignedUserId')
            this.assignIfExists(taskData.recurrence_type, 'recurrenceType')
            this.assignIfExists(taskData.advanced_recurrence_string, 'advancedRecurrenceType')
            this.assignIfExists(taskData.location_alert, 'locationAlert')
            this.assignIfExists(taskData.sort_order, 'sortOrder')

            this.assignIfExists(taskData.project_duedate, '_projectDueDate', (timestamp : number) => this.cleanBoolean(taskData.project_duedate_has_time) ? this.timestampToDate(timestamp) : Utils.denormalizedDateFromGMTDate(this.timestampToDate(timestamp)))
            this.assignIfExists(taskData.project_startdate, '_projectStartDate', (timestamp : number) => Utils.denormalizedDateFromGMTDate(this.timestampToDate(timestamp)))
            this.assignIfExists(this.cleanBoolean(taskData.project_starred), '_projectStarred')
            this.assignIfExists(taskData.project_priority, '_projectPriority', priorityValidator)
            this.assignIfExists(this.cleanBoolean(taskData.project_duedate_has_time), '_projectDueDateHasTime')
        }
    }

    requestBody() {
        return {
            name : this.name,
            taskid : this.identifier,
            listid : this.listId,
            parentid : this.parentId,
            note : this.note,
            startdate : Utils.dateToTimestamp(Utils.normalizedDate(this._startDate)),
            duedate : Utils.dateToTimestamp(this.dueDateHasTime ? this._dueDate : Utils.normalizedDate(this._dueDate)),
            due_date_has_time : this._dueDateHasTime ? 1 : 0,
            completiondate : Utils.dateToTimestamp(this.completionDate),
            priority : this._priority,
            task_type : this.taskType,
            type_data : this.typeData,
            starred : this._starred ? 1 : 0,
            assigned_userid : this.assignedUserId,
            recurrence_type : this.recurrenceType,
            advanced_recurrence_string : this.advancedRecurrenceType,
            location_alert : this.locationAlert,
            sort_order : this.sortOrder,
            project_starred : this._projectStarred ? 1 : 0,
            project_startdate : Utils.dateToTimestamp(Utils.normalizedDate(this._projectStartDate)),
            project_duedate : Utils.dateToTimestamp(this._projectDueDateHasTime ? this._projectDueDate : Utils.normalizedDate(this._projectDueDate)),
            project_duedate_has_time : this._projectDueDateHasTime ? 1 : 0,
            project_priority : this._projectPriority,
        }
    }

    private getTaskTypeDataForKey(key : string) : string {
        if (!this.typeData) return null
        const formattedKey = `${key}: `
        // Finds the key and splits the string around it
        const splitTypeData : string[] = this.typeData.split(formattedKey)
        if (splitTypeData.length > 1) {
            // Split on white space to single out the value after the key
            const splitValuesAfterKey : string[] = splitTypeData[1].split(/(\n)/)
            return splitValuesAfterKey[0]
        }

        return null
    }

    private setTaskTypeDataHeader(typeIdentifier : string) {
        if (!this.typeData) return
        const lines = this.typeData.split(/\n/)
        lines.shift()
        let newTypeData = lines.reduce((accum, curr) => `${accum}${curr}\n`, TaskTypeDataConstants.headerTemplate(typeIdentifier))
        this.typeData = newTypeData.trim()
    }

    removeTaskTypeData() {
        if (this.taskTypeFromTypeData == TaskTypeDataConstants.projectTypeIdentifier ||
            this.taskTypeFromTypeData == TaskTypeDataConstants.checklistTypeIdentifier) {
            const typeIdentifier = this.taskTypeFromTypeData
            this.typeData = TaskTypeDataConstants.headerTemplate(typeIdentifier)
            this.typeData += TaskTypeDataConstants.footer
        }
        else {
            this.typeData = ''
        }
    }

    determineRecurrenceType(recurrenceType : TaskRecurrenceType, repeatFrom : RepeatFromType = RepeatFromType.DueDate) {
        if (recurrenceType == TaskRecurrenceType.None) {
            this.recurrenceType = TaskRecurrenceType.None
        }
        else {
            this.recurrenceType = recurrenceType + 100 * repeatFrom
        }

        if (recurrenceType != TaskRecurrenceType.Advanced) {
            this.advancedRecurrenceType = null
        }
    }

    getRepeatFromType() : RepeatFromType{
        return this.recurrenceType < 100 ? RepeatFromType.DueDate : RepeatFromType.CompletionDate
    }

    getBaseRecurrenceType() : TaskRecurrenceType {
        const type = this.getRepeatFromType()
        return type == RepeatFromType.DueDate ? this.recurrenceType : this.recurrenceType - 100
    }

    getAdvancedRecurrenceTypeValue() : AdvancedRecurrenceType {
        if (!this.advancedRecurrenceType || this.advancedRecurrenceType.length == 0) {
            return AdvancedRecurrenceType.Unknown
        }

        const splitString = this.advancedRecurrenceType.split(/\s/)

        if (splitString[0].toUpperCase() == "every".toUpperCase()) {
            if (splitString.length < 2) return AdvancedRecurrenceType.Unknown
            const everyValue : string = splitString[1]
            if (Number(everyValue) == 0) return AdvancedRecurrenceType.Unknown
            if (Number(everyValue) > 0) return AdvancedRecurrenceType.EveryXDaysWeeksMonths
            return AdvancedRecurrenceType.EveryMonTueEtc
        }

        if (splitString[0].toUpperCase() == "on".toUpperCase() || splitString[0].toUpperCase() == "the".toUpperCase()) {
            return AdvancedRecurrenceType.TheXOfEachMonth
        }

        return AdvancedRecurrenceType.Unknown
    }
}
