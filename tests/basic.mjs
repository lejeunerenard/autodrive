import test from 'brittle'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import c from 'compact-encoding'
import Autodrive from '../index.mjs'
import b4a from 'b4a'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

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

test('.db', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store)

  t.is(drive.db, drive.view.db)
})

test('.core', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store)

  t.is(drive.core, drive.view.db.core)
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

  const blobs = await drive.getBlobs()
  t.is(blobs, drive.view.blobs)
})

test('.close() then reopen', async (t) => {
  const storage = RAM.reusable()
  const store = new Corestore(storage)
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  const input = Buffer.from('example')
  await drive.put('/blob.txt', input)

  const file = await drive.get('/blob.txt')
  t.alike(file, input)

  const contentKeyBefore = drive.contentKey
  await drive.close()

  const store2 = new Corestore(storage)
  const drive2 = new Autodrive(store2, null, { valueEncoding: c.any })

  const file2 = await drive2.get('/blob.txt')
  t.alike(file2, input)

  const contentKeyAfter = drive2.contentKey
  t.alike(contentKeyBefore, contentKeyAfter)
  await drive2.close()
})

// Requires AutocoreSession.core & AutocoreSession.download
test.skip('.mirror()', async (t) => {
  const storeA = new Corestore(RAM.reusable())
  const a = new Autodrive(storeA, null, { valueEncoding: c.any })
  const storeB = new Corestore(RAM.reusable())
  const b = new Autodrive(storeB, null, { valueEncoding: c.any })

  await a.ready()
  await b.ready()

  await a.put('/file.txt', 'hello world')

  await a.mirror(b).done()
  await b.update()

  const file = await b.get('/file.txt')
  t.alike(file, b4a.from('hello world'))
})

test('.createWriteStream()', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })
  await drive.ready()

  const stream = drive.createWriteStream('/a.txt')
  const sourceFile = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/test.txt')
  const fileRs = fs.createReadStream(sourceFile)

  await pipeline(
    fileRs,
    stream
  )

  const output = await drive.get('/a.txt')
  t.alike(output, Buffer.from('Testing\n'))

  t.absent(drive._writeStreams.has('/a.txt'), 'stream was removed')
})
