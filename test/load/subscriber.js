import createClient from './createClient'

async function init () {
  let model = await createClient()

  let doc = model.doc('items', '1')
  await doc.subscribe()

  let count = 0

  doc.on('change', () => {
    count++
  })

  function showCount () {
    console.log('changes/sec', count)
    count = 0
  }

  setInterval(showCount, 1000)
}

init().catch((err) => console.error(err, err.stack))
