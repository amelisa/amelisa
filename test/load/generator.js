import createClient from './createClient'

createClient()
  .then((model) => {
    let index = 0
    let count = 0
    function createDoc () {
      let doc = {
        name: index++
      }

      model
        .add('items', doc)
        .then(() => {
          count++
        })
    }

    function showCount () {
      console.log('created docs/sec', count)
      count = 0
    }

    setInterval(createDoc, 10)
    setInterval(showCount, 1000)
  })
