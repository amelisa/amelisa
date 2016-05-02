import RethinkStorage from '../../src/mongo/RethinkStorage'
import { shouldBehaveLikeMongoQueriesStorage } from './mongoqueriesstorage'

const rethinkUrl = 'rethinkdb://localhost:28015/test'

describe.skip('RethinkStorage', function () {
  before(async () => {
    this.storage = new RethinkStorage(rethinkUrl)
  })

  shouldBehaveLikeMongoQueriesStorage.bind(this)()
})
