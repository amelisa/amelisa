# Amelisa

Data engine with offline and realtime

[![Join the chat at https://gitter.im/amelisa/amelisa](https://badges.gitter.im/amelisa/amelisa.svg)](https://gitter.im/amelisa/amelisa?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

### Features
- offline
- realtime
- data sync between devices
- JSON CRDT type which includes operations on objects, arrays, strings, numbers and booleans
- merging of complex data structures, like array of arrays of objects
- collaborative text editing
- isomorphic api
- db-queries subscriptions with [amelisa-mongo](https://github.com/amelisa/amelisa-mongo)
- GraphQL support (POC)
- React and React Native integration with [react-amelisa](https://github.com/amelisa/react-amelisa)
- horizontal scaling with [amelisa-redis](https://github.com/amelisa/amelisa-redis)
- Passport-based auth with [amelisa-auth](https://github.com/amelisa/amelisa-auth)
- access control
- modular structure with plug-able storages, framework adapter, etc.

### Warning
This software is in alpha stage. Does not follow semver till 1.0 version, breaking changes happen.

### Inspired by
- [Racer](https://github.com/derbyjs/racer)
- [SwarmJS](https://github.com/gritzko/swarm)

### Installation

Amelisa requires [NodeJS](http://nodejs.org/). You will also need to have a [MongoDB](http://docs.mongodb.org/manual/installation/) and a [Redis](http://redis.io/download) server running on your machine. The examples will connect via the default configurations.

```
$ npm install amelisa
```

### Tests

```
$ npm test
```

### Usage

Read [documentation](http://amelisajs.com) for more information.

### MIT License
Copyright (c) 2015 by Vladimir Makhaev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
