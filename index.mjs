import Autobase from 'autobase'
import b4a from 'b4a'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import Hyperblobs from 'hyperblobs'
import MirrorDrive from 'mirror-drive'
import { WriteStream } from './lib/streams.mjs'

export default class Autodrive extends Autobase {
  constructor (store, bootstrap, handlers = {}) {
    if (bootstrap && typeof bootstrap !== 'string' && !b4a.isBuffer(bootstrap)) {
      handlers = bootstrap
      bootstrap = null
    }

    function open (viewStore, base) {
      // Create underlying hypercore data structures without hyperdrive to work
      // around readying immediately
      const db = new Hyperbee(viewStore.get('db'), {
        keyEncoding: 'utf-8',
        valueEncoding: 'json',
        metadata: { contentFeed: null },
        extension: false
      })
      // Name for blobs doesnt need to be derived from the hyperbee key since
      // there is a unique namespace for the viewstore
      const blobs = new Hyperblobs(viewStore.get('blobs'))
      const drive = new Hyperdrive(base.store, { _db: db })
      drive.blobs = blobs
      return drive
    }

    const apply = 'apply' in handlers ? handlers.apply : Autodrive.apply

    super(store, bootstrap, { ...handlers, open, apply })
    this._writeStreams = new Map()
  }

  static async apply (batch, drive, base) {
    for (const node of batch) {
      const op = node.value
      if (op.type === 'drive-put') {
        await drive.put(op.path, op.buffer, op.opts)
      } else if (op.type === 'drive-del') {
        await drive.del(op.path)
      } else if (op.type === 'drive-symlink') {
        await drive.symlink(op.path, op.linkname)
      } else if (op.type === 'drive-ws-chunk') {
        const name = op.name
        const stream = base._writeStreams.has(name)
          ? base._writeStreams.get(name)
          : drive.createWriteStream(name, op.opts)
            .on('finish', () => base._writeStreams.delete(name))

        base._writeStreams.set(name, stream)

        for (const chunk of op.batch) {
          stream.write(chunk)
        }
      } else if (op.type === 'drive-ws-end') {
        const name = op.name
        const stream = base._writeStreams.has(name)
          ? base._writeStreams.get(name)
          : null

        stream.end()
      }
    }
  }

  // // TODO Figure out how not to conflict with autobase's .version
  // get version () {
  //   return this.view.db.version
  // }

  get contentKey () {
    return this.view.contentKey
  }

  getBlobs () {
    return this.view.getBlobs()
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
    return this.view.get(path, { prefetch: false, ...opts })
  }

  exists (path) {
    return this.view.exists(path)
  }

  entry (path, opts) {
    return this.view.entry(path, opts)
  }

  list (path, opts) {
    return this.view.list(path, opts)
  }

  symlink (path, linkname) {
    return this.append({ type: 'drive-symlink', path, linkname })
  }

  mirror (out, opts) {
    return new MirrorDrive(this, out, opts)
  }

  createWriteStream (name, { executable = false, metadata = null } = {}) {
    return new WriteStream(this, name, { executable, linkname: null, metadata })
  }

  createReadStream (path, opts) {
    return this.view.createReadStream(path, opts)
  }
}
