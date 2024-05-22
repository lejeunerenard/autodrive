import Autobase from 'autobase'
import b4a from 'b4a'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import Autobee from 'autobee-example'

const proxyHyperbee = (base, bee) => {
  return new Proxy(bee, {
    get(target, prop, receiver) {
      const value = target[prop]
      if (prop === 'view') {
        return bee
      }

      if (value instanceof Function) {
        switch (prop) {
          case 'put':
            return (key, value, opts) => {
              const encKey = opts && opts.keyEncoding ? opts.keyEncoding.encode(key) : key
              if (opts && opts.keyEncoding) {
                delete opts.keyEncoding
              }

              return target.append({
                type: 'put',
                key: encKey,
                value,
                opts
              })
            }
          case 'get':
            return (key, opts) => target.view.get(key, opts)
          case 'peek':
            return (opts) => target.view.peek(opts)
          case 'createReadStream':
            return (range, opts) => target.view.createReadStream(range, opts)

          case 'append':
            return (obj) => {
              console.log('bee append', obj)
              // obj.type = 'bee-' + obj.type
              return target.append(obj)
            }
           case 'getHeader':
            // HACK attempting to patch the fact that AutoCores don't respect .get(index, { wait: false })
            return (opts) => {
              if ('wait' in opts && !opts.wait && target.core.length === 0) {
                return false
              }
              return Reflect.get(...arguments)
            }
        }
      }

      return Reflect.get(...arguments)
    }
  })
}

export default class Autodrive extends Autobase {
  constructor (store, bootstrap, handlers = {}) {
    if (bootstrap && typeof bootstrap !== 'string' && !b4a.isBuffer(bootstrap)) {
      handlers = bootstrap
      bootstrap = null
    }

    function open (viewStore) {
      const bee = new Hyperbee(viewStore.get('db', { cache: true }), { extension: false  })
      return {
        bee,
        drive: new Hyperdrive(viewStore, { _db: proxyHyperbee(this, bee)  })
      }
    }

    const apply = 'apply' in handlers ? handlers.apply : Autodrive.apply

    super(store, bootstrap, { ...handlers, open, apply })
  }

  // async _open () {
  //   return super._open()
  // }

  static async apply (batch, view, base) {
    const b = view.drive // .batch()

    console.log('view.bee.opening', view.bee.opening)
    console.log('batch', batch)
    await Autobee.apply(batch, view.bee, base)

    for (const node of batch) {
      const op = node.value
      if (op.type === 'drive-put') {
        await b.put(op.path, op.buffer, op.opts)
      }
    }

    // await b.flush()
  }

  async put (path, buffer, opts = {}) {
    return this.append({
      type: 'drive-put',
      path,
      buffer
    })
  }

  async get (path, opts = {}) {
    return this.view.get(path, opts)
  }
}
