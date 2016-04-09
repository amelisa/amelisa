import createClient from './createClient'

async function init () {
  let model = await createClient()

  let index = 0
  let count = 0

  async function createOp () {
    await model.set(['items', '1', 'name'], index++)
    count++
  }

  function showCount () {
    console.log('ops/sec', count)
    count = 0
  }

  setInterval(createOp, 0)
  setInterval(showCount, 1000)
}

init().catch((err) => console.log(err, err.stack))
