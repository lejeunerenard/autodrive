# Autodrive

A multiwriter version of [hyperdrive](https://github.com/holepunchto/hyperdrive)
using [autobase](https://github.com/holepunchto/autobase). Currently
experimental.

## Install

```sh
npm install lejeunerenard/autodrive
```

## Usage

```js
import Autodrive from 'autodrive'
import Corestore from 'corestore'

const store = new Corestore('./corestore')
const drive = new Autodrive(store, null, { valueEncoding: c.any })

const input = Buffer.from('example')
await drive.put('/blob.txt', input)

const entry = await drive.get('/blob.txt')
console.log(entry) // 'example'
```

## API

This module tries to conform to the same API as
[`Hyperdrive`](https://github.com/holepunchto/hyperdrive). The following are the
unique methods not found in `Hyperdrive` followed by the `Hyperdrive` API not
yet implemented.

### `const drive = new Autodrive(store, bootstrap = null, [options])`

Makes a new `Autodrive`. Takes the same arguments as an `autobase` with the
`store` (a [`Corestore`](https://github.com/holepunchto/corestore) instance)
being required. The `bootstrap` is the key of an existing autodrive or if `null`
(default) will create a new autodrive.

`options` takes any options `autobase` takes including overriding the `apply`
handler.

### `Autodrive.apply(batch, view, base)`

A static method used as the default `apply` for the `Autodrive`'s underlying
`autobase`. Provided as a static method to allow combining `Autodrive` with
other `autobase` components.

### `.view`

The `.view` property is an instance of `Hyperdrive` by default.

### Hyperdrive API not implemented

- [ ] `.version`  
      This property exists but is the default `autobase` property `.version`,
      not the `Hyperdrive` version. A work around for now is to use `.length`
- [ ] `.id`  
      `.key` is provided but `.id` is not yet implemented.
- [ ] `.readable`
- [ ] `.supportsMetadata`
- [ ] `.compare(entryA, entryB)`
- [ ] `.clear(path, [options])`
- [ ] `.clearAll([options])`
- [ ] `.purge()`
- [ ] `.batch()`  
      This is not implemented and as a result no batch operations are supported
      yet.
- [ ] `.readdir(folder)`
- [ ] `.entries([range], [options])`
- [/] `.mirror(out, [options])`  
      This feature is implemented, but is waiting on features in `Autobase`'s
      `AutoCoreSession` to be implemented.
- [ ] `.watch([folder])`
- [ ] `.download(folder, [options])`
- [ ] `.checkout(version)`
- [ ] `.diff(version, folder, [options])`
- [ ] `.downloadDiff(version, folder, [options])`
- [ ] `.downloadRange(dbRanges, blobRanges)`
- [ ] `.findingPeers()`
