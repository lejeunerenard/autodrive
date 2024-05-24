import test from 'brittle'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import c from 'compact-encoding'
import Autodrive from '../index.mjs'
import { replicateAndSync } from 'autobase-test-helpers'
import { addWriter, applyWithAddWriter } from './helpers/index.mjs'

test('.put()', async (t) => {
  t.test('read only', async (t) => {
    const store1 = new Corestore(RAM.reusable())
    const drive1 = new Autodrive(store1, null, { valueEncoding: c.any })
    await drive1.ready()

    const store2 = new Corestore(RAM.reusable())
    const drive2 = new Autodrive(store2, drive1.key, { valueEncoding: c.any })
    await drive2.ready()

    const drives = [drive1, drive2]

    t.absent(await drive1.exists('/foo.txt'), 'file doesnt exist yet')

    const fileBuffer = Buffer.from('beep')
    await drive1.put('/foo.txt', fileBuffer)

    await replicateAndSync(drives)

    const file = await drive2.get('/foo.txt')
    t.alike(file, fileBuffer)
  })

  t.test('writer', async (t) => {
    const apply = async (batch, drive, base) => {
      await applyWithAddWriter(false)(batch, drive, base)
      await Autodrive.apply(batch, drive, base)
    }
    const store1 = new Corestore(RAM.reusable())
    const drive1 = new Autodrive(store1, null, { valueEncoding: c.any, apply })
    await drive1.ready()

    const store2 = new Corestore(RAM.reusable())
    const drive2 = new Autodrive(store2, drive1.key, { valueEncoding: c.any, apply })
    await drive2.ready()

    const drives = [drive1, drive2]

    await addWriter(drive1, drive2.local.key)
    await replicateAndSync(drives)

    t.absent(await drive1.exists('/foo.txt'), 'file doesnt exist yet')

    const fileBuffer = Buffer.from('beep')
    await drive1.put('/foo.txt', fileBuffer)

    await replicateAndSync(drives)

    const file = await drive2.get('/foo.txt')
    t.alike(file, fileBuffer)

    await drive2.put('/foo.txt', Buffer.from('overwritten'))
    await replicateAndSync(drives)

    const overWrittenFile = await drive1.get('/foo.txt')
    t.alike(overWrittenFile, Buffer.from('overwritten'))
  })

  t.test('last write wins', async (t) => {
    const apply = async (batch, drive, base) => {
      await applyWithAddWriter(false)(batch, drive, base)
      await Autodrive.apply(batch, drive, base)
    }
    const store1 = new Corestore(RAM.reusable())
    const drive1 = new Autodrive(store1, null, { valueEncoding: c.any, apply })
    await drive1.ready()

    const store2 = new Corestore(RAM.reusable())
    const drive2 = new Autodrive(store2, drive1.key, { valueEncoding: c.any, apply })
    await drive2.ready()

    const drives = [drive1, drive2]

    await addWriter(drive1, drive2.local.key)
    await replicateAndSync(drives)

    // Set initial file state
    await drive1.put('/foo.txt', Buffer.from('a'))
    await replicateAndSync(drives)

    // Diverge
    await drive2.put('/foo.txt', Buffer.from('from drive2'))
    await drive2.put('/other.txt', Buffer.from('bump to being 2 blocks'))

    await drive1.put('/foo.txt', Buffer.from('from drive1'))

    await replicateAndSync(drives)

    const finalFile1 = await drive1.get('/foo.txt')
    t.alike(finalFile1, Buffer.from('from drive2'))
    const finalFile2 = await drive2.get('/foo.txt')
    t.alike(finalFile2, finalFile1)
  })
})
