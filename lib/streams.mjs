import { Writable } from 'streamx'

export class WriteStream extends Writable {
  constructor (core, name, driveOpts = {}) {
    super()
    this.core = core
    this.name = name
    this.driveOpts = driveOpts
    this._firstWrite = true
  }

  _writev (batch, cb) {
    const obj = { type: 'drive-ws-chunk', batch, name: this.name}
    if (this._firstWrite) {
      obj.opts = this.driveOpts
      this._firstWrite = false
    }
    this._writevP(obj).then(cb, cb)
  }

  async _writevP (batch) {
    await this.core.append(batch)
  }

  _destroy (cb) {
    this._destroyP().then(cb, cb)
  }

  async _destroyP () {
    return this.core.append({
      type: 'drive-ws-end',
      name: this.name,
    })
  }
}
