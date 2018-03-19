import { TCObject } from './tc-object'
import { Utils } from '../tc-utils'
import { ListEmailNotificationModel } from '../tc-types'

export type ListTaskCount = { count : number, overdue : number }

export class TCList extends TCObject {
  name      : string = 'New List'
  description: string = "A list"

  iconName : string = null
  color    : string = '#2196f3'
  sortOrder: number = 0
  sortType : number = -1
  defaultDueDate : number = -1

  public emailNotifications : ListEmailNotificationModel = {
    taskNotifications   : false,
    userNotifications   : false,
    commentNotifications: false,
    notifyAssignedOnly  : false,
  }

  private buildEmailNotifications(listData : any) {
    this.emailNotifications.taskNotifications = this.cleanBoolean(listData.settings.task_notifications)
    this.emailNotifications.userNotifications = this.cleanBoolean(listData.settings.user_notifications)
    this.emailNotifications.commentNotifications = this.cleanBoolean(listData.settings.comment_notifications)
    this.emailNotifications.notifyAssignedOnly = this.cleanBoolean(listData.settings.notify_assigned_only)
  }

  constructor(listData? : any) {
    super(listData != null ? listData.list.listid : null, listData != null ? listData.list.timestamp : null)

    // All user lists must have an icon. When a new list is created a random
    // list icon is selected.
    this.iconName = Utils.iconNameToCss(Utils.randomListIcon())

    if (listData) {
      this.assignIfExists(listData.list.name, 'name')
      this.assignIfExists(listData.list.description, 'description')

      if (listData.settings) {
        this.assignIfExists(Utils.rgbToHex(listData.settings.color), 'color')
        this.assignIfExists(Utils.iconNameToCss(listData.settings.icon_name), 'iconName')

        this.assignIfExists(listData.settings.sort_order, 'sortOrder')
        this.assignIfExists(listData.settings.sort_type, 'sortType')
        this.assignIfExists(listData.settings.default_due_date, 'defaultDueDate')

        this.buildEmailNotifications(listData)
      }

      if (this.identifier == "INBOX") {
        this.name = "Inbox"
        this.iconName = "twf-inbox"
      }
    }
  }

  requestBody() {
    return {
            name    : this.name,
            description : this.description,

            settings: {
                color : Utils.hexToRgb(this.color),
                icon_name : Utils.cssToIconName(this.iconName),
                sort_order: this.sortOrder,
                sort_type : this.sortType,
                default_due_date  : this.defaultDueDate,
                task_notifications: this.emailNotifications.taskNotifications ? 1 : 0,
                user_notifications: this.emailNotifications.userNotifications ? 1 : 0,
                comment_notifications: this.emailNotifications.commentNotifications ? 1 : 0,
                notify_assigned_only : this.emailNotifications.notifyAssignedOnly ? 1 : 0
            }
        }
  }
}

