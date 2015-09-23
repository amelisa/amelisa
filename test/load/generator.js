import createClient from './createClient';

createClient()
  .then((model) => {
    let index = 0;
    let count = 0;
    function createDoc() {
      let start = Date.now();

      let doc = {
        name: index++
      }

      model.add('items', doc, (err) => {
        // console.log('item created', err, Date.now() - start);
        count++;
      });
    }

    function showCount() {
      console.log('created docs/sec', count);
      count = 0;
    }

    setInterval(createDoc, 10);
    setInterval(showCount, 1000);
  });
