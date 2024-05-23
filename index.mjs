import Autobase from 'autobase'
import b4a from 'b4a'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import Hyperblobs from 'hyperblobs'

export default class Autodrive extends Autobase {
  constructor (store, bootstrap, handlers = {}) {
    if (bootstrap && typeof bootstrap !== 'string' && !b4a.isBuffer(bootstrap)) {
      handlers = bootstrap
      bootstrap = null
    }

    function open (viewStore) {
      // Create underlying hypercore data structures without hyperdrive to work
      // around readying immediately
      const db = new Hyperbee(viewStore.get('db'), {
        keyEncoding: 'utf-8',
        valueEncoding: 'json',
        metadata: { contentFeed: null },
        extension: false
      })
      const blobs = new Hyperblobs(viewStore.get('blobs'))
      return {
        db,
        blobs
      }
    }

    const apply = 'apply' in handlers ? handlers.apply : Autodrive.apply

    super(store, bootstrap, { ...handlers, open, apply })

    // Cache for hyperdrive object
    this._drive = null
  }

  async _open () {
    await super._open()
    if (!this._drive) {
      this._drive = new Hyperdrive(this.store, { _db: this.view.db })
      this._drive.blobs = this.view.blobs
    }
    await this._drive
  }

  static async apply (batch, view, base) {
    for (const node of batch) {
      const op = node.value
      if (op.type === 'drive-put') {
        await base._drive.put(op.path, op.buffer, op.opts)
      } else if (op.type === 'drive-del') {
        await base._drive.del(op.path)
      } else if (op.type === 'drive-symlink') {
        await base._drive.symlink(op.path, op.linkname)
      }
    }
  }

  // // TODO Figure out how not to conflict with autobase's .version
  // get version () {
  //   return this.view.db.version
  // }

  getBlobs () {
    return this._drive.getBlobs()
  }

  async put (path, buffer, opts = {}) {
    return this.append({
      type: 'drive-put',
      path,
      buffer,
      opts
    })
  }

  async del (path) {
    return this.append({ type: 'drive-del', path })
  }

  async get (path, opts = {}) {
    return this._drive.get(path, { prefetch: false, ...opts })
  }

  exists (path) {
    return this._drive.exists(path)
  }

  entry (path, opts) {
    return this._drive.entry(path, opts)
  }

  list (path, opts) {
    return this._drive.list(path, opts)
  }

  symlink (path, linkname) {
    return this.append({ type: 'drive-symlink', path, linkname })
  }
}
