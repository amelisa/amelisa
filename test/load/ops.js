import createClient from './createClient';

createClient()
  .then((model) => {
    let index = 0;
    let count = 0;
    function createDoc() {
      let start = Date.now();

      let doc = {
        _id: '1',
        name: null
      }

      model
        .add('items', doc)
        .then(() => {
          console.log('item created');
        });
    }

    function mutateDoc() {
      model
        .set('items', '1', 'name', index++)
        .then(() => {
          count++;
          mutateDoc();
        });
    }

    function showCount() {
      console.log('ops/sec', count);
      count = 0;
    }

    createDoc();
    mutateDoc();
    setInterval(showCount, 1000);
  });
