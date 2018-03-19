import { TCObject }   from './tc-object'
import { SmartListFullFilter, TCCompletedTasksFilter } from './tc-smart-list-filters'
import { Utils, kUnfiledTaskListID } from '../tc-utils'
import { environment } from '../../environments/environment'
import { TCUserSettings } from './tc-user-settings'

export class TCSmartList extends TCObject {
  private static readonly kShowListsForTasks : string = "showListForTasks"
  private static readonly kExcludeStartDates : string = "excludeStartDates"
  private static readonly kShowSubtasks      : string = "showSubtasks"

  public readonly isEverythingSmartList : boolean = false
  public readonly isSpecialSmartList : boolean = false

  name     : string = 'New Smart List'
  iconName : string = ''
  color    : string = '#2196f3'
  sortType : number = -1  // -1 to use the app default
  sortOrder: number = 0

  filter: SmartListFullFilter = {}
  completedTaskFilter : TCCompletedTasksFilter = {
    type : "all",
    period : "none"
  }
  defaultDueDate : number = -1  // -1 to use the app default
  defaultList : string = ''
  excludedListIds : Set<string> = new Set<string>()

  set showListForTasks(show : boolean) {
    this.filter[TCSmartList.kShowListsForTasks] = show
  }
  get showListForTasks() : boolean {
    // Use trinary expression to avoid returning undefined or null
    return (this.filter[TCSmartList.kShowListsForTasks]) ? true : false
  }

  set excludeStartDates(exclude : boolean) {
    this.filter[TCSmartList.kExcludeStartDates] = exclude
  }
  get excludeStartDates() : boolean {
    // Use trinary expression to avoid returning undefined or null
    return (this.filter[TCSmartList.kExcludeStartDates]) ? true : false
  }

  set showSubtasks(show : boolean) {
    this.filter[TCSmartList.kShowSubtasks] = show
  }
  get showSubtasks() : boolean {
    // Use trinary expression to avoid returning undefined or null
    return (this.filter[TCSmartList.kShowSubtasks]) ? true : false
  }

  constructor(listData? : any) {
    super(listData != null ? listData.listid : null, listData != null ? listData.timestamp : null)

    if (listData) {
      this.assignIfExists(listData.name, 'name')
      this.assignIfExists(Utils.rgbToHex(listData.color) , 'color')
      this.assignIfExists(Utils.smartListIconNameToCSS(listData.icon_name), 'iconName')
      this.assignIfExists(listData.sort_order, 'sortOrder')
      this.assignIfExists(listData.sort_type, 'sortType')
      this.assignIfExists(listData.json_filter, 'filter', JSON.parse)
      this.assignIfExists(listData.default_due_date, 'defaultDueDate')
      this.assignIfExists(listData.default_list, 'defaultList')
      this.excludedListIds = listData.excluded_list_ids != null ? 
        new Set((listData.excluded_list_ids.split(',') as string[]).filter((e:string )=> e.length > 0)) : 
        this.excludedListIds
      this.assignIfExists(listData.completed_tasks_filter, 'completedTaskFilter', JSON.parse)
      
      if (!(listData.completed_tasks_filter) && (this.filter.completedTasks)) {
        this.completedTaskFilter = this.filter.completedTasks
      }

      if (this.iconName && this.iconName == "twf-everything-smart-list") {
        this.isEverythingSmartList = true
      }

      if (this.iconName && (this.iconName == "twf-everything-smart-list" || this.iconName == "twf-focus-smart-list" || this.iconName == "twf-important-smart-list" || this.iconName == "twf-someday-smart-list")) {
        this.isSpecialSmartList = true
      }
    }
  }

  // The web client will need to take references to kUnfiledTaskListID
  // and replace them with the actual inbox list id for use in the app.
  // References to the inbox get sanitized for outgoing information using
  // the TCSmartList.sanitizedRequestBody method
  setCorrectInboxReferences(userSettings : TCUserSettings) : TCSmartList {
    if (environment.isElectron) {
      return this
    }

    const defaultIsInbox = this.defaultList == kUnfiledTaskListID
    this.defaultList = defaultIsInbox ? userSettings.userInbox : this.defaultList

    const correctedExcludedLists = Array.from(this.excludedListIds).map(id => id == kUnfiledTaskListID ? userSettings.userInbox : id)
    this.excludedListIds = new Set(correctedExcludedLists)

    this.filter.defaultList = this.defaultList
    this.filter.excludeLists = correctedExcludedLists

    return this
  }

  // Creates an exact copy of the smart list object
  copy() : TCSmartList {
    return new TCSmartList(this.requestBody())
  }

  // Creates a copy with an undefined list id which 
  // makes it distinct from the original list object
  // when saved through the API
  duplicate() : TCSmartList {
    const data = this.requestBody()
    delete data.listid

    // If this is the Everything smart list, do not duplicate
    // the list icon name because this is what we currently
    // key off of to identify the Everything smart list.
    if (this.isEverythingSmartList) {
      delete data.icon_name
    }
    
    return new TCSmartList(data)
  }

  requestBody() {
    this.filter.completedTasks = this.completedTaskFilter
    this.filter.excludeLists = Array.from(this.excludedListIds)
    this.filter.defaultList = this.defaultList
    return {
      listid : this.identifier,
      name   : this.name,
      color  : Utils.hexToRgb(this.color),
      icon_name : Utils.smartListIconCssToName(this.iconName),
      sort_order: this.sortOrder,
      sort_type : this.sortType,

      json_filter : JSON.stringify(this.filter),
      default_list : this.defaultList,
      default_due_date : this.defaultDueDate,
      excluded_list_ids : this.filter.excludeLists.reduce((accum, current, index) => index == 0 ? current : accum + `,${current}`, ''),
      completed_tasks_filter : JSON.stringify(this.completedTaskFilter)
    }
  }

  // The web version of the app needs smart lists to sanitize references
  // to the inbox and mark them as kUnfiledTaskListID so that sync
  // clients will work correclty.
  sanitizedRequestBody(userSettings : TCUserSettings) {
    const result = this.requestBody()
    if (environment.isElectron) {
      return result
    }

    const inboxId = userSettings.userInbox
    const newFilter : SmartListFullFilter = Object.assign({}, this.filter)

    const defaultListIsInbox = this.defaultList == inboxId
    newFilter.defaultList = defaultListIsInbox ? kUnfiledTaskListID : this.defaultList
    result.default_list = defaultListIsInbox ? kUnfiledTaskListID : this.defaultList

    const sanitizedExcludedLists = Array.from(this.excludedListIds).map(id => id == inboxId ? kUnfiledTaskListID : id)
    newFilter.excludeLists = sanitizedExcludedLists
    result.excluded_list_ids = newFilter.excludeLists.reduce((accum, current, index) => index == 0 ? current : accum + `,${current}`, '')

    result.json_filter = JSON.stringify(newFilter)

    return result
  }
}