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

  // // TODO Figure out how to support actions on the hyperdrive before anything has been applied.
  // t.absent(await drive.exists('/blob.txt'), 'file doesnt exist yet')

  const input = Buffer.from('example')
  await drive.put('/blob.txt', input)

  const entry = await drive.get('/blob.txt')
  t.alike(entry, input)

  t.ok(await drive.exists('/blob.txt'), 'file exists')
  t.absent(await drive.exists('/non-existent.txt'), 'non-existent doesnt exist')

  t.ok('win')
})
