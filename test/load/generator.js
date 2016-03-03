import createClient from './createClient'

async function init () {
  let model = await createClient()

  let index = 0
  let count = 0
  async function createDoc () {
    let doc = {
      name: index++
    }

    await model.add('items', doc)
    count++
  }

  function showCount () {
    console.log('created docs/sec', count)
    count = 0
  }

  setInterval(createDoc, 10)
  setInterval(showCount, 1000)
}

init().catch((err) => console.log(err, err.stack))
