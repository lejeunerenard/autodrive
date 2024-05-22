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
      // Create underlying hypercore datastructures without hyperdrive to work around readying immediately
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

  // Populate hyperdrive object
  _ensureDrive () {
    if (!this._drive && !this._applying) throw Error('Couldnt make a drive yet as `apply` hasnt been called.')

    // todo figure out if a length check on the db is a good idea
    if (!this._drive && this._applying) {
      this._drive = new Hyperdrive(this.store, { _db: this.view.db })
      this._drive.blobs = this.view.blobs
    }
  }

  static async apply (batch, view, base) {
    base._ensureDrive()

    for (const node of batch) {
      const op = node.value
      if (op.type === 'drive-put') {
        await base._drive.put(op.path, op.buffer, op.opts)
      } else if (op.type === 'drive-del') {
        await base._drive.del(op.path)
      }
    }
  }

  // // TODO Figure out how not to conflict with autobase's .version
  // get version () {
  //   return this.view.db.version
  // }

  async put (path, buffer, opts = {}) {
    return this.append({
      type: 'drive-put',
      path,
      buffer
    })
  }

  async del (path) {
    return this.append({ type: 'drive-del', path })
  }

  async get (path, opts = {}) {
    this._ensureDrive()
    return this._drive.get(path, { prefetch: false, ...opts })
  }

  exists (path) {
    this._ensureDrive()
    return this._drive.exists(path)
  }

  entry (path, opts) {
    this._ensureDrive()
    return this._drive.entry(path, opts)
  }

  list (path, opts) {
    this._ensureDrive()
    return this._drive.list(path, opts)
  }
}
