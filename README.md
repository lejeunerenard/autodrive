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
