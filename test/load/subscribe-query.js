import createClient from './createClient'

async function init () {
  let model = await createClient()

  let query = model.query('items', {$count: true})
  await query.subscribe()

  let count = 0

  query.on('change', () => {
    count++
  })

  function showCount () {
    console.log('docs count', query.get(), 'changes/sec', count)
    count = 0
  }

  setInterval(showCount, 1000)
}

init().catch((err) => console.error(err, err.stack))
