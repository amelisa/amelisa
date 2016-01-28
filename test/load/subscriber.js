import createClient from './createClient'

async function init () {
  let model = await createClient()

  let subscription = await model.subscribe('items.1')

  let count = 0

  subscription.on('change', () => {
    count++
  })

  function showCount () {
    console.log('changes/sec', count)
    count = 0
  }

  setInterval(showCount, 1000)
}

init().catch((err) => console.error(err, err.stack))
