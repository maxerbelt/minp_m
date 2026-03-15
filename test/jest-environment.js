import JsdomEnvironment from 'jest-environment-jsdom'
import { fn } from 'jest-mock'

export default class CustomEnvironment extends JsdomEnvironment {
  async setup () {
    await super.setup()
    console.log('CustomEnvironment: setup running')

    //
    // 1️⃣ Set a stable default URL (optional)
    //
    if (this.dom?.reconfigure) {
      this.dom.reconfigure({
        url: 'http://localhost/'
      })
    }

    //
    // 2️⃣ Mock navigation methods SAFELY
    //
    const LocationProto = this.global.Location?.prototype

    if (LocationProto) {
      LocationProto.assign = fn()
      LocationProto.replace = fn()
      LocationProto.reload = fn()
    }

    //
    // 3️⃣ Mock history.pushState safely
    //
    const HistoryProto = this.global.History?.prototype

    if (HistoryProto && !HistoryProto.pushState?._isMockFunction) {
      HistoryProto.pushState = fn()
    }
  }
}
