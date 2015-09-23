import createClient from './createClient';

createClient()
  .then((model) => {

    let queries = {
      doc: ['items', '1']//,
      // docs: ['items', {}]
    }

    let subscription = model.subscribe(queries);

    let count = 0;

    subscription.on('change', () => {
      count++;
    });

    function showCount() {
      console.log('changes/sec', count);
      count = 0;
    }

    setInterval(showCount, 1000);
  });
