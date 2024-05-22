import test from 'brittle'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import c from 'compact-encoding'
import Autodrive from '../index.mjs'

test('constructor', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store)

  await drive.ready()

  t.is(drive._handlers.apply, Autodrive.apply)
})

test('basic put example', async (t) => {
  const store = new Corestore(RAM.reusable())
  const drive = new Autodrive(store, null, { valueEncoding: c.any })

  // TODO Maybe remove as it might not be necessary?
  await drive.ready()

  const input = Buffer.from('example')
  await drive.put('/blob.txt', input)

  // const entry = await drive.get('/blob.txt')
  // t.alike(entry, input)
})
