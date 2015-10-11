import server from './server';
import driver from 'node-phantom-simple';
import phantomjs from 'phantomjs2';

const options = {
  path: phantomjs.path
}

function evaluate(url) {
  console.log('evaluate')
  try {
    socket = new WebSocket('ws://' + url);
  } catch (err) {
    return err
  }

  // setTimeout(() => window.callPhantom('end'), 1000);
}

server((err, url, httpServer) => {
  driver.create(options, (err, browser) => {
    browser.createPage((err, page) => {
      console.log('open', url);
      page.open('http://' + url, (err, status) => {
        console.log('opened');
        page.includeJs('http://' + url + '/js/bundle.js', (err) => {
          console.log('js included');
          // page.evaluate(evaluate, url, (err, result) => {
          //   console.log(err, result)
          // });
        });
      });

      page.onCallback = (data) => {
        console.log('onCallback', data);
        browser.exit();
        httpServer.close();
        process.exit();
      };

      page.onConsoleMessage = (msg, lineNum, sourceId) => {
        console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
      };

      page.onError = (msg, trace) => {
        let msgStack = ['ERROR: ' + msg];

        if (trace && trace.length) {
          msgStack.push('TRACE:');
          trace.forEach((t) => {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
          });
        }

        console.error(msgStack.join('\n'));
      };
    });
  });
});

//
// driver.create({ path: require('phantomjs2').path }, function (err, browser) {
//   return browser.createPage(function (err, page) {
//     return page.open("http://tilomitra.com/repository/screenscrape/ajax.html", function (err,status) {
//       console.log("opened site? ", status);
//       page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js', function (err) {
//         // jQuery Loaded.
//         // Wait for a bit for AJAX content to load on the page. Here, we are waiting 5 seconds.
//         setTimeout(function () {
//           return page.evaluate(function () {
//             //Get what you want from the page using jQuery. A good way is to populate an object with all the jQuery commands that you need and then return the object.
//             var h2Arr = [],
//                 pArr = [];
//
//             $('h2').each(function () { h2Arr.push($(this).html()); });
//             $('p').each(function () { pArr.push($(this).html()); });
//
//             return {
//               h2: h2Arr,
//               p: pArr
//             };
//           }, function (err,result) {
//             console.log(result);
//             browser.exit();
//           });
//         }, 5000);
//       });
//       });
//   });
// });
