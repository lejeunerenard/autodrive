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

  t.is(drive._handlers.apply, Autodrive.apply)
})

test('.put()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  t.absent(await drive.exists('/blob.txt'), 'file doesnt exist yet')

  const input = Buffer.from('example')
  await drive.put('/blob.txt', input)

  const file = await drive.get('/blob.txt')
  t.alike(file, input)

  t.ok(await drive.exists('/blob.txt'), 'file exists')
  t.absent(await drive.exists('/non-existent.txt'), 'non-existent doesnt exist')

  await drive.put('/has-metadata.txt', Buffer.from('b'), {
    executable: true,
    metadata: {
      beep: 'boop'
    }
  })

  const entry = await drive.entry('/has-metadata.txt')
  t.alike({
    key: entry.key,
    value: {
      executable: entry.value.executable,
      metadata: entry.value.metadata,
    }
  }, {
    key: '/has-metadata.txt',
    value: {
      executable: true,
      metadata: {
        beep: 'boop'
      }
    }
  })
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

test('.del()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  await drive.put('/a.txt', Buffer.from('a'))

  t.ok(await drive.exists('/a.txt'))

  await drive.del('/a.txt')

  t.absent(await drive.exists('/a.txt'))
})

test('.symlink()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  await drive.put('/a.txt', Buffer.from('a'))
  t.ok(await drive.exists('/a.txt'))

  await drive.symlink('/b.txt', '/a.txt')
  const entry = await drive.entry('/b.txt')
  t.alike(entry, {
    seq: 2,
    key: '/b.txt',
    value: {
      executable: false,
      linkname: '/a.txt',
      blob: null,
      metadata: null
    }
  })
})

test('.getBlobs()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  await drive.ready()

  const blobs = await drive.getBlobs()
  t.is(blobs, drive.view.blobs)
})
