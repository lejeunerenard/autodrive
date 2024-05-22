import test from 'brittle'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import c from 'compact-encoding'
import Autodrive from '../index.mjs'

const iterToArray = async (iter) => {
  const output = []
  for await (const node of iter) {
    output.push(node)
  }
  return output
}

test('constructor', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store)

  await drive.ready()

  t.is(drive._handlers.apply, Autodrive.apply)
})

test('basic put example', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  // // TODO Figure out how to support actions on the hyperdrive before anything has been applied.
  // t.absent(await drive.exists('/blob.txt'), 'file doesnt exist yet')

  const input = Buffer.from('example')
  await drive.put('/blob.txt', input)

  const entry = await drive.get('/blob.txt')
  t.alike(entry, input)

  t.ok(await drive.exists('/blob.txt'), 'file exists')
  t.absent(await drive.exists('/non-existent.txt'), 'non-existent doesnt exist')
})

test('list()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  await drive.put('/a.txt', Buffer.from('a'))
  await drive.put('/b.txt', Buffer.from('b'))
  await drive.put('/c.txt', Buffer.from('c'))

  const files = await iterToArray(drive.list())
  t.alike(files.map((f) => ({ key: f.key })), [{ key: '/a.txt' }, { key: '/b.txt' }, { key: '/c.txt' }])

  await drive.put('/foo/bar.txt', Buffer.from('bar'))
  await drive.put('/foo/biz/baz.txt', Buffer.from('baz'))

  const recursiveFiles = await iterToArray(drive.list('/foo', { recursive: true }))
  t.alike(
    recursiveFiles.map((f) => ({ key: f.key })),
    [{ key: '/foo/bar.txt' }, { key: '/foo/biz/baz.txt' }])
})

test('.entry()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  await drive.put('/a.txt', Buffer.from('a'))

  const entry = await drive.entry('/a.txt')

  t.alike(entry, { seq: 1, key: '/a.txt', value: {
    executable: false,
    linkname: null,
    blob: {
      blockOffset: 0,
      blockLength: 1,
      byteOffset: 0,
      byteLength: 1,
    },
    metadata: null
  } })
})
