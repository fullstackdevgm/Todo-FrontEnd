import { Injectable } from '@angular/core'
import { HotkeysService, Hotkey } from 'angular2-hotkeys'
import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable'

class HotkeyModel {
  [key : string] : string[]
}

export class HotkeyEventModel {
  name : string
  combo : string
  ev : KeyboardEvent
}


@Injectable()
export class TCHotkeyService {

  private readonly hotkeys : HotkeyModel = {
    "up" : ["Tasks.selectPrevTask"],
    "down" : ["Tasks.selectNextTask"],
    "del" : ["Tasks.selectDeleteSelectedTasks"],
    "backspace" : ["Tasks.selectDeleteSelectedTasks"],
    "ctrl+f" : ["MacOS.NavBar.focusOnSearch"],
    "ctrl+alt+f" : ["Other.NavBar.focusOnSearch"],
    "ctrl+n" : ["MacOS.TaskCreate.create"],
    "ctrl+alt+n" : ["Other.TaskCreate.create"],
    "ctrl+," : ["NavBar.openSettings"],
    "meta+," : ["NavBar.openSettings"],
    "enter" : ["Modal.save"],
    "esc" : ["Modal.cancel"],
    "ctrl+." : ["MacOS.Task.complete"],
    "ctrl+alt+." : ["Other.Task.complete"],
    "ctrl+0" : ["MacOS.Task.priorityNone"],
    "ctrl+alt+0" : ["Other.Task.priorityNone"],
    "ctrl+1" : ["MacOS.Task.priorityLow"],
    "ctrl+alt+1" : ["Other.Task.priorityLow"],
    "ctrl+2" : ["MacOS.Task.priorityMedium"],
    "ctrl+alt+2" : ["Other.Task.priorityMedium"],
    "ctrl+3" : ["MacOS.Task.priorityHigh"],
    "ctrl+alt+3" : ["Other.Task.priorityHigh"],
  }

  private subject : Subject<HotkeyEventModel>
  public get commands() : Observable<HotkeyEventModel> {
    return this.subject
  }

  constructor(private hotkeysService : HotkeysService) {
    this.subject = new Subject<HotkeyEventModel>()
    for (const key in this.hotkeys) {
      const commands = this.hotkeys[key]
      hotkeysService.add(new Hotkey(key, (ev, combo) => this.hotkey(ev, combo, commands)))
    }
  }

  hotkey(ev : KeyboardEvent, combo : string, commands : string[]) : boolean {
    commands.forEach(c => { 
      const command = {
        name : c,
        ev : ev,
        combo : combo
      } as HotkeyEventModel
      this.subject.next(command)
    })
    return true
  }
}
