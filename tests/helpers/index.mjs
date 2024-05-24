import b4a from 'b4a'

export function addWriter (db, key) {
  return db.append({
    type: 'add-writer',
    key
  })
}

export const applyWithAddWriter = (debug) => async (batch, view, base) => {
  // Add .addWriter functionality
  for (const node of batch) {
    const op = node.value
    if (op.type === 'add-writer') {
      debug && console.log('\rAdding writer', op.key)
      await base.addWriter(b4a.from(op.key, 'hex'))
      continue
    }
  }
}
