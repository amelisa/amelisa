import MongoStorage from '../../src/mongo/MongoStorage'
import { shouldBehaveLikeMongoQueriesStorage } from './mongoqueriesstorage'

const mongoUrl = 'mongodb://localhost:27017/test'

describe('MongoStorage', function () {
  before(async () => {
    this.storage = new MongoStorage(mongoUrl)
  })

  shouldBehaveLikeMongoQueriesStorage.bind(this)()
})
