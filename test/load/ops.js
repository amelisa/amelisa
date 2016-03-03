import createClient from './createClient'

async function init () {
  let model = await createClient()

  let index = 0
  let count = 0
  async function createDoc () {
    let doc = {
      _id: '1',
      name: null
    }

    await model.add('items', doc)
    console.log('item created')
  }

  async function mutateDoc () {
    model.set(['items', '1', 'name'], index++)
    count++
    setTimeout(mutateDoc, 0)
  }

  function showCount () {
    console.log('ops/sec', count)
    count = 0
  }

  await createDoc()
  mutateDoc()
  setInterval(showCount, 1000)
}

init().catch((err) => console.log(err, err.stack))
